'use client'

import { useState } from 'react'
import Link from 'next/link'
import AgreementContent from '@/components/agreements/AgreementContent'
import type { ProviderDetails } from '@/components/agreements/AgreementPDF'

type Agreement = {
  id: string
  title: string
  status: string
  expires_on: string | null
  signed_at: string | null
  signature_data_url: string | null
  pdf_url: string | null
  signing_token: string | null
  signer_name: string | null
  advocate_name: string | null
  supports_description: string | null
  funding_type: string | null
  payment_method: string | null
  created_at: string
}

export default function ClientAgreementsClient({
  agreements,
  participantName,
  provider,
}: {
  agreements: Agreement[]
  participantName: string
  provider: Partial<ProviderDetails>
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (agreements.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">Your documents</p>
          <h1 className="mt-1 font-headline text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">Agreements</h1>
        </div>
        <div className="rounded-[28px] border border-dashed border-[#e6e8ec] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">description</span>
          <p className="mt-3 text-sm font-semibold text-[#0f172a]">No agreements yet</p>
          <p className="mt-1 text-xs text-[#64748b]">Your service agreements will appear here once Vivid Care prepares them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">Your documents</p>
        <h1 className="mt-1 font-headline text-2xl font-semibold tracking-[-0.04em] text-[#0f172a]">Agreements</h1>
        <p className="mt-1 text-sm text-[#64748b]">{agreements.length} agreement{agreements.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="space-y-3">
        {agreements.map(agreement => {
          const isExpanded = expandedId === agreement.id

          return (
            <div
              key={agreement.id}
              className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_26px_rgba(23,23,22,0.04)]"
            >
              {/* Header row â€” always visible */}
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : agreement.id)}
                className="flex w-full items-start gap-4 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#6B2C91]"
                aria-expanded={isExpanded}
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  agreement.status === 'signed' ? 'bg-[#F4ECF8] text-[#54206F]' :
                  agreement.status === 'pending_signature' ? 'bg-[#6B2C91] text-[#0f172a]' :
                  'bg-[#f7f8f9] text-[#5c5850]'
                }`}>
                  <span className="material-symbols-outlined text-[20px]">
                    {agreement.status === 'signed' ? 'verified' : 'description'}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#0f172a]">{agreement.title}</p>
                    <StatusBadge status={agreement.status} />
                  </div>
                  <p className="mt-1 text-xs text-[#64748b]">
                    {agreement.status === 'signed' && agreement.signed_at
                      ? `Signed ${formatDate(agreement.signed_at)}`
                      : agreement.status === 'pending_signature'
                        ? 'Awaiting your signature'
                        : `Created ${formatDate(agreement.created_at)}`}
                    {agreement.expires_on ? ` Â· Expires ${formatDate(agreement.expires_on)}` : ''}
                  </p>
                </div>

                <span
                  className={`material-symbols-outlined shrink-0 text-[20px] text-[#64748b] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  expand_more
                </span>
              </button>

              {/* Action bar â€” shown when pending signature */}
              {agreement.status === 'pending_signature' && agreement.signing_token && !isExpanded && (
                <div className="border-t border-[#f0f1f3] px-4 pb-4 pt-3">
                  <Link
                    href={`/sign/${agreement.signing_token}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6B2C91] px-4 py-3 text-sm font-semibold text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
                  >
                    <span className="material-symbols-outlined text-[18px]">draw</span>
                    Sign this agreement
                  </Link>
                </div>
              )}

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-[#f0f1f3]">
                  {/* Action bar inside expanded view */}
                  <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                    {agreement.status === 'pending_signature' && agreement.signing_token && (
                      <Link
                        href={`/sign/${agreement.signing_token}`}
                        className="inline-flex items-center gap-2 rounded-2xl bg-[#6B2C91] px-4 py-2.5 text-sm font-semibold text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f172a]"
                      >
                        <span className="material-symbols-outlined text-[16px]">draw</span>
                        Sign this agreement
                      </Link>
                    )}
                    {agreement.pdf_url && (
                      <a
                        href={agreement.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 text-sm font-semibold text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
                      >
                        <span className="material-symbols-outlined text-[16px]">download</span>
                        Download PDF
                      </a>
                    )}
                  </div>

                  {/* Agreement content */}
                  <div className="px-4 pb-6">
                    <AgreementContent
                      participantName={participantName}
                      advocateName={agreement.advocate_name}
                      supportDescription={agreement.supports_description ?? 'Support services as agreed between the participant and Vivid Care.'}
                      fundingType={(agreement.funding_type as 'self' | 'nominee' | 'ndia' | 'plan_manager') ?? 'ndia'}
                      paymentMethod={(agreement.payment_method as 'eft' | 'cheque' | 'cash') ?? 'eft'}
                      commencementDate={formatDate(agreement.created_at)}
                      expiryDate={agreement.expires_on ? formatDate(agreement.expires_on) : null}
                      signerName={agreement.signer_name ?? ''}
                      signatureDataUrl={agreement.signature_data_url}
                      signedAt={agreement.signed_at ? formatDate(agreement.signed_at) : '___________________'}
                      provider={provider}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    signed: 'bg-[#F4ECF8] text-[#54206F]',
    pending_signature: 'bg-[#fef9c3] text-[#92400e]',
    draft: 'bg-[#f7f8f9] text-[#5c5850]',
    expired: 'bg-[#fee2e2] text-[#991b1b]',
  }
  const labels: Record<string, string> = {
    signed: 'Signed',
    pending_signature: 'Needs signature',
    draft: 'Draft',
    expired: 'Expired',
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${styles[status] ?? styles.draft}`}>
      {labels[status] ?? status}
    </span>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}
