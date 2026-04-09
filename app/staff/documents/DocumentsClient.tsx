'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

const MY_DOC_TYPES = [
  'Passport', 'Police Clearance', 'Visa Document', 'CPR Certificate',
  'Manual Handling Certificate', 'Elder Care Licence', 'Child Care Licence',
  'Education Certificate', 'Working With Children Check',
]

type Tab = 'personal' | 'client'

export default function DocumentsClient({ myDocs, clientDocs, clients, staffId }: {
  myDocs: any[]; clientDocs: any[]; clients: any[]; staffId: string
}) {
  const [tab, setTab] = useState<Tab>('personal')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function uploadPersonal(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `staff/${staffId}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); alert(upErr.message); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({
      owner_id: staffId, owner_type: 'staff', doc_type: docType,
      file_url: publicUrl, file_name: file.name,
      expiry_date: expiryDate || null, uploaded_by: staffId,
    })
    setUploading(false); setUploadOpen(false)
    setDocType(''); setExpiryDate(''); setFile(null)
    router.refresh()
  }

  async function uploadClientDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType || !selectedClient) return
    setUploading(true)

    const path = `client/${selectedClient}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) { setUploading(false); alert(upErr.message); return }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({
      owner_id: selectedClient, owner_type: 'client', doc_type: docType,
      file_url: publicUrl, file_name: file.name,
      expiry_date: expiryDate || null, uploaded_by: staffId,
    })
    setUploading(false); setUploadOpen(false)
    setDocType(''); setExpiryDate(''); setFile(null); setSelectedClient('')
    router.refresh()
  }

  return (
    <>
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1 mb-5">
        {(['personal', 'client'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-headline capitalize transition-all ${tab === t ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-sky-800'}`}>
            {t === 'personal' ? 'My Documents' : 'Client Documents'}
          </button>
        ))}
      </div>

      <div className="flex justify-end mb-4">
        <button onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl primary-gradient text-white font-bold text-sm">
          <span className="material-symbols-outlined text-base">upload</span>
          Upload
        </button>
      </div>

      {tab === 'personal' && (
        <DocList docs={myDocs} emptyText="No personal documents uploaded yet" />
      )}

      {tab === 'client' && (
        <DocList docs={clientDocs} emptyText="No client documents uploaded yet" />
      )}

      {/* Upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={tab === 'personal' ? 'Upload Personal Document' : 'Upload Client Document'}>
        <form onSubmit={tab === 'personal' ? uploadPersonal : uploadClientDoc} className="space-y-4">
          {tab === 'client' && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Client *</label>
              <select required value={selectedClient} onChange={e => setSelectedClient(e.target.value)}
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none">
                <option value="">Select client…</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Document Type *</label>
            {tab === 'personal' ? (
              <select required value={docType} onChange={e => setDocType(e.target.value)}
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none">
                <option value="">Select type…</option>
                {MY_DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <input required value={docType} onChange={e => setDocType(e.target.value)} placeholder="e.g. Client Agreement"
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
            )}
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Expiry Date</label>
            <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)}
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">File *</label>
            <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-on-surface-variant" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm">Cancel</button>
            <button type="submit" disabled={uploading} className="flex-1 py-3 rounded-xl primary-gradient text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {uploading ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Uploading…</> : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function DocList({ docs, emptyText }: { docs: any[]; emptyText: string }) {
  if (docs.length === 0) return (
    <div className="text-center py-12 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
      <span className="material-symbols-outlined text-4xl mb-2 block">folder_open</span>
      <p className="text-sm font-semibold">{emptyText}</p>
    </div>
  )
  return (
    <div className="space-y-3">
      {docs.map(doc => (
        <div key={doc.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-fixed rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-xl">description</span>
            </div>
            <div>
              <p className="font-semibold text-sm text-on-surface">{doc.doc_type}</p>
              <p className="text-xs text-on-surface-variant">{doc.file_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
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
  )
}
