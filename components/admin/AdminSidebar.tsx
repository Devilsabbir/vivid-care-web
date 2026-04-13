'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/admin/roster', icon: 'calendar_month', label: 'Scheduler' },
  { href: '/admin/staff', icon: 'badge', label: 'Staff' },
  { href: '/admin/clients', icon: 'group', label: 'Clients' },
  { href: '/admin/compliance', icon: 'description', label: 'Documents' },
  { href: '/admin/service-documentation', icon: 'fact_check', label: 'Service docs' },
  { href: '/admin/agreements', icon: 'draw', label: 'Agreements' },
  { href: '/admin/incidents', icon: 'warning', label: 'Incidents' },
  { href: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
  { href: '/admin/active-shifts', icon: 'location_on', label: 'Live shifts' },
  { href: '/admin/shift-history', icon: 'history', label: 'History' },
  { href: '/admin/settings', icon: 'tune', label: 'Settings' },
]

export default function AdminSidebar({ adminName }: { adminName?: string }) {
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

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-[88px] flex-col items-center bg-[#1a1a18] px-3 py-4">
      <Link
        href="/admin/dashboard"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cdff52] text-[#1a1a18] shadow-[0_14px_32px_rgba(26,26,24,0.2)]"
        title="Vivid Care"
      >
        <span className="material-symbols-outlined material-symbols-filled text-[22px]">favorite</span>
        <span className="sr-only">Vivid Care</span>
      </Link>

      <nav className="flex w-full flex-1 flex-col items-center gap-2 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-150 ${
                active
                  ? 'bg-white/10 text-[#cdff52]'
                  : 'text-white/55 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span
                className="material-symbols-outlined text-[21px]"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span className="sr-only">{item.label}</span>
              <span className="pointer-events-none absolute left-[calc(100%+0.75rem)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-full bg-[#1f1f1c] px-3 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 flex flex-col items-center gap-2">
        <button
          onClick={handleSignOut}
          type="button"
          title="Sign out"
          aria-label="Sign out"
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 text-white/60 transition-colors hover:border-white/20 hover:bg-white/8 hover:text-white"
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
        </button>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#30302a] text-[11px] font-semibold uppercase tracking-[0.16em] text-[#cdff52]"
          title={adminName ?? 'Admin'}
        >
          {initials}
        </div>
      </div>
    </aside>
  )
}
