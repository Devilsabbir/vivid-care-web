import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'
import { randomBytes } from 'crypto'

/**
 * Create a Supabase Auth account for an NDIS client and link it to their
 * clients row. The client can then sign in to the mobile app and see the
 * (client) tabs.
 *
 * Standard (non-NDIS) clients are rejected — the mobile app is NDIS-only.
 *
 * Flow:
 * 1. Verify the caller is admin
 * 2. Verify the target client exists + is NDIS + isn't already linked
 * 3. Create the auth user via service role (email_confirm: true so they can
 *    sign in immediately without an email click-through)
 * 4. The existing handle_new_user trigger auto-creates the profiles row with
 *    role='client'. We then UPDATE profiles SET client_id so RLS scoping works.
 * 5. Return the plaintext password ONCE in the response — admin copies and
 *    shares manually (SMS / WhatsApp / etc.) since not all client emails are
 *    deliverable.
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`create-client-user:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      }
    )
  }

  // Admin only
  const caller = await createServerClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: callerProfile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const clientId = typeof body.clientId === 'string' ? body.clientId : null
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null
  const customPassword = typeof body.password === 'string' && body.password.length > 0
    ? body.password
    : null

  if (!clientId || !email) {
    return NextResponse.json({ error: 'clientId and email are required' }, { status: 400 })
  }
  if (!email.includes('@') || email.length < 5) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }
  if (customPassword && customPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  // Verify target client exists + is NDIS
  const { data: client, error: clientErr } = await caller
    .from('clients')
    .select('id, full_name, client_type')
    .eq('id', clientId)
    .single()
  if (clientErr || !client) {
    return NextResponse.json({ error: 'Client not found.' }, { status: 404 })
  }
  if (client.client_type !== 'ndis') {
    return NextResponse.json(
      { error: 'Only NDIS clients can be invited to the mobile app.' },
      { status: 400 }
    )
  }

  // Verify the client isn't already linked to an auth user
  const { data: existingLink } = await caller
    .from('profiles')
    .select('id, email')
    .eq('role', 'client')
    .eq('client_id', clientId)
    .maybeSingle()
  if (existingLink) {
    return NextResponse.json(
      {
        error: 'CLIENT_ALREADY_LINKED',
        message: `This client already has a mobile login (${existingLink.email}). Reset their password or remove access first.`,
      },
      { status: 409 }
    )
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey) {
    console.error('[create-client-user] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey)

  // Cryptographically random 12-char password if admin didn't supply one
  const password = customPassword ?? generatePassword(12)

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: 'client',
      full_name: client.full_name,
    },
  })
  if (createErr) {
    // Distinguish "email already taken" from other failures
    const message = createErr.message ?? ''
    if (message.toLowerCase().includes('already')) {
      return NextResponse.json(
        { error: 'EMAIL_TAKEN', message: 'An account with this email already exists.' },
        { status: 409 }
      )
    }
    console.error('[create-client-user] auth.admin.createUser failed:', createErr)
    return NextResponse.json({ error: 'Failed to create user: ' + message }, { status: 500 })
  }

  const newUserId = created.user?.id
  if (!newUserId) {
    return NextResponse.json({ error: 'Auth user created but no id returned.' }, { status: 500 })
  }

  // Link the profile to the client. The handle_new_user trigger inserts the
  // row with role + full_name but doesn't know the client_id, so we patch it.
  const { error: linkErr } = await admin
    .from('profiles')
    .update({ client_id: clientId, email })
    .eq('id', newUserId)
  if (linkErr) {
    // Roll back the auth user so we don't leave an orphan
    await admin.auth.admin.deleteUser(newUserId).catch(() => {})
    console.error('[create-client-user] profile link failed:', linkErr)
    return NextResponse.json({ error: 'Failed to link client profile: ' + linkErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: newUserId, email, password })
}

/** Generate a random ASCII password (mixed case + digits, no ambiguous chars). */
function generatePassword(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}
