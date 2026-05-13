'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface AdminTopbarProps {
  adminName?: string
  unreadCount?: number
  onViviOpen: () => void
}

/**
 * Glassmorphism topbar that mounts above every admin page.
 * - Global search input (TODO: wire to a real search route)
 * - "Ask Vivi" gradient pill — opens the slide-in AI drawer
 * - Quick-add pill (TODO: open a menu)
 * - Notifications bell with unread dot
 * - Help icon
 * - Avatar
 *
 * Registers a global ⌘/ (Ctrl+/ on Windows) shortcut to open Vivi from anywhere.
 */
export default function AdminTopbar({ adminName, unreadCount = 0, onViviOpen }: AdminTopbarProps) {
  const initials = adminName
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
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
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-3 border-b border-[#e6e8ec] bg-white/85 px-6 backdrop-blur-xl lg:flex">
      {/* Search — opens the Vivi AI drawer which doubles as universal search */}
      <button
        type="button"
        onClick={onViviOpen}
        aria-label="Search clients, shifts, and notes"
        className="flex h-9 min-w-[280px] items-center gap-2 rounded-[10px] border border-[#e6e8ec] bg-[#fafbfc] px-3 text-left text-[12.5px] text-[#94a3b8] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">search</span>
        <span className="flex-1 truncate">Search clients, shifts, notes…</span>
        <kbd className="font-mono text-[10.5px] text-[#94a3b8]">⌘ K</kbd>
      </button>

      <div className="flex-1" />

      {/* Vivi trigger */}
      <button
        type="button"
        onClick={onViviOpen}
        className="group flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-[#6B2C91] to-[#2BAEE0] px-3.5 text-[12.5px] font-semibold text-white shadow-[0_4px_14px_rgba(107,44,145,0.25)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2"
        aria-label="Open Vivi AI assistant"
      >
        <span className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-white/30 blur-md animate-pulse" />
          <span className="material-symbols-outlined relative text-[14px]" aria-hidden="true">auto_awesome</span>
        </span>
        <span>Ask Vivi</span>
        <kbd className="rounded-[4px] bg-white/20 px-1.5 py-0.5 font-mono text-[9px]">⌘ /</kbd>
      </button>

      {/* Quick add — opens roster (the primary creation surface) */}
      <Link
        href="/admin/roster"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#e6e8ec] bg-white px-3.5 text-[12.5px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
      >
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
        New shift
      </Link>

      {/* Notifications */}
      <Link
        href="/admin/notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-[#475569] hover:bg-[#f7f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
        aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#DC2626]" />
        )}
      </Link>

      {/* Help — opens Vivi AI assistant which can answer how-to questions */}
      <button
        type="button"
        onClick={onViviOpen}
        className="flex h-9 w-9 items-center justify-center rounded-full text-[#475569] hover:bg-[#f7f8f9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
        aria-label="Help — ask Vivi"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">help</span>
      </button>

      {/* Avatar */}
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F4ECF8] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#54206F]"
        title={adminName ?? 'Admin'}
      >
        {initials}
      </div>
    </header>
  )
}
