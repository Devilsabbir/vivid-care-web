/**
 * Standard 4-up summary tile used at the top of admin detail pages
 * (Documents, Recent shifts, etc). Mirrors the .adm-kpi token recipe —
 * 16px radius, 18px / 60px-right padding, 32px value, 12px label.
 *
 * Use KpiCard for primary dashboard metrics (delta + spark line);
 * MetricCard is for the simpler value+sub layout.
 */
export default function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string | number
  sub: string
  accent?: boolean
}) {
  const labelColor = accent ? 'rgba(255,255,255,0.7)' : '#6B6371'
  const valueColor = accent ? '#FFFFFF' : '#1A1320'
  const subColor = accent ? 'rgba(255,255,255,0.7)' : '#97909C'
  return (
    <div
      className="rounded-[16px] p-[18px] shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]"
      style={{ background: accent ? '#6B2C91' : '#FFFFFF' }}
    >
      <p
        className="text-[12px] font-medium uppercase"
        style={{ letterSpacing: '0.06em', color: labelColor }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[28px] font-bold leading-none"
        style={{ letterSpacing: '-0.02em', color: valueColor }}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] font-medium" style={{ color: subColor }}>
        {sub}
      </p>
    </div>
  )
}
