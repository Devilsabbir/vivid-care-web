import { createClient } from '@/lib/supabase/server'
import RosterClient from './RosterClient'

export default async function RosterPage() {
  const supabase = await createClient()

  const [
    { data: shifts, error: shiftsError },
    { data: staff, error: staffError },
    { data: clients, error: clientsError },
    { data: supportTypes, error: supportTypesError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, staff_id, client_id, title, support_type_key, documentation_status, start_time, end_time, notes, status, profiles!shifts_staff_id_fkey(full_name), clients(full_name, address, lat, lng)')
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
  if (shiftsError) console.error('[roster page] shifts fetch failed:', shiftsError)
  if (staffError) console.error('[roster page] profiles fetch failed:', staffError)
  if (clientsError) console.error('[roster page] clients fetch failed:', clientsError)
  if (supportTypesError) console.error('[roster page] ndis_support_types fetch failed:', supportTypesError)

  return <RosterClient shifts={shifts ?? []} staff={staff ?? []} clients={clients ?? []} supportTypes={supportTypes ?? [{ key: 'general_support', title: 'General Daily Support' }]} />
}
