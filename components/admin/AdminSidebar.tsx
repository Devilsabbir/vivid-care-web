'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Admin sidebar — implements the design handoff's `.adm-side` layout
 * directly. The class names match `styles/vc-admin.css` exactly, so
 * the visual output is pixel-identical to the bundled design.
 *
 * Responsive behaviour stays the same as before:
 *  - lg+ : sticky 248px column anchored to the left edge
 *  - <lg : compact top bar + slide-in drawer
 */

interface NavGroup {
  label?: string
  items: ReadonlyArray<{ href: string; icon: string; label: string }>
}

const NAV_GROUPS: ReadonlyArray<NavGroup> = [
  {
    items: [
      { href: '/admin/dashboard',     icon: 'dashboard',      label: 'Dashboard' },
      { href: '/admin/roster',        icon: 'calendar_month', label: 'Roster' },
      { href: '/admin/shifts',        icon: 'event_note',     label: 'Shifts' },
      { href: '/admin/active-shifts', icon: 'location_on',    label: 'Live shifts' },
    ],
  },
  {
    label: 'People',
    items: [
      { href: '/admin/clients', icon: 'groups', label: 'Clients' },
      { href: '/admin/staff',   icon: 'badge',  label: 'Staff' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { href: '/admin/compliance', icon: 'description', label: 'Documents' },
      { href: '/admin/agreements', icon: 'draw',        label: 'Agreements' },
      { href: '/admin/incidents',  icon: 'warning',     label: 'Incidents' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/payments',      icon: 'payments',      label: 'Billing' },
      { href: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
      { href: '/admin/settings',      icon: 'settings',      label: 'Settings' },
    ],
  },
]

function NavItem({
  href,
  icon,
  label,
  active,
  onClick,
}: {
  href: string
  icon: string
  label: string
  active: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`adm-nav-item ${active ? 'active' : ''}`}
    >
      <span
        className="material-symbols-outlined"
        style={{
          fontSize: 18,
          fontVariationSettings: active ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300",
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}

function SidebarBody({
  pathname,
  adminName,
  initials,
  onSignOut,
  onLinkClick,
  onClose,
}: {
  pathname: string
  adminName: string
  initials: string
  onSignOut: () => void
  onLinkClick?: () => void
  onClose?: () => void
}) {
  return (
    <aside className="adm-side">
      {/* Logo */}
      <div className="adm-brand" style={{ position: 'relative' }}>
        <Link
          href="/admin/dashboard"
          onClick={onClose}
          className="flex flex-1 items-center justify-center"
          aria-label="Vivid Care home"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="VividCare" style={{ height: 56, width: 'auto' }} />
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="adm-iconbtn"
            style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 28, height: 28 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">close</span>
          </button>
        )}
      </div>

      {/* Region switcher chip */}
      <div className="adm-org">
        <div className="glyph">WA</div>
        <div className="meta">
          <div className="name">Western Australia · Perth</div>
          <div className="sub">Region</div>
        </div>
        <span style={{ color: 'var(--slate-400)' }} aria-hidden="true">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>expand_more</span>
        </span>
      </div>

      {/* Nav groups */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="adm-nav-group" style={idx > 0 ? { marginTop: 6 } : undefined}>
            {group.label && (
              <div className="lbl" style={{ padding: '6px 10px' }}>
                {group.label}
              </div>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  active={active}
                  onClick={onLinkClick}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer — signed-in admin chip */}
      <div className="adm-side-foot">
        <div className="vc-avatar warm" style={{ width: 32, height: 32, fontSize: 12 }} title={adminName || 'Admin'}>
          {initials}
        </div>
        <div className="who">
          <div className="name">{adminName || 'Admin'}</div>
          <div className="role">Care coordinator</div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="adm-iconbtn"
          style={{ width: 28, height: 28 }}
          title="Sign out"
          aria-label="Sign out"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">logout</span>
        </button>
      </div>
    </aside>
  )
}

export default function AdminSidebar({ adminName }: { adminName?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const initials =
    adminName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AD'

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Desktop sidebar (lg+) — fixed-positioned 248px column on the
            left edge so the layout doesn't depend on grid placement. ── */}
      <div
        className="fixed inset-y-0 left-0 z-50 hidden lg:block"
        style={{ width: 248 }}
      >
        <SidebarBody
          pathname={pathname}
          adminName={adminName ?? ''}
          initials={initials}
          onSignOut={handleSignOut}
        />
      </div>

      {/* ── Mobile top bar (<lg) ── */}
      <div className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-[#F1EEF4] bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="adm-iconbtn"
          style={{ width: 36, height: 36 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 20 }} aria-hidden="true">menu</span>
        </button>

        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div
            className="flex items-center justify-center rounded-[7px]"
            style={{ height: 28, width: 28, background: 'var(--vc-purple)' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" style={{ height: 16, width: 16, filter: 'brightness(0) invert(1)' }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate-900)' }}>VividCare</span>
        </Link>

        <div
          className="vc-avatar warm"
          style={{ width: 28, height: 28, fontSize: 11 }}
          title={adminName ?? 'Admin'}
        >
          {initials}
        </div>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(20,12,32,0.42)', backdropFilter: 'blur(3px)' }}
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0"
            style={{ width: 264, boxShadow: '4px 0 24px rgba(20,12,32,0.18)' }}
          >
            <SidebarBody
              pathname={pathname}
              adminName={adminName ?? ''}
              initials={initials}
              onSignOut={handleSignOut}
              onLinkClick={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  )
}
