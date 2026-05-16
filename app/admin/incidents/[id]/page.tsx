import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IncidentStatusUpdate from './IncidentStatusUpdate'
import IncidentChat from './IncidentChat'

type IncidentDetail = {
  id: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'emergency'
  status: 'open' | 'investigating' | 'resolved'
  reported_at: string
  staff: { full_name: string | null }[] | { full_name: string | null } | null
  clients: { full_name: string | null }[] | { full_name: string | null } | null
  shifts: { start_time: string; end_time: string }[] | { start_time: string; end_time: string } | null
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error: incidentError } = await supabase
    .from('incidents')
    .select('id, title, description, severity, status, reported_at, staff:profiles!staff_id(full_name), clients(full_name), shifts(start_time, end_time)')
    .eq('id', params.id)
    .single()
  if (incidentError) console.error('[incident detail page] incidents fetch failed:', incidentError)

  const incident = data as IncidentDetail | null
  if (!incident) notFound()

  const reporter = relationRow(incident.staff)?.full_name ?? 'Staff member'
  const client = relationRow(incident.clients)?.full_name ?? 'Client record'
  const shift = relationRow(incident.shifts)

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#6B6371]">
        <Link
          href="/admin/incidents"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[#6B6371] hover:bg-[#F8F6FA] hover:text-[#1A1320]"
          aria-label="Back to incidents list"
        >
          <span className="material-symbols-outlined text-[14px]">chevron_left</span>
        </Link>
        <Link href="/admin/incidents" className="hover:text-[#1A1320]">Incidents</Link>
        <span className="material-symbols-outlined text-[12px] text-[#C7C2CB]" aria-hidden="true">chevron_right</span>
        <span className="font-semibold text-[#1A1320] truncate max-w-[480px]">{incident.title}</span>
      </div>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={severityBadge(incident.severity)}>{severityLabel(incident.severity)}</span>
            <span className={statusBadge(incident.status)}>{statusLabel(incident.status)}</span>
          </div>
          <h1
            className="mt-2 max-w-3xl text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            {incident.title}
          </h1>
          <p className="mt-1.5 text-[13.5px] text-[#6B6371]">
            Reported {formatReportedAt(incident.reported_at)} by <span className="font-semibold text-[#3F3548]">{reporter}</span>
          </p>
        </div>

        <div
          className="rounded-[16px] bg-white px-5 py-4 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)] lg:min-w-[280px]"
        >
          <p
            className="text-[10px] font-medium uppercase text-[#6B6371]"
            style={{ letterSpacing: '0.06em' }}
          >
            Linked client
          </p>
          <p className="mt-2 text-[16px] font-semibold leading-tight text-[#1A1320]">{client}</p>
          <p className="mt-1 text-[12.5px] text-[#6B6371]">
            {shift ? `${formatTime(shift.start_time)} – ${formatTime(shift.end_time)} shift window` : 'No linked shift window'}
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <InfoTile label="Reported by" value={reporter} sub="Submitted from staff workflow" />
            <InfoTile label="Client" value={client} sub="Linked care recipient" />
            <InfoTile
              label="Reported at"
              value={new Date(incident.reported_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
              sub={new Date(incident.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              accent
            />
          </div>

          <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Incident narrative</p>
                <h2 className="mt-2 text-lg font-semibold text-[#0f172a]">Case summary</h2>
              </div>
              <span className={severityBadge(incident.severity)}>{severityLabel(incident.severity)}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#64748b]">
              {incident.description ?? 'No additional narrative was provided in this incident report.'}
            </p>
          </section>

          {/* Real-time chat with the reporter */}
          {user && (
            <IncidentChat
              incidentId={incident.id}
              adminId={user.id}
              reporterName={reporter}
            />
          )}

          <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <h2 className="text-lg font-semibold text-[#0f172a]">Response checklist</h2>
            <div className="mt-4 space-y-3">
              {responseChecklist(incident.status, incident.severity, Boolean(shift)).map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-[18px] bg-[#fafbfc] px-4 py-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${item.done ? item.doneClass : 'bg-[#ebe7df] text-[#8f8b84]'}`}>
                    <span className="material-symbols-outlined text-[16px]">{item.done ? 'check' : 'schedule'}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#0f172a]">{item.label}</p>
                    <p className="text-[11px] text-[#94a3b8]">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Update workflow</h3>
            </div>
            <div className="px-4 py-4">
              <IncidentStatusUpdate incidentId={incident.id} currentStatus={incident.status} />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Case snapshot</h3>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-[#56524c]">
              <SnapshotRow label="Severity" value={severityLabel(incident.severity)} />
              <SnapshotRow label="Workflow" value={statusLabel(incident.status)} />
              <SnapshotRow label="Shift linked" value={shift ? 'Yes' : 'No'} />
              <SnapshotRow label="Escalation" value={incident.severity === 'emergency' || incident.severity === 'high' ? 'Immediate review' : 'Standard review'} />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Recommended next step</h3>
            </div>
            <div className="px-4 py-4 text-[12px] leading-6 text-[#64748b]">
              {incident.status === 'resolved'
                ? 'This report is marked resolved. Review whether a follow-up note or policy update is still needed.'
                : incident.status === 'investigating'
                  ? 'Capture findings, verify whether client documentation needs an amendment, and then close the case when ready.'
                  : 'Acknowledge the incident, confirm any immediate client safety actions, and move it into review.'}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function InfoTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#54206F]' : 'text-[#94a3b8]'}`}>{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#54206F]' : 'text-[#94a3b8]'}`}>{sub}</p>
    </div>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-[#fafbfc] px-3 py-3">
      <span>{label}</span>
      <strong className="font-semibold text-[#0f172a]">{value}</strong>
    </div>
  )
}

function relationRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function severityBadge(severity: IncidentDetail['severity']) {
  const base = 'rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase'
  // letterSpacing applied via inline style elsewhere; using arbitrary tracking class
  if (severity === 'emergency' || severity === 'high') return `${base} bg-[#FCE7E7] text-[#DC2626] tracking-[0.04em]`
  if (severity === 'medium') return `${base} bg-[#FEF3D6] text-[#5C3A06] tracking-[0.04em]`
  return `${base} bg-[#F1EEF4] text-[#3F3548] tracking-[0.04em]`
}

function statusBadge(status: IncidentDetail['status']) {
  const base = 'rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.04em]'
  if (status === 'investigating') return `${base} bg-[#FEF3D6] text-[#5C3A06]`
  if (status === 'resolved') return `${base} bg-[#F1F9E1] text-[#5E8D1F]`
  return `${base} bg-[#FCE7E7] text-[#DC2626]`
}

function severityLabel(severity: IncidentDetail['severity']) {
  if (severity === 'emergency') return 'Emergency'
  if (severity === 'high') return 'High severity'
  if (severity === 'medium') return 'Medium severity'
  return 'Low severity'
}

function statusLabel(status: IncidentDetail['status']) {
  if (status === 'investigating') return 'Under review'
  if (status === 'resolved') return 'Resolved'
  return 'Open'
}

function formatReportedAt(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) +
    ' at ' +
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function responseChecklist(
  status: IncidentDetail['status'],
  severity: IncidentDetail['severity'],
  linkedShift: boolean,
) {
  return [
    {
      label: 'Incident acknowledged',
      meta: status === 'open' ? 'Still waiting for admin acknowledgement.' : 'The incident has moved out of the initial open state.',
      done: status !== 'open',
      doneClass: 'bg-[#fef9c3] text-[#92400e]',
    },
    {
      label: 'Investigation underway',
      meta: status === 'resolved' ? 'Investigation has been completed.' : 'Collect facts, witness notes, and client impact details.',
      done: status === 'investigating' || status === 'resolved',
      doneClass: 'bg-[#dbeafe] text-[#1d4ed8]',
    },
    {
      label: 'Severity reviewed',
      meta: severity === 'emergency' || severity === 'high' ? 'Requires immediate follow-up and supervisor review.' : 'Standard incident pathway applies.',
      done: true,
      doneClass: 'bg-[#fee2e2] text-[#991b1b]',
    },
    {
      label: 'Linked shift confirmed',
      meta: linkedShift ? 'A related shift window is attached to this record.' : 'No shift window was attached to this case.',
      done: linkedShift,
      doneClass: 'bg-[#F4ECF8] text-[#54206F]',
    },
  ]
}
