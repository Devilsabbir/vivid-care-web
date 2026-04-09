import { createClient } from '@/lib/supabase/server'
import RosterClient from './RosterClient'

export default async function RosterPage() {
  const supabase = await createClient()

  const [{ data: shifts }, { data: staff }, { data: clients }] = await Promise.all([
    supabase.from('shifts').select('*, profiles(full_name), clients(full_name)').order('start_time', { ascending: true }),
    supabase.from('profiles').select('id, full_name').eq('role', 'staff').order('full_name'),
    supabase.from('clients').select('id, full_name, address, lat, lng').order('full_name'),
  ])

  return (
    <div className="max-w-6xl">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Roster</h2>
          <p className="text-on-surface-variant text-sm mt-1">Manage shift assignments and scheduling</p>
        </div>
      </header>
      <RosterClient shifts={shifts ?? []} staff={staff ?? []} clients={clients ?? []} />
    </div>
  )
}
