import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ClientsTable from './ClientsTable'

type Client = {
  id: string
  full_name: string | null
  client_type: 'ndis' | 'standard' | null
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

  const [{ data: clients, error: clientsError }, { data: shifts, error: shiftsError }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, full_name, client_type, ndis_number, address, phone, lat, lng')
      .order('full_name', { ascending: true }),
    supabase
      .from('shifts')
      .select('client_id, staff_id, start_time, status')
      .gte('start_time', weekStart.toISOString())
      .lte('start_time', weekEnd.toISOString()),
  ])
  if (clientsError) console.error('[clients page] clients fetch failed:', clientsError)
  if (shiftsError) console.error('[clients page] shifts fetch failed:', shiftsError)

  const shiftRows = (shifts ?? []) as ClientShift[]
  const cards = ((clients ?? []) as Client[]).map(client => {
    const clientShifts = shiftRows.filter(shift => shift.client_id === client.id && shift.status !== 'cancelled')
    return {
      id: client.id,
      full_name: client.full_name ?? 'Unnamed client',
      client_type: (client.client_type ?? 'ndis') as 'ndis' | 'standard',
      ndis_number: client.ndis_number,
      address: client.address,
      phone: client.phone,
      shiftsThisWeek: clientShifts.length,
      assignedStaff: new Set(clientShifts.map(shift => shift.staff_id)).size,
      hasMappedAddress: Boolean(client.lat && client.lng),
    }
  })

  const summary = {
    total: cards.length,
    ndis: cards.filter(card => card.client_type === 'ndis').length,
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
            Clients
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            Client records, NDIS visibility, and weekly allocation load in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-[34px] items-center rounded-[9px] border border-[#E5E1E8] bg-white px-3 text-[12.5px] font-medium text-[#3F3548]">
            {summary.activeThisWeek} receiving support this week
          </span>
          <Link
            href="/admin/clients/new"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">person_add</span>
            Add client
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Client records" value={summary.total} sub="Active profiles in the system" tone="white" />
        <SummaryCard label="NDIS clients" value={summary.ndis} sub="NDIS participants — require service agreements" tone="accent" />
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
  tone: 'white' | 'accent'
}) {
  const isAccent = tone === 'accent'
  const labelColor = isAccent ? 'rgba(255,255,255,0.7)' : '#6B6371'
  const valueColor = isAccent ? '#FFFFFF' : '#1A1320'
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
