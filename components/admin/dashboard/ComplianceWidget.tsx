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

export default function ComplianceWidget({ docs, totalCount }: ComplianceWidgetProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0f172a]">Expiring credentials</h3>
          <p className="mt-1 text-[12px] text-[#64748b]">{totalCount} in next 30 days</p>
        </div>
        <Link href="/admin/compliance" className="text-[11.5px] font-semibold text-[#6B2C91]">
          View all
        </Link>
      </div>
      {docs.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#94a3b8]">No documents expiring soon.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {docs.slice(0, 5).map(d => {
            const tone = d.daysLeft < 7 ? '#DC2626' : d.daysLeft < 30 ? '#D97706' : '#5E8D1F'
            const href = d.ownerType === 'staff'
              ? `/admin/staff/${d.ownerId}?tab=documents`
              : `/admin/clients/${d.ownerId}?tab=documents`
            return (
              <li key={d.id}>
                <Link href={href} className="flex items-center gap-2 rounded-[8px] py-1 text-[12px] hover:bg-[#f7f8f9]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: tone }} />
                  <span className="flex-1 truncate font-medium text-[#0f172a]">{d.docType}</span>
                  <span className="truncate text-[#64748b]">{d.ownerName}</span>
                  <span className="shrink-0 font-semibold" style={{ color: tone }}>
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
