import { createClient } from '@/lib/supabase/server'
import ClockClient from './ClockClient'

export default async function ClockPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Perth is UTC+8 with no DST. Compute "today" as a Perth calendar day so
  // shifts entered by the admin in Perth time are matched correctly.
  const PERTH_OFFSET_MS = 8 * 60 * 60 * 1000
  const nowUtc = new Date()
  const perthNow = new Date(nowUtc.getTime() + PERTH_OFFSET_MS)
  perthNow.setUTCHours(0, 0, 0, 0) // midnight in Perth, expressed as a UTC Date
  const startOfPerthDay = new Date(perthNow.getTime() - PERTH_OFFSET_MS)
  const endOfPerthDay = new Date(startOfPerthDay.getTime() + 24 * 60 * 60 * 1000 - 1)

  // Fetch today's scheduled shifts (Perth day) and all active shifts separately.
  // Active shifts are fetched without a date filter so staff can always clock out,
  // even if the shift started before today's Perth midnight (e.g. overnight shifts).
  const [{ data: todayScheduled }, { data: currentlyActive }, { data: admins }] = await Promise.all([
    supabase
      .from('shifts')
      .select('*, clients(full_name, address, lat, lng)')
      .eq('staff_id', user!.id)
      .eq('status', 'scheduled')
      .gte('start_time', startOfPerthDay.toISOString())
      .lte('start_time', endOfPerthDay.toISOString())
      .order('start_time', { ascending: true }),
    supabase
      .from('shifts')
      .select('*, clients(full_name, address, lat, lng)')
      .eq('staff_id', user!.id)
      .eq('status', 'active')
      .order('start_time', { ascending: true }),
    supabase.from('profiles').select('id').eq('role', 'admin'),
  ])

  // Active shifts bubble to the top; deduplicate in case a shift appears in both lists.
  const activeList = currentlyActive ?? []
  const activeIds = new Set(activeList.map((s: { id: string }) => s.id))
  const shifts = [
    ...activeList,
    ...(todayScheduled ?? []).filter((s: { id: string }) => !activeIds.has(s.id)),
  ]

  const activeCount = activeList.length

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
          <div className="rounded-[22px] bg-[#c852ff] px-4 py-4 text-[#171717]">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#5e0087]">Active now</p>
            <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{activeCount}</p>
          </div>
        </div>
      </section>

      <ClockClient shifts={shifts ?? []} adminIds={(admins ?? []).map(admin => admin.id)} />
    </div>
  )
}
