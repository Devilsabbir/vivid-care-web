'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'

export default function SignClient({
  token,
  agreementId,
  agreementTitle,
  participantName,
  status,
  expiresOn,
}: {
  token: string
  agreementId: string
  agreementTitle: string
  participantName: string
  status: string
  expiresOn: string | null
}) {
  const [signerName, setSignerName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const signatureRef = useRef<SignatureCanvas | null>(null)

  if (status === 'signed') {
    return <StatusScreen title="Already signed" message="This agreement has already been signed. Thank you." icon="check_circle" />
  }

  if (status === 'expired') {
    return <StatusScreen title="Link expired" message="This signing link is no longer valid. Please contact Vivid Care." icon="schedule" />
  }

  if (done) {
    return <StatusScreen title="Signed successfully" message="Thank you for signing. Your signed agreement has been saved. You may close this window." icon="verified" />
  }

  async function handleSubmit() {
    if (!signerName.trim()) {
      setError('Please enter your full name.')
      return
    }
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setError('Please draw your signature above.')
      return
    }
    setError(null)
    setSubmitting(true)

    try {
      const signatureDataUrl = signatureRef.current.toDataURL('image/png')
      const res = await fetch('/api/agreements/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, signerName, signatureDataUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setSubmitting(false)
        return
      }

      setDone(true)
    } catch {
      setError('Network error. Please check your connection and try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[22px] text-[#c852ff]">favorite</span>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a877f]">Vivid Care · NDIS Service Provider</p>
          <h1 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">Service Agreement</h1>
        </div>
      </div>

      <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Agreement for</p>
        <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#1a1a18]">{participantName}</h2>
        <p className="mt-1 text-sm text-[#67635c]">{agreementTitle}</p>
        {expiresOn ? (
          <p className="mt-1 text-xs text-[#8a877f]">
            Expires: {new Date(expiresOn).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        ) : null}
      </div>

      <div className="mt-6 rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.06)]">
        <p className="mb-4 text-sm leading-6 text-[#4f4c45]">
          By signing below, you confirm that you have read and agree to the terms of this Vivid Care NDIS Service Agreement. A signed PDF copy will be generated and stored securely.
        </p>

        <div className="mb-4">
          <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
            Full name of signee *
          </label>
          <input
            type="text"
            value={signerName}
            onChange={e => setSignerName(e.target.value)}
            placeholder="Enter your full name"
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
              canvasProps={{ className: 'h-[200px] w-full' }}
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
          {submitting ? 'Signing and generating PDF...' : 'Sign Agreement'}
        </button>
      </div>
    </div>
  )
}

function StatusScreen({ title, message, icon }: { title: string; message: string; icon: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[28px] border border-[#e8e4dc] bg-white p-10 text-center shadow-[0_20px_50px_rgba(26,26,24,0.08)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a18]">
          <span className="material-symbols-outlined material-symbols-filled text-[30px] text-[#c852ff]">{icon}</span>
        </div>
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#1a1a18]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#67635c]">{message}</p>
      </div>
    </div>
  )
}
