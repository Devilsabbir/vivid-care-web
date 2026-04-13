import { createClient } from '@/lib/supabase/server'
import RosterClient from './RosterClient'

export default async function RosterPage() {
  const supabase = await createClient()

  const [{ data: shifts }, { data: staff }, { data: clients }, { data: supportTypes }] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, staff_id, client_id, title, support_type_key, documentation_status, start_time, end_time, notes, status, profiles(full_name), clients(full_name, address, lat, lng)')
      .order('start_time', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'staff')
      .order('full_name', { ascending: true }),
    supabase
      .from('clients')
      .select('id, full_name, address, lat, lng')
      .order('full_name', { ascending: true }),
    supabase
      .from('ndis_support_types')
      .select('key, title')
      .order('title', { ascending: true }),
  ])

  return <RosterClient shifts={shifts ?? []} staff={staff ?? []} clients={clients ?? []} supportTypes={supportTypes ?? [{ key: 'general_support', title: 'General Daily Support' }]} />
}
