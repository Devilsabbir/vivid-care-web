import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

const SYSTEM_PROMPT = `You are a helpful assistant for Vivid Care, a workforce management platform for care providers.
Help staff with questions about using the app. Keep answers concise and practical.

Key features you can explain:
- Clock In/Out: Go to Clock tab, tap Clock In when at the client's location. GPS verification required within 300m.
- Documents: Go to Documents tab, tap Upload to add personal documents or client agreements.
- Incidents: Go to Incidents tab, tap "Report an Incident" to submit a report. Admin is notified immediately.
- Roster/Home: Your Calendar tab shows all assigned shifts.
- Payments: View completed shifts and hours in the Payments tab.
- Notifications: Bell icon shows all updates, roster changes, and reminders.

If you cannot help, suggest they contact support via the Contact Support tab.`

const MAX_MESSAGES = 10
const MAX_MESSAGE_LENGTH = 2000

export async function POST(req: NextRequest) {
  // Authentication check — only admin and staff may use the chat assistant
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Rate limiting
  const rl = rateLimit(`chat:${getIP(req)}`, { limit: 20, windowMs: 60_000 })
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

  const body = await req.json()
  const { messages } = body

  // Validate input
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  if (messages.length > MAX_MESSAGES) {
    return NextResponse.json({ error: 'Too many messages in context' }, { status: 400 })
  }
  for (const msg of messages) {
    if (typeof msg.content !== 'string' || msg.content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ content: 'AI assistant is not configured. Please contact your administrator.' })
  }

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
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-MAX_MESSAGES),
      }),
    })

    const data = await res.json()
    const content = data.content?.[0]?.text ?? 'Sorry, I could not process your request.'
    return NextResponse.json({ content })
  } catch {
    return NextResponse.json({ content: 'Something went wrong. Please try again.' })
  }
}
