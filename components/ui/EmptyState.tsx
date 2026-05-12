import Link from 'next/link'

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: string
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#e6e8ec] bg-white px-6 py-16 text-center">
      <span className="material-symbols-outlined text-[44px] text-[#94a3b8]" aria-hidden="true">{icon}</span>
      <p className="mt-3 text-sm font-medium text-[#0f172a]">{title}</p>
      <p className="mt-1 text-xs text-[#64748b]">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#0f172a] px-5 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
