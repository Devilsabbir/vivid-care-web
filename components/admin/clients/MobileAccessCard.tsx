'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LinkedUser {
  id: string
  email: string | null
  full_name: string | null
}

type Mode = 'closed' | 'invite' | 'reset' | 'remove' | 'show-credentials'

interface ShowCredentialsState {
  email: string
  password: string
  /** UI hint: was this from a fresh invite or a password reset? */
  source: 'invite' | 'reset'
}

export default function MobileAccessCard({
  clientId,
  clientFullName,
  clientEmail,
  isNdis,
  linkedUser,
}: {
  clientId: string
  clientFullName: string
  clientEmail: string | null
  isNdis: boolean
  linkedUser: LinkedUser | null
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('closed')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState(clientEmail ?? '')
  const [overridePassword, setOverridePassword] = useState('')

  // Remove confirm
  const [removeConfirmText, setRemoveConfirmText] = useState('')

  // Credentials to display once
  const [creds, setCreds] = useState<ShowCredentialsState | null>(null)

  // Non-NDIS clients can't have mobile access — render a disabled card.
  if (!isNdis) {
    return (
      <div className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
        <div className="border-b border-[#f0f1f3] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0f172a]">Mobile access</h3>
        </div>
        <div className="px-4 py-4 text-[12px] leading-5 text-[#64748b]">
          Only NDIS clients can be invited to the mobile app. Standard clients use the admin-facing
          workspace.
        </div>
      </div>
    )
  }

  async function handleInvite() {
    setError(null)
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address.')
      return
    }
    if (overridePassword && overridePassword.length < 8) {
      setError('Password must be at least 8 characters (or leave blank for auto-generated).')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/admin/create-client-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          email: inviteEmail.trim().toLowerCase(),
          password: overridePassword || undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload.message ?? payload.error ?? 'Failed to invite client.')
        setBusy(false)
        return
      }
      setCreds({ email: payload.email, password: payload.password, source: 'invite' })
      setMode('show-credentials')
      setOverridePassword('')
      setBusy(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Network error.')
      setBusy(false)
    }
  }

  async function handleReset() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/reset-client-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload.message ?? payload.error ?? 'Failed to reset password.')
        setBusy(false)
        return
      }
      setCreds({ email: payload.email, password: payload.password, source: 'reset' })
      setMode('show-credentials')
      setBusy(false)
    } catch (e: any) {
      setError(e?.message ?? 'Network error.')
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (removeConfirmText.trim().toLowerCase() !== (clientFullName ?? '').trim().toLowerCase()) {
      setError('Type the client\'s full name to confirm removal.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const res = await fetch('/api/admin/remove-client-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(payload.message ?? payload.error ?? 'Failed to remove access.')
        setBusy(false)
        return
      }
      setMode('closed')
      setRemoveConfirmText('')
      setBusy(false)
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Network error.')
      setBusy(false)
    }
  }

  function closeModal() {
    setMode('closed')
    setError(null)
    setBusy(false)
    setRemoveConfirmText('')
    setOverridePassword('')
    setCreds(null)
  }

  return (
    <>
      <div className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-4 py-3">
          <h3 className="text-sm font-semibold text-[#0f172a]">Mobile access</h3>
          {linkedUser ? (
            <span className="rounded-full bg-[#F1F9E1] px-2.5 py-1 text-[10px] font-semibold text-[#5E8D1F]">
              Active
            </span>
          ) : (
            <span className="rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[10px] font-semibold text-[#64748b]">
              Not invited
            </span>
          )}
        </div>

        <div className="space-y-3 px-4 py-4">
          {linkedUser ? (
            <>
              <p className="text-[12px] leading-5 text-[#64748b]">
                This client has a mobile login. They can open VividCare on their phone and sign their
                service agreements.
              </p>
              <div className="rounded-[14px] bg-[#fafbfc] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Email</p>
                <p className="mt-1 truncate text-[12.5px] font-medium text-[#0f172a]">
                  {linkedUser.email ?? '—'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMode('reset')}
                disabled={busy}
                className="w-full rounded-2xl border border-[#e6e8ec] bg-white px-4 py-2.5 text-sm font-semibold text-[#475569] hover:bg-[#fafbfc] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
              >
                Reset password
              </button>
              <button
                type="button"
                onClick={() => setMode('remove')}
                disabled={busy}
                className="w-full rounded-2xl bg-[#fee2e2] px-4 py-2.5 text-sm font-semibold text-[#991b1b] hover:bg-[#fecaca] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
              >
                Remove mobile access
              </button>
            </>
          ) : (
            <>
              <p className="text-[12px] leading-5 text-[#64748b]">
                Invite this client to sign in to the VividCare mobile app. They&apos;ll be able to
                review and sign their service agreements from their phone.
              </p>
              <button
                type="button"
                onClick={() => setMode('invite')}
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#6B2C91] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#54206F] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
              >
                <span className="material-symbols-outlined text-[18px]">phone_iphone</span>
                Invite to mobile app
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {mode !== 'closed' && (
        <Modal onClose={busy ? undefined : closeModal}>
          {mode === 'invite' && (
            <>
              <ModalHeader
                icon="phone_iphone"
                accent="#54206F"
                accentBg="#F4ECF8"
                title="Invite to mobile app"
                description={`A login will be created for ${clientFullName}. They can sign their agreements on their phone.`}
              />
              <div className="mt-5 space-y-3">
                <Field
                  label="Email"
                  value={inviteEmail}
                  onChange={setInviteEmail}
                  placeholder="client@email.com"
                  type="email"
                />
                <Field
                  label="Password (optional)"
                  value={overridePassword}
                  onChange={setOverridePassword}
                  placeholder="Leave blank to auto-generate"
                  type="text"
                />
                <p className="text-[11px] text-[#64748b]">
                  We&apos;ll show you the password once after creation. Copy it and share it with the
                  client however you normally communicate (SMS, voice, in person).
                </p>
              </div>
              {error && <ErrorRow message={error} />}
              <ModalActions
                primary="Create login"
                primaryBusy={busy}
                primaryDisabled={!inviteEmail.trim()}
                onPrimary={handleInvite}
                onCancel={closeModal}
              />
            </>
          )}

          {mode === 'reset' && (
            <>
              <ModalHeader
                icon="key"
                accent="#475569"
                accentBg="#f0f1f3"
                title="Reset password"
                description={`Generate a new password for ${linkedUser?.email ?? clientFullName}. Any signed-in sessions will be invalidated.`}
              />
              {error && <ErrorRow message={error} />}
              <ModalActions
                primary="Generate new password"
                primaryBusy={busy}
                onPrimary={handleReset}
                onCancel={closeModal}
              />
            </>
          )}

          {mode === 'remove' && (
            <>
              <ModalHeader
                icon="link_off"
                accent="#991b1b"
                accentBg="#fee2e2"
                title="Remove mobile access?"
                description={`This permanently deletes ${clientFullName}'s login. Their agreements, shifts, and care notes are kept; only the phone account is removed.`}
              />
              <label className="mt-5 block">
                <span className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">
                  Type the full name to confirm
                </span>
                <input
                  type="text"
                  value={removeConfirmText}
                  onChange={e => setRemoveConfirmText(e.target.value)}
                  placeholder={clientFullName}
                  autoFocus
                  className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#dc2626]"
                />
              </label>
              {error && <ErrorRow message={error} />}
              <ModalActions
                primary="Remove permanently"
                primaryBusy={busy}
                primaryDanger
                onPrimary={handleRemove}
                onCancel={closeModal}
              />
            </>
          )}

          {mode === 'show-credentials' && creds && (
            <>
              <ModalHeader
                icon="content_copy"
                accent="#166534"
                accentBg="#DCFCE7"
                title={creds.source === 'invite' ? 'Mobile login created' : 'New password generated'}
                description="Copy these credentials and share them with the client. This password will not be shown again."
              />
              <div className="mt-5 space-y-3">
                <CopyRow label="Email" value={creds.email} />
                <CopyRow label="Password" value={creds.password} mono />
                <CopyRow
                  label="Welcome message"
                  value={`Hi ${clientFullName.split(' ')[0] || ''}, your VividCare login is ready. Open the VividCare app on your phone, sign in with ${creds.email} / ${creds.password}, and tap Agreements to review and sign your service agreement. Let us know if you have any trouble.`}
                  multiline
                />
              </div>
              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-2xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

/* ─── Subcomponents ──────────────────────────────────────────────────────── */

function Modal({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-[81] w-full max-w-md rounded-[24px] bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.2)]">
        {children}
      </div>
    </div>
  )
}

function ModalHeader({
  icon, accent, accentBg, title, description,
}: {
  icon: string; accent: string; accentBg: string; title: string; description: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
        style={{ backgroundColor: accentBg }}
      >
        <span className="material-symbols-outlined text-[20px]" style={{ color: accent }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-[#0f172a]">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-[#64748b]">{description}</p>
      </div>
    </div>
  )
}

function ModalActions({
  primary, onPrimary, primaryBusy, primaryDisabled, primaryDanger, onCancel,
}: {
  primary: string
  onPrimary: () => void
  primaryBusy?: boolean
  primaryDisabled?: boolean
  primaryDanger?: boolean
  onCancel: () => void
}) {
  return (
    <div className="mt-5 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={primaryBusy}
        className="rounded-2xl border border-[#e6e8ec] bg-white px-4 py-2.5 text-sm font-medium text-[#475569] disabled:opacity-60"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryBusy || primaryDisabled}
        className={`rounded-2xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
          primaryDanger ? 'bg-[#dc2626]' : 'bg-[#0f172a]'
        }`}
      >
        {primaryBusy ? 'Working…' : primary}
      </button>
    </div>
  )
}

function ErrorRow({ message }: { message: string }) {
  return (
    <p className="mt-3 rounded-2xl bg-[#fee2e2] px-3 py-2 text-[12px] text-[#991b1b]">{message}</p>
  )
}

function Field({
  label, value, onChange, placeholder, type = 'text',
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
      />
    </div>
  )
}

function CopyRow({ label, value, mono, multiline }: { label: string; value: string; mono?: boolean; multiline?: boolean }) {
  const [copied, setCopied] = useState(false)
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API may fail in some browsers — fall back to selecting the text
    }
  }
  return (
    <div className="rounded-[14px] border border-[#e6e8ec] bg-[#fafbfc] p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">{label}</p>
        <button
          type="button"
          onClick={handleCopy}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
            copied ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-white text-[#475569] hover:bg-[#f0f1f3]'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div
        className={`mt-2 ${mono ? 'font-mono' : ''} ${multiline ? 'text-[12px] leading-5 text-[#475569] whitespace-pre-wrap break-words' : 'truncate text-[13px] font-medium text-[#0f172a]'}`}
      >
        {value}
      </div>
    </div>
  )
}
