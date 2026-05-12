interface ClientMixDonutProps {
  ndis: number
  standard: number
}

/**
 * Two-arc donut chart — NDIS vs Standard clients.
 * Pure inline SVG, no chart library.
 */
export default function ClientMixDonut({ ndis, standard }: ClientMixDonutProps) {
  const total = ndis + standard
  const ndisPct = total > 0 ? (ndis / total) * 100 : 0

  const r = 42
  const c = 2 * Math.PI * r
  const ndisStroke = (ndisPct / 100) * c

  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <h3 className="text-[14px] font-semibold text-[#0f172a]">Client mix</h3>
      <p className="mt-1 text-[12px] text-[#64748b]">NDIS vs standard</p>
      <div className="mt-4 flex items-center gap-5">
        <svg viewBox="0 0 100 100" className="h-[110px] w-[110px] -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f0f1f3" strokeWidth="14" />
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="#1380AB"
            strokeWidth="14"
            strokeDasharray={`${ndisStroke} ${c}`}
            strokeLinecap="butt"
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="central"
            transform="rotate(90 50 50)"
            style={{ fontFamily: 'IBM Plex Sans', fontSize: 18, fontWeight: 600, fill: '#0f172a' }}
          >
            {total}
          </text>
        </svg>
        <div className="flex-1 space-y-2 text-[12px]">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#1380AB]" />
            <span className="flex-1 text-[#0f172a]">NDIS Clients</span>
            <span className="font-semibold text-[#0f172a]">{ndis}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#94a3b8]" />
            <span className="flex-1 text-[#0f172a]">Standard</span>
            <span className="font-semibold text-[#0f172a]">{standard}</span>
          </div>
        </div>
      </div>
    </section>
  )
}
