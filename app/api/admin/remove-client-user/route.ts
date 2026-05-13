import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

/**
 * Remove an NDIS client's mobile login. Deletes the auth.users row, which
 * cascades to profiles via the existing ON DELETE CASCADE FK. The clients
 * row + their agreements / shifts / care notes / incidents are all kept.
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`remove-client-user:${ip}`, { limit: 5, windowMs: 60_000 })
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
    console.error('[remove-client-user] profile lookup failed:', linkErr)
    return NextResponse.json({ error: 'Could not look up client account.' }, { status: 500 })
  }
  if (!link) {
    return NextResponse.json(
      { error: 'NO_LINKED_USER', message: 'This client doesn\'t have a mobile login.' },
      { status: 404 }
    )
  }

  // Self-removal guard (defense in depth — admin can't be a client too,
  // but blocks any cross-role weirdness)
  if (link.id === user.id) {
    return NextResponse.json({ error: 'You cannot remove your own account from here.' }, { status: 400 })
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey) {
    return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey)

  // Notifications addressed to this user have no FK so they'd stay orphaned —
  // drain them explicitly. Everything else (shifts, agreements, incidents)
  // references clients.id not profiles.id, so those stay intact.
  await admin.from('notifications').delete().eq('user_id', link.id).then(({ error }) => {
    if (error) console.warn('[remove-client-user] notifications drain failed:', error.message)
  })

  const { error: delErr } = await admin.auth.admin.deleteUser(link.id)
  if (delErr) {
    console.error('[remove-client-user] deleteUser failed:', delErr)
    return NextResponse.json({ error: 'Failed to delete user: ' + delErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
