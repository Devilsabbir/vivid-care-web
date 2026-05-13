import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'
import { getIP } from '@/lib/get-ip'

/**
 * Hard-delete a staff member.
 *
 * Cascade summary (set up via FKs + this handler):
 * - `shifts.staff_id` → SET NULL (historical shifts preserved, un-attributed)
 * - `documents`, `clock_events`, `staff_locations`, `notifications`,
 *   `care_notes` (staff-authored) — manually drained here
 * - `profiles` row — cascaded by deleting the auth.users row (FK CASCADE)
 * - `auth.users` row — deleted last via service role
 *
 * Blocks the delete if the staff has any `active` or `scheduled` shifts.
 * Admin caller must clear those first (cancel or reassign).
 */
export async function POST(req: NextRequest) {
  const ip = getIP(req)
  const rl = rateLimit(`delete-user:${ip}`, { limit: 5, windowMs: 60_000 })
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
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

  // Verify caller is an admin
  const caller = await createServerClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const targetId = typeof body.user_id === 'string' ? body.user_id : null
  if (!targetId) return NextResponse.json({ error: 'user_id required' }, { status: 400 })

  // Self-delete guard
  if (targetId === user.id) {
    return NextResponse.json(
      { error: "You can't delete your own admin account from here." },
      { status: 400 }
    )
  }

  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!adminKey) {
    console.error('[delete-user] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Server misconfigured: missing service role key' }, { status: 500 })
  }
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, adminKey)

  // 1. Block if active/scheduled shifts exist (with the new SET NULL FK,
  //    the DB would let us drop the staff anyway — but the admin should
  //    cancel/reassign these first so live ops doesn't get orphaned).
  const { data: blockingShifts, error: shiftsErr } = await admin
    .from('shifts')
    .select('id, status')
    .eq('staff_id', targetId)
    .in('status', ['active', 'scheduled'])
  if (shiftsErr) {
    console.error('[delete-user] shifts check failed:', shiftsErr)
    return NextResponse.json({ error: 'Could not check upcoming shifts: ' + shiftsErr.message }, { status: 500 })
  }
  if (blockingShifts && blockingShifts.length > 0) {
    const active = blockingShifts.filter(s => s.status === 'active').length
    const scheduled = blockingShifts.filter(s => s.status === 'scheduled').length
    return NextResponse.json(
      {
        error: 'STAFF_HAS_UPCOMING_SHIFTS',
        active,
        scheduled,
        message: `This staff member has ${active} active and ${scheduled} scheduled shifts. Cancel or reassign them before deleting.`,
      },
      { status: 409 }
    )
  }

  // 2. Drain owned rows that don't have ON DELETE SET NULL / CASCADE wired.
  //    Order doesn't matter much here — none of these reference each other
  //    via the staff id directly.
  const drainPromises = await Promise.all([
    admin.from('documents').delete().eq('owner_type', 'staff').eq('owner_id', targetId),
    admin.from('clock_events').delete().eq('staff_id', targetId),
    admin.from('staff_locations').delete().eq('staff_id', targetId),
    admin.from('notifications').delete().eq('user_id', targetId),
    admin.from('care_notes').delete().eq('staff_id', targetId),
  ])
  for (const result of drainPromises) {
    if (result.error) {
      console.error('[delete-user] cascade drain error:', result.error)
      return NextResponse.json({ error: 'Failed to drain linked rows: ' + result.error.message }, { status: 500 })
    }
  }

  // 3. Delete the auth user. profiles row cascades via the FK.
  const { error: deleteAuthError } = await admin.auth.admin.deleteUser(targetId)
  if (deleteAuthError) {
    console.error('[delete-user] auth.admin.deleteUser failed:', deleteAuthError)
    return NextResponse.json({ error: 'Failed to delete auth user: ' + deleteAuthError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
