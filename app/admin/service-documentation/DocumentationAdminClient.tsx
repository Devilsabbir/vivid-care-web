'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ShiftRow = {
  id: string
  title: string | null
  start_time: string
  end_time: string
  status: string
  support_type_key: string | null
  documentation_status: string
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
  clients: { full_name: string | null } | { full_name: string | null }[] | null
}

type DocRow = {
  id: string
  shift_id: string
  support_type_key: string
  form_key: string
  title: string
  payload: Record<string, unknown>
  status: 'draft' | 'submitted' | 'approved' | 'amended'
  submitted_by: string | null
  approved_by: string | null
  submitted_at: string
  approved_at: string | null
}

type SupportTypeRow = {
  key: string
  title: string
  item_number: string | null
}

type RequirementRow = {
  id: string
  support_type_key: string
  form_key: string
  label: string
}

export default function DocumentationAdminClient({
  schemaReady,
  adminId,
  shifts,
  docs,
  supportTypes,
  requirements,
}: {
  schemaReady: boolean
  adminId: string
  shifts: ShiftRow[]
  docs: DocRow[]
  supportTypes: SupportTypeRow[]
  requirements: RequirementRow[]
}) {
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const shiftMap = useMemo(() => {
    const map = new Map<string, ShiftRow>()
    shifts.forEach(shift => map.set(shift.id, shift))
    return map
  }, [shifts])

  const summary = {
    pending: shifts.filter(shift => shift.documentation_status === 'pending').length,
    inProgress: shifts.filter(shift => shift.documentation_status === 'in_progress').length,
    documented: shifts.filter(shift => shift.documentation_status === 'documented').length,
    approved: docs.filter(doc => doc.status === 'approved').length,
  }

  async function approveDoc(doc: DocRow) {
    setSaving(doc.id)
    setMessage(null)

    const { error } = await supabase
      .from('shift_documentation')
      .update({
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', doc.id)

    if (!error) {
      await supabase.from('audit_events').insert({
        entity_type: 'shift_documentation',
        entity_key: doc.id,
        action: 'approved',
        actor_id: adminId,
        metadata: { shift_id: doc.shift_id, form_key: doc.form_key },
      })
    }

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Documentation approved.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {!schemaReady ? (
        <section className="rounded-[24px] border border-[#f3d7d7] bg-[#fff5f5] p-5 text-sm text-[#9b3434]">
          The service documentation schema is not available yet. Apply the latest Supabase migrations, then refresh this page.
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[24px] border border-[#e4c1f5] bg-[#f9f0ff] p-4 text-sm text-[#4a006f]">
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Pending shifts" value={summary.pending} sub="No forms submitted yet" />
        <MetricCard label="In progress" value={summary.inProgress} sub="Partial documentation" accent />
        <MetricCard label="Documented" value={summary.documented} sub="Requirements submitted" />
        <MetricCard label="Approved forms" value={summary.approved} sub="Admin-reviewed records" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Support types</p>
          <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Documentation requirements</h3>
          <div className="mt-5 space-y-3">
            {supportTypes.map(type => (
              <article key={type.key} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a18]">{type.title}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8a877f]">{type.key}</p>
                  </div>
                  <span className="rounded-full bg-[#1a1a18] px-2.5 py-1 text-[10px] font-semibold text-white">
                    {requirements.filter(requirement => requirement.support_type_key === type.key).length} forms
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {requirements.filter(requirement => requirement.support_type_key === type.key).map(requirement => (
                    <span key={requirement.id} className="rounded-full bg-white px-3 py-1.5 text-[11px] text-[#4f4c45]">
                      {requirement.label}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </aside>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Shift status</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Recent shifts awaiting documentation</h3>

            <div className="mt-5 space-y-3">
              {shifts.slice(0, 12).map(shift => (
                <article key={shift.id} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a18]">
                        {relationName(shift.clients)} / {relationName(shift.profiles)}
                      </p>
                      <p className="mt-1 text-[12px] text-[#67635c]">
                        {formatDateTime(shift.start_time)} - {formatTime(shift.end_time)}
                      </p>
                      <p className="mt-1 text-[12px] text-[#8a877f]">
                        Support type: {labelSupportType(shift.support_type_key)}
                      </p>
                    </div>
                    <span className={documentationStatusClass(shift.documentation_status)}>{copyDocumentationStatus(shift.documentation_status)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Submitted forms</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Recent staff submissions</h3>

            <div className="mt-5 space-y-4">
              {docs.map(doc => {
                const relatedShift = shiftMap.get(doc.shift_id)
                return (
                  <article key={doc.id} className="rounded-[22px] border border-[#ede8df] bg-[#faf9f6] p-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#1a1a18]">{doc.title}</p>
                          <span className={docStatusClass(doc.status)}>{doc.status}</span>
                        </div>
                        <p className="mt-2 text-[12px] text-[#67635c]">
                          {relatedShift ? `${relationName(relatedShift.clients)} / ${relationName(relatedShift.profiles)}` : 'Shift record'}
                        </p>
                        <p className="mt-1 text-[12px] text-[#8a877f]">
                          Submitted {formatDateTime(doc.submitted_at)} / {labelSupportType(doc.support_type_key)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setExpandedDocId(current => current === doc.id ? null : doc.id)}
                          className="rounded-2xl border border-[#dcd7cf] px-4 py-2 text-sm font-semibold text-[#1a1a18]"
                        >
                          {expandedDocId === doc.id ? 'Hide payload' : 'View payload'}
                        </button>
                        {doc.status !== 'approved' ? (
                          <button
                            type="button"
                            onClick={() => approveDoc(doc)}
                            disabled={saving === doc.id}
                            className="rounded-2xl bg-[#1a1a18] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                          >
                            {saving === doc.id ? 'Approving...' : 'Approve'}
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {expandedDocId === doc.id ? (
                      <pre className="mt-4 overflow-auto rounded-[18px] bg-[#1a1a18] p-4 text-xs leading-6 text-[#c852ff]">
                        {JSON.stringify(doc.payload, null, 2)}
                      </pre>
                    ) : null}
                  </article>
                )
              })}
              {docs.length === 0 ? <p className="text-sm text-[#8a877f]">No documentation has been submitted yet.</p> : null}
            </div>
          </section>
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#c852ff]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function relationName(value: ShiftRow['profiles'] | ShiftRow['clients']) {
  if (Array.isArray(value)) return value[0]?.full_name ?? 'Unknown'
  return value?.full_name ?? 'Unknown'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function labelSupportType(value: string | null) {
  return value ? value.replace(/_/g, ' ') : 'general support'
}

function documentationStatusClass(status: string) {
  if (status === 'documented') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]'
  if (status === 'in_progress') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  if (status === 'overdue') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
  if (status === 'not_required') return 'rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]'
  return 'rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold text-[#1d4ed8]'
}

function copyDocumentationStatus(status: string) {
  if (status === 'documented') return 'Documented'
  if (status === 'in_progress') return 'In progress'
  if (status === 'overdue') return 'Overdue'
  if (status === 'not_required') return 'Not required'
  return 'Pending'
}

function docStatusClass(status: DocRow['status']) {
  if (status === 'approved') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]'
  if (status === 'submitted') return 'rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold text-[#1d4ed8]'
  if (status === 'amended') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  return 'rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]'
}
