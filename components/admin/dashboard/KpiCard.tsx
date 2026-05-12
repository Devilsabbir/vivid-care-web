import Sparkline from './Sparkline'

interface KpiCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  delta: string
  direction: 'up' | 'down' | 'flat'
  target: number // 0-100 percentage
  context: string
  color: string
  bg: string
  spark: number[]
}

/**
 * Top-row metric card — icon, value, delta, target progress bar, sparkline.
 * Lifted from the design bundle's `.adm-kpi` block.
 */
export default function KpiCard({
  icon, label, value, sub, delta, direction, target, context, color, bg, spark,
}: KpiCardProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const deltaColor =
    direction === 'up' ? '#16A34A' : direction === 'down' ? '#DC2626' : '#64748b'

  return (
    <div className="relative overflow-hidden rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: bg, color }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748b]">{label}</p>
      <p className="mt-2 flex items-baseline gap-1.5 text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a]">
        {value}
        {sub && <span className="text-[12px] font-medium text-[#94a3b8]">{sub}</span>}
      </p>
      <p className="mt-1 text-[12px] font-medium" style={{ color: deltaColor }}>
        {arrow} {delta}
      </p>
      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded-full bg-[#f0f1f3]">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(100, target)}%`, backgroundColor: color }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10.5px] font-medium text-[#64748b]">
          <span>{context}</span>
          <span>Target {target}%</span>
        </div>
      </div>
      <div className="mt-3">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  )
}
