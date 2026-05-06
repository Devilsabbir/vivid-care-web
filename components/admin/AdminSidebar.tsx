'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_GROUPS = [
  {
    label: 'Operations',
    items: [
      { href: '/admin/dashboard',        icon: 'dashboard',    label: 'Dashboard' },
      { href: '/admin/roster',           icon: 'calendar_month', label: 'Roster' },
      { href: '/admin/shifts',           icon: 'event_note',   label: 'Shifts' },
      { href: '/admin/shift-history',    icon: 'history',      label: 'Shift history' },
      { href: '/admin/active-shifts',    icon: 'location_on',  label: 'Live shifts' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/clients', icon: 'group',  label: 'Clients' },
      { href: '/admin/staff',   icon: 'badge',  label: 'Staff' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/admin/compliance',            icon: 'description', label: 'Documents' },
      { href: '/admin/agreements',            icon: 'draw',        label: 'Agreements' },
      { href: '/admin/incidents',             icon: 'warning',     label: 'Incidents' },
      { href: '/admin/service-documentation', icon: 'fact_check',  label: 'Service docs' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin/payments',      icon: 'payments',      label: 'Payments' },
      { href: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
      { href: '/admin/settings',      icon: 'tune',          label: 'Settings' },
    ],
  },
]

function NavItems({
  pathname,
  onLinkClick,
}: {
  pathname: string
  onLinkClick?: () => void
}) {
  return (
    <nav
      aria-label="Main navigation"
      className="flex-1 overflow-y-auto px-3 pb-2"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-4">
          <div className="mb-1 px-2 pt-2 text-[9.5px] font-semibold uppercase tracking-[0.12em] text-white/30">
            {group.label}
          </div>
          {group.items.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                aria-current={active ? 'page' : undefined}
                className={`flex h-9 w-full items-center gap-3 rounded-xl px-2.5 text-[13px] font-medium transition-all duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] ${
                  active
                    ? 'bg-white/10 text-[#7BC143]'
                    : 'text-white/55 hover:bg-white/6 hover:text-white/90'
                }`}
              >
                <span
                  className="material-symbols-outlined shrink-0 text-[18px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export default function AdminSidebar({ adminName }: { adminName?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const initials = adminName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('') || 'AD'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const sidebarFooter = (
    <div className="border-t border-white/8 px-3 py-3">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2e2e2a] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7BC143]"
          title={adminName ?? 'Admin'}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12px] font-medium leading-tight text-white/80">
            {adminName ?? 'Admin'}
          </div>
          <div className="text-[10px] text-white/35">System Admin</div>
        </div>
        <button
          onClick={handleSignOut}
          type="button"
          title="Sign out"
          aria-label="Sign out"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
        >
          <span className="material-symbols-outlined text-[16px]">logout</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col bg-[#1a1a18] lg:flex">
        <div className="flex items-center gap-3 px-4 py-5">
          <Link href="/admin/dashboard" title="Vivid Care">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" alt="Vivid Care" className="h-7 w-7 object-contain" />
            </div>
          </Link>
          <div>
            <div className="text-[13px] font-semibold leading-tight tracking-[-0.01em] text-white">Vivid Care</div>
            <div className="text-[10px] font-medium text-[#7BC143]">Empowering People</div>
          </div>
        </div>
        <NavItems pathname={pathname} />
        {sidebarFooter}
      </aside>

      {/* ── Mobile top bar (below lg) ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-[#1a1a18] px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <Link href="/admin/dashboard" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.12)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vivid Care" className="h-6 w-6 object-contain" />
          </div>
          <div className="text-[13px] font-semibold text-white">Vivid Care</div>
        </Link>

        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2e2e2a] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7BC143]"
          title={adminName ?? 'Admin'}
        >
          {initials}
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />

          {/* Slide-in drawer */}
          <aside className="absolute inset-y-0 left-0 flex w-[260px] flex-col bg-[#1a1a18] shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
            {/* Logo + close */}
            <div className="flex items-center justify-between px-4 py-5">
              <Link
                href="/admin/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.png" alt="Vivid Care" className="h-7 w-7 object-contain" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-tight text-white">Vivid Care</div>
                  <div className="text-[10px] font-medium text-[#7BC143]">Empowering People</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-xl text-white/50 hover:bg-white/8 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <NavItems pathname={pathname} onLinkClick={() => setMobileOpen(false)} />
            {sidebarFooter}
          </aside>
        </div>
      )}
    </>
  )
}
