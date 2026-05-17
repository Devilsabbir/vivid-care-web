'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface AdminTopbarProps {
  adminName?: string
  unreadCount?: number
  onViviOpen: () => void
}

/**
 * Sticky top bar that mounts above every admin page. Uses the design
 * handoff's `.adm-topbar`, `.adm-search`, `.adm-iconbtn` and
 * `.adm-pillbtn` classes directly from `styles/vc-admin.css` so the
 * visual output is pixel-identical to the bundle.
 */
export default function AdminTopbar({ adminName, unreadCount = 0, onViviOpen }: AdminTopbarProps) {
  const initials =
    adminName
      ?.split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AD'

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault()
        onViviOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onViviOpen])

  return (
    <header className="adm-topbar hidden lg:flex">
      {/* Search — opens the Vivi AI drawer (universal search). */}
      <button
        type="button"
        onClick={onViviOpen}
        aria-label="Search clients, shifts, and notes"
        className="adm-search"
        style={{ border: 0, cursor: 'pointer' }}
      >
        <span style={{ color: 'var(--slate-500)' }} aria-hidden="true">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
        </span>
        <span>Search clients, shifts, notes…</span>
        <kbd>⌘ K</kbd>
      </button>

      <div style={{ flex: 1 }} />

      {/* Ask Vivi gradient pill */}
      <button
        type="button"
        onClick={onViviOpen}
        className="adm-pillbtn"
        style={{
          height: 34,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: 999,
          border: 0,
          background: 'linear-gradient(135deg, var(--vc-purple) 0%, var(--vc-blue) 100%)',
          color: '#fff',
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(107,44,145,0.25)',
        }}
        aria-label="Open Vivi AI assistant"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">auto_awesome</span>
        Ask Vivi
        <kbd
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 4,
            padding: '1px 4px',
            fontFamily: 'var(--ff-mono)',
            fontSize: 10,
          }}
        >
          ⌘ /
        </kbd>
      </button>

      {/* Quick add → opens roster (primary creation surface). */}
      <Link href="/admin/roster" className="adm-pillbtn primary">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">add</span>
        Quick add
      </Link>

      {/* Notifications */}
      <Link
        href="/admin/notifications"
        className="adm-iconbtn"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">notifications</span>
        {unreadCount > 0 && <span className="dot" />}
      </Link>

      {/* Help — re-uses Vivi */}
      <button
        type="button"
        onClick={onViviOpen}
        className="adm-iconbtn"
        aria-label="Help — ask Vivi"
      >
        <span className="material-symbols-outlined" style={{ fontSize: 18 }} aria-hidden="true">help</span>
      </button>

      {/* Admin avatar */}
      <div
        className="vc-avatar warm"
        style={{ width: 32, height: 32, fontSize: 12 }}
        title={adminName ?? 'Admin'}
      >
        {initials}
      </div>
    </header>
  )
}
