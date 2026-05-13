import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ShiftsListClient from './ShiftsListClient'

type ViewMode = 'upcoming' | 'past'

const UPCOMING_STATUSES = ['scheduled', 'active']
const PAST_STATUSES = ['completed', 'cancelled']

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const params = await searchParams
  const view: ViewMode = params.view === 'past' ? 'past' : 'upcoming'
  const statuses = view === 'past' ? PAST_STATUSES : UPCOMING_STATUSES

  const supabase = await createClient()

  const [
    { data: shifts, error: shiftsError },
    { data: staff, error: staffError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, start_time, end_time, status, support_type, clock_in_time, clock_out_time, notes, staff_id, client_id, staff:profiles!staff_id(full_name), clients(full_name, address)')
      .in('status', statuses)
      .order('start_time', { ascending: view === 'past' ? false : true })
      .limit(200),
    supabase.from('profiles').select('id, full_name').eq('role', 'staff').order('full_name'),
    // Only standard (non-NDIS) clients receive shift assignments
    supabase.from('clients').select('id, full_name').eq('client_type', 'standard').order('full_name'),
  ])
  if (shiftsError) console.error('[shifts page] shifts fetch failed:', shiftsError)
  if (staffError) console.error('[shifts page] profiles fetch failed:', staffError)
  if (clientsError) console.error('[shifts page] clients fetch failed:', clientsError)

  const normalizedShifts = (shifts ?? []).map((shift: any) => ({
    ...shift,
    staff_name: Array.isArray(shift.staff) ? shift.staff[0]?.full_name : shift.staff?.full_name,
    client_name: Array.isArray(shift.clients) ? shift.clients[0]?.full_name : shift.clients?.full_name,
    client_address: Array.isArray(shift.clients) ? shift.clients[0]?.address : shift.clients?.address,
  }))

  // Past view shows a clocked-hours total + completed/cancelled split — same
  // payroll-style summary the old /admin/shift-history page used to show.
  const totalHours = view === 'past'
    ? normalizedShifts.reduce((sum, shift) => {
        if (!shift.clock_in_time || !shift.clock_out_time) return sum
        return sum + (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000
      }, 0)
    : 0
  const completedCount = view === 'past' ? normalizedShifts.filter(s => s.status === 'completed').length : 0
  const cancelledCount = view === 'past' ? normalizedShifts.filter(s => s.status === 'cancelled').length : 0

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">Shifts</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#6B2C91] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
              <span className="material-symbols-outlined text-[18px]">event_note</span>
              {view === 'past' ? 'payroll view' : 'live operations'}
            </span>
          </div>
          <p className="text-sm text-[#64748b]">
            {view === 'past'
              ? 'Review completed and cancelled visits with clocked hours for downstream payroll and audit work.'
              : 'Monitor scheduled and currently-active shifts across the organisation.'}
          </p>
        </div>

        {/* Upcoming / Past toggle */}
        <nav aria-label="Shift view" className="inline-flex items-center rounded-full bg-[#f0f1f3] p-1">
          <Link
            href="/admin/shifts?view=upcoming"
            aria-current={view === 'upcoming' ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
              view === 'upcoming' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Upcoming
          </Link>
          <Link
            href="/admin/shifts?view=past"
            aria-current={view === 'past' ? 'page' : undefined}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition-colors ${
              view === 'past' ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            Past
          </Link>
        </nav>
      </header>

      {view === 'past' && (
        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Historical shifts" value={normalizedShifts.length} />
          <SummaryCard label="Completed" value={completedCount} accent />
          <SummaryCard label="Cancelled" value={cancelledCount} danger />
          <SummaryCard label="Clocked hours" value={Number(totalHours.toFixed(1))} suffix="h" />
        </section>
      )}

      <ShiftsListClient
        view={view}
        shifts={normalizedShifts}
        staff={staff ?? []}
        clients={clients ?? []}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  suffix,
  accent,
  danger,
}: {
  label: string
  value: number
  suffix?: string
  accent?: boolean
  danger?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${
      accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'
    }`}>
      <p className={`text-[12px] ${
        accent ? 'text-[#54206F]' : danger ? 'text-[#dc2626]' : 'text-[#64748b]'
      }`}>{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <p className={`font-headline text-[2.35rem] leading-none tracking-[-0.07em] ${
          danger ? 'text-[#dc2626]' : 'text-[#0f172a]'
        }`}>{value}</p>
        {suffix ? <span className="pb-1 text-xs text-[#64748b]">{suffix}</span> : null}
      </div>
    </div>
  )
}
