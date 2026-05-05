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
          </div>
        </div>
        <div className="flex items-center gap-3 md:ml-auto">
          <ExpiryBadge expiryDate={doc.expiry_date} />
          {doc.file_url ? (
            <a
              href={doc.file_url}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[11px] font-medium text-[#4f4c45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff]"
            >
              Open file
            </a>
          ) : null}
        </div>
      </div>
    </article>
  )
}
