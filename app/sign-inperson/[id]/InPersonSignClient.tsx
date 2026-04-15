'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'

export default function InPersonSignClient({
  agreementId,
  agreementTitle,
  participantName,
  status,
  expiresOn,
}: {
  agreementId: string
  agreementTitle: string
  participantName: string
  status: string
  expiresOn: string | null
}) {
  const [signerName, setSignerName] = useState(participantName)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)
  const router = useRouter()

  if (status === 'signed') {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
          <p className="text-sm text-[#67635c]">This agreement has already been signed.</p>
          <button
            type="button"
            onClick={() => router.push('/admin/agreements')}
            className="mt-6 rounded-2xl bg-[#1a1a18] px-6 py-3 text-sm font-semibold text-white"
          >
            Back to agreements
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a18]">
            <span className="material-symbols-outlined material-symbols-filled text-[30px] text-[#c852ff]">verified</span>
          </div>
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Signed successfully</h2>
          <p className="mt-3 text-sm leading-6 text-[#67635c]">
            The agreement has been signed and the PDF has been generated.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            {pdfUrl ? (
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-2xl bg-[#c852ff] px-4 py-3 text-sm font-semibold text-[#1a1a18] text-center"
              >
                Download PDF
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => router.push('/admin/agreements')}
              className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white"
            >
              Back to agreements
            </button>
          </div>
        </div>
      </div>
    )
  }

  async function handleSubmit() {
    if (!signerName.trim()) {
      setError('Please confirm the signer name.')
      return
    }
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Please draw the signature above.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const signatureDataUrl = signatureRef.current.toDataURL('image/png')
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agreementId, signerName, signatureDataUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setPdfUrl(data.pdfUrl ?? null)
      setDone(true)
    } catch {
      setError('Network error. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[22px] text-[#c852ff]">favorite</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a877f]">Vivid Care · In-Person Signing</p>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Service Agreement</h1>
        </div>
      </div>

      <div className="mb-6 rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Agreement for</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1a1a18]">{participantName}</h2>
        <p className="mt-1 text-sm text-[#67635c]">{agreementTitle}</p>
        {expiresOn ? (
          <p className="mt-1 text-xs text-[#8a877f]">
            Expires: {new Date(expiresOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <div className="mb-4 rounded-[20px] bg-[#f4f2ed] p-4 text-sm text-[#67635c]">
          Please hand this device to the participant or their representative to sign below.
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Full name of signee *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
          />
        </div>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Signature *
          </label>
          <div className="mt-2 overflow-hidden rounded-[20px] border border-[#dfd9cf] bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#1a1a18"
              canvasProps={{ className: 'h-[220px] w-full' }}
            />
          </div>
          <button
            type="button"
            onClick={() => signatureRef.current?.clear()}
            className="mt-2 text-xs text-[#8a877f] underline"
          >
            Clear signature
          </button>
        </div>

        {error ? (
          <div className="mb-4 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Signing and generating PDF...' : 'Submit Signature'}
        </button>
      </div>
    </div>
  )
}
