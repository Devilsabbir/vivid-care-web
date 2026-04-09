import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(req: NextRequest) {
  const { messages } = await req.json()

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
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: messages.slice(-10), // Last 10 messages for context
      }),
    })

    const data = await res.json()
    const content = data.content?.[0]?.text ?? 'Sorry, I could not process your request.'
    return NextResponse.json({ content })
  } catch (err) {
    return NextResponse.json({ content: 'Something went wrong. Please try again.' })
  }
}
