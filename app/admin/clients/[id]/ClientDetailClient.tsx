'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge } from '@/components/ui/Badge'

type Tab = 'overview' | 'documents' | 'shifts'

export default function ClientDetailClient({ client, documents, shifts }: {
  client: any; documents: any[]; shifts: any[]
}) {
  const [tab, setTab] = useState<Tab>('overview')
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleDelete() {
    if (!confirm(`Delete ${client.full_name}? This cannot be undone.`)) return
    setDeleting(true)
    await supabase.from('clients').delete().eq('id', client.id)
    router.push('/admin/clients')
  }

  return (
    <div className="space-y-6">
      {/* Profile card */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm flex flex-wrap gap-6 items-start">
        <div className="w-16 h-16 primary-gradient rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-headline flex-shrink-0">
          {client.full_name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'NDIS Number', value: client.ndis_number },
            { label: 'Date of Birth', value: client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString('en-AU') : null },
            { label: 'Age', value: client.age },
            { label: 'Phone', value: client.phone },
            { label: 'Email', value: client.email },
            { label: 'Emergency Contact', value: client.emergency_contact },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label">{label}</p>
              <p className="text-sm text-on-surface mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
          {client.address && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label">Address</p>
              <p className="text-sm text-on-surface mt-0.5">{client.address}</p>
            </div>
          )}
          {client.notes && (
            <div className="col-span-2 md:col-span-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label">Notes</p>
              <p className="text-sm text-on-surface mt-0.5">{client.notes}</p>
            </div>
          )}
        </div>
        <button onClick={handleDelete} disabled={deleting} className="text-error text-sm font-semibold flex items-center gap-1 hover:underline disabled:opacity-50">
          <span className="material-symbols-outlined text-base">delete</span>
          Delete
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 w-fit">
        {(['overview', 'documents', 'shifts'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold font-headline capitalize transition-all ${tab === t ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-sky-800'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <p className="text-sm text-on-surface-variant">
            {client.notes ?? 'No additional notes for this client.'}
          </p>
        </div>
      )}

      {tab === 'documents' && (
        <DocumentsTab documents={documents} ownerId={client.id} ownerType="client" />
      )}

      {tab === 'shifts' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/10">
            <h3 className="font-bold font-headline text-on-surface">Shift History</h3>
          </div>
          {shifts.length > 0 ? (
            <div className="divide-y divide-outline-variant/10">
              {shifts.map((shift: any) => (
                <div key={shift.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-on-surface">{shift.profiles?.full_name ?? 'Staff'}</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} •{' '}
                      {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} –{' '}
                      {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full font-label ${
                    shift.status === 'completed' ? 'bg-secondary-container/40 text-secondary' :
                    shift.status === 'active' ? 'bg-primary-fixed text-primary' :
                    shift.status === 'cancelled' ? 'bg-surface-container-highest text-outline' :
                    'bg-tertiary-fixed/60 text-tertiary'
                  }`}>{shift.status}</span>
                </div>
              ))}
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

function DocumentsTab({ documents, ownerId, ownerType }: { documents: any[]; ownerId: string; ownerType: string }) {
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const supabase = createClient()
  const router = useRouter()

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `${ownerType}/${ownerId}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); alert(upErr.message); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)

    await supabase.from('documents').insert({
      owner_id: ownerId, owner_type: ownerType, doc_type: docType,
      file_url: publicUrl, file_name: file.name,
      expiry_date: expiryDate || null,
    })
    setUploading(false)
    setDocType(''); setExpiryDate(''); setFile(null)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {/* Upload form */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <h3 className="font-bold font-headline text-on-surface mb-4">Upload Document</h3>
        <form onSubmit={handleUpload} className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Document Type</label>
            <input value={docType} onChange={e => setDocType(e.target.value)} required placeholder="e.g. Client Agreement"
              className="w-full bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="w-full bg-surface-container-highest rounded-lg px-4 py-2.5 text-sm focus:outline-none" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">File</label>
            <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-on-surface-variant" />
          </div>
          <button type="submit" disabled={uploading}
            className="px-5 py-2.5 rounded-xl primary-gradient text-white font-bold text-sm disabled:opacity-60 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">upload</span>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </form>
      </div>

      {/* Documents list */}
      {documents.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/10">
          {documents.map((doc: any) => (
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
  )
}
