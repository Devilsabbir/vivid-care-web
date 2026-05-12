'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ALL_NAV_ITEMS = [
  { href: '/client/home', icon: 'home', label: 'Home', ndisOnly: false },
  { href: '/client/agreements', icon: 'description', label: 'Agreements', ndisOnly: true },
  { href: '/client/shifts', icon: 'calendar_month', label: 'Visits', ndisOnly: false },
  { href: '/client/profile', icon: 'person', label: 'Profile', ndisOnly: false },
]

export default function ClientBottomNav({ isNdis = true }: { isNdis?: boolean }) {
  const pathname = usePathname()
  const navItems = ALL_NAV_ITEMS.filter(item => !item.ndisOnly || isNdis)

  return (
    <nav aria-label="Client navigation" className="pointer-events-none fixed inset-x-0 bottom-0 z-50">
      <div className="pointer-events-auto mx-auto mb-4 max-w-lg px-4">
        <div className={`grid h-[76px] items-center rounded-[28px] border border-white/10 bg-[#0f172a]/95 px-2 shadow-[0_24px_44px_rgba(23,23,22,0.26)] backdrop-blur-xl ${navItems.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {navItems.map(({ href, icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                aria-label={label}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] ${
                  active ? 'text-[#0f172a]' : 'text-[#989389] hover:text-white'
                }`}
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? 'bg-[#6B2C91]' : 'bg-transparent'}`}>
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
