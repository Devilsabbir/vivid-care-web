import { createClient } from '@/lib/supabase/server'
import IncidentReportClient from './IncidentReportClient'

export default async function StaffIncidentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Active/today shift for linking
  const now = new Date()
  const startOfDay = new Date(now); startOfDay.setHours(0, 0, 0, 0)

  const { data: shifts } = await supabase
    .from('shifts')
    .select('id, clients(id, full_name)')
    .eq('staff_id', user!.id)
    .in('status', ['active', 'scheduled'])
    .gte('start_time', startOfDay.toISOString())

  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')

  const { data: myIncidents } = await supabase
    .from('incidents')
    .select('*, clients(full_name)')
    .eq('staff_id', user!.id)
    .order('reported_at', { ascending: false })
    .limit(20)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Incidents</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">Report and view incidents</p>
      </div>
      <IncidentReportClient
        shifts={shifts ?? []}
        staffId={user!.id}
        adminIds={(admins ?? []).map(a => a.id)}
        myIncidents={myIncidents ?? []}
      />
    </div>
  )
}
