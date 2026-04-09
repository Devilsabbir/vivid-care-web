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
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-header border-t border-outline-variant/20">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-all ${active ? 'text-primary' : 'text-outline hover:text-on-surface'}`}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={active ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {icon}
              </span>
              <span className="text-[10px] font-bold font-label">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
