import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import IncidentStatusUpdate from './IncidentStatusUpdate'

type IncidentDetail = {
  id: string
  title: string
  description: string | null
  severity: 'low' | 'medium' | 'high' | 'emergency'
  status: 'open' | 'investigating' | 'resolved'
  reported_at: string
  profiles: { full_name: string | null }[] | { full_name: string | null } | null
  clients: { full_name: string | null }[] | { full_name: string | null } | null
  shifts: { start_time: string; end_time: string }[] | { start_time: string; end_time: string } | null
}

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('incidents')
    .select('id, title, description, severity, status, reported_at, profiles(full_name), clients(full_name), shifts(start_time, end_time)')
    .eq('id', params.id)
    .single()

  const incident = data as IncidentDetail | null
  if (!incident) notFound()

  const reporter = relationRow(incident.profiles)?.full_name ?? 'Staff member'
  const client = relationRow(incident.clients)?.full_name ?? 'Client record'
  const shift = relationRow(incident.shifts)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin/incidents"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55]"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to incidents
          </Link>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={severityBadge(incident.severity)}>{severityLabel(incident.severity)}</span>
              <span className={statusBadge(incident.status)}>{statusLabel(incident.status)}</span>
            </div>
            <h1 className="max-w-3xl text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.5rem]">
              <span className="font-headline">{incident.title}</span>
            </h1>
            <p className="text-sm text-[#6c6b66]">
              Logged on {formatReportedAt(incident.reported_at)} by {reporter}
            </p>
          </div>
        </div>

        <div className="rounded-[24px] bg-[#1a1a18] px-5 py-4 text-white shadow-[0_16px_40px_rgba(26,26,24,0.14)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Linked client</p>
          <p className="mt-2 text-lg font-semibold">{client}</p>
          <p className="mt-1 text-sm text-white/65">
            {shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)} shift window` : 'No linked shift window'}
          </p>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoTile label="Reported by" value={reporter} sub="Submitted from staff workflow" />
            <InfoTile label="Client" value={client} sub="Linked care recipient" />
            <InfoTile
              label="Reported at"
              value={new Date(incident.reported_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
              sub={new Date(incident.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
              accent
            />
          </div>

          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Incident narrative</p>
                <h2 className="mt-2 text-lg font-semibold text-[#1a1a18]">Case summary</h2>
              </div>
              <span className={severityBadge(incident.severity)}>{severityLabel(incident.severity)}</span>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#4f4c45]">
              {incident.description ?? 'No additional narrative was provided in this incident report.'}
            </p>
          </section>

          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <h2 className="text-lg font-semibold text-[#1a1a18]">Response checklist</h2>
            <div className="mt-4 space-y-3">
              {responseChecklist(incident.status, incident.severity, Boolean(shift)).map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-[18px] bg-[#faf9f6] px-4 py-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full ${item.done ? item.doneClass : 'bg-[#ebe7df] text-[#8f8b84]'}`}>
                    <span className="material-symbols-outlined text-[16px]">{item.done ? 'check' : 'schedule'}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#1a1a18]">{item.label}</p>
                    <p className="text-[11px] text-[#8a877f]">{item.meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Update workflow</h3>
            </div>
            <div className="px-4 py-4">
              <IncidentStatusUpdate incidentId={incident.id} currentStatus={incident.status} />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Case snapshot</h3>
            </div>
            <div className="space-y-3 px-4 py-4 text-sm text-[#56524c]">
              <SnapshotRow label="Severity" value={severityLabel(incident.severity)} />
              <SnapshotRow label="Workflow" value={statusLabel(incident.status)} />
              <SnapshotRow label="Shift linked" value={shift ? 'Yes' : 'No'} />
              <SnapshotRow label="Escalation" value={incident.severity === 'emergency' || incident.severity === 'high' ? 'Immediate review' : 'Standard review'} />
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Recommended next step</h3>
            </div>
            <div className="px-4 py-4 text-[12px] leading-6 text-[#66635b]">
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
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 text-lg font-semibold text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[16px] bg-[#faf9f6] px-3 py-3">
      <span>{label}</span>
      <strong className="font-semibold text-[#1a1a18]">{value}</strong>
    </div>
  )
}

function relationRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function severityBadge(severity: IncidentDetail['severity']) {
  if (severity === 'emergency' || severity === 'high') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#991b1b]'
  if (severity === 'medium') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92400e]'
  return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#166534]'
}

function statusBadge(status: IncidentDetail['status']) {
  if (status === 'investigating') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92400e]'
  if (status === 'resolved') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#166534]'
  return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#991b1b]'
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
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
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
      doneClass: 'bg-[#dcfce7] text-[#166534]',
    },
  ]
}
