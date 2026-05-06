import { createClient } from '@/lib/supabase/server'
import ShiftsListClient from './ShiftsListClient'

export default async function ShiftsPage() {
  const supabase = await createClient()

  const [
    { data: shifts, error: shiftsError },
    { data: staff, error: staffError },
    { data: clients, error: clientsError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('id, start_time, end_time, status, support_type, clock_in_time, clock_out_time, notes, staff_id, client_id, staff:profiles!staff_id(full_name), clients(full_name, address)')
      .order('start_time', { ascending: false })
      .limit(100),
    supabase.from('profiles').select('id, full_name').eq('role', 'staff').order('full_name'),
    supabase.from('clients').select('id, full_name').order('full_name'),
  ])
  if (shiftsError) console.error('[shifts page] shifts fetch failed:', shiftsError)
  if (staffError) console.error('[shifts page] profiles fetch failed:', staffError)
  if (clientsError) console.error('[shifts page] clients fetch failed:', clientsError)

  const normalizedShifts = (shifts ?? []).map((shift: any) => ({
    ...shift,
    staff_name: Array.isArray(shift.staff) ? shift.staff[0]?.full_name : shift.staff?.full_name,
    client_name: Array.isArray(shift.clients) ? shift.clients[0]?.full_name : shift.clients?.full_name,
    client_address: Array.isArray(shift.clients) ? shift.clients[0]?.address : shift.clients?.address,
  }))

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Shifts</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">event_note</span>
              all records
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">
            View and manage all shift records across the organisation.
          </p>
        </div>
      </header>

      <ShiftsListClient
        shifts={normalizedShifts}
        staff={staff ?? []}
        clients={clients ?? []}
      />
    </div>
  )
}
