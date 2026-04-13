'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/staff/home', icon: 'calendar_month', label: 'Home' },
  { href: '/staff/clock', icon: 'timer', label: 'Clock' },
  { href: '/staff/documents', icon: 'folder', label: 'Documents' },
  { href: '/staff/payments', icon: 'payments', label: 'Payments' },
  { href: '/staff/support', icon: 'smart_toy', label: 'Support' },
  { href: '/staff/profile', icon: 'person', label: 'Profile' },
]

export default function StaffBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto mx-auto mb-4 max-w-lg px-4">
        <div className="grid h-[76px] grid-cols-6 items-center rounded-[28px] border border-white/10 bg-[#171717]/95 px-2 shadow-[0_24px_44px_rgba(23,23,22,0.26)] backdrop-blur-xl">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center transition ${
                active ? 'text-[#171717]' : 'text-[#989389] hover:text-white'
              }`}
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-[#cdff52]' : 'bg-transparent'}`}>
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {icon}
                </span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{label}</span>
            </Link>
          )
        })}
        </div>
      </div>
    </nav>
  )
}
