'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge, Badge } from '@/components/ui/Badge'

const DOC_TYPES = [
  'Passport', 'Police Clearance', 'Visa Document', 'CPR Certificate',
  'Manual Handling Certificate', 'Elder Care Licence', 'Child Care Licence',
  'Education Certificate', 'Working With Children Check', 'Other'
]

type Tab = 'overview' | 'documents' | 'shifts'

export default function StaffDetailClient({ member, documents, shifts }: {
  member: any; documents: any[]; shifts: any[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `staff/${member.id}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); alert(upErr.message); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      owner_id: member.id, owner_type: 'staff', doc_type: docType,
      file_url: publicUrl, file_name: file.name,
      expiry_date: expiryDate || null,
    })
    setUploading(false)
    setDocType(''); setExpiryDate(''); setFile(null)
    router.refresh()
  }

  const completedShifts = shifts.filter(s => s.status === 'completed')
  const totalHours = completedShifts.reduce((sum, s) => {
    const h = (new Date(s.clock_out_time || s.end_time).getTime() - new Date(s.clock_in_time || s.start_time).getTime()) / 3600000
    return sum + h
  }, 0)

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex gap-6 items-start">
        <div className="w-16 h-16 bg-secondary-fixed rounded-2xl flex items-center justify-center text-secondary text-2xl font-bold font-headline flex-shrink-0">
          {member.full_name?.charAt(0)}
        </div>
        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Phone', value: member.phone },
            { label: 'Role', value: 'Staff' },
            { label: 'Total Shifts', value: shifts.length },
            { label: 'Completed Shifts', value: completedShifts.length },
            { label: 'Total Hours', value: `${totalHours.toFixed(1)}h` },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label">{label}</p>
              <p className="text-sm text-on-surface mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 w-fit">
        {(['overview', 'documents', 'shifts'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold font-headline capitalize transition-all ${tab === t ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-sky-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-on-surface-variant font-semibold mb-3">Compliance Summary</p>
          {documents.length > 0 ? (
            <div className="space-y-2">
              {documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between py-2">
                  <span className="text-sm text-on-surface">{doc.doc_type}</span>
                  <ExpiryBadge expiryDate={doc.expiry_date} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-on-surface-variant">No compliance documents uploaded yet.</p>
          )}
        </div>
      )}

      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold font-headline text-on-surface mb-4">Upload Document</h3>
            <form onSubmit={handleUpload} className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Document Type</label>
                <select value={docType} onChange={e => setDocType(e.target.value)} required
                  className="w-full bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm focus:outline-none">
                  <option value="">Select type…</option>
                  {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Expiry Date</label>
                <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
                  className="w-full bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
              </div>
              <div className="flex-1 min-w-[160px]">
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">File</label>
                <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-on-surface-variant" />
              </div>
              <button type="submit" disabled={uploading}
                className="px-5 py-2.5 rounded-xl primary-gradient text-white font-bold text-sm disabled:opacity-60 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">upload</span>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          </div>

          {documents.length > 0 ? (
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/10">
              {documents.map(doc => (
                <div key={doc.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-on-surface-variant">description</span>
                    <div>
                      <p className="font-semibold text-sm text-on-surface">{doc.doc_type}</p>
                      <p className="text-xs text-on-surface-variant">{doc.file_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <ExpiryBadge expiryDate={doc.expiry_date} />
                    {doc.file_url && (
                      <a href={doc.file_url} target="_blank" rel="noopener" className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline">
                        <span className="material-symbols-outlined text-xl">open_in_new</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">folder_open</span>
              <p className="text-sm">No documents uploaded yet</p>
            </div>
          )}
        </div>
      )}

      {tab === 'shifts' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h3 className="font-bold font-headline text-on-surface">Shift History</h3>
          </div>
          {shifts.length > 0 ? (
            <div className="divide-y divide-outline-variant/10">
              {shifts.map(s => {
                const hours = s.clock_out_time && s.clock_in_time
                  ? ((new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000).toFixed(1)
                  : null
                return (
                  <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm text-on-surface">{s.clients?.full_name ?? 'Client'}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(s.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} •{' '}
                        {new Date(s.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – {new Date(s.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                        {hours ? ` • ${hours}h` : ''}
                      </p>
                    </div>
                    <Badge variant={s.status} />
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 block">calendar_today</span>
              <p className="text-sm">No shifts recorded</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
