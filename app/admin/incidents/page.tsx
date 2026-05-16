import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type IncidentRow = {
  id: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'emergency'
  status: 'open' | 'investigating' | 'resolved'
  reported_at: string
  shift_id: string | null
  staff: { full_name: string | null }[] | null
  clients: { full_name: string | null }[] | null
}

export default async function IncidentsPage() {
  const supabase = await createClient()
  const { data, error: incidentsError } = await supabase
    .from('incidents')
    .select('id, title, description, severity, status, reported_at, shift_id, staff:profiles!staff_id(full_name), clients(full_name)')
    .order('reported_at', { ascending: false })
  if (incidentsError) console.error('[incidents page] incidents fetch failed:', incidentsError)

  const incidents = ((data ?? []) as IncidentRow[]).map(item => ({
    ...item,
    staffName: item.staff?.[0]?.full_name ?? 'Staff member',
    clientName: item.clients?.[0]?.full_name ?? 'Client record',
  }))

  const counts = {
    total: incidents.length,
    open: incidents.filter(item => item.status === 'open').length,
    investigating: incidents.filter(item => item.status === 'investigating').length,
    resolved: incidents.filter(item => item.status === 'resolved').length,
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Page header — design's adm-page-head pattern ─────── */}
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Incidents
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            Track open issues, review escalations, and keep response visible across the team.
          </p>
        </div>
      </header>

      {/* ── Summary tiles ────────────────────────────────────── */}
      <section className="grid gap-3.5 md:grid-cols-4">
        <SummaryCard
          label="Total incidents"
          value={counts.total}
          icon="warning"
          tone={{ bg: '#F4ECF8', fg: '#54206F' }}
        />
        <SummaryCard
          label="Open"
          value={counts.open}
          icon="error"
          tone={{ bg: '#FCE7E7', fg: '#DC2626' }}
        />
        <SummaryCard
          label="Under review"
          value={counts.investigating}
          icon="hourglass_top"
          tone={{ bg: '#FEF3D6', fg: '#5C3A06' }}
        />
        <SummaryCard
          label="Resolved"
          value={counts.resolved}
          icon="check_circle"
          tone={{ bg: '#F1F9E1', fg: '#5E8D1F' }}
        />
      </section>

      {/* ── List ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        {incidents.length > 0 ? (
          incidents.map((item) => (
            <Link
              key={item.id}
              href={`/admin/incidents/${item.id}`}
              className="group flex gap-3.5 rounded-[16px] bg-white p-4 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)] transition-all hover:shadow-[0_8px_20px_rgba(46,18,64,0.08),0_2px_4px_rgba(46,18,64,0.05)]"
            >
              <div className={`w-1 shrink-0 rounded-full ${severityBar(item.severity)}`} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-[15px] font-semibold leading-tight text-[#1A1320] group-hover:text-[#54206F]">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[12px] text-[#6B6371]">
                      {formatIncidentDate(item.reported_at)} · Reported by {item.staffName}
                    </p>
                  </div>
                  <span className={statusClass(item.status)}>{statusLabel(item.status)}</span>
                </div>

                {item.description && (
                  <p className="mt-3 text-[13px] leading-[1.5] text-[#3F3548] line-clamp-2">
                    {item.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-[#F1EEF4] px-2 py-[3px] text-[11px] font-semibold uppercase text-[#3F3548]"
                    style={{ letterSpacing: '0.04em' }}
                  >
                    <span className="material-symbols-outlined text-[11px]" aria-hidden="true">person</span>
                    {item.clientName}
                  </span>
                  <span className={severityPill(item.severity)}>{severityLabel(item.severity)}</span>
                  {item.shift_id && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-[#E6F5FC] px-2 py-[3px] text-[11px] font-semibold uppercase text-[#1380AB]"
                      style={{ letterSpacing: '0.04em' }}
                    >
                      <span className="material-symbols-outlined text-[11px]" aria-hidden="true">schedule</span>
                      Shift-linked
                    </span>
                  )}
                  <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] font-medium text-[#6B2C91]">
                    Review
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">chevron_right</span>
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[16px] border border-dashed border-[#E5E1E8] bg-white px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#C7C2CB]" aria-hidden="true">warning</span>
            <p className="mt-3 text-[14px] font-semibold text-[#1A1320]">No incidents reported</p>
            <p className="mt-1 text-[12.5px] text-[#6B6371]">
              New reports will appear here as staff log them against active shifts.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: number
  icon: string
  tone: { bg: string; fg: string }
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]"
      style={{ padding: '18px 60px 18px 18px' }}
    >
      <div
        className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      </div>
      <p
        className="text-[12px] font-medium uppercase text-[#6B6371]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[32px] font-bold leading-none text-[#1A1320]"
        style={{ letterSpacing: '-0.02em' }}
      >
        {value}
      </p>
    </div>
  )
}

function formatIncidentDate(value: string) {
  const date = new Date(value)
  return (
    date.toLocaleDateString('en-AU', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'Australia/Perth',
    }) +
    ' · ' +
    date
      .toLocaleTimeString('en-AU', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Australia/Perth',
      })
      .toLowerCase()
  )
}

function severityBar(severity: IncidentRow['severity']) {
  if (severity === 'emergency' || severity === 'high') return 'bg-[#DC2626]'
  if (severity === 'medium') return 'bg-[#D97706]'
  return 'bg-[#6B2C91]'
}

function severityPill(severity: IncidentRow['severity']) {
  const cls =
    'inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase'
  const tracking = { letterSpacing: '0.04em' }
  if (severity === 'emergency' || severity === 'high')
    return (
      `${cls} bg-[#FCE7E7] text-[#DC2626]`
    )
  if (severity === 'medium') return `${cls} bg-[#FEF3D6] text-[#5C3A06]`
  return `${cls} bg-[#F1EEF4] text-[#3F3548]`
}

function severityLabel(severity: IncidentRow['severity']) {
  if (severity === 'emergency') return 'Emergency'
  if (severity === 'high') return 'High'
  if (severity === 'medium') return 'Medium'
  return 'Low'
}

function statusLabel(status: IncidentRow['status']) {
  if (status === 'investigating') return 'Under review'
  if (status === 'resolved') return 'Resolved'
  return 'Open'
}

function statusClass(status: IncidentRow['status']) {
  const base =
    'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase'
  if (status === 'investigating') return `${base} bg-[#FEF3D6] text-[#5C3A06]`
  if (status === 'resolved') return `${base} bg-[#F1F9E1] text-[#5E8D1F]`
  return `${base} bg-[#FCE7E7] text-[#DC2626]`
}
