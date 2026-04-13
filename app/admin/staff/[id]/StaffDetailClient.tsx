'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge, Badge } from '@/components/ui/Badge'
import { getExpiryStatus } from '@/lib/utils/expiry'

const DOC_TYPES = [
  'Passport',
  'Police Clearance',
  'Visa Document',
  'CPR Certificate',
  'Manual Handling Certificate',
  'Elder Care Licence',
  'Child Care Licence',
  'Education Certificate',
  'Working With Children Check',
  'Other',
]

type Tab = 'overview' | 'documents' | 'shifts'

export default function StaffDetailClient({
  member,
  documents,
  shifts,
}: {
  member: any
  documents: any[]
  shifts: any[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

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

    const {
      data: { publicUrl },
    } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      owner_id: member.id,
      owner_type: 'staff',
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

  const completedShifts = shifts.filter((shift: any) => shift.status === 'completed')
  const totalHours = completedShifts.reduce((sum: number, shift: any) => {
    const hours = (
      new Date(shift.clock_out_time || shift.end_time).getTime() -
      new Date(shift.clock_in_time || shift.start_time).getTime()
    ) / 3600000
    return sum + hours
  }, 0)

  const docSummary = useMemo(() => {
    const statuses = documents.map(doc => getExpiryStatus(doc.expiry_date))
    return {
      total: documents.length,
      expired: statuses.filter(status => status === 'expired').length,
      attention: statuses.filter(status => status === 'near_expiry').length,
      valid: statuses.filter(status => status === 'active').length,
    }
  }, [documents])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Documents" value={docSummary.total} sub={`${docSummary.valid} current`} />
        <MetricCard label="Needs review" value={docSummary.expired + docSummary.attention} sub="Expired or approaching expiry" accent={docSummary.expired + docSummary.attention > 0} />
        <MetricCard label="Completed shifts" value={completedShifts.length} sub={`${shifts.length} total assigned`} />
        <MetricCard label="Hours logged" value={Number(totalHours.toFixed(1))} sub="Across completed work" />
      </section>

      <div className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        {(['overview', 'documents', 'shifts'] as Tab[]).map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={tab === item ? 'rounded-full bg-[#1a1a18] px-4 py-2 text-white' : 'rounded-full px-4 py-2 text-[#6d6b64]'}
          >
            {item === 'overview' ? 'Profile' : item === 'documents' ? 'Compliance docs' : 'Shift history'}
          </button>
        ))}
      </div>

      {tab === 'overview' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <h3 className="text-sm font-semibold text-[#1a1a18]">Staff profile</h3>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={member.full_name ?? 'Unnamed staff'} />
              <Field label="Phone" value={member.phone ?? 'No phone recorded'} />
              <Field label="Email" value={member.email ?? 'Email not stored in profile'} />
              <Field label="Role" value="Support worker" />
            </div>
          </section>

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
                <p>Use the shift history tab to review recent clients and attendance outcomes.</p>
              </div>
            </RailCard>
          </aside>
        </div>
      ) : null}

      {tab === 'documents' ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-[#1a1a18]">Upload compliance document</h3>
                  <p className="text-xs text-[#8a877f]">Add identification, screening, and certification records to the staff profile</p>
                </div>
              </div>

              <form onSubmit={handleUpload} className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Document type</label>
                  <select
                    value={docType}
                    onChange={event => setDocType(event.target.value)}
                    required
                    className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
                  >
                    <option value="">Select document</option>
                    {DOC_TYPES.map(type => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
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

                <div className="md:col-span-2">
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">File</label>
                  <input
                    type="file"
                    required
                    onChange={event => setFile(event.target.files?.[0] ?? null)}
                    className="mt-2 w-full rounded-2xl border border-dashed border-[#d6d2c9] bg-[#faf9f6] px-4 py-3 text-sm text-[#66635b] outline-none"
                  />
                </div>

                <div className="md:col-span-2 flex justify-end">
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
              <EmptyState icon="folder_open" title="No documents uploaded yet" copy="Upload worker screening, identification, and compliance records here." />
            )}
          </section>

          <RailCard title="Document guidance">
            <div className="space-y-2 text-[12px] leading-6 text-[#66635b]">
              <p>Use expiry dates for screening and certification documents so the compliance hub can monitor renewals.</p>
              <p>Uploads from this page immediately appear in the staff compliance and roster readiness views.</p>
            </div>
          </RailCard>
        </div>
      ) : null}

      {tab === 'shifts' ? (
        shifts.length > 0 ? (
          <div className="space-y-3">
            {shifts.map((shift: any) => {
              const hours =
                shift.clock_out_time && shift.clock_in_time
                  ? ((new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000).toFixed(1)
                  : null

              return (
                <article key={shift.id} className="rounded-[22px] border border-[#e8e4dc] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <div>
                      <h4 className="text-sm font-semibold text-[#1a1a18]">{shift.clients?.full_name ?? 'Client record'}</h4>
                      <p className="text-[12px] text-[#7d7a73]">
                        {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {' / '}
                        {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        {hours ? ` / ${hours}h` : ''}
                      </p>
                    </div>
                    <div className="md:ml-auto flex items-center gap-3">
                      <Badge variant={shift.status} />
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState icon="calendar_today" title="No shifts recorded" copy="Recent client visits for this worker will appear here." />
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
