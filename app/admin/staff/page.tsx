import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getExpiryStatus } from '@/lib/utils/expiry'
import StaffTable from './StaffTable'

type StaffProfile = {
  id: string
  full_name: string | null
  phone: string | null
}

type StaffShift = {
  staff_id: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
}

type StaffDocument = {
  owner_id: string
  expiry_date: string | null
}

type StaffCardData = {
  id: string
  full_name: string
  phone: string | null
  shiftsThisWeek: number
  hoursThisWeek: number
  docState: 'expired' | 'near_expiry' | 'active' | 'missing'
}

export default async function StaffPage() {
  const supabase = await createClient()
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfDay(addDays(weekStart, 6))

  const [
    { data: staff, error: staffError },
    { data: shifts, error: shiftsError },
    { data: docs, error: docsError },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name, phone').eq('role', 'staff').order('full_name', { ascending: true }),
    supabase
      .from('shifts')
      .select('staff_id, start_time, end_time, status')
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString()),
    supabase
      .from('documents')
      .select('owner_id, expiry_date')
      .eq('owner_type', 'staff')
      .not('expiry_date', 'is', null),
  ])
  if (staffError) console.error('[staff page] profiles fetch failed:', staffError)
  if (shiftsError) console.error('[staff page] shifts fetch failed:', shiftsError)
  if (docsError) console.error('[staff page] documents fetch failed:', docsError)

  const shiftRows = (shifts ?? []) as StaffShift[]
  const docRows = (docs ?? []) as StaffDocument[]

  const cards: StaffCardData[] = ((staff ?? []) as StaffProfile[]).map(member => {
    const memberShifts = shiftRows.filter(shift => shift.staff_id === member.id && shift.status !== 'cancelled')
    const hours = memberShifts.reduce((total, shift) => {
      return total + (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) / 3600000
    }, 0)

    const statuses = docRows
      .filter(doc => doc.owner_id === member.id)
      .map(doc => getExpiryStatus(doc.expiry_date))

    const docState = statuses.includes('expired')
      ? 'expired'
      : statuses.includes('near_expiry')
        ? 'near_expiry'
        : statuses.includes('active')
          ? 'active'
          : 'missing'

    return {
      id: member.id,
      full_name: member.full_name ?? 'Unnamed staff',
      phone: member.phone,
      shiftsThisWeek: memberShifts.length,
      hoursThisWeek: hours,
      docState,
    }
  })

  const summary = {
    total: cards.length,
    expiring: cards.filter(card => card.docState === 'near_expiry' || card.docState === 'expired').length,
    activeThisWeek: cards.filter(card => card.shiftsThisWeek > 0).length,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Staff
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            Roster visibility, document readiness, and live workforce health in one view.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-[34px] items-center rounded-[9px] border border-[#E5E1E8] bg-white px-3 text-[12.5px] font-medium text-[#3F3548]">
            {summary.activeThisWeek} active this week
          </span>
          <Link
            href="/admin/staff/new"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person_add</span>
            Add staff
          </Link>
        </div>
      </header>

      {/* Segmented filter tabs — matches the design's .adm-tabs treatment.
          Currently visual only; wiring filters is future work. */}
      <nav className="inline-flex w-fit gap-[2px] rounded-[10px] bg-[#F1EEF4] p-[3px]">
        <span className="rounded-[8px] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#1A1320] shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          All staff
        </span>
        <span className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[#3F3548]">Active</span>
        <span className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[#3F3548]">Inactive</span>
        <span className="rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[#3F3548]">Expiring docs</span>
      </nav>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Care team" value={summary.total} sub="Registered staff records" tone="white" />
        <SummaryCard label="On roster" value={summary.activeThisWeek} sub="Staff with shifts this week" tone="accent" />
        <SummaryCard label="Needs review" value={summary.expiring} sub="Expiring or overdue compliance" tone="white" danger />
      </section>

      <StaffTable staff={cards} />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
  danger,
}: {
  label: string
  value: number
  sub: string
  tone: 'white' | 'accent'
  danger?: boolean
}) {
  const isAccent = tone === 'accent'
  const valueColor = isAccent ? '#FFFFFF' : danger ? '#D97706' : '#1A1320'
  const labelColor = isAccent ? 'rgba(255,255,255,0.7)' : danger ? '#5C3A06' : '#6B6371'
  const subColor = isAccent ? 'rgba(255,255,255,0.7)' : '#97909C'
  return (
    <div
      className="rounded-[16px] p-[18px] shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]"
      style={{ background: isAccent ? '#6B2C91' : '#FFFFFF' }}
    >
      <p
        className="text-[12px] font-medium uppercase"
        style={{ letterSpacing: '0.06em', color: labelColor }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[32px] font-bold leading-none"
        style={{ letterSpacing: '-0.02em', color: valueColor }}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] font-medium" style={{ color: subColor }}>
        {sub}
      </p>
    </div>
  )
}

function startOfWeek(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  const day = next.getDay()
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function endOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}
