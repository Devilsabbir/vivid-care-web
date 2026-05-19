import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Max-Age': '86400',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

function jsonWithCors(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init)
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.headers.set(k, v)
  return res
}

const STAFF_SYSTEM_PROMPT = `You are Vivid Care Staff Assistant, an AI helper for care support workers in the field.

Your audience: support workers on shift, between visits, often on a phone. Keep answers concise, practical, and friendly. Avoid jargon. Aim for 2-4 sentences unless the worker explicitly asks for more.

## What you help with
- Shift logistics: clock-in rules, late arrivals, handovers, missed shifts
- Care documentation: how to write a good incident note, medication log, handover summary
- NDIS terminology in plain English (funding types, support categories, plan periods)
- Common care scenarios: refusing medication, falls, transport, behaviour escalation
- VividCare app navigation: where to find things, how to clock in/out, how to attach photos

## What you must NOT do
- Make clinical or medical decisions
- Diagnose anything
- Override a client's care plan
- Provide legal advice
- Invent platform features that don't exist

If a worker reports an emergency, a serious incident, or a safety concern, your FIRST line should always be: "Call your coordinator or 000 if anyone is in immediate danger."

Be warm, supportive, and brief. These are people doing emotional work, often tired.`

const MAX_MESSAGES = 12
const MAX_MESSAGE_LENGTH = 4000

export async function POST(req: NextRequest) {
  // ── Auth: only logged-in staff (or admin) may use this endpoint ──
  // The mobile app sends its Supabase session in the Authorization header.
  const authHeader = req.headers.get('authorization') ?? ''
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : null

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return jsonWithCors({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Build a Supabase client that reads the user from the bearer token.
  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll: () => (accessToken ? [{ name: 'sb-access-token', value: accessToken }] : []),
      setAll: () => {},
    },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return jsonWithCors({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()
  if (!profile || !['staff', 'admin'].includes(profile.role)) {
    return jsonWithCors({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limit: 30/min per IP
  const rl = rateLimit(`staff-chat:${getIP(req)}`, { limit: 30, windowMs: 60_000 })
  if (!rl.success) {
    return jsonWithCors(
      { error: 'Too many messages — slow down a moment.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const messages = body?.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonWithCors({ error: 'Invalid request' }, { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return jsonWithCors({ error: 'Conversation too long.' }, { status: 400 })
  }
  for (const msg of messages) {
    if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
      return jsonWithCors({ error: 'Message too long' }, { status: 400 })
    }
    if (!['user', 'assistant'].includes(msg.role)) {
      return jsonWithCors({ error: 'Invalid message role' }, { status: 400 })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return jsonWithCors({
      content: "Sorry, the AI assistant isn't configured yet. Ask your admin to add ANTHROPIC_API_KEY to the app environment.",
    })
  }

  const systemPrompt = profile.full_name
    ? `${STAFF_SYSTEM_PROMPT}\n\nThe support worker you're talking to is ${profile.full_name}.`
    : STAFF_SYSTEM_PROMPT

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-7',
        max_tokens: 768,
        system: systemPrompt,
        messages: messages.slice(-MAX_MESSAGES),
      }),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      console.error('[staff-chat] anthropic error:', res.status, errText)
      return jsonWithCors({
        content: 'Sorry — the assistant is temporarily unavailable. Try again in a moment.',
      })
    }

    const data = await res.json()
    const content = data.content?.[0]?.text ?? 'Sorry, I could not generate a response.'
    return jsonWithCors({ content })
  } catch (err) {
    console.error('[staff-chat] unexpected error:', err)
    return jsonWithCors({ content: 'Something went wrong. Please try again.' })
  }
}
