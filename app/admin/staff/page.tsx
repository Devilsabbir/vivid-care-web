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

  const [{ data: staff }, { data: shifts }, { data: docs }] = await Promise.all([
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
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Staff</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">badge</span>
              operations
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">Roster visibility, document readiness, and live workforce health in one view</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f4f2ed] px-3 py-2 text-xs font-medium text-[#59564f]">
            {summary.activeThisWeek} active this week
          </span>
          <Link
            href="/admin/staff/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add staff
          </Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        <span className="rounded-full bg-[#1a1a18] px-4 py-2 text-white">All staff</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Active</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Inactive</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Expiring docs</span>
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
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${tone === 'accent' ? 'bg-[#c852ff]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${tone === 'accent' ? 'text-[#5e0087]' : danger ? 'text-[#ca8a04]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className={`mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] ${danger ? 'text-[#ca8a04]' : 'text-[#1a1a18]'}`}>{value}</p>
      <p className={`mt-2 text-xs ${tone === 'accent' ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{sub}</p>
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
