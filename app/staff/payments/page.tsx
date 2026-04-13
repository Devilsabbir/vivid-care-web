import { createClient } from '@/lib/supabase/server'

export default async function StaffPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, clients(full_name)')
    .eq('staff_id', user!.id)
    .eq('status', 'completed')
    .order('start_time', { ascending: false })

  const totalHours = (shifts ?? []).reduce((sum, shift) => {
    if (!shift.clock_in_time || !shift.clock_out_time) return sum
    return sum + (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000
  }, 0)

  const averageHours = (shifts ?? []).length > 0 ? totalHours / (shifts ?? []).length : 0

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Payments</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Completed hours</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          This view helps you check completed shifts before payroll is processed by admin.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Shifts" value={(shifts ?? []).length} />
          <MiniStat label="Hours" value={Number(totalHours.toFixed(1))} accent />
          <MiniStat label="Avg" value={Number(averageHours.toFixed(1))} />
        </div>
      </section>

      <section className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#cdff52] text-[#171716]">
            <span className="material-symbols-outlined text-[20px]">info</span>
          </div>
          <p className="text-sm leading-6 text-[#666258]">
            Payment processing is managed by admin. If hours look incorrect, raise it with your coordinator before payroll cut-off.
          </p>
        </div>
      </section>

      {(shifts ?? []).length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">History</p>
            <h2 className="mt-1 text-lg font-semibold text-[#171716]">Completed shift log</h2>
          </div>

          <div className="space-y-3">
            {shifts!.map(shift => {
              const hours = shift.clock_in_time && shift.clock_out_time
                ? ((new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000).toFixed(1)
                : null
              const start = new Date(shift.start_time)

              return (
                <article key={shift.id} className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#171716]">{shift.clients?.full_name ?? 'Client'}</p>
                      <p className="mt-1 text-xs text-[#8b867b]">
                        {start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} - {new Date(shift.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} to {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-headline text-lg font-semibold text-[#171716]">{hours ? `${hours}h` : '-'}</p>
                      <span className="rounded-full bg-[#f4f1ea] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a665f]">
                        Completed
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#b5afa5]">payments</span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">No completed shifts yet</p>
          <p className="mt-1 text-xs text-[#8b867b]">Completed visits with clock records will appear here for payroll review.</p>
        </section>
      )}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${accent ? 'bg-[#cdff52] text-[#171716]' : 'bg-white/8 text-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#627100]' : 'text-[#8f8a80]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{value}</p>
    </div>
  )
}
