import { createClient } from '@/lib/supabase/server'
import PaymentsAdminClient from './PaymentsAdminClient'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Fetch completed shifts as the basis for payments
  const { data: shifts, error: shiftsError } = await supabase
    .from('shifts')
    .select('id, start_time, end_time, status, support_type, clock_in_time, clock_out_time, staff_id, client_id, staff:profiles!staff_id(full_name), clients(full_name)')
    .in('status', ['completed', 'active'])
    .order('start_time', { ascending: false })
    .limit(100)
  if (shiftsError) console.error('[payments page] shifts fetch failed:', shiftsError)

  const normalizedShifts = (shifts ?? []).map((shift: any) => ({
    ...shift,
    staff_name: Array.isArray(shift.staff) ? shift.staff[0]?.full_name : shift.staff?.full_name,
    client_name: Array.isArray(shift.clients) ? shift.clients[0]?.full_name : shift.clients?.full_name,
  }))

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
            Track shift hours and clock activity across the organisation.
          </p>
        </div>
      </header>

      <PaymentsAdminClient shifts={normalizedShifts} />
    </div>
  )
}
