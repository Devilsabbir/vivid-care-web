import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type IncidentRow = {
  id: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'emergency'
  status: 'open' | 'investigating' | 'resolved'
  reported_at: string
  profiles: { full_name: string | null }[] | null
  clients: { full_name: string | null }[] | null
}

export default async function IncidentsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('incidents')
    .select('id, title, description, severity, status, reported_at, profiles(full_name), clients(full_name)')
    .order('reported_at', { ascending: false })

  const incidents = ((data ?? []) as IncidentRow[]).map(item => ({
    ...item,
    staffName: item.profiles?.[0]?.full_name ?? 'Staff member',
    clientName: item.clients?.[0]?.full_name ?? 'Client record',
  }))

  const counts = {
    total: incidents.length,
    open: incidents.filter(item => item.status === 'open').length,
    investigating: incidents.filter(item => item.status === 'investigating').length,
    resolved: incidents.filter(item => item.status === 'resolved').length,
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Incidents</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              response board
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">Track open issues, review escalations, and keep incident handling visible for the whole operations team</p>
        </div>

        <Link
          href="/staff/incidents"
          className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New report
        </Link>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        <span className="rounded-full bg-[#1a1a18] px-4 py-2 text-white">All</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Open</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Under review</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Resolved</span>
        <span className="rounded-full bg-[#f4f2ed] px-4 py-2 text-[#5f5c55]">This week</span>
      </nav>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Total incidents" value={counts.total} tone="white" />
        <SummaryCard label="Open" value={counts.open} tone="white" danger="red" />
        <SummaryCard label="Under review" value={counts.investigating} tone="white" danger="amber" />
        <SummaryCard label="Resolved" value={counts.resolved} tone="lime" />
      </section>

      <section className="space-y-3">
        {incidents.length > 0 ? incidents.map(item => (
          <Link
            key={item.id}
            href={`/admin/incidents/${item.id}`}
            className="flex gap-4 rounded-[22px] border border-[#e8e4dc] bg-white p-5 shadow-[0_12px_28px_rgba(26,26,24,0.04)] transition-colors hover:bg-[#faf9f6]"
          >
            <div className={`w-1 rounded-full ${severityBar(item.severity)}`} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[#1a1a18]">{item.title}</h3>
                  <p className="mt-1 text-[11px] text-[#8a877f]">
                    {formatIncidentDate(item.reported_at)} · {item.staffName}
                  </p>
                </div>
                <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#5c5953]">
                {item.description ?? 'No additional narrative was supplied for this incident.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#f4f2ed] px-2.5 py-1 text-[10px] font-semibold text-[#6a665f]">
                  {item.clientName}
                </span>
                <span className="rounded-full bg-[#f4f2ed] px-2.5 py-1 text-[10px] font-semibold text-[#6a665f]">
                  {severityLabel(item.severity)}
                </span>
                <span className="rounded-full bg-[#f4f2ed] px-2.5 py-1 text-[10px] font-semibold text-[#6a665f]">
                  Shift-linked
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded-xl bg-[#1a1a18] px-3 py-1.5 text-[11px] font-medium text-white">
                  Review
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </span>
              </div>
            </div>
          </Link>
        )) : (
          <div className="rounded-[24px] border border-dashed border-[#d8d3ca] bg-white px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#bbb6ad]">warning</span>
            <p className="mt-3 text-sm font-medium text-[#1a1a18]">No incidents reported</p>
            <p className="mt-1 text-xs text-[#8a877f]">New reports will appear here as staff log them against active shifts.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  danger,
}: {
  label: string
  value: number
  tone: 'white' | 'lime'
  danger?: 'red' | 'amber'
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${tone === 'lime' ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${tone === 'lime' ? 'text-[#627100]' : danger === 'red' ? 'text-[#dc2626]' : danger === 'amber' ? 'text-[#ca8a04]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className={`mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] ${danger === 'red' ? 'text-[#dc2626]' : danger === 'amber' ? 'text-[#ca8a04]' : 'text-[#1a1a18]'}`}>{value}</p>
    </div>
  )
}

function formatIncidentDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' · ' +
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

function severityBar(severity: IncidentRow['severity']) {
  if (severity === 'emergency' || severity === 'high') return 'bg-[#dc2626]'
  if (severity === 'medium') return 'bg-[#ca8a04]'
  return 'bg-[#16a34a]'
}

function severityLabel(severity: IncidentRow['severity']) {
  if (severity === 'emergency') return 'Emergency'
  if (severity === 'high') return 'High severity'
  if (severity === 'medium') return 'Medium severity'
  return 'Low severity'
}

function statusLabel(status: IncidentRow['status']) {
  if (status === 'investigating') return 'Under review'
  if (status === 'resolved') return 'Resolved'
  return 'Open'
}

function statusClass(status: IncidentRow['status']) {
  if (status === 'investigating') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  if (status === 'resolved') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]'
  return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
}
