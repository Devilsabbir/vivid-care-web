'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ClientProfileClient({
  clientName,
  email,
  phone,
  address,
  ndisNumber,
  emergencyContact,
  dateOfBirth,
}: {
  clientName: string
  email: string
  phone: string | null
  address: string | null
  ndisNumber: string | null
  emergencyContact: string | null
  dateOfBirth: string | null
}) {
  const [signingOut, setSigningOut] = useState(false)
  const router = useRouter()

  async function handleSignOut() {
    setSigningOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initials = clientName
    .split(' ')
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'C'

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-4 rounded-[30px] bg-[#171717] px-5 py-8 text-white shadow-[0_26px_54px_rgba(23,23,22,0.18)]">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#8B45A6] font-headline text-2xl font-bold text-[#171717] shadow-[0_8px_24px_rgba(139,69,166,0.3)]">
          {initials}
        </div>
        <div className="text-center">
          <h1 className="font-headline text-xl font-semibold">{clientName || 'Client'}</h1>
          <p className="mt-1 text-xs text-[#8f8a80]">NDIS Participant</p>
        </div>
        <span className="rounded-full bg-[#8B45A6]/20 px-3 py-1 text-xs font-semibold text-[#8B45A6]">
          Client portal
        </span>
      </div>

      {/* Details */}
      <section className="overflow-hidden rounded-[28px] border border-[#e6e0d7] bg-white shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        <div className="border-b border-[#f0ece5] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Personal details</p>
          <p className="mt-0.5 text-xs text-[#8b867b]">Contact Vivid Care to update your information</p>
        </div>
        <div className="divide-y divide-[#f5f3ee]">
          <ProfileField label="Full name" value={clientName} icon="person" />
          <ProfileField label="Email" value={email} icon="mail" />
          <ProfileField label="Phone" value={phone} icon="phone" />
          <ProfileField label="Address" value={address} icon="location_on" />
          <ProfileField label="NDIS number" value={ndisNumber} icon="badge" />
          <ProfileField label="Date of birth" value={dateOfBirth ? formatDate(dateOfBirth) : null} icon="cake" />
        </div>
      </section>

      {/* Emergency contact */}
      {emergencyContact && (
        <section className="overflow-hidden rounded-[28px] border border-[#e6e0d7] bg-white shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
          <div className="border-b border-[#f0ece5] px-5 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Emergency contact</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff1f1]">
                <span className="material-symbols-outlined text-[18px] text-[#991b1b]">emergency</span>
              </div>
              <p className="text-sm text-[#1a1a18]">{emergencyContact}</p>
            </div>
          </div>
        </section>
      )}

      {/* Support info */}
      <section className="overflow-hidden rounded-[28px] border border-[#e6e0d7] bg-white shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        <div className="border-b border-[#f0ece5] px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Vivid Care contact</p>
        </div>
        <div className="space-y-3 px-5 py-4 text-sm text-[#5c5850]">
          <p className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#8b867b]">phone</span>
            123456789
          </p>
          <p className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[18px] text-[#8b867b]">mail</span>
            kemaked@gmail.com
          </p>
        </div>
      </section>

      {/* Sign out */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="flex w-full items-center justify-center gap-3 rounded-[24px] border border-[#f3d7d7] bg-[#fff1f1] px-4 py-4 text-sm font-semibold text-[#9b3434] transition hover:bg-[#fee2e2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] disabled:opacity-60"
      >
        {signingOut ? (
          <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">logout</span>
        )}
        {signingOut ? 'Signing out...' : 'Sign out'}
      </button>
    </div>
  )
}

function ProfileField({
  label,
  value,
  icon,
}: {
  label: string
  value: string | null | undefined
  icon: string
}) {
  return (
    <div className="flex items-start gap-4 px-5 py-3.5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f1ea]">
        <span className="material-symbols-outlined text-[16px] text-[#8b867b]">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b867b]">{label}</p>
        <p className={`mt-0.5 text-sm ${value ? 'text-[#1a1a18]' : 'italic text-[#b5afa5]'}`}>
          {value ?? 'Not recorded'}
        </p>
      </div>
    </div>
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })
}
