'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge, Badge } from '@/components/ui/Badge'
import { getExpiryStatus } from '@/lib/utils/expiry'
import MetricCard from '@/components/ui/MetricCard'
import Field from '@/components/ui/Field'
import { RailCard } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Tabs from '@/components/ui/Tabs'
import ComplianceSummary from '@/components/compliance/ComplianceSummary'
import ReadinessBadge from '@/components/compliance/ReadinessBadge'
import DocumentCard from '@/components/compliance/DocumentCard'
import StatusBadge from '@/components/ui/StatusBadge'

const DOC_TYPES = [
  'Passport', 'Police Clearance', 'Visa Document', 'CPR Certificate',
  'Manual Handling Certificate', 'Elder Care Licence', 'Child Care Licence',
  'Education Certificate', 'Working With Children Check', 'Other',
]

type Tab = 'overview' | 'documents' | 'roster' | 'availability' | 'activity'

const TAB_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'documents', label: 'Documents' },
  { key: 'roster', label: 'Roster' },
  { key: 'availability', label: 'Availability' },
  { key: 'activity', label: 'Activity' },
]

export default function StaffDetailClient({
  member,
  documents,
  shifts,
}: {
  member: any
  documents: any[]
  shifts: any[]
}) {
  const searchParams = useSearchParams()
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const urlTab = searchParams.get('tab') as Tab | null
    if (urlTab && TAB_ITEMS.some(t => t.key === urlTab)) {
      setTab(urlTab)
    }
  }, [searchParams])

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `staff/${member.id}/${docType}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      alert(uploadError.message)
      return
    }

    // Store the storage path (not a public URL) — signed URLs are generated
    // on demand so the private bucket restriction is respected.
    await supabase.from('documents').insert({
      owner_id: member.id,
      owner_type: 'staff',
      doc_type: docType,
      file_url: path,
      file_name: file.name,
      expiry_date: expiryDate || null,
    })

    setUploading(false)
    setDocType('')
    setExpiryDate('')
    setFile(null)
    router.refresh()
  }

  const completedShifts = shifts.filter((s: any) => s.status === 'completed')
  const totalHours = completedShifts.reduce((sum: number, s: any) => {
    const hours = (new Date(s.clock_out_time || s.end_time).getTime() - new Date(s.clock_in_time || s.start_time).getTime()) / 3600000
    return sum + hours
  }, 0)

  const docSummary = useMemo(() => {
    const statuses = documents.map(doc => getExpiryStatus(doc.expiry_date))
    return {
      total: documents.length,
      expired: statuses.filter(s => s === 'expired').length,
      attention: statuses.filter(s => s === 'near_expiry').length,
      valid: statuses.filter(s => s === 'active').length,
    }
  }, [documents])

  return (
    <div className="space-y-6">
      {/* Metrics row */}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Documents" value={docSummary.total} sub={`${docSummary.valid} current`} />
        <MetricCard label="Needs review" value={docSummary.expired + docSummary.attention} sub="Expired or approaching expiry" accent={docSummary.expired + docSummary.attention > 0} />
        <MetricCard label="Completed shifts" value={completedShifts.length} sub={`${shifts.length} total assigned`} />
        <MetricCard label="Hours logged" value={Number(totalHours.toFixed(1))} sub="Across completed work" />
      </section>

      {/* Readiness badge */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#8a877f]">Roster readiness:</span>
        <ReadinessBadge documents={documents} />
      </div>

      {/* Tabs */}
      <Tabs items={TAB_ITEMS} active={tab} onChange={k => setTab(k as Tab)} ariaLabel="Staff profile sections" />

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Staff profile</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full name" value={member.full_name ?? 'Unnamed staff'} />
                <Field label="Phone" value={member.phone ?? 'No phone recorded'} />
                <Field label="Email" value={member.email ?? 'Email not stored in profile'} />
                <Field label="Role" value="Support worker" />
              </div>
            </section>

            {/* Compliance summary */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Compliance overview</h3>
              <ComplianceSummary documents={documents} />
            </section>

            {/* Upcoming shifts */}
            {shifts.filter((s: any) => s.status === 'scheduled').length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[#1a1a18]">Upcoming shifts</h3>
                <div className="space-y-2">
                  {shifts.filter((s: any) => s.status === 'scheduled').slice(0, 3).map((shift: any) => (
                    <Link
                      key={shift.id}
                      href={`/admin/shifts/${shift.id}`}
                      className="flex items-center justify-between rounded-[18px] border border-[#e8e4dc] bg-white px-4 py-3 hover:bg-[#faf9f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#1a1a18]">{shift.clients?.full_name ?? 'Client'}</p>
                        <p className="text-[11px] text-[#8a877f]">
                          {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <StatusBadge status="scheduled" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <RailCard title="Compliance snapshot">
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.slice(0, 4).map(doc => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-[#faf9f6] px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#1a1a18]">{doc.doc_type}</p>
                        <p className="truncate text-[11px] text-[#8a877f]">{doc.file_name ?? 'Document file'}</p>
                      </div>
                      <ExpiryBadge expiryDate={doc.expiry_date} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] leading-6 text-[#66635b]">No compliance documents have been uploaded for this staff member yet.</p>
              )}
            </RailCard>

            <RailCard title="Recent work">
              <div className="space-y-2 text-[12px] text-[#66635b]">
                <p>{completedShifts.length} completed shifts are available for auditing.</p>
                <p>{Number(totalHours.toFixed(1))} total hours have been logged across finished work.</p>
              </div>
            </RailCard>
          </aside>
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Upload compliance document</h3>
              <p className="mt-1 text-xs text-[#8a877f]">Add identification, screening, and certification records</p>
              <form onSubmit={handleUpload} className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="doc-type" className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Document type</label>
                  <select id="doc-type" value={docType} onChange={e => setDocType(e.target.value)} required className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]">
                    <option value="">Select document</option>
                    {DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="expiry" className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Expiry date</label>
                  <input id="expiry" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="file-upload" className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">File</label>
                  <input id="file-upload" type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-2 w-full rounded-2xl border border-dashed border-[#d6d2c9] bg-[#faf9f6] px-4 py-3 text-sm text-[#66635b] outline-none" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={uploading} className="rounded-2xl bg-[#1a1a18] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] focus-visible:ring-offset-2">
                    {uploading ? 'Uploading...' : 'Upload document'}
                  </button>
                </div>
              </form>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map(doc => <DocumentCard key={doc.id} doc={doc} />)}
              </div>
            ) : (
              <EmptyState icon="folder_open" title="No documents uploaded yet" description="Upload worker screening, identification, and compliance records here." />
            )}
          </section>

          <RailCard title="Document guidance">
            <div className="space-y-2 text-[12px] leading-6 text-[#66635b]">
              <p>Use expiry dates for screening and certification documents so the compliance hub can monitor renewals.</p>
              <p>Uploads from this page immediately appear in the staff compliance and roster readiness views.</p>
            </div>
          </RailCard>
        </div>
      )}

      {/* Roster tab */}
      {tab === 'roster' && (
        shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map((shift: any) => {
              const hours = shift.clock_out_time && shift.clock_in_time
                ? ((new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000).toFixed(1)
                : null
              return (
                <Link
                  key={shift.id}
                  href={`/admin/shifts/${shift.id}`}
                  className="block rounded-[22px] border border-[#e8e4dc] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)] hover:bg-[#faf9f6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-[#1a1a18]">{shift.clients?.full_name ?? 'Client record'}</h4>
                      <p className="text-[12px] text-[#7d7a73]">
                        {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' / '}
                        {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        {' - '}
                        {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                        {hours ? ` / ${hours}h` : ''}
                      </p>
                    </div>
                    <div className="md:ml-auto">
                      <Badge variant={shift.status} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <EmptyState icon="calendar_today" title="No shifts recorded" description="Recent client visits for this worker will appear here." />
        )
      )}

      {/* Availability tab (placeholder) */}
      {tab === 'availability' && (
        <div className="space-y-4">
          <EmptyState
            icon="event_available"
            title="Availability management"
            description="Staff availability and unavailable dates will be configurable here once the availability table is implemented."
          />
          {/* TODO: Implement availability management when backend supports an availability table */}
          <p className="rounded-[18px] bg-[#fef9c3] px-4 py-3 text-xs text-[#92400e]">
            <span className="material-symbols-outlined mr-1 text-[14px] align-middle" aria-hidden="true">info</span>
            Availability management requires a backend table. This feature is planned for a future release.
          </p>
        </div>
      )}

      {/* Activity tab */}
      {tab === 'activity' && (
        <div className="space-y-4">
          {shifts.length > 0 ? (
            <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Recent activity</h3>
              <div className="mt-4 space-y-3">
                {shifts.slice(0, 10).map((shift: any) => (
                  <div key={shift.id} className="flex items-center gap-3 rounded-[18px] bg-[#faf9f6] px-4 py-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${shift.status === 'completed' ? 'bg-[#dcfce7] text-[#166534]' : shift.status === 'cancelled' ? 'bg-[#f3f4f6] text-[#6b7280]' : 'bg-[#dbeafe] text-[#1d4ed8]'}`}>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        {shift.status === 'completed' ? 'check' : shift.status === 'cancelled' ? 'close' : 'schedule'}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1a1a18]">
                        {shift.status === 'completed' ? 'Completed shift' : shift.status === 'cancelled' ? 'Cancelled shift' : 'Scheduled shift'} — {shift.clients?.full_name ?? 'Client'}
                      </p>
                      <p className="text-[11px] text-[#8a877f]">
                        {new Date(shift.start_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState icon="history" title="No activity yet" description="Staff activity timeline will populate as shifts are completed." />
          )}
        </div>
      )}
    </div>
  )
}
