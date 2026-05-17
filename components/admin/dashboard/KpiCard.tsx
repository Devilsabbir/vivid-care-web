import Sparkline from './Sparkline'

interface KpiCardProps {
  icon: string
  label: string
  value: string | number
  sub?: string
  delta: string
  direction: 'up' | 'down' | 'flat'
  target: number
  context: string
  color: string
  bg: string
  spark: number[]
}

/**
 * Top-row metric card. Uses the design-handoff `.adm-kpi` class
 * directly so the visual treatment is sourced from
 * `styles/vc-admin.css` rather than re-declared in Tailwind.
 *
 * `.adm-kpi` declares: white surface, 16px radius, warm purple shadow,
 * 18px padding (60px right reserved for `.corner-icon`).
 * `.adm-kpi .lbl`, `.val`, `.delta`, `.corner-icon`, `.delta.up/dn/flat`
 * carry the rest of the typography.
 */
export default function KpiCard({
  icon, label, value, sub, delta, direction, target, context, color, bg, spark,
}: KpiCardProps) {
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  return (
    <div className="adm-kpi">
      <div className="corner-icon" style={{ background: bg, color }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }} aria-hidden="true">
          {icon}
        </span>
      </div>

      <div className="lbl">{label}</div>

      <div className="val">
        {value}
        {sub && <sub>{sub}</sub>}
      </div>

      <div className={`delta ${direction}`} title={context}>
        <span aria-hidden="true">{arrow}</span>
        {delta}
      </div>

      <div style={{ marginTop: 10, marginBottom: 6 }}>
        <div style={{ height: 4, borderRadius: 999, background: 'var(--slate-100)', overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, target)}%`,
              height: '100%',
              background: color,
              borderRadius: 999,
            }}
          />
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 5,
            font: '500 10.5px/1 var(--ff-sans)',
            color: 'var(--slate-500)',
            letterSpacing: '0.02em',
          }}
        >
          <span>{context}</span>
          <span>Target {target}{label.toLowerCase().includes('incident') ? '' : '%'}</span>
        </div>
      </div>

      <Sparkline data={spark} color={color} />
    </div>
  )
}
