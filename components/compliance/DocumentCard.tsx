'use client'

import { useState } from 'react'
import { ExpiryBadge } from '@/components/ui/Badge'

interface DocumentCardProps {
  doc: {
    id: string
    doc_type: string
    file_name?: string | null
    file_url?: string | null
    expiry_date: string | null
  }
  showOwnerType?: boolean
  ownerType?: string
}

export default function DocumentCard({ doc, showOwnerType, ownerType }: DocumentCardProps) {
  const [opening, setOpening] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  async function handleOpen() {
    if (!doc.file_url) return
    setOpening(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/documents/sign-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `HTTP ${res.status}`)
      }

      const { signedUrl } = await res.json()
      if (signedUrl) {
        window.open(signedUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (err: any) {
      console.error('[DocumentCard] failed to open document:', err)
      setErrorMsg('Could not open file. Please try again.')
    } finally {
      setOpening(false)
    }
  }

  return (
    <article className="rounded-[22px] border border-[#e8e4dc] bg-white p-4 shadow-[0_12px_28px_rgba(26,26,24,0.04)]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ede7] text-[#6f6b63]">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">description</span>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#1a1a18]">{doc.doc_type}</h4>
            <p className="text-[11px] text-[#8a877f]">
              {doc.file_name ?? 'Document file'}
              {showOwnerType && ownerType ? ` · ${ownerType}` : ''}
            </p>
            {errorMsg ? (
              <p className="mt-0.5 text-[11px] text-red-600">{errorMsg}</p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3 md:ml-auto">
          <ExpiryBadge expiryDate={doc.expiry_date} />
          {doc.file_url ? (
            <button
              onClick={handleOpen}
              disabled={opening}
              aria-label={opening ? 'Opening document…' : 'Open document file'}
              className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[11px] font-medium text-[#4f4c45] transition hover:bg-[#ece6dc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] disabled:opacity-60"
            >
              {opening ? 'Opening…' : 'Open file'}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
