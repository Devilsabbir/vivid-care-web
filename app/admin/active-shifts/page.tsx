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
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Live shifts
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            Real-time attendance visibility for the active roster and the next shifts about to start.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/roster"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-[#E5E1E8] bg-white px-3 text-[12.5px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">calendar_month</span>
            Open roster
          </Link>
          <Link
            href="/admin/dashboard"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">dashboard</span>
            Dashboard
          </Link>
        </div>
      </header>

      <ActiveShiftsClient initialShifts={shifts ?? []} initialStaffLocations={staffLocations ?? []} />
    </div>
  )
}
