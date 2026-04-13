'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge, Badge } from '@/components/ui/Badge'

type Tab = 'overview' | 'documents' | 'shifts'

export default function ClientDetailClient({
  client,
  documents,
  shifts,
}: {
  client: any
  documents: any[]
  shifts: any[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm(`Delete ${client.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', client.id)
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

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      owner_id: client.id,
      owner_type: 'client',
      doc_type: docType,
      file_url: publicUrl,
      file_name: file.name,
      expiry_date: expiryDate || null,
    })

    setUploading(false)
    setDocType('')
    setExpiryDate('')
    setFile(null)
    router.refresh()
  }

  const summary = useMemo(() => {
    return {
      documents: documents.length,
      shifts: shifts.length,
      assignedStaff: new Set(shifts.map((shift: any) => shift.staff_id).filter(Boolean)).size,
      geoReady: Boolean(client.lat && client.lng),
    }
  }, [client.lat, client.lng, documents.length, shifts])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Documents" value={summary.documents} sub="Client-facing records" />
        <MetricCard label="Assigned staff" value={summary.assignedStaff} sub="Across recent shifts" />
        <MetricCard label="Recent shifts" value={summary.shifts} sub="Latest support visits" />
        <MetricCard label="Geofence" value={summary.geoReady ? 1 : 0} sub={summary.geoReady ? 'Configured' : 'Missing coordinates'} accent={!summary.geoReady} />
      </section>

      <div className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        {(['overview', 'documents', 'shifts'] as Tab[]).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={tab === item ? 'rounded-full bg-[#1a1a18] px-4 py-2 text-white' : 'rounded-full px-4 py-2 text-[#6d6b64]'}
          >
            {item === 'overview' ? 'Profile' : item === 'documents' ? 'Documents' : 'Shift history'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <h3 className="text-sm font-semibold text-[#1a1a18]">Client profile</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={client.full_name ?? 'Unnamed client'} />
              <Field label="NDIS number" value={client.ndis_number ?? 'Not recorded'} />
              <Field label="Date of birth" value={client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString('en-AU') : 'Not recorded'} />
              <Field label="Age" value={client.age ? String(client.age) : 'Not recorded'} />
              <Field label="Phone" value={client.phone ?? 'Not recorded'} />
              <Field label="Email" value={client.email ?? 'Not recorded'} />
              <Field label="Emergency contact" value={client.emergency_contact ?? 'Not recorded'} />
              <Field label="Geofence" value={summary.geoReady ? `${client.lat}, ${client.lng}` : 'Coordinates not configured'} />
            </div>

            {client.address ? (
              <div className="mt-4 rounded-[18px] bg-[#faf9f6] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Address</p>
                <p className="mt-2 text-sm font-medium text-[#1a1a18]">{client.address}</p>
              </div>
            ) : null}

            {client.notes ? (
              <div className="mt-4 rounded-[18px] bg-[#faf9f6] p-4">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Notes</p>
                <p className="mt-2 text-sm leading-6 text-[#4f4c45]">{client.notes}</p>
              </div>
            ) : null}
          </section>

          <aside className="space-y-4">
            <RailCard title="Record health">
              <div className="space-y-2 text-[12px] leading-6 text-[#66635b]">
                <p>{summary.documents} document records are stored against this client.</p>
                <p>{summary.shifts} recent rostered visits are available for review.</p>
                <p>{summary.geoReady ? 'Clock-in geofence can be enforced for this address.' : 'Add latitude and longitude to enable geofenced attendance.'}</p>
              </div>
            </RailCard>

            <div className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
              <div className="border-b border-[#f0ece5] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#1a1a18]">Danger zone</h3>
              </div>
              <div className="px-4 py-4">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-semibold text-[#991b1b] disabled:opacity-60"
                >
                  {deleting ? 'Deleting...' : 'Delete client record'}
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {tab === 'documents' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Upload client document</h3>
              <p className="mt-1 text-xs text-[#8a877f]">Store agreements, support plans, and care records against this client profile</p>

              <form onSubmit={handleUpload} className="mt-5 grid gap-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Document type</label>
                  <input
                    value={docType}
                    onChange={event => setDocType(event.target.value)}
                    required
                    placeholder="Client agreement, care plan, roster confirmation..."
                    className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Expiry date</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={event => setExpiryDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">File</label>
                  <input
                    type="file"
                    required
                    onChange={event => setFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-2xl border border-dashed border-[#d6d2c9] bg-[#faf9f6] px-4 py-3 text-sm text-[#66635b] outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="rounded-2xl bg-[#1a1a18] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {uploading ? 'Uploading...' : 'Upload document'}
                  </button>
                </div>
              </form>
            </div>

            {documents.length > 0 ? (
              <div className="space-y-3">
                {documents.map(doc => (
                  <article key={doc.id} className="rounded-[22px] border border-[#e8e4dc] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ede7] text-[#6f6b63]">
                          <span className="material-symbols-outlined text-[18px]">description</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#1a1a18]">{doc.doc_type}</h4>
                          <p className="text-[11px] text-[#8a877f]">{doc.file_name ?? 'Document file'}</p>
                        </div>
                      </div>
                      <div className="md:ml-auto flex items-center gap-3">
                        <ExpiryBadge expiryDate={doc.expiry_date} />
                        {doc.file_url ? (
                          <a href={doc.file_url} target="_blank" rel="noreferrer" className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[11px] font-medium text-[#4f4c45]">
                            Open file
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState icon="folder_open" title="No client documents uploaded" copy="Use this page to store plans, agreements, and compliance records." />
            )}
          </section>

          <RailCard title="Document guidance">
            <div className="space-y-2 text-[12px] leading-6 text-[#66635b]">
              <p>Client documents stored here feed directly into the compliance and audit workflow.</p>
              <p>Use expiry dates for agreements and plan windows so renewal reminders can be triggered later.</p>
            </div>
          </RailCard>
        </div>
      ) : null}

      {tab === 'shifts' ? (
        shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map((shift: any) => (
              <article key={shift.id} className="rounded-[22px] border border-[#e8e4dc] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-center">
                  <div>
                    <h4 className="text-sm font-semibold text-[#1a1a18]">{shift.profiles?.full_name ?? 'Staff record'}</h4>
                    <p className="text-[12px] text-[#7d7a73]">
                      {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' / '}
                      {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      {' - '}
                      {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="md:ml-auto">
                    <Badge variant={shift.status} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState icon="calendar_today" title="No shifts recorded" copy="Recent visits for this client will appear here." />
        )
      ) : null}
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
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.2rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#faf9f6] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#1a1a18]">{value}</p>
    </div>
  )
}

function RailCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0ece5] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1a1a18]">{title}</h3>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  )
}

function EmptyState({
  icon,
  title,
  copy,
}: {
  icon: string
  title: string
  copy: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#d8d3ca] bg-white px-6 py-16 text-center">
      <span className="material-symbols-outlined text-[44px] text-[#bbb6ad]">{icon}</span>
      <p className="mt-3 text-sm font-medium text-[#1a1a18]">{title}</p>
      <p className="mt-1 text-xs text-[#8a877f]">{copy}</p>
    </div>
  )
}
