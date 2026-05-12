'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/staff/home',          icon: 'home',       label: 'Home' },
  { href: '/staff/clock',         icon: 'timer',      label: 'Clock' },
  { href: '/staff/documentation', icon: 'assignment', label: 'Service' },
  { href: '/staff/documents',     icon: 'folder',     label: 'Docs' },
  { href: '/staff/payments',      icon: 'payments',   label: 'Payments' },
  { href: '/staff/support',       icon: 'smart_toy',  label: 'Support' },
  { href: '/staff/profile',       icon: 'person',     label: 'Profile' },
]

export default function StaffBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Staff navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#e6e8ec] bg-white/95 backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="mx-auto grid max-w-lg grid-cols-7 px-1 pt-1 pb-2">
        {navItems.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              className={[
                'flex flex-col items-center gap-1 rounded-xl px-0.5 py-2 text-center transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
                active ? 'text-[#0f766e]' : 'text-[#94a3b8] hover:text-[#475569]',
              ].join(' ')}
            >
              <span
                className={[
                  'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                  active ? 'bg-[#f0fdfa]' : '',
                ].join(' ')}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={active
                    ? { fontVariationSettings: "'FILL' 1, 'wght' 500" }
                    : { fontVariationSettings: "'FILL' 0, 'wght' 300" }}
                >
                  {icon}
                </span>
              </span>
              <span className={['text-[10px] font-medium', active ? 'font-semibold' : ''].join(' ')}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
