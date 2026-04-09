import { createClient } from '@/lib/supabase/server'
import StaffHomeClient from './StaffHomeClient'

export default async function StaffHomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, clients(full_name, address)')
    .eq('staff_id', user!.id)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })

  return <StaffHomeClient shifts={shifts ?? []} staffName={profile?.full_name ?? ''} />
}
