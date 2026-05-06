import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffHomeClient from './StaffHomeClient'

export default async function StaffHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error: profileError } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
  if (profileError) console.error('[staff home page] profiles fetch failed:', profileError)

  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('*, clients(full_name, address)')
    .eq('staff_id', user!.id)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
  if (shiftsError) console.error('[staff home page] shifts fetch failed:', shiftsError)

  return <StaffHomeClient shifts={shifts ?? []} staffName={profile?.full_name ?? ''} />
}
