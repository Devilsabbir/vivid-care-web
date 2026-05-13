'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import MetricCard from '@/components/ui/MetricCard'
import Field from '@/components/ui/Field'
import { RailCard } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Tabs from '@/components/ui/Tabs'
import DocumentCard from '@/components/compliance/DocumentCard'
import StatusBadge from '@/components/ui/StatusBadge'

type Tab = 'overview' | 'shifts' | 'documents' | 'incidents' | 'agreements' | 'notes'

const BASE_TAB_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'documents', label: 'Documents' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'notes', label: 'Notes' },
]

const NDIS_TAB_ITEMS = [
  { key: 'overview', label: 'Overview' },
  { key: 'shifts', label: 'Shifts' },
  { key: 'documents', label: 'Documents' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'agreements', label: 'Agreements' },
  { key: 'notes', label: 'Notes' },
]

export default function ClientDetailClient({
  client,
  documents,
  shifts,
  incidents = [],
  agreements = [],
}: {
  client: any
  documents: any[]
  shifts: any[]
  incidents?: any[]
  agreements?: any[]
}) {
  const searchParams = useSearchParams()
  const isNdis = client.client_type !== 'standard'
  const TAB_ITEMS = isNdis ? NDIS_TAB_ITEMS : BASE_TAB_ITEMS
  const initialTab = (searchParams.get('tab') as Tab) || 'overview'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [deleting, setDeleting] = useState(false)
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

  async function handleDelete() {
    if (!confirm(`Delete ${client.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    const { error: deleteError } = await supabase.from('clients').delete().eq('id', client.id)
    if (deleteError) {
      console.error('[ClientDetailClient] client delete failed:', deleteError)
      setDeleting(false)
      alert('Delete failed: ' + deleteError.message)
      return
    }
    router.push('/admin/clients')
  }

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `client/${client.id}/${docType}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (uploadError) {
      setUploading(false)
      alert(uploadError.message)
      return
    }

    // Store the storage path (not a public URL) — signed URLs are generated
    // on demand so the private bucket restriction is respected.
    const { error: insertError } = await supabase.from('documents').insert({
      owner_id: client.id,
      owner_type: 'client',
      doc_type: docType,
      file_url: path,
      file_name: file.name,
      expiry_date: expiryDate || null,
    })
    if (insertError) {
      console.error('[ClientDetailClient] document insert failed:', insertError)
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

  const summary = useMemo(() => ({
    documents: documents.length,
    shifts: shifts.length,
    assignedStaff: new Set(shifts.map((s: any) => s.staff_id).filter(Boolean)).size,
    addressMapped: Boolean(client.lat && client.lng),
    incidents: incidents.length,
    agreements: agreements.length,
  }), [client.lat, client.lng, documents.length, shifts, incidents.length, agreements.length])

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Documents" value={summary.documents} sub="Client-facing records" />
        <MetricCard label="Assigned staff" value={summary.assignedStaff} sub="Across recent shifts" />
        <MetricCard label="Recent shifts" value={summary.shifts} sub="Latest support visits" />
        <MetricCard label="Address" value={summary.addressMapped ? 'Mapped' : 'Review'} sub={summary.addressMapped ? 'Pin shown on live map' : 'Missing coordinates'} accent={!summary.addressMapped} />
      </section>

      {/* Tabs */}
      <Tabs items={TAB_ITEMS} active={tab} onChange={k => setTab(k as Tab)} ariaLabel="Client profile sections" />

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Client profile</h3>
              <div className="mt-4 flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                  isNdis
                    ? 'bg-[#E6F5FC] text-[#1380AB]'
                    : 'bg-[#f7f8f9] text-[#64748b]'
                }`}>
                  {isNdis ? 'NDIS Client' : 'Client'}
                </span>
                {isNdis && (
                  <span className="text-[11px] text-[#64748b]">Service agreements and signatures required</span>
                )}
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Field label="Full name" value={client.full_name ?? 'Unnamed client'} />
                {isNdis && <Field label="NDIS number" value={client.ndis_number ?? 'Not recorded'} />}
                <Field label="Date of birth" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString('en-AU') : 'Not recorded'} />
                <Field label="Age" value={client.age ? String(client.age) : 'Not recorded'} />
                <Field label="Phone" value={client.phone ?? 'Not recorded'} />
                <Field label="Email" value={client.email ?? 'Not recorded'} />
                <Field label="Emergency contact" value={client.emergency_contact ?? 'Not recorded'} />
                <Field label="Map coordinates" value={summary.addressMapped ? `${client.lat}, ${client.lng}` : 'Coordinates not configured'} />
              </div>
              {client.address && (
                <div className="mt-4 rounded-[18px] bg-[#fafbfc] p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Address</p>
                  <p className="mt-2 text-sm font-medium text-[#0f172a]">{client.address}</p>
                </div>
              )}
              {client.notes && (
                <div className="mt-4 rounded-[18px] bg-[#fafbfc] p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Notes</p>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">{client.notes}</p>
                </div>
              )}
            </section>

            {/* Upcoming shifts */}
            {shifts.filter((s: any) => s.status === 'scheduled').length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Upcoming shifts</h3>
                <div className="space-y-2">
                  {shifts.filter((s: any) => s.status === 'scheduled').slice(0, 3).map((shift: any) => (
                    <Link key={shift.id} href={`/admin/shifts/${shift.id}`} className="flex items-center justify-between rounded-[18px] border border-[#e6e8ec] bg-white px-4 py-3 hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                      <div>
                        <p className="text-sm font-medium text-[#0f172a]">{shift.profiles?.full_name ?? 'Staff'}</p>
                        <p className="text-[11px] text-[#94a3b8]">{new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                      <StatusBadge status="scheduled" />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recent incidents */}
            {incidents.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Recent incidents</h3>
                <div className="space-y-2">
                  {incidents.slice(0, 3).map((inc: any) => (
                    <Link key={inc.id} href={`/admin/incidents/${inc.id}`} className="flex items-center justify-between rounded-[18px] border border-[#e6e8ec] bg-white px-4 py-3 hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                      <span className="text-sm font-medium text-[#0f172a]">{inc.title}</span>
                      <StatusBadge status={inc.severity} />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4">
            <RailCard title="Record health">
              <div className="space-y-2 text-[12px] leading-6 text-[#64748b]">
                <p>{summary.documents} document records stored.</p>
                <p>{summary.shifts} recent rostered visits.</p>
                <p>{summary.addressMapped ? 'Address pin shown on live map.' : 'Add lat/lng so this client appears on the live map.'}</p>
              </div>
            </RailCard>

            <div className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
              <div className="border-b border-[#f0ece5] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Danger zone</h3>
              </div>
              <div className="px-4 py-4">
                <button type="button" onClick={handleDelete} disabled={deleting} className="w-full rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#991b1b] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                  {deleting ? 'Deleting...' : 'Delete client record'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Shifts tab */}
      {tab === 'shifts' && (
        shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map((shift: any) => (
              <Link key={shift.id} href={`/admin/shifts/${shift.id}`} className="block rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)] hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0f172a]">{shift.profiles?.full_name ?? 'Staff record'}</h4>
                    <p className="text-[12px] text-[#7d7a73]">
                      {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' / '}
                      {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                      {' - '}
                      {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                    </p>
                  </div>
                  <div className="md:ml-auto"><Badge variant={shift.status} /></div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon="calendar_today" title="No shifts recorded" description="Recent visits for this client will appear here." />
        )
      )}

      {/* Documents tab */}
      {tab === 'documents' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Upload client document</h3>
              <p className="mt-1 text-xs text-[#94a3b8]">Store agreements, support plans, and care records</p>
              <form onSubmit={handleUpload} className="mt-5 grid gap-4">
                <div>
                  <label htmlFor="client-doc-type" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Document type</label>
                  <input id="client-doc-type" value={docType} onChange={e => setDocType(e.target.value)} required placeholder="Client agreement, care plan..." className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]" />
                </div>
                <div>
                  <label htmlFor="client-expiry" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Expiry date</label>
                  <input id="client-expiry" type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]" />
                </div>
                <div>
                  <label htmlFor="client-file" className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">File</label>
                  <input id="client-file" type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="mt-2 w-full rounded-2xl border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#64748b] outline-none" />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={uploading} className="rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2">
                    {uploading ? 'Uploading...' : 'Upload document'}
                  </button>
                </div>
              </form>
            </div>
            {documents.length > 0 ? (
              <div className="space-y-3">{documents.map(doc => <DocumentCard key={doc.id} doc={doc} />)}</div>
            ) : (
              <EmptyState icon="folder_open" title="No client documents uploaded" description="Use this page to store plans, agreements, and compliance records." />
            )}
          </section>
          <RailCard title="Document guidance">
            <div className="space-y-2 text-[12px] leading-6 text-[#64748b]">
              <p>Client documents feed into compliance and audit workflows.</p>
              <p>Use expiry dates so renewal reminders can be triggered.</p>
            </div>
          </RailCard>
        </div>
      )}

      {/* Incidents tab */}
      {tab === 'incidents' && (
        incidents.length > 0 ? (
          <div className="space-y-3">
            {incidents.map((inc: any) => (
              <Link key={inc.id} href={`/admin/incidents/${inc.id}`} className="block rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)] hover:bg-[#fafbfc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-[#0f172a]">{inc.title}</h4>
                    <p className="text-[11px] text-[#94a3b8]">
                      {new Date(inc.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex gap-2 md:ml-auto">
                    <StatusBadge status={inc.severity} />
                    <StatusBadge status={inc.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState icon="shield" title="No incidents recorded" description="Incidents linked to this client will appear here." />
        )
      )}

      {/* Agreements tab — NDIS clients only */}
      {tab === 'agreements' && (
        isNdis ? (
          agreements.length > 0 ? (
            <div className="space-y-3">
              {agreements.map((agr: any) => (
                <article key={agr.id} className="rounded-[22px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-[#0f172a]">{agr.title ?? 'Agreement'}</h4>
                      <p className="text-[11px] text-[#94a3b8]">
                        {agr.created_at ? new Date(agr.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="md:ml-auto">
                      <StatusBadge status={agr.status ?? 'draft'} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState icon="draw" title="No agreements" description="Service agreements for this NDIS client will appear here. Generate one from the Agreements hub." />
          )
        ) : (
          <div className="rounded-[24px] border border-[#e6e8ec] bg-white px-6 py-14 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">draw</span>
            <p className="mt-3 text-sm font-semibold text-[#0f172a]">Not applicable</p>
            <p className="mt-1 text-xs text-[#64748b]">This is a standard (non-NDIS) client. Service agreements and signature collection are only required for NDIS participants.</p>
          </div>
        )
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="space-y-4">
          {client.notes ? (
            <div className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#0f172a]">Client notes</h3>
              <p className="mt-4 text-sm leading-7 text-[#64748b]">{client.notes}</p>
            </div>
          ) : (
            <EmptyState icon="note" title="No notes" description="Add notes to the client record to track important information." />
          )}
          {/* TODO: Implement add note functionality when backend supports a notes table */}
          <button type="button" disabled className="inline-flex items-center gap-2 rounded-2xl border border-[#e6e8ec] px-4 py-2.5 text-sm font-medium text-[#64748b] opacity-60">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">add</span>
            Add note (coming soon)
          </button>
        </div>
      )}
    </div>
  )
}
