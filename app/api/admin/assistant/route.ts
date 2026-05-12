import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

const ADMIN_SYSTEM_PROMPT = `You are Vivid Care Operations Assistant, an AI helper exclusively for administrators of the Vivid Care workforce management platform.

Your job is to help admins solve operational, compliance, and platform-usage problems quickly. Be concise, direct, and practical — admins are busy and want actionable answers.

## About the platform

Vivid Care is a Next.js + Supabase platform for Australian disability and aged-care providers. Three portals exist:
- Admin portal (this is who you're talking to) — desktop-first command center
- Staff mobile portal — used by support workers in the field
- Client portal — NDIS participants only; standard (non-NDIS) clients cannot log in

## Client types
- "NDIS Client" — funded NDIS participant; requires a service agreement with signature
- "Client" — standard non-NDIS client; no signature collection required, no client portal access

## Key admin workflows you can help with
- **Roster:** Drag-and-drop shift creation, conflict detection, geofence checks, bulk assignment
- **Agreements:** Generate NDIS service agreements (NDIS clients only), share signing links, sign in-person, track expiry
- **Compliance:** Track staff documents (passport, police check, CPR, etc.), expiry monitoring, upload renewals
- **Incidents:** Review, investigate, resolve, severity escalation
- **Payments:** Hours pulled from clock_in/clock_out times × staff hourly_rate; mark shifts as paid; per-staff billing summary
- **Live shifts:** Real-time map of clocked-in staff and their distance from client locations
- **Notifications:** Realtime feed of roster changes, clock events, compliance alerts; admin can broadcast notifications

## What you can do
- Explain how to do something in the admin portal
- Suggest a workflow for handling tricky situations (e.g. last-minute roster swap, expired document, missed clock-out)
- Decode NDIS terminology (funding types: NDIA-managed / plan-managed / self-managed / nominee)
- Help draft communications (incident reports, service notes, staff messages)
- Walk through compliance and audit-readiness checks

## What you must NOT do
- Make clinical or medical decisions
- Provide legal advice on NDIS rulings, employment law, or disputes — direct admins to their compliance officer or NDIS contact
- Diagnose specific bugs in the platform code itself — escalate to engineering
- Invent platform features that don't exist

When asked about specific data (e.g. "how many overdue documents do we have?"), explain that you don't have live access and direct the admin to the relevant page in the portal.

Keep responses under 200 words unless the admin explicitly asks for detail. Use bullet points and bold for scannability.`

const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 4000

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Admin-only.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limiting per admin (more permissive than the staff chat).
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

  // Personalize the system prompt with the admin's name when known.
  const systemPrompt = profile?.full_name
    ? `${ADMIN_SYSTEM_PROMPT}\n\nThe admin you are speaking with is ${profile.full_name}.`
    : ADMIN_SYSTEM_PROMPT

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
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
