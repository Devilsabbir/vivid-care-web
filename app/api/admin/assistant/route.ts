import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

/**
 * Vivi — admin operations assistant.
 *
 * Two upgrades over the previous Haiku version:
 *  1. Model bumped to Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
 *     so reasoning / tone / formatting are sharper. Haiku stays for the
 *     staff chat where speed matters more than depth.
 *  2. Live org context — every request now augments the system prompt
 *     with current counts (shifts today, open incidents, expiring docs,
 *     NDIS clients pending signature, etc.) so Vivi can answer
 *     "how many open incidents?" with real numbers, not "I don't have
 *     access".
 *
 * Context is fetched via the service-role client so we get an org-wide
 * view independent of the admin's row-level scope.
 */

const ADMIN_SYSTEM_PROMPT_BASE = `You are Vivi, the operations assistant for Vivid Care — a Western Australian NDIS-registered disability and aged-care provider running on a Next.js + Supabase platform.

You are talking to an **administrator** using the admin portal. Be sharp, specific, and brief. Admins are busy — give them the answer first, then context.

## The platform at a glance

- **Admin portal** (this one): roster, clients, staff, incidents, agreements, payments, compliance, settings.
- **Staff mobile app** (Expo Go): clock in/out, view shifts, file incidents, sign service docs, chat with admin.
- **NDIS client portal**: NDIS participants only (non-NDIS clients have no login). View agreements, sign on phone, view shifts.

## Concepts and jargon you should know

- **Client types**: \`ndis\` (funded participant, needs a service agreement + signature) vs \`standard\` (private/aged-care, no portal access).
- **Funding management**: NDIA-managed / plan-managed / self-managed / nominee.
- **Agreement lifecycle**: \`draft\` → \`pending_signature\` → \`signed\` (or \`expired\` / \`cancelled\`). Signatures captured on the client's phone via the NDIS portal.
- **Shift lifecycle**: \`scheduled\` → \`active\` (clocked in) → \`completed\` (clocked out). Clock-in window is **±15 min around start time** — enforced by a DB trigger.
- **Incident severity**: \`low\` / \`medium\` / \`high\` / \`emergency\`. Status: \`open\` / \`investigating\` / \`resolved\`. NDIS reportable incidents must be filed within 24h.
- **Realtime**: agreements, shifts, incident_messages, staff_locations all stream live to admin dashboard — admin doesn't need to refresh.

## What you can help with

- **Walkthroughs**: "How do I roster a recurring shift?" / "Where do I see who's clocked in right now?"
- **Triage**: "What should I do if a staffer missed clock-out?" / "How do I escalate an emergency incident?"
- **Drafting**: Incident write-ups, service notes, staff notices, NDIS comms.
- **Decoding NDIS terminology** in plain English.
- **Compliance hygiene**: what documents expire, what's the cadence for police checks, etc.
- **Live counts** from the snapshot below (you DO have access — quote the numbers).

## What you must NOT do

- Make clinical, medical, or medication decisions.
- Give legal advice (employment law, NDIS rulings, disputes) — direct to compliance officer.
- Diagnose platform bugs — escalate to engineering.
- Invent features. If it's not in this prompt or the snapshot, say so.

## Style

- **Lead with the answer.** Background after.
- Use **bold** for the action, bullets for steps.
- Under 200 words unless detail is requested.
- Plain Australian English. No corporate fluff.`

const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 4000

/** Format an ISO timestamp into Perth-local "Tue 11:30 AM". */
function fmtPerth(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Australia/Perth',
  })
}

/**
 * Pull a live snapshot of org state so Vivi can answer with real
 * numbers AND real rows. Service-role client = org-wide view. All
 * queries timeboxed via Promise.allSettled.
 *
 * Snapshot now includes:
 *   - High-level counts (shifts today, incidents, agreements, clients)
 *   - Active roster: every shift that's currently in-progress
 *   - Today's roster: scheduled / active / completed shifts for today
 *     with staff + client + time window + status
 *   - Recent open incidents (top 5)
 *
 * Rows are truncated to avoid blowing the system-prompt budget.
 */
async function buildLiveContext(): Promise<string> {
  try {
    const svc = createServiceClient()
    const now = new Date()
    const startOfDayUtc = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
    startOfDayUtc.setUTCHours(0, 0, 0, 0)
    const endOfDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000 - 1)
    const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)

    const [
      shiftsToday,
      activeNow,
      openIncidents,
      highSeverityIncidents,
      pendingAgreements,
      signedAgreements,
      ndisClients,
      standardClients,
      activeStaff,
      expiringDocs,
      // Detail rows for "tell me the roster" type questions
      todaysRosterRows,
      activeShiftRows,
      openIncidentRows,
    ] = await Promise.allSettled([
      svc.from('shifts').select('id', { count: 'exact', head: true })
        .gte('start_time', startOfDayUtc.toISOString())
        .lte('start_time', endOfDayUtc.toISOString()),
      svc.from('shifts').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      svc.from('incidents').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      svc.from('incidents').select('id', { count: 'exact', head: true }).in('severity', ['high', 'emergency']).neq('status', 'resolved'),
      svc.from('agreements').select('id', { count: 'exact', head: true }).eq('status', 'pending_signature'),
      svc.from('agreements').select('id', { count: 'exact', head: true }).eq('status', 'signed'),
      svc.from('clients').select('id', { count: 'exact', head: true }).eq('client_type', 'ndis'),
      svc.from('clients').select('id', { count: 'exact', head: true }).eq('client_type', 'standard'),
      svc.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'staff'),
      svc.from('documents').select('id', { count: 'exact', head: true })
        .not('expiry_date', 'is', null)
        .lte('expiry_date', in45Days.toISOString().slice(0, 10)),
      // ── DETAIL ROWS ────────────────────────────────────────────────
      svc
        .from('shifts')
        .select('id, status, start_time, end_time, support_type, staff:profiles!staff_id(full_name), clients(full_name, address)')
        .gte('start_time', startOfDayUtc.toISOString())
        .lte('start_time', endOfDayUtc.toISOString())
        .order('start_time', { ascending: true })
        .limit(20),
      svc
        .from('shifts')
        .select('id, status, start_time, end_time, support_type, clock_in_time, staff:profiles!staff_id(full_name), clients(full_name)')
        .eq('status', 'active')
        .order('clock_in_time', { ascending: false })
        .limit(20),
      svc
        .from('incidents')
        .select('id, title, severity, status, reported_at, staff:profiles!staff_id(full_name), clients(full_name)')
        .eq('status', 'open')
        .order('reported_at', { ascending: false })
        .limit(5),
    ])

    const countOf = (r: PromiseSettledResult<{ count: number | null }>) =>
      r.status === 'fulfilled' ? (r.value.count ?? 0) : '?'
    const dataOf = <T,>(r: PromiseSettledResult<{ data: T[] | null }>): T[] =>
      r.status === 'fulfilled' && r.value.data ? r.value.data : []

    // Normalise PostgREST nested embed (returns array OR object depending on FK cardinality).
    const flat = (v: unknown): { full_name?: string | null; address?: string | null } | null => {
      if (!v) return null
      if (Array.isArray(v)) return (v[0] as any) ?? null
      return v as any
    }

    const counts = `## Live snapshot (just queried)\n
- **Shifts today**: ${countOf(shiftsToday)} (${countOf(activeNow)} currently clocked-in)
- **Incidents**: ${countOf(openIncidents)} open, ${countOf(highSeverityIncidents)} high/emergency severity
- **Agreements**: ${countOf(pendingAgreements)} awaiting signature, ${countOf(signedAgreements)} signed
- **Clients**: ${countOf(ndisClients)} NDIS, ${countOf(standardClients)} standard
- **Active staff**: ${countOf(activeStaff)}
- **Documents expiring within 45 days**: ${countOf(expiringDocs)}
- **Timestamp**: ${now.toISOString()} (Perth time = UTC+8)
`

    // Active roster — staff currently clocked in
    const activeRows = dataOf<any>(activeShiftRows)
    const activeBlock = activeRows.length
      ? `\n## Active roster (clocked-in right now)\n` +
        activeRows.map((s) => {
          const staff = flat(s.staff)?.full_name ?? 'Unassigned'
          const client = flat(s.clients)?.full_name ?? 'Client'
          return `- **${staff}** with ${client} · ${fmtPerth(s.start_time)} → ${fmtPerth(s.end_time)}` +
            (s.support_type ? ` · ${s.support_type}` : '') +
            (s.clock_in_time ? ` · in since ${fmtPerth(s.clock_in_time)}` : '')
        }).join('\n')
      : `\n## Active roster\nNo staff currently clocked in.`

    // Today's roster — full day view
    const todayRows = dataOf<any>(todaysRosterRows)
    const todayBlock = todayRows.length
      ? `\n\n## Today's roster (in chronological order)\n` +
        todayRows.map((s) => {
          const staff = flat(s.staff)?.full_name ?? 'Unassigned'
          const client = flat(s.clients)?.full_name ?? 'Client'
          const addr = flat(s.clients)?.address
          return `- ${fmtPerth(s.start_time)}–${fmtPerth(s.end_time)} · **${staff}** → ${client}` +
            (s.support_type ? ` (${s.support_type})` : '') +
            ` · status: \`${s.status}\`` +
            (addr ? ` · ${addr}` : '')
        }).join('\n')
      : `\n\n## Today's roster\nNothing scheduled today.`

    // Open incidents — what needs attention
    const incRows = dataOf<any>(openIncidentRows)
    const incBlock = incRows.length
      ? `\n\n## Open incidents (top ${incRows.length})\n` +
        incRows.map((i) => {
          const staff = flat(i.staff)?.full_name ?? '—'
          const client = flat(i.clients)?.full_name ?? '—'
          return `- **${i.severity.toUpperCase()}** · ${i.title} · reported by ${staff} for ${client} · ${fmtPerth(i.reported_at)}`
        }).join('\n')
      : `\n\n## Open incidents\nNone right now — well done.`

    return `\n\n${counts}${activeBlock}${todayBlock}${incBlock}\n`
  } catch (e) {
    console.warn('[admin-assistant] live context fetch failed:', e)
    return ''
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rl = rateLimit(`admin-assistant:${getIP(req)}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'You are sending messages too quickly. Please wait a moment.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
        },
      }
    )
  }

  const body = await req.json().catch(() => null)
  const messages = body?.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Conversation too long. Start a new chat.' }, { status: 400 })
  }
  for (const msg of messages) {
    if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return NextResponse.json({ error: 'Invalid message role' }, { status: 400 })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({
      content: 'The AI assistant is not configured for this organisation. Ask your developer to set ANTHROPIC_API_KEY in environment variables.',
    })
  }

  // Augment the system prompt with personalised name + live org snapshot.
  const liveContext = await buildLiveContext()
  const systemPrompt = [
    ADMIN_SYSTEM_PROMPT_BASE,
    profile?.full_name ? `\n\nThe admin you are speaking with is **${profile.full_name}**.` : '',
    liveContext,
  ].join('')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        // Sonnet for the admin assistant — better reasoning + writing than
        // Haiku, with the trade-off of ~3× cost per token. Worth it for
        // the lower-volume admin surface.
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        system: systemPrompt,
        messages: messages.slice(-MAX_MESSAGES),
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[admin-assistant] anthropic error:', res.status, errText)
      return NextResponse.json({ content: 'Sorry — the assistant is temporarily unavailable. Please try again in a moment.' })
    }

    const data = await res.json()
    const content = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[admin-assistant] unexpected error:', err)
    return NextResponse.json({ content: 'Something went wrong. Please try again.' })
  }
}
