export default function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-[#faf9f6] p-4">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">{label}</p>
      <p className="mt-2 text-sm font-medium text-[#1a1a18]">{value}</p>
    </div>
  )
}
