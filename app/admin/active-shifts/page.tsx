import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ActiveShiftsClient from './ActiveShiftsClient'

export default async function ActiveShiftsPage() {
  const supabase = await createClient()

  // Show all currently-active shifts (regardless of start_time — they're clocked
  // in NOW) plus scheduled shifts in a reasonable window (-7d running late, +14d
  // upcoming). The old `>= now() - 24h` filter was hiding stale-but-still-active
  // shifts and any roster older than yesterday.
  const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 86400000).toISOString()
  const FOURTEEN_DAYS_AHEAD = new Date(Date.now() + 14 * 86400000).toISOString()

  const [
    { data: activeShifts, error: activeError },
    { data: scheduledShifts, error: scheduledError },
    { data: staffLocations, error: locError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('*, staff:profiles!staff_id(full_name, phone), clients(full_name, address, lat, lng)')
      .eq('status', 'active')
      .order('start_time', { ascending: true }),
    supabase
      .from('shifts')
      .select('*, staff:profiles!staff_id(full_name, phone), clients(full_name, address, lat, lng)')
      .eq('status', 'scheduled')
      .gte('start_time', SEVEN_DAYS_AGO)
      .lte('start_time', FOURTEEN_DAYS_AHEAD)
      .order('start_time', { ascending: true }),
    supabase
      .from('staff_locations')
      .select('staff_id, lat, lng, accuracy, updated_at, shift_id'),
  ])

  const shifts = [...(activeShifts ?? []), ...(scheduledShifts ?? [])]
  const shiftsError = activeError ?? scheduledError
  if (shiftsError) console.error('[active-shifts page] shifts fetch failed:', shiftsError)
  if (locError) console.error('[active-shifts page] staff_locations fetch failed:', locError)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">Live shifts</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#6B2C91] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              monitoring board
            </span>
          </div>
          <p className="text-sm text-[#64748b]">Realtime attendance visibility for the active roster and the next shifts about to start</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/roster" aria-label="Open roster" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e6e8ec] bg-white text-[#64748b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">calendar_month</span>
          </Link>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white">
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Back to dashboard
          </Link>
        </div>
      </header>

      <ActiveShiftsClient initialShifts={shifts ?? []} initialStaffLocations={staffLocations ?? []} />
    </div>
  )
}
