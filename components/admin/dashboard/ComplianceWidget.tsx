import Link from 'next/link'

export interface ExpiringDoc {
  id: string
  docType: string
  ownerName: string
  ownerType: 'staff' | 'client'
  ownerId: string
  daysLeft: number
}

interface ComplianceWidgetProps {
  docs: ExpiringDoc[]
  totalCount: number
}

/**
 * Expiring credentials rail card. Status dots colour-code urgency
 * (red < 7 days, amber < 30, green otherwise). Rows link to the owner's
 * documents tab.
 */
export default function ComplianceWidget({ docs, totalCount }: ComplianceWidgetProps) {
  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-[14px] font-semibold leading-none text-[#1A1320]">
            Expiring credentials
          </h3>
          <p className="mt-1.5 text-[12px] text-[#6B6371]">{totalCount} in next 30 days</p>
        </div>
        <Link
          href="/admin/compliance"
          className="text-[12px] font-medium text-[#6B2C91] hover:underline"
        >
          View all →
        </Link>
      </div>

      {docs.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[10px] bg-[#F1F9E1] py-6 text-center">
          <span className="material-symbols-outlined text-[20px] text-[#5E8D1F]" aria-hidden="true">verified</span>
          <p className="mt-1.5 text-[12px] font-semibold text-[#5E8D1F]">All current</p>
          <p className="text-[11px] font-medium text-[#5E8D1F]/70">No documents expiring soon.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-1">
          {docs.slice(0, 5).map((d) => {
            const tone =
              d.daysLeft < 7
                ? { fg: '#DC2626', bg: '#FCE7E7' }
                : d.daysLeft < 30
                  ? { fg: '#D97706', bg: '#FEF3D6' }
                  : { fg: '#5E8D1F', bg: '#F1F9E1' }
            const href =
              d.ownerType === 'staff'
                ? `/admin/staff/${d.ownerId}?tab=documents`
                : `/admin/clients/${d.ownerId}?tab=documents`
            return (
              <li key={d.id}>
                <Link
                  href={href}
                  className="-mx-2 flex items-center gap-2.5 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F6FA]"
                >
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: tone.fg }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium leading-tight text-[#1A1320]">
                      {d.docType}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-[#6B6371]">{d.ownerName}</p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-[2px] text-[11px] font-semibold"
                    style={{ background: tone.bg, color: tone.fg }}
                  >
                    {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d over` : `${d.daysLeft}d`}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
