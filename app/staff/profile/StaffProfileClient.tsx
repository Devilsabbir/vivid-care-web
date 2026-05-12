'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function StaffProfileClient({
  fullName,
  email,
  role,
}: {
  fullName: string
  email: string
  role: string
}) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] bg-[#0f172a] px-5 py-6 text-white shadow-[0_24px_44px_rgba(15,23,42,0.10)]">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#6B2C91] font-headline text-2xl font-semibold text-[#0f172a]">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Account</p>
            <h1 className="mt-2 font-headline text-[1.7rem] font-semibold leading-none tracking-[-0.05em]">{fullName}</h1>
            <p className="mt-2 text-sm text-[#d1ccc3]">{email}</p>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] bg-white/8 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8f8a80]">Role</p>
          <p className="mt-2 text-sm font-semibold capitalize text-white">{role}</p>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <InfoCard label="Full name" value={fullName} />
        <InfoCard label="Email" value={email} />
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">Quick links</p>
          <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">Useful places</h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <QuickLink href="/staff/documents" icon="folder" label="Docs" />
          <QuickLink href="/staff/notifications" icon="notifications" label="Alerts" />
          <QuickLink href="/staff/support" icon="smart_toy" label="Support" />
        </div>
      </section>

      <button
        onClick={handleSignOut}
        className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-[#e6e8ec] bg-white px-4 py-4 text-sm font-semibold text-[#0f172a] shadow-[0_12px_26px_rgba(23,23,22,0.04)] transition hover:bg-[#f8f5ef]"
      >
        <span className="material-symbols-outlined text-[20px]">logout</span>
        Sign out
      </button>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <section className="rounded-[24px] border border-[#e6e8ec] bg-white px-4 py-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-[#0f172a]">{value}</p>
    </section>
  )
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-[24px] border border-[#e6e8ec] bg-white px-3 py-4 text-center shadow-[0_12px_26px_rgba(23,23,22,0.04)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f172a] text-[#6B2C91]">
        <span className="material-symbols-outlined text-[20px]">{icon}</span>
      </span>
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0f172a]">{label}</span>
    </Link>
  )
}
