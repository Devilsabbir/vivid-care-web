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
 * Pixel-aligned with the design bundle's `.adm-kpi` block (admin-styles.css).
 *
 * Key dimensions from the design:
 *  - 16px border-radius, 18px padding (60px right to reserve corner-icon space)
 *  - label: 12px 500 uppercase slate-500, letter-spacing 0.06em
 *  - value: 32px 700 with optional 13px slate-500 sub
 *  - delta: pill with green-50 (up) / danger-bg (dn) / slate-100 (flat) bg
 *  - corner icon: 32x32, 9px radius, colored bg + foreground
 *  - context bar: 4px rounded with actual %, label + Target text below
 *  - sparkline at the bottom
 */
export default function KpiCard({
  icon, label, value, sub, delta, direction, target, context, color, bg, spark,
}: KpiCardProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const deltaPillStyle =
    direction === 'up'
      ? { backgroundColor: '#F1F9E1', color: '#5E8D1F' }
      : direction === 'down'
        ? { backgroundColor: '#FCE7E7', color: '#DC2626' }
        : { backgroundColor: '#F1EEF4', color: '#3F3548' }

  return (
    <div
      className="relative overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]"
      style={{ padding: '18px 60px 18px 18px' }}
    >
      {/* Corner icon */}
      <div
        className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: bg, color }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      </div>

      {/* Label */}
      <p
        className="text-[12px] font-medium uppercase text-[#6B6371]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </p>

      {/* Value */}
      <p
        className="mt-3.5 flex items-baseline gap-1.5 text-[32px] font-bold text-[#1A1320]"
        style={{ letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        {value}
        {sub && <span className="text-[13px] font-medium text-[#6B6371]">{sub}</span>}
      </p>

      {/* Delta pill */}
      <div
        className="mt-2.5 inline-flex items-center gap-1 rounded-full px-[7px] py-[3px] text-[12px] font-semibold"
        style={deltaPillStyle}
        title={context}
      >
        <span aria-hidden="true">{arrow}</span>
        <span>{delta}</span>
      </div>

      {/* Context bar */}
      <div className="mt-2.5">
        <div className="h-1 overflow-hidden rounded-full bg-[#F1EEF4]">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.min(100, target)}%`, backgroundColor: color }}
          />
        </div>
        <div
          className="mt-1.5 flex justify-between text-[10.5px] font-medium text-[#6B6371]"
          style={{ letterSpacing: '0.02em' }}
        >
          <span>{context}</span>
          <span>Target {target}{label.toLowerCase().includes('incident') ? '' : '%'}</span>
        </div>
      </div>

      {/* Sparkline */}
      <div className="mt-2.5">
        <Sparkline data={spark} color={color} />
      </div>
    </div>
  )
}
