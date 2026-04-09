import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'

export default async function ShiftHistoryPage() {
  const supabase = await createClient()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, profiles(full_name), clients(full_name)')
    .in('status', ['completed', 'cancelled'])
    .order('start_time', { ascending: false })
    .limit(100)

  const totalHours = (shifts ?? []).reduce((sum, s) => {
    if (!s.clock_in_time || !s.clock_out_time) return sum
    return sum + (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000
  }, 0)

  return (
    <div className="max-w-6xl">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Shift History</h2>
          <p className="text-on-surface-variant text-sm mt-1">{shifts?.length ?? 0} completed shifts • {totalHours.toFixed(1)}h total</p>
        </div>
      </header>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
        <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label border-b border-outline-variant/10">
          <div className="col-span-3">Staff</div>
          <div className="col-span-3">Client</div>
          <div className="col-span-3">Date & Time</div>
          <div className="col-span-1">Hours</div>
          <div className="col-span-2">Status</div>
        </div>

        {shifts && shifts.length > 0 ? (
          <div>
            {shifts.map((s, i) => {
              const hours = s.clock_in_time && s.clock_out_time
                ? ((new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000).toFixed(1)
                : '—'
              return (
                <div key={s.id} className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/50 transition-colors ${i % 2 === 1 ? 'bg-surface-container-low/20' : ''}`}>
                  <div className="col-span-3 font-semibold text-sm text-on-surface">{s.profiles?.full_name ?? '—'}</div>
                  <div className="col-span-3 text-sm text-on-surface-variant">{s.clients?.full_name ?? '—'}</div>
                  <div className="col-span-3 text-sm text-on-surface-variant">
                    {new Date(s.start_time).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}<br />
                    <span className="text-xs">{new Date(s.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – {new Date(s.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="col-span-1 text-sm font-semibold text-on-surface">{hours}h</div>
                  <div className="col-span-2"><Badge variant={s.status} /></div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3 block">history</span>
            <p className="text-sm font-semibold">No completed shifts yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
