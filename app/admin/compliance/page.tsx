import { createClient } from '@/lib/supabase/server'
import { getExpiryStatus, expiryLabel, daysUntilExpiry } from '@/lib/utils/expiry'
import { ExpiryBadge } from '@/components/ui/Badge'
import Link from 'next/link'

export default async function CompliancePage() {
  const supabase = await createClient()

  const { data: docs } = await supabase
    .from('documents')
    .select('*')
    .not('expiry_date', 'is', null)
    .order('expiry_date', { ascending: true })

  const expired = docs?.filter(d => getExpiryStatus(d.expiry_date) === 'expired') ?? []
  const nearExpiry = docs?.filter(d => getExpiryStatus(d.expiry_date) === 'near_expiry') ?? []
  const active = docs?.filter(d => getExpiryStatus(d.expiry_date) === 'active') ?? []

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Compliance</h2>
        <p className="text-on-surface-variant text-sm mt-1">45-day expiry monitoring for all documents</p>
      </header>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-error-container rounded-2xl p-5">
          <p className="text-3xl font-black font-headline text-error">{expired.length}</p>
          <p className="text-sm text-on-error-container font-label mt-1">Expired</p>
        </div>
        <div className="bg-tertiary-fixed/40 rounded-2xl p-5">
          <p className="text-3xl font-black font-headline text-tertiary">{nearExpiry.length}</p>
          <p className="text-sm text-tertiary font-label mt-1">Expiring within 45 days</p>
        </div>
        <div className="bg-secondary-container/40 rounded-2xl p-5">
          <p className="text-3xl font-black font-headline text-secondary">{active.length}</p>
          <p className="text-sm text-secondary font-label mt-1">Compliant</p>
        </div>
      </div>

      {/* Urgent list */}
      {[...expired, ...nearExpiry].length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm mb-6">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-xl">assignment_late</span>
            <h3 className="font-bold font-headline text-on-surface">Needs Attention</h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {[...expired, ...nearExpiry].map(doc => (
              <DocRow key={doc.id} doc={doc} />
            ))}
          </div>
        </div>
      )}

      {/* All compliant */}
      {active.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
          <div className="px-6 py-4 border-b border-outline-variant/10 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">verified</span>
            <h3 className="font-bold font-headline text-on-surface">Compliant Documents</h3>
          </div>
          <div className="divide-y divide-outline-variant/10">
            {active.map(doc => <DocRow key={doc.id} doc={doc} />)}
          </div>
        </div>
      )}

      {(!docs || docs.length === 0) && (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">description</span>
          <p className="text-sm font-semibold">No documents with expiry dates</p>
          <p className="text-xs mt-1">Upload documents from staff or client profiles</p>
        </div>
      )}
    </div>
  )
}

function DocRow({ doc }: { doc: any }) {
  const status = getExpiryStatus(doc.expiry_date)
  const borderColor = status === 'expired' ? 'border-l-error' : status === 'near_expiry' ? 'border-l-tertiary' : 'border-l-secondary'

  return (
    <div className={`px-6 py-4 flex items-center justify-between border-l-4 ${borderColor}`}>
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-on-surface-variant">description</span>
        <div>
          <p className="font-semibold text-sm text-on-surface">{doc.doc_type}</p>
          <p className="text-xs text-on-surface-variant capitalize">{doc.owner_type} document</p>
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
  )
}
