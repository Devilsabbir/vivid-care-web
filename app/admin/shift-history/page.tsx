import { createClient } from '@/lib/supabase/server'

type ShiftRow = {
  id: string
  status: 'completed' | 'cancelled'
  start_time: string
  end_time: string
  clock_in_time: string | null
  clock_out_time: string | null
  profiles: { full_name: string | null }[] | null
  clients: { full_name: string | null }[] | null
}

export default async function ShiftHistoryPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('shifts')
    .select('id, status, start_time, end_time, clock_in_time, clock_out_time, profiles(full_name), clients(full_name)')
    .in('status', ['completed', 'cancelled'])
    .order('start_time', { ascending: false })
    .limit(100)

  const shifts = ((data ?? []) as ShiftRow[]).map(shift => ({
    ...shift,
    staffName: shift.profiles?.[0]?.full_name ?? 'Staff member',
    clientName: shift.clients?.[0]?.full_name ?? 'Client record',
  }))

  const totalHours = shifts.reduce((sum, shift) => {
    if (!shift.clock_in_time || !shift.clock_out_time) return sum
    return sum + (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000
  }, 0)

  const completedCount = shifts.filter(shift => shift.status === 'completed').length
  const cancelledCount = shifts.filter(shift => shift.status === 'cancelled').length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Shift history</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">history</span>
              payroll view
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">Review completed services, cancellations, and hours captured for downstream payroll and audit work</p>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Historical shifts" value={shifts.length} tone="white" />
        <SummaryCard label="Completed" value={completedCount} tone="lime" />
        <SummaryCard label="Cancelled" value={cancelledCount} tone="white" danger />
        <SummaryCard label="Clocked hours" value={Number(totalHours.toFixed(1))} suffix="h" tone="white" />
      </section>

      <section className="overflow-hidden rounded-[28px] border border-[#e8e4dc] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-[#f0ece5] px-5 py-4 md:px-6">
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a18]">Historical shift ledger</h3>
            <p className="text-xs text-[#8a877f]">Clocked hours are calculated from attendance timestamps when available</p>
          </div>
          <span className="rounded-xl bg-[#f4f2ed] px-3 py-1.5 text-[11px] text-[#66635b]">Latest 100 records</span>
        </div>

        {shifts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#adaba4]">
                  <th className="px-6 py-3 font-medium">Staff member</th>
                  <th className="px-6 py-3 font-medium">Client</th>
                  <th className="px-6 py-3 font-medium">Date and time</th>
                  <th className="px-6 py-3 font-medium">Hours</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map(shift => (
                  <tr key={shift.id} className="border-t border-[#f5f1ea] text-sm text-[#1a1a18]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1a1a18] text-[10px] font-semibold uppercase tracking-[0.14em] text-[#cdff52]">
                          {initials(shift.staffName)}
                        </div>
                        <span className="font-medium">{shift.staffName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#5f5c56]">{shift.clientName}</td>
                    <td className="px-6 py-4 text-[#5f5c56]">
                      <div>{new Date(shift.start_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      <div className="text-xs text-[#9c998f]">
                        {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} - {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[#1a1a18]">{hoursLabel(shift)}</td>
                    <td className="px-6 py-4">
                      <span className={shift.status === 'completed' ? 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]' : 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'}>
                        {shift.status === 'completed' ? 'Completed' : 'Cancelled'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#bbb6ad]">history</span>
            <p className="mt-3 text-sm font-medium text-[#1a1a18]">No historical shifts yet</p>
            <p className="mt-1 text-xs text-[#8a877f]">Completed and cancelled visits will appear here as the platform is used.</p>
          </div>
        )}
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  tone,
  suffix,
  danger,
}: {
  label: string
  value: number
  tone: 'white' | 'lime'
  suffix?: string
  danger?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${tone === 'lime' ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${tone === 'lime' ? 'text-[#627100]' : danger ? 'text-[#dc2626]' : 'text-[#8a877f]'}`}>{label}</p>
      <div className="mt-2 flex items-end gap-1">
        <p className={`font-headline text-[2.35rem] leading-none tracking-[-0.07em] ${danger ? 'text-[#dc2626]' : 'text-[#1a1a18]'}`}>{value}</p>
        {suffix ? <span className="pb-1 text-xs text-[#8a877f]">{suffix}</span> : null}
      </div>
    </div>
  )
}

function hoursLabel(shift: ShiftRow) {
  if (!shift.clock_in_time || !shift.clock_out_time) return '—'
  const hours = (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000
  return `${hours.toFixed(1)}h`
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}
