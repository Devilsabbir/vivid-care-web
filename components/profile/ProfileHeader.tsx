import Link from 'next/link'
import { type ReactNode } from 'react'

interface Action {
  label: string
  href?: string
  icon: string
  onClick?: () => void
}

export default function ProfileHeader({
  name,
  subtitle,
  backHref,
  backLabel,
  avatarBg = 'bg-[#1a1a18]',
  avatarColor = 'text-[#c852ff]',
  statusBadge,
  actions = [],
  children,
}: {
  name: string
  subtitle: string
  backHref: string
  backLabel: string
  avatarBg?: string
  avatarColor?: string
  statusBadge?: ReactNode
  actions?: Action[]
  children?: ReactNode
}) {
  const initials = (name ?? 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')

  return (
    <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff]"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${avatarBg} text-xl font-semibold uppercase tracking-[0.14em] ${avatarColor}`}>
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
                <span className="font-headline">{name}</span>
              </h1>
              {statusBadge}
            </div>
            <p className="text-sm text-[#6c6b66]">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>

      {actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {actions.map(action =>
            action.href ? (
              <Link
                key={action.label}
                href={action.href}
                className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff] focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{action.icon}</span>
                {action.label}
              </Link>
            ) : (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#ddd9d1] bg-white px-4 py-2.5 text-sm font-semibold text-[#5e5b54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff] focus-visible:ring-offset-2"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{action.icon}</span>
                {action.label}
              </button>
            )
          )}
        </div>
      )}
    </header>
  )
}
