'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'

const MY_DOC_TYPES = [
  'Passport',
  'Police Clearance',
  'Visa Document',
  'CPR Certificate',
  'Manual Handling Certificate',
  'Elder Care Licence',
  'Child Care Licence',
  'Education Certificate',
  'Working With Children Check',
]

type Tab = 'personal' | 'client'

export default function DocumentsClient({ myDocs, clientDocs, clients, staffId }: {
  myDocs: any[]
  clientDocs: any[]
  clients: any[]
  staffId: string
}) {
  const [tab, setTab] = useState<Tab>('personal')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [selectedClient, setSelectedClient] = useState('')
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  async function uploadPersonal(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `staff/${staffId}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) {
      setUploading(false)
      alert(upErr.message)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({
      owner_id: staffId,
      owner_type: 'staff',
      doc_type: docType,
      file_url: publicUrl,
      file_name: file.name,
      expiry_date: expiryDate || null,
      uploaded_by: staffId,
    })

    resetForm()
    router.refresh()
  }

  async function uploadClientDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType || !selectedClient) return
    setUploading(true)

    const path = `client/${selectedClient}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) {
      setUploading(false)
      alert(upErr.message)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
    await supabase.from('documents').insert({
      owner_id: selectedClient,
      owner_type: 'client',
      doc_type: docType,
      file_url: publicUrl,
      file_name: file.name,
      expiry_date: expiryDate || null,
      uploaded_by: staffId,
    })

    resetForm()
    router.refresh()
  }

  function resetForm() {
    setUploading(false)
    setUploadOpen(false)
    setDocType('')
    setExpiryDate('')
    setFile(null)
    setSelectedClient('')
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="My docs" value={myDocs.length} sub="Personal compliance" />
        <SummaryCard label="Client docs" value={clientDocs.length} sub="Shared records" />
        <SummaryCard label="Attention" value={countExpiring(myDocs) + countExpiring(clientDocs)} sub="Expiring within 45 days" accent />
      </div>

      <div className="flex gap-1 rounded-[22px] border border-[#e6e0d7] bg-white p-1.5 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        {(['personal', 'client'] as Tab[]).map(value => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-[18px] py-3 text-sm font-semibold transition ${
              tab === value ? 'bg-[#171717] text-white' : 'text-[#676359] hover:text-[#171716]'
            }`}
          >
            {value === 'personal' ? 'My Documents' : 'Client Documents'}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-2.5 text-sm font-semibold text-[#171716] shadow-[0_12px_24px_rgba(205,255,82,0.16)]"
        >
          <span className="material-symbols-outlined text-base">upload</span>
          Upload
        </button>
      </div>

      {tab === 'personal' ? (
        <DocList docs={myDocs} emptyText="No personal documents uploaded yet" />
      ) : (
        <DocList docs={clientDocs} emptyText="No client documents uploaded yet" />
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title={tab === 'personal' ? 'Upload Personal Document' : 'Upload Client Document'}>
        <form onSubmit={tab === 'personal' ? uploadPersonal : uploadClientDoc} className="space-y-4">
          {tab === 'client' ? (
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Client *</label>
              <select
                required
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm focus:outline-none"
              >
                <option value="">Select client...</option>
                {clients.map((client: any) => <option key={client.id} value={client.id}>{client.full_name}</option>)}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Document Type *</label>
            {tab === 'personal' ? (
              <select
                required
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm focus:outline-none"
              >
                <option value="">Select type...</option>
                {MY_DOC_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
            ) : (
              <input
                required
                value={docType}
                onChange={e => setDocType(e.target.value)}
                placeholder="e.g. Client Agreement"
                className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">File *</label>
            <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-on-surface-variant" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 rounded-xl bg-surface-container py-3 text-sm font-semibold text-on-surface">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#171717] py-3 text-sm font-bold text-white disabled:opacity-60">
              {uploading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                  Uploading...
                </>
              ) : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function DocList({ docs, emptyText }: { docs: any[]; emptyText: string }) {
  if (docs.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-12 text-center text-[#8b867b]">
        <span className="material-symbols-outlined mb-2 block text-[40px] text-[#b5afa5]">folder_open</span>
        <p className="text-sm font-semibold text-[#171716]">{emptyText}</p>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {docs.map(doc => (
        <article key={doc.id} className="flex items-center justify-between gap-3 rounded-[24px] border border-[#e9e3d8] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-[#cdff52]">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#171716]">{doc.doc_type}</p>
              <p className="text-xs text-[#8b867b]">{doc.file_name}</p>
              {doc.expiry_date ? (
                <p className="mt-1 text-[11px] text-[#8b867b]">Expires {new Date(doc.expiry_date).toLocaleDateString('en-AU')}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#8b867b]">No expiry date recorded</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExpiryBadge expiryDate={doc.expiry_date} />
            {doc.file_url ? (
              <a href={doc.file_url} target="_blank" rel="noopener" className="rounded-xl bg-[#f4f1ea] p-2 text-[#171716] transition hover:bg-[#ece6dc]">
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function SummaryCard({
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
    <section className={`rounded-[24px] px-4 py-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)] ${accent ? 'bg-[#cdff52]' : 'border border-[#e6e0d7] bg-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#627100]' : 'text-[#8b867b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em] text-[#171716]">{value}</p>
      <p className={`mt-2 text-[11px] ${accent ? 'text-[#4b5900]' : 'text-[#8b867b]'}`}>{sub}</p>
    </section>
  )
}

function countExpiring(docs: any[]) {
  const now = new Date()
  const soon = new Date()
  soon.setDate(now.getDate() + 45)

  return docs.filter(doc => {
    if (!doc.expiry_date) return false
    const expiry = new Date(doc.expiry_date)
    return expiry >= now && expiry <= soon
  }).length
}
