export default function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#fafbfc] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#0f172a]">{value}</p>
    </div>
  )
}
