import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verify caller is an admin
  const caller = await createServerClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, password, full_name, phone } = await req.json()
  const adminKey =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    adminKey!
  )
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'staff', full_name },
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (phone && data.user) {
    await admin.from('profiles').update({ phone }).eq('id', data.user.id)
  }
  return NextResponse.json({ ok: true })
}
