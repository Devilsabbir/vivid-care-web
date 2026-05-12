import Link from 'next/link'

interface AlertBannerProps {
  clientName: string
  reportedAt: string
  severity: string
  deadline: string
  href: string
}

/**
 * Amber alert banner — surfaces an urgent open incident at the top of
 * the dashboard so admins act before NDIS reporting deadlines.
 */
export default function AlertBanner({ clientName, reportedAt, severity, deadline, href }: AlertBannerProps) {
  const reported = new Date(reportedAt).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
  return (
    <div className="flex flex-col items-start gap-4 rounded-[16px] border border-[#FEF3D6] bg-[#FFFBEB] p-4 md:flex-row md:items-center">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#D97706] text-white">
        <span className="material-symbols-outlined text-[20px]" aria-hidden="true">warning</span>
      </div>
      <div className="min-w-0 flex-1 text-[13px] leading-5 text-[#78350F]">
        <strong className="text-[#5C2E08]">{clientName}</strong> — incident filed {reported} ({severity}).
        Awaiting your review before NDIS reporting window closes {deadline}.
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1 rounded-full border border-[#D97706] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#78350F] hover:bg-[#FEF3D6]"
      >
        Review now
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
      </Link>
    </div>
  )
}
