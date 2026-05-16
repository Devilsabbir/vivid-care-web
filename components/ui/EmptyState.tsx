import Link from 'next/link'

/**
 * Empty-state placeholder. Used across admin pages whenever a list,
 * table, or card has no rows to render. Visuals match the design
 * handoff:
 *  - 16px rounded card with a dashed slate-100 border
 *  - 56px tinted icon circle
 *  - 14.5px / 600 title, 12.5px slate-warm subtitle
 *  - Optional primary action (purple pill)
 */
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
    <div className="rounded-[16px] border border-dashed border-[#E5E1E8] bg-white px-6 py-12 text-center">
      <div
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: '#F4ECF8', color: '#6B2C91' }}
      >
        <span className="material-symbols-outlined text-[26px]" aria-hidden="true">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-[14.5px] font-semibold text-[#1A1320]">{title}</p>
      <p className="mt-1.5 mx-auto max-w-md text-[12.5px] leading-[1.5] text-[#6B6371]">
        {description}
      </p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91] focus-visible:ring-offset-2"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  )
}
