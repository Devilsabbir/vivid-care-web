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
  const [hourlyRate, setHourlyRate] = useState<string>(String(member.hourly_rate ?? 0))
  const [savingRate, setSavingRate] = useState(false)
  const [rateMessage, setRateMessage] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const expectedConfirmName = (member.full_name ?? '').trim()
  const deleteConfirmReady =
    expectedConfirmName.length > 0 &&
    deleteConfirmText.trim().toLowerCase() === expectedConfirmName.toLowerCase()

  async function handleDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: member.id }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Surface the friendly STAFF_HAS_UPCOMING_SHIFTS message verbatim
        setDeleteError(payload.message ?? payload.error ?? 'Delete failed.')
        setDeleting(false)
        return
      }
      router.push('/admin/staff')
    } catch (err: any) {
      console.error('[StaffDetailClient] delete failed:', err)
      setDeleteError(err?.message ?? 'Delete failed. Network error.')
      setDeleting(false)
    }
  }

  async function handleSaveRate() {
    const parsed = parseFloat(hourlyRate)
    if (Number.isNaN(parsed) || parsed < 0) {
      setRateMessage('Enter a non-negative hourly rate.')
      return
    }
    setSavingRate(true)
    setRateMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({ hourly_rate: parsed })
      .eq('id', member.id)
    setSavingRate(false)
    if (error) {
      console.error('[StaffDetailClient] hourly_rate update failed:', error)
      setRateMessage('Save failed: ' + error.message)
      return
    }
    setRateMessage('Hourly rate updated.')
    router.refresh()
  }

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
    const { error: insertError } = await supabase.from('documents').insert({
      owner_id: member.id,
      owner_type: 'staff',
      doc_type: docType,
      file_url: path,
      file_name: file.name,
      expiry_date: expiryDate || null,
    })
    if (insertError) {
      console.error('[StaffDetailClient] document insert failed:', insertError)
      setUploading(false)
      alert('Document record failed: ' + insertError.message)
      return
    }

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
        <span className="text-xs text-[#94a3b8]">Roster readiness:</span>
        <ReadinessBadge documents={documents} />
      </div>

      {/* Tabs */}
      <Tabs items={TAB_ITEMS} active={tab} onChange={k => setTab(k as Tab)} ariaLabel="Staff profile sections" />

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Staff profile</h3>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full name" value={member.full_name ?? 'Unnamed staff'} />
                <Field label="Phone" value={member.phone ?? 'No phone recorded'} />
                <Field label="Email" value={member.email ?? 'Email not stored in profile'} />
                <Field label="Role" value="Support worker" />
              </div>

              {/* Hourly rate — prominent current value + editor */}
              {(() => {
                const savedRate = typeof member.hourly_rate === 'number' ? member.hourly_rate : null
                const hasRate = savedRate !== null
                const editedRateNumber = parseFloat(hourlyRate)
                const isUnsavedChange = hasRate
                  ? !Number.isNaN(editedRateNumber) && Math.abs(editedRateNumber - (savedRate ?? 0)) > 0.0001
                  : hourlyRate.trim().length > 0
                return (
                  <div className="mt-6 rounded-[18px] bg-[#fafbfc] p-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Current hourly rate</p>
                          <div className="mt-1 flex items-baseline gap-1.5">
                            {hasRate ? (
                              <>
                                <span className="font-headline text-[2.1rem] leading-none tracking-[-0.04em] text-[#0f172a]">
                                  ${(savedRate ?? 0).toFixed(2)}
                                </span>
                                <span className="text-sm text-[#64748b]">/ hr</span>
                              </>
                            ) : (
                              <span className="rounded-full bg-[#FEF3C7] px-3 py-1 text-[12px] font-semibold text-[#92400E]">
                                Not set yet
                              </span>
                            )}
                          </div>
                          {hasRate && savedRate === 0 && (
                            <p className="mt-1 text-[11px] text-[#94a3b8]">Staff member is currently unpaid.</p>
                          )}
                          {!hasRate && (
                            <p className="mt-1 text-[11px] text-[#92400E]">Set a rate so the payments page can calculate amounts owed.</p>
                          )}
                        </div>
                        {hasRate && (
                          <span className="rounded-full bg-[#F1F9E1] px-2.5 py-1 text-[11px] font-semibold text-[#5E8D1F]">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="border-t border-[#e6e8ec] pt-4">
                        <label htmlFor="hourly-rate" className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                          Change rate to
                        </label>
                        <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-[#64748b]">$</span>
                              <input
                                id="hourly-rate"
                                type="number"
                                min="0"
                                step="0.5"
                                value={hourlyRate}
                                onChange={e => setHourlyRate(e.target.value)}
                                className="w-32 rounded-xl border border-[#e6e8ec] bg-white px-3 py-2 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
                              />
                              <span className="text-sm text-[#94a3b8]">/ hr</span>
                              {isUnsavedChange && (
                                <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">Unsaved</span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-[#94a3b8]">Used by the payments page to calculate amounts owed from clocked hours.</p>
                          </div>
                          <button
                            type="button"
                            onClick={handleSaveRate}
                            disabled={savingRate || !isUnsavedChange}
                            className="rounded-2xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2"
                          >
                            {savingRate ? 'Saving…' : 'Save rate'}
                          </button>
                        </div>
                      </div>
                    </div>
                    {rateMessage && (
                      <p className={`mt-3 text-xs ${rateMessage.startsWith('Save failed') || rateMessage.startsWith('Enter') ? 'text-[#991b1b]' : 'text-[#54206F]'}`}>
                        {rateMessage}
                      </p>
                    )}
                  </div>
                )
              })()}
            </section>

            {/* Compliance summary */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Compliance overview</h3>
              <ComplianceSummary documents={documents} />
            </section>

            {/* Upcoming shifts */}
            {shifts.filter((s: any) => s.status === 'scheduled').length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Upcoming shifts</h3>
                <div className="space-y-2">
                  {shifts.filter((s: any) => s.status === 'scheduled').slice(0, 3).map((shift: any) => (
                    <Link
                      key={shift.id}
                      href={`/admin/shifts/${shift.id}`}
                      className="flex items-center justify-between rounded-[18px] border border-[#e6e8ec] bg-white px-4 py-3 hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
                    >
                      <div>
                        <p className="text-sm font-medium text-[#0f172a]">{shift.clients?.full_name ?? 'Client'}</p>
                        <p className="text-[11px] text-[#94a3b8]">
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
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-[16px] bg-[#fafbfc] px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#0f172a]">{doc.doc_type}</p>
                        <p className="truncate text-[11px] text-[#94a3b8]">{doc.file_name ?? 'Document file'}</p>
                      </div>
                      <ExpiryBadge expiryDate={doc.expiry_date} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] leading-6 text-[#64748b]">No compliance documents have been uploaded for this staff member yet.</p>
              )}
            </RailCard>

            <RailCard title="Recent work">
              <div className="space-y-2 text-[12px] text-[#64748b]">
                <p>{completedShifts.length} completed shifts are available for auditing.</p>
                <p>{Number(totalHours.toFixed(1))} total hours have been logged across finished work.</p>
              </div>
            </RailCard>

            {/* Danger zone — hard-delete staff member */}
            <div className="overflow-hidden rounded-[24px] border border-[#fecaca] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
              <div className="border-b border-[#fee2e2] bg-[#fef2f2] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#991b1b]">Danger zone</h3>
              </div>
              <div className="space-y-2 px-4 py-4">
                <p className="text-[12px] leading-5 text-[#64748b]">
                  Permanently delete this staff member, their auth login, documents,
                  notifications, and live location. Historical shifts are kept but
                  un-attributed.
                </p>
                <button
                  type="button"
                  onClick={() => setDeleteOpen(true)}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#991b1b] hover:bg-[#fecaca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Delete staff member
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Upload compliance document</h3>
              <p className="mt-1 text-xs text-[#94a3b8]">Add identification, screening, and certification records</p>
              <form onSubmit={handleUpload} className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="doc-type" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Document type</label>
                  <select id="doc-type" value={docType} onChange={e => setDocType(e.target.value)} required className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                    <option value="">Select document</option>
                    {DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="expiry" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Expiry date</label>
                  <input id="expiry" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="file-upload" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">File</label>
                  <input id="file-upload" type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-2 w-full rounded-2xl border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#64748b] outline-none" />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button type="submit" disabled={uploading} className="rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2">
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
            <div className="space-y-2 text-[12px] leading-6 text-[#64748b]">
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
                  className="block rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)] hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-[#0f172a]">{shift.clients?.full_name ?? 'Client record'}</h4>
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
            <div className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Recent activity</h3>
              <div className="mt-4 space-y-3">
                {shifts.slice(0, 10).map((shift: any) => (
                  <div key={shift.id} className="flex items-center gap-3 rounded-[18px] bg-[#fafbfc] px-4 py-3">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full ${shift.status === 'completed' ? 'bg-[#dcfce7] text-[#166534]' : shift.status === 'cancelled' ? 'bg-[#f3f4f6] text-[#6b7280]' : 'bg-[#dbeafe] text-[#1d4ed8]'}`}>
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                        {shift.status === 'completed' ? 'check' : shift.status === 'cancelled' ? 'close' : 'schedule'}
                      </span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0f172a]">
                        {shift.status === 'completed' ? 'Completed shift' : shift.status === 'cancelled' ? 'Cancelled shift' : 'Scheduled shift'} — {shift.clients?.full_name ?? 'Client'}
                      </p>
                      <p className="text-[11px] text-[#94a3b8]">
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

      {/* Delete confirmation modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={() => !deleting && setDeleteOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-[81] w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.2)]">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fee2e2]">
                <span className="material-symbols-outlined text-[20px] text-[#991b1b]">delete_forever</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-[#0f172a]">Delete staff member?</h3>
                <p className="mt-1 text-[13px] leading-5 text-[#64748b]">
                  This permanently removes <strong>{expectedConfirmName}</strong>, their login,
                  documents, notifications and live location. Historical shifts will stay in your
                  records as &quot;Unassigned&quot;. <strong>This cannot be undone.</strong>
                </p>
              </div>
            </div>

            <label className="mt-5 block">
              <span className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">
                Type the full name to confirm
              </span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder={expectedConfirmName}
                autoFocus
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
              />
            </label>

            {deleteError && (
              <p className="mt-3 rounded-2xl bg-[#fee2e2] px-3 py-2 text-[12px] text-[#991b1b]">
                {deleteError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setDeleteOpen(false); setDeleteConfirmText(''); setDeleteError(null) }}
                disabled={deleting}
                className="rounded-2xl border border-[#e6e8ec] bg-white px-4 py-2.5 text-sm font-medium text-[#475569] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!deleteConfirmReady || deleting}
                className="rounded-2xl bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
