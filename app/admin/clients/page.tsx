import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ClientsTable from './ClientsTable'

type Client = {
  id: string
  full_name: string | null
  ndis_number: string | null
  address: string | null
  phone: string | null
  lat: number | null
  lng: number | null
}

type ClientShift = {
  client_id: string
  staff_id: string
  start_time: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfDay(addDays(weekStart, 6))

  const [{ data: clients }, { data: shifts }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, ndis_number, address, phone, lat, lng')
      .order('full_name', { ascending: true }),
    supabase
      .from('shifts')
      .select('client_id, staff_id, start_time, status')
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString()),
  ])

  const shiftRows = (shifts ?? []) as ClientShift[]
  const cards = ((clients ?? []) as Client[]).map(client => {
    const clientShifts = shiftRows.filter(shift => shift.client_id === client.id && shift.status !== 'cancelled')
    return {
      id: client.id,
      full_name: client.full_name ?? 'Unnamed client',
      ndis_number: client.ndis_number,
      address: client.address,
      phone: client.phone,
      shiftsThisWeek: clientShifts.length,
      assignedStaff: new Set(clientShifts.map(shift => shift.staff_id)).size,
      hasGeofence: Boolean(client.lat && client.lng),
    }
  })

  const summary = {
    total: cards.length,
    ndis: cards.filter(card => card.ndis_number).length,
    activeThisWeek: cards.filter(card => card.shiftsThisWeek > 0).length,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Clients</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">group</span>
              service hub
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">Client records, NDIS visibility, and weekly allocation load in one place</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#f4f2ed] px-3 py-2 text-xs font-medium text-[#59564f]">
            {summary.activeThisWeek} receiving support this week
          </span>
          <Link
            href="/admin/clients/new"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add client
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Client records" value={summary.total} sub="Active profiles in the system" tone="white" />
        <SummaryCard label="NDIS-linked" value={summary.ndis} sub="Profiles with NDIS numbers" tone="lime" />
        <SummaryCard label="Scheduled care" value={summary.activeThisWeek} sub="Clients with shifts this week" tone="white" />
      </section>

      <ClientsTable clients={cards} />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number
  sub: string
  tone: 'white' | 'lime'
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${tone === 'lime' ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${tone === 'lime' ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${tone === 'lime' ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
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
