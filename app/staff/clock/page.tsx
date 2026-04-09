import { createClient } from '@/lib/supabase/server'
import ClockClient from './ClockClient'

export default async function ClockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Find today's shift that's scheduled or active
  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(now)
  endOfDay.setHours(23, 59, 59, 999)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, clients(full_name, address, lat, lng)')
    .eq('staff_id', user!.id)
    .in('status', ['scheduled', 'active'])
    .gte('start_time', startOfDay.toISOString())
    .lte('start_time', endOfDay.toISOString())
    .order('start_time', { ascending: true })

  // Get all admin profile IDs for notifications
  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Clock In / Out</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">Today's shifts</p>
      </div>
      <ClockClient shifts={shifts ?? []} staffId={user!.id} adminIds={(admins ?? []).map(a => a.id)} />
    </div>
  )
}
