interface ClientMixDonutProps {
  ndis: number
  standard: number
}

/**
 * Two-arc donut chart — NDIS vs Standard clients.
 *
 * Visuals per the design's "Client mix" rail card:
 *  - 16px radius card with the warm purple-tinted shadow
 *  - 140px donut, NDIS arc in brand blue (#2BAEE0), Standard in slate
 *  - Centred total + label inside the donut
 *  - Legend rows with rounded swatches + tabular figures on the right
 *
 * Pure inline SVG, no chart library.
 */
export default function ClientMixDonut({ ndis, standard }: ClientMixDonutProps) {
  const total = ndis + standard
  const ndisPct = total > 0 ? (ndis / total) * 100 : 0
  const stdPct = total > 0 ? (standard / total) * 100 : 0

  const r = 40
  const c = 2 * Math.PI * r
  const ndisStroke = (ndisPct / 100) * c

  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[14px] font-semibold leading-none text-[#1A1320]">Client mix</h3>
          <p className="mt-1.5 text-[12px] text-[#6B6371]">NDIS vs Standard</p>
        </div>
        <span
          className="inline-flex items-center gap-1 rounded-full bg-[#F4ECF8] px-2 py-[3px] text-[11px] font-semibold uppercase text-[#54206F]"
          style={{ letterSpacing: '0.04em' }}
        >
          {total} active
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-[120px] w-[120px] -rotate-90" aria-hidden="true">
          {/* Track */}
          <circle cx="50" cy="50" r={r} fill="none" stroke="#F1EEF4" strokeWidth="12" />
          {/* NDIS arc — blue */}
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#2BAEE0"
            strokeWidth="12"
            strokeDasharray={`${ndisStroke} ${c}`}
            strokeLinecap="round"
          />
          {/* Total centred */}
          <text
            x="50"
            y="46"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 50 50)"
            style={{ fontFamily: 'IBM Plex Sans', fontSize: 22, fontWeight: 700, fill: '#1A1320', letterSpacing: '-0.04em' }}
          >
            {total}
          </text>
          <text
            x="50"
            y="60"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 50 50)"
            style={{ fontFamily: 'IBM Plex Sans', fontSize: 8, fontWeight: 500, fill: '#6B6371', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            Clients
          </text>
        </svg>
        <div className="flex-1 space-y-2.5">
          <LegendRow color="#2BAEE0" label="NDIS Clients" value={ndis} pct={ndisPct} />
          <LegendRow color="#C7C2CB" label="Standard" value={standard} pct={stdPct} />
        </div>
      </div>
    </section>
  )
}

function LegendRow({
  color,
  label,
  value,
  pct,
}: {
  color: string
  label: string
  value: number
  pct: number
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span className="flex-1 truncate text-[12.5px] text-[#3F3548]">{label}</span>
      <span className="font-mono text-[12px] text-[#97909C]">{pct.toFixed(0)}%</span>
      <span className="font-mono text-[13px] font-semibold text-[#1A1320]" style={{ minWidth: 24, textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
