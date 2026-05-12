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
      className="flex-1 overflow-y-auto px-3 pb-3"
      style={{ scrollbarWidth: 'none' }}
    >
      {NAV_GROUPS.map(group => (
        <div key={group.label} className="mb-1">
          <div className="mb-0.5 px-2 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#94a3b8]">
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
                className={[
                  'flex h-8 w-full items-center gap-2.5 rounded-[7px] px-2.5 text-[13px] font-medium transition-all duration-100',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
                  active
                    ? 'bg-[#f0fdfa] text-[#0f766e]'
                    : 'text-[#475569] hover:bg-[#f7f8f9] hover:text-[#0f172a]',
                ].join(' ')}
              >
                <span
                  className="material-symbols-outlined shrink-0 text-[17px]"
                  style={active ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : { fontVariationSettings: "'FILL' 0, 'wght' 300" }}
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

  const sidebarContent = (onClose?: () => void) => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-[#e6e8ec] px-4 py-[18px]">
        <Link href="/admin/dashboard" title="Vivid Care" onClick={onClose} className="flex items-center gap-2.5">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] bg-[#0d9488]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          <div className="text-[14px] font-semibold tracking-[-0.01em] text-[#0f172a]">VividCare</div>
          <span className="ml-auto text-[10.5px] font-medium text-[#94a3b8]">Admin</span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-[#94a3b8] hover:bg-[#f7f8f9] hover:text-[#0f172a]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* Search bar */}
      <div className="border-b border-[#e6e8ec] px-3 py-2.5">
        <div className="flex h-[30px] w-full items-center gap-2 rounded-[8px] border border-[#e6e8ec] bg-[#fafbfc] px-2.5 text-[12px] text-[#94a3b8]">
          <span className="material-symbols-outlined text-[14px]">search</span>
          <span className="flex-1">Search…</span>
          <span className="flex items-center gap-0.5">
            <kbd className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[4px] border border-[#e6e8ec] bg-white px-1 font-mono text-[10px] text-[#64748b]">⌘</kbd>
            <kbd className="inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[4px] border border-[#e6e8ec] bg-white px-1 font-mono text-[10px] text-[#64748b]">K</kbd>
          </span>
        </div>
      </div>

      <NavItems pathname={pathname} onLinkClick={onClose} />

      {/* Footer */}
      <div className="border-t border-[#e6e8ec] px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0fdfa] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0f766e]"
            title={adminName ?? 'Admin'}
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-600 leading-tight text-[#0f172a]">
              {adminName ?? 'Admin'}
            </div>
            <div className="text-[10.5px] text-[#94a3b8]">Operations admin</div>
          </div>
          <button
            onClick={handleSignOut}
            type="button"
            title="Sign out"
            aria-label="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#94a3b8] transition-colors hover:bg-[#f7f8f9] hover:text-[#475569]"
          >
            <span className="material-symbols-outlined text-[16px]">logout</span>
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      {/* ── Desktop sidebar (lg+) ── */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[232px] flex-col border-r border-[#e6e8ec] bg-white lg:flex">
        {sidebarContent()}
      </aside>

      {/* ── Mobile top bar (below lg) ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[#e6e8ec] bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#475569] hover:bg-[#f7f8f9] hover:text-[#0f172a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-[#0d9488]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Vivid Care" className="h-4 w-4 object-contain brightness-0 invert" />
          </div>
          <span className="text-[13px] font-semibold text-[#0f172a]">VividCare</span>
        </Link>

        <div
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f0fdfa] text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0f766e]"
          title={adminName ?? 'Admin'}
        >
          {initials}
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[264px] flex-col border-r border-[#e6e8ec] bg-white shadow-[4px_0_24px_rgba(15,23,42,0.08)]">
            {sidebarContent(() => setMobileOpen(false))}
          </aside>
        </div>
      )}
    </>
  )
}
