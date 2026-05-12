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
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.2rem] leading-none tracking-[-0.07em] text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{sub}</p>
    </div>
  )
}
