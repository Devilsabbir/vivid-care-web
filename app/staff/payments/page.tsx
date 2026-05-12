import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function fmtMoney(value: number): string {
  return `$${value.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default async function StaffPaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: shifts, error: shiftsError }] = await Promise.all([
    supabase.from('profiles').select('hourly_rate').eq('id', user.id).single(),
    supabase
      .from('shifts')
      .select('id, start_time, end_time, clock_in_time, clock_out_time, payment_status, paid_at, clients(full_name)')
      .eq('staff_id', user.id)
      .eq('status', 'completed')
      .order('start_time', { ascending: false }),
  ])
  if (shiftsError) console.error('[staff payments] shifts fetch failed:', shiftsError)

  const hourlyRate = Number(profile?.hourly_rate ?? 0)

  const enriched = (shifts ?? []).map((shift: any) => {
    const hours = shift.clock_in_time && shift.clock_out_time
      ? (new Date(shift.clock_out_time).getTime() - new Date(shift.clock_in_time).getTime()) / 3600000
      : 0
    const amount = hours > 0 ? hours * hourlyRate : 0
    return { ...shift, hours: hours > 0 ? hours : 0, amount, paymentStatus: (shift.payment_status ?? 'pending') as 'pending' | 'paid' }
  })

  const totalHours = enriched.reduce((sum, s) => sum + s.hours, 0)
  const pendingAmount = enriched
    .filter(s => s.paymentStatus === 'pending')
    .reduce((sum, s) => sum + s.amount, 0)
  const paidAmount = enriched
    .filter(s => s.paymentStatus === 'paid')
    .reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#0f172a] px-5 py-5 text-white shadow-[0_24px_44px_rgba(15,23,42,0.10)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Payments</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Earnings overview</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Hourly rate: <span className="font-semibold text-white">{fmtMoney(hourlyRate)}/hr</span>
          {hourlyRate === 0 && <span className="ml-2 rounded-full bg-[#dc2626]/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#fecaca]">Not set</span>}
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Hours" value={totalHours.toFixed(1)} />
          <MiniStat label="Pending" value={fmtMoney(pendingAmount)} accent />
          <MiniStat label="Paid" value={fmtMoney(paidAmount)} />
        </div>
      </section>

      {hourlyRate === 0 && (
        <section className="rounded-[24px] border border-[#fef08a] bg-[#fefce8] p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#92400e]">info</span>
            <p className="text-sm leading-6 text-[#92400e]">
              Your hourly rate has not been set yet. Contact your admin coordinator — earnings cannot be calculated until a rate is configured on your profile.
            </p>
          </div>
        </section>
      )}

      {enriched.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#64748b]">History</p>
            <h2 className="mt-1 text-lg font-semibold text-[#0f172a]">Completed shifts</h2>
          </div>

          <div className="space-y-3">
            {enriched.map((shift: any) => {
              const start = new Date(shift.start_time)
              const clientName = Array.isArray(shift.clients) ? shift.clients[0]?.full_name : shift.clients?.full_name

              return (
                <article key={shift.id} className="rounded-[24px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0f172a]">{clientName ?? 'Client'}</p>
                      <p className="mt-1 text-xs text-[#64748b]">
                        {start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} · {shift.hours.toFixed(1)}h
                      </p>
                      {shift.paid_at && (
                        <p className="mt-1 text-[11px] text-[#54206F]">Paid {new Date(shift.paid_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="font-headline text-lg font-semibold text-[#0f172a]">{fmtMoney(shift.amount)}</p>
                      <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                        shift.paymentStatus === 'paid'
                          ? 'bg-[#F4ECF8] text-[#54206F]'
                          : 'bg-[#fef9c3] text-[#92400e]'
                      }`}>
                        {shift.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[#e6e8ec] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">payments</span>
          <p className="mt-3 text-sm font-semibold text-[#0f172a]">No completed shifts yet</p>
          <p className="mt-1 text-xs text-[#64748b]">Earnings appear here once you've clocked out of completed shifts.</p>
        </section>
      )}
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${accent ? 'bg-[#6B2C91] text-[#0f172a]' : 'bg-white/8 text-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#54206F]' : 'text-[#8f8a80]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.5rem] font-semibold leading-none tracking-[-0.04em]">{value}</p>
    </div>
  )
}
