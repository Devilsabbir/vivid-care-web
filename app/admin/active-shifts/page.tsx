import { createClient } from '@/lib/supabase/server'
import ActiveShiftsClient from './ActiveShiftsClient'

export default async function ActiveShiftsPage() {
  const supabase = await createClient()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, profiles(full_name, phone), clients(full_name, address, lat, lng)')
    .in('status', ['active', 'scheduled'])
    .gte('start_time', new Date(Date.now() - 86400000).toISOString())
    .order('start_time', { ascending: true })

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Active Shifts</h2>
        <p className="text-on-surface-variant text-sm mt-1">Real-time shift monitoring</p>
      </header>
      <ActiveShiftsClient initialShifts={shifts ?? []} />
    </div>
  )
}
