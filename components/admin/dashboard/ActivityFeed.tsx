import Link from 'next/link'

export interface ActivityRow {
  id: string
  icon: string
  iconBg: string
  iconColor: string
  title: string
  time: string
  href?: string
}

interface ActivityFeedProps {
  items: ActivityRow[]
}

/**
 * Recent activity rail card. Mirrors the design's .adm-feed pattern —
 * 32px tinted icon squares, 13.5px slate-700 body, 11.5px slate-400
 * timestamp. Up to 5 rows shown; full feed link sits in the header.
 */
export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold leading-none text-[#1A1320]">Recent activity</h3>
        <Link
          href="/admin/notifications"
          className="text-[12px] font-medium text-[#6B2C91] hover:underline"
        >
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[10px] bg-[#F8F6FA] py-8 text-center">
          <span className="material-symbols-outlined text-[22px] text-[#C7C2CB]" aria-hidden="true">timeline</span>
          <p className="mt-2 text-[12px] font-medium text-[#6B6371]">No recent activity yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.slice(0, 5).map((it) => {
            const Inner = (
              <>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
                  style={{ backgroundColor: it.iconBg, color: it.iconColor }}
                >
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{it.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-[#1A1320]">
                    {it.title}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-[#97909C]">{it.time}</div>
                </div>
              </>
            )
            return (
              <li key={it.id}>
                {it.href ? (
                  <Link
                    href={it.href}
                    className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F6FA]"
                  >
                    {Inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 py-1">{Inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
