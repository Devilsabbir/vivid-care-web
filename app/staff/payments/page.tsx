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

  const totalHours = (shifts ?? []).reduce((sum, s) => {
    if (!s.clock_in_time || !s.clock_out_time) return sum
    return sum + (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000
  }, 0)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Payments</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">Completed shifts and hours</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
          <p className="text-3xl font-black font-headline text-on-surface">{(shifts ?? []).length}</p>
          <p className="text-sm text-on-surface-variant font-label mt-1">Completed Shifts</p>
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
          <p className="text-3xl font-black font-headline text-secondary">{totalHours.toFixed(1)}h</p>
          <p className="text-sm text-on-surface-variant font-label mt-1">Total Hours</p>
        </div>
      </div>

      <div className="bg-primary-fixed/30 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-primary text-xl flex-shrink-0">info</span>
        <p className="text-sm text-primary font-semibold">
          Payment processing is managed by your admin. Contact your administrator for payroll enquiries.
        </p>
      </div>

      {/* Shift list */}
      {shifts && shifts.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-label mb-2">Shift History</p>
          {shifts.map(s => {
            const hours = s.clock_in_time && s.clock_out_time
              ? ((new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000).toFixed(1)
              : null
            const start = new Date(s.start_time)
            return (
              <div key={s.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm font-headline text-on-surface">{s.clients?.full_name ?? 'Client'}</p>
                  <p className="text-xs text-on-surface-variant">
                    {start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} •{' '}
                    {new Date(s.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(s.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  {hours ? (
                    <p className="font-bold text-sm text-on-surface">{hours}h</p>
                  ) : (
                    <p className="text-xs text-outline">No clock record</p>
                  )}
                  <span className="text-[10px] font-black uppercase text-secondary bg-secondary-container/40 px-2 py-0.5 rounded-full">Completed</span>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">payments</span>
          <p className="text-sm font-semibold">No completed shifts yet</p>
        </div>
      )}
    </div>
  )
}
