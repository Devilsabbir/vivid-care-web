import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'
import { randomBytes } from 'crypto'

/**
 * Generate a fresh password for an NDIS client's mobile login and return it
 * to the admin to share manually. Invalidates the client's existing tokens.
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`reset-client-password:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    )
  }

  const caller = await createServerClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: callerProfile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (callerProfile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const clientId = typeof body.clientId === 'string' ? body.clientId : null
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
  }

  const { data: link, error: linkErr } = await caller
    .from('profiles')
    .select('id, email')
    .eq('role', 'client')
    .eq('client_id', clientId)
    .maybeSingle()
  if (linkErr) {
    console.error('[reset-client-password] profile lookup failed:', linkErr)
    return NextResponse.json({ error: 'Could not look up client account.' }, { status: 500 })
  }
  if (!link) {
    return NextResponse.json(
      { error: 'NO_LINKED_USER', message: 'This client doesn\'t have a mobile login yet.' },
      { status: 404 }
    )
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey)

  const password = generatePassword(12)
  const { error: updErr } = await admin.auth.admin.updateUserById(link.id, { password })
  if (updErr) {
    console.error('[reset-client-password] updateUserById failed:', updErr)
    return NextResponse.json({ error: 'Failed to reset password: ' + updErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: link.id, email: link.email, password })
}

function generatePassword(len: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}
