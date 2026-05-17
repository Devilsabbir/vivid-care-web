/**
 * Read-only labeled value tile. Used inside detail-page cards (Client
 * profile, Staff profile, etc) to render key/value pairs in a soft
 * panel. Visuals match the design handoff:
 *  - 10px radius warm slate-50 surface
 *  - 11px uppercase 0.06em label
 *  - 14px / 600 slate-900 value
 */
export default function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-[#F8F6FA] px-3.5 py-3">
      <p
        className="text-[11px] font-medium uppercase text-[#97909C]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </p>
      <p className="mt-1.5 text-[14px] font-semibold leading-tight text-[#1A1320]">{value}</p>
    </div>
  )
}
