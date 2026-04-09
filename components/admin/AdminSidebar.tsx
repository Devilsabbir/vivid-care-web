'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { href: '/admin/clients', icon: 'group', label: 'Clients' },
  { href: '/admin/staff', icon: 'badge', label: 'Staff' },
  { href: '/admin/roster', icon: 'calendar_month', label: 'Roster' },
  { href: '/admin/active-shifts', icon: 'location_on', label: 'Active Shifts' },
  { href: '/admin/shift-history', icon: 'history', label: 'Shift History' },
  { href: '/admin/incidents', icon: 'report_problem', label: 'Incidents' },
  { href: '/admin/compliance', icon: 'description', label: 'Compliance' },
  { href: '/admin/notifications', icon: 'notifications', label: 'Notifications' },
]

export default function AdminSidebar({ adminName }: { adminName?: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 z-50 bg-slate-100 flex flex-col py-4">
      {/* Logo */}
      <div className="px-6 mb-8 flex items-center gap-3">
        <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white flex-shrink-0">
          <span className="material-symbols-outlined material-symbols-filled text-xl">favorite</span>
        </div>
        <div>
          <h1 className="text-xl font-bold font-headline bg-gradient-to-br from-sky-900 to-sky-700 bg-clip-text text-transparent leading-none">
            Vivid Care
          </h1>
          <p className="text-[10px] font-medium text-slate-500 tracking-tight">Clinical Atelier</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-2 overflow-y-auto">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-headline font-semibold text-sm transition-all duration-200 ${
                active
                  ? 'bg-white text-sky-900 shadow-sm'
                  : 'text-slate-600 hover:text-sky-800 hover:bg-slate-50'
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Admin info + sign out */}
      <div className="px-4 mt-4 space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg shadow-sm">
          <div className="w-8 h-8 primary-gradient rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {adminName?.charAt(0) ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold font-headline text-sky-900 truncate">{adminName ?? 'Admin'}</p>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">System Admin</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-sky-900/5 text-sky-900 font-headline text-sm font-bold border border-sky-900/10 hover:bg-sky-900/10 transition-colors"
        >
          <span className="material-symbols-outlined text-base">logout</span>
          Sign Out
        </button>
      </div>
    </aside>
  )
}
