'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ExpiryBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import ErrorToast from '@/components/ui/ErrorToast'
import { useErrorToast } from '@/lib/hooks/useErrorToast'

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
  const { errorMessage, showError, dismiss } = useErrorToast()

  async function uploadPersonal(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !docType) return
    setUploading(true)

    const path = `staff/${staffId}/${docType}/${Date.now()}_${file.name}`
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
    if (upErr) {
      console.error('[DocumentsClient] personal storage upload failed:', upErr)
      setUploading(false)
      showError('File upload failed. Please try again.')
      return
    }

    // Store the storage path (not a public URL) â€” signed URLs are generated
    // on demand so the private bucket restriction is respected.
    const { error: dbErr } = await supabase.from('documents').insert({
      owner_id: staffId,
      owner_type: 'staff',
      doc_type: docType,
      file_url: path,
      file_name: file.name,
      expiry_date: expiryDate || null,
      uploaded_by: staffId,
    })

    if (dbErr) {
      console.error('[DocumentsClient] personal document record insert failed:', dbErr)
      setUploading(false)
      showError('Document saved to storage but record creation failed. Contact support.')
      return
    }

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
      console.error('[DocumentsClient] client storage upload failed:', upErr)
      setUploading(false)
      showError('File upload failed. Please try again.')
      return
    }

    // Store the storage path (not a public URL) â€” signed URLs are generated
    // on demand so the private bucket restriction is respected.
    const { error: dbErr } = await supabase.from('documents').insert({
      owner_id: selectedClient,
      owner_type: 'client',
      doc_type: docType,
      file_url: path,
      file_name: file.name,
      expiry_date: expiryDate || null,
      uploaded_by: staffId,
    })

    if (dbErr) {
      console.error('[DocumentsClient] client document record insert failed:', dbErr)
      setUploading(false)
      showError('Document saved to storage but record creation failed. Contact support.')
      return
    }

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
      {errorMessage && <ErrorToast message={errorMessage} onDismiss={dismiss} />}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="My docs" value={myDocs.length} sub="Personal compliance" />
        <SummaryCard label="Client docs" value={clientDocs.length} sub="Shared records" />
        <SummaryCard label="Attention" value={countExpiring(myDocs) + countExpiring(clientDocs)} sub="Expiring within 45 days" accent />
      </div>

      <div className="flex gap-1 rounded-[22px] border border-[#e6e8ec] bg-white p-1.5 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        {(['personal', 'client'] as Tab[]).map(value => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-[18px] py-3 text-sm font-semibold transition ${
              tab === value ? 'bg-[#0f172a] text-white' : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {value === 'personal' ? 'My Documents' : 'Client Documents'}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 rounded-full bg-[#6B2C91] px-4 py-2.5 text-sm font-semibold text-[#0f172a] shadow-[0_12px_24px_rgba(26,26,24,0.08)]"
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
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Client *</label>
              <select
                required
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full rounded-lg bg-[#f7f8f9] border border-[#e6e8ec] px-4 py-3 text-sm focus:outline-none"
              >
                <option value="">Select client...</option>
                {clients.map((client: any) => <option key={client.id} value={client.id}>{client.full_name}</option>)}
              </select>
            </div>
          ) : null}

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Document Type *</label>
            {tab === 'personal' ? (
              <select
                required
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full rounded-lg bg-[#f7f8f9] border border-[#e6e8ec] px-4 py-3 text-sm focus:outline-none"
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
                className="w-full rounded-lg bg-[#f7f8f9] border border-[#e6e8ec] px-4 py-3 text-sm focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#64748b]">Expiry Date</label>
            <input
              type="date"
              value={expiryDate}
              onChange={e => setExpiryDate(e.target.value)}
              className="w-full rounded-lg bg-[#f7f8f9] border border-[#e6e8ec] px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#64748b]">File *</label>
            <input type="file" required onChange={e => setFile(e.target.files?.[0] ?? null)} className="w-full text-sm text-[#64748b]" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setUploadOpen(false)} className="flex-1 rounded-xl bg-[#f7f8f9] py-3 text-sm font-semibold text-[#0f172a]">
              Cancel
            </button>
            <button type="submit" disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#0f172a] py-3 text-sm font-bold text-white disabled:opacity-60">
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
      <section className="rounded-[28px] border border-dashed border-[#e6e8ec] bg-white px-6 py-12 text-center text-[#64748b]">
        <span className="material-symbols-outlined mb-2 block text-[40px] text-[#94a3b8]">folder_open</span>
        <p className="text-sm font-semibold text-[#0f172a]">{emptyText}</p>
      </section>
    )
  }

  return (
    <div className="space-y-3">
      {docs.map(doc => (
        <article key={doc.id} className="flex items-center justify-between gap-3 rounded-[24px] border border-[#e9e3d8] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f172a] text-[#6B2C91]">
              <span className="material-symbols-outlined text-[20px]">description</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">{doc.doc_type}</p>
              <p className="text-xs text-[#64748b]">{doc.file_name}</p>
              {doc.expiry_date ? (
                <p className="mt-1 text-[11px] text-[#64748b]">Expires {new Date(doc.expiry_date).toLocaleDateString('en-AU')}</p>
              ) : (
                <p className="mt-1 text-[11px] text-[#64748b]">No expiry date recorded</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ExpiryBadge expiryDate={doc.expiry_date} />
            {doc.file_url ? (
              <DocOpenButton docId={doc.id} />
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function DocOpenButton({ docId }: { docId: string }) {
  const [opening, setOpening] = useState(false)

  async function handleOpen() {
    setOpening(true)
    try {
      const res = await fetch('/api/documents/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { signedUrl } = await res.json()
      if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('[DocOpenButton] failed to open document:', err)
    } finally {
      setOpening(false)
    }
  }

  return (
    <button
      onClick={handleOpen}
      disabled={opening}
      aria-label={opening ? 'Opening documentâ€¦' : 'Open document'}
      className="rounded-xl bg-[#f7f8f9] p-2 text-[#0f172a] transition hover:bg-[#e6e8ec] disabled:opacity-60"
    >
      <span className={`material-symbols-outlined text-[20px] ${opening ? 'animate-spin' : ''}`}>
        {opening ? 'progress_activity' : 'open_in_new'}
      </span>
    </button>
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
    <section className={`rounded-[24px] px-4 py-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)] ${accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em] text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-[11px] ${accent ? 'text-[#4b5900]' : 'text-[#64748b]'}`}>{sub}</p>
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
