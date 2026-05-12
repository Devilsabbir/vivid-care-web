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

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">Recent activity</h3>
        <Link href="/admin/notifications" className="text-[11.5px] font-semibold text-[#6B2C91]">
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#94a3b8]">No recent activity yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {items.slice(0, 5).map(it => {
            const Inner = (
              <>
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: it.iconBg, color: it.iconColor }}
                >
                  <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{it.icon}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[#0f172a]">{it.title}</div>
                  <div className="text-[10.5px] text-[#94a3b8]">{it.time}</div>
                </div>
              </>
            )
            return (
              <li key={it.id}>
                {it.href ? (
                  <Link href={it.href} className="flex items-center gap-2.5 rounded-[10px] py-1 hover:bg-[#f7f8f9]">
                    {Inner}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2.5 py-1">{Inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
