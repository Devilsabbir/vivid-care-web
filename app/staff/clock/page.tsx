import { createClient } from '@/lib/supabase/server'
import ClockClient from './ClockClient'

export default async function ClockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  const { data: admins } = await supabase.from('profiles').select('id').eq('role', 'admin')
  const activeCount = (shifts ?? []).filter(shift => shift.status === 'active').length

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Attendance</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Clock in and out</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Use this screen when you arrive or leave. GPS verification is required when a client geofence is configured.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-[22px] bg-white/8 px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f8a80]">Today</p>
            <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{(shifts ?? []).length}</p>
          </div>
          <div className="rounded-[22px] bg-[#cdff52] px-4 py-4 text-[#171717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#627100]">Active now</p>
            <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{activeCount}</p>
          </div>
        </div>
      </section>

      <ClockClient shifts={shifts ?? []} adminIds={(admins ?? []).map(admin => admin.id)} />
    </div>
  )
}
