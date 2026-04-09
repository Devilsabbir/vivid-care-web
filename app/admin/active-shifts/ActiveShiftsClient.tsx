'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'

export default function ActiveShiftsClient({ initialShifts }: { initialShifts: any[] }) {
  const [shifts, setShifts] = useState(initialShifts)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('active_shifts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
        // Re-fetch on any shift change
        supabase
          .from('shifts')
          .select('*, profiles(full_name, phone), clients(full_name, address, lat, lng)')
          .in('status', ['active', 'scheduled'])
          .gte('start_time', new Date(Date.now() - 86400000).toISOString())
          .order('start_time', { ascending: true })
          .then(({ data }) => data && setShifts(data))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const active = shifts.filter(s => s.status === 'active')
  const scheduled = shifts.filter(s => s.status === 'scheduled')

  return (
    <div className="space-y-8">
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'Active Now', value: active.length, color: 'text-secondary', bg: 'bg-secondary-container/40' },
          { label: 'Scheduled Today', value: scheduled.length, color: 'text-primary', bg: 'bg-primary-fixed/60' },
          { label: 'Total Monitored', value: shifts.length, color: 'text-on-surface', bg: 'bg-surface-container' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
            <p className={`text-3xl font-black font-headline ${color}`}>{value}</p>
            <p className="text-sm text-on-surface-variant font-label mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Active shifts */}
      {active.length > 0 && (
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant font-label mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            Active Now
          </h3>
          <div className="space-y-3">
            {active.map(shift => <ShiftRow key={shift.id} shift={shift} />)}
          </div>
        </div>
      )}

      {/* Scheduled */}
      {scheduled.length > 0 && (
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-on-surface-variant font-label mb-3">Scheduled Today</h3>
          <div className="space-y-3">
            {scheduled.map(shift => <ShiftRow key={shift.id} shift={shift} />)}
          </div>
        </div>
      )}

      {shifts.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">location_off</span>
          <p className="font-semibold">No active or scheduled shifts</p>
        </div>
      )}
    </div>
  )
}

function ShiftRow({ shift }: { shift: any }) {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const now = new Date()
  const progress = shift.status === 'active' && shift.clock_in_time
    ? Math.min(100, ((now.getTime() - new Date(shift.clock_in_time).getTime()) / (end.getTime() - start.getTime())) * 100)
    : 0

  return (
    <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex items-center gap-4">
      <div className="w-11 h-11 primary-gradient rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        {shift.profiles?.full_name?.charAt(0) ?? '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-bold font-headline text-sm text-on-surface">{shift.profiles?.full_name}</p>
          {shift.status === 'active' && (
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-on-surface-variant">
          Client: {shift.clients?.full_name} • {start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {shift.clients?.address && (
          <p className="text-xs text-outline mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">location_on</span>
            {shift.clients.address}
          </p>
        )}
      </div>
      {shift.status === 'active' && progress > 0 && (
        <div className="hidden md:block w-24">
          <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-secondary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[10px] text-on-surface-variant mt-1 text-right">{Math.round(progress)}%</p>
        </div>
      )}
      <div className="flex-shrink-0">
        <Badge variant={shift.status} />
        {shift.clock_in_time && (
          <p className="text-[10px] text-on-surface-variant mt-1 text-right">
            In: {new Date(shift.clock_in_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
