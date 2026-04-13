import { createClient } from '@/lib/supabase/server'
import IncidentReportClient from './IncidentReportClient'

export default async function StaffIncidentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)

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

  const openCount = (myIncidents ?? []).filter(incident => incident.status === 'open' || incident.status === 'investigating').length
  const urgentCount = (myIncidents ?? []).filter(incident => incident.severity === 'high' || incident.severity === 'emergency').length

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Incidents</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Report issues quickly</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Use this screen during or after a shift to document incidents and keep coordinators informed in real time.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Linked shifts" value={(shifts ?? []).length} />
          <MiniStat label="Open" value={openCount} accent />
          <MiniStat label="Urgent" value={urgentCount} />
        </div>
      </section>

      <IncidentReportClient
        shifts={shifts ?? []}
        staffId={user!.id}
        adminIds={(admins ?? []).map(admin => admin.id)}
        myIncidents={myIncidents ?? []}
      />
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${accent ? 'bg-[#cdff52] text-[#171716]' : 'bg-white/8 text-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#627100]' : 'text-[#8f8a80]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{value}</p>
    </div>
  )
}
