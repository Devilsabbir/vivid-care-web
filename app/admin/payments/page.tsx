import { createClient } from '@/lib/supabase/server'
import PaymentsAdminClient from './PaymentsAdminClient'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Fetch shifts with the linked staff member's hourly rate and the client name.
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, start_time, end_time, status, support_type, clock_in_time, clock_out_time, staff_id, client_id, payment_status, paid_at, staff:profiles!staff_id(full_name, hourly_rate), clients(full_name)')
    .in('status', ['completed', 'active'])
    .order('start_time', { ascending: false })
    .limit(200)
  if (shiftsError) console.error('[payments page] shifts fetch failed:', shiftsError)

  const normalizedShifts = (shifts ?? []).map((shift: any) => {
    const staffRecord = Array.isArray(shift.staff) ? shift.staff[0] : shift.staff
    const clientRecord = Array.isArray(shift.clients) ? shift.clients[0] : shift.clients
    return {
      id: shift.id,
      start_time: shift.start_time,
      end_time: shift.end_time,
      status: shift.status,
      support_type: shift.support_type,
      staff_id: shift.staff_id,
      client_id: shift.client_id,
      clock_in_time: shift.clock_in_time,
      clock_out_time: shift.clock_out_time,
      payment_status: (shift.payment_status ?? 'pending') as 'pending' | 'paid',
      paid_at: shift.paid_at as string | null,
      staff_name: staffRecord?.full_name ?? null,
      hourly_rate: Number(staffRecord?.hourly_rate ?? 0),
      client_name: clientRecord?.full_name ?? null,
    }
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">Payments</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
              <span className="material-symbols-outlined text-[18px]">payments</span>
              billing
            </span>
          </div>
          <p className="text-sm text-[#64748b]">
            Staff hours, billable amounts, and outstanding payments calculated from clocked time.
          </p>
        </div>
      </header>

      <PaymentsAdminClient shifts={normalizedShifts} />
    </div>
  )
}
