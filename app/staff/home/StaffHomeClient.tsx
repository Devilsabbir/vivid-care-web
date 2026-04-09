'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

export default function StaffHomeClient({ shifts, staffName }: { shifts: any[]; staffName: string }) {
  const [FC, setFC] = useState<any>(null)
  const [plugins, setPlugins] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/interaction'),
    ]).then(([fc, dg, ip]) => {
      setFC(() => fc.default)
      setPlugins([dg.default, ip.default])
    })
  }, [])

  const now = new Date()
  const upcoming = shifts.filter(s => new Date(s.end_time) >= now).slice(0, 3)
  const todayShifts = shifts.filter(s => {
    const d = new Date(s.start_time)
    return d.toDateString() === now.toDateString()
  })

  const events = shifts.map(s => ({
    id: s.id,
    title: s.clients?.full_name ?? 'Shift',
    start: s.start_time,
    end: s.end_time,
    backgroundColor: s.status === 'active' ? '#2c694e' : s.status === 'completed' ? '#717881' : '#00446f',
    borderColor: 'transparent',
  }))

  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold font-headline text-on-surface">
          {greeting}, {staffName.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {now.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Today's shifts */}
      {todayShifts.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
            <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-label">Today</p>
          </div>
          <div className="space-y-3">
            {todayShifts.map(s => (
              <ShiftCard key={s.id} shift={s} />
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm">
        {FC && plugins.length > 0 ? (
          <FC
            plugins={plugins}
            initialView="dayGridMonth"
            headerToolbar={{ left: 'prev,next', center: 'title', right: '' }}
            events={events}
            height="auto"
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl animate-spin">progress_activity</span>
          </div>
        )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-label mb-3">Upcoming</p>
          <div className="space-y-3">
            {upcoming.map(s => <ShiftCard key={s.id} shift={s} />)}
          </div>
        </div>
      )}

      {shifts.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">calendar_today</span>
          <p className="font-semibold text-sm">No shifts assigned yet</p>
          <p className="text-xs mt-1">Your roster will appear here when assigned</p>
        </div>
      )}
    </div>
  )
}

function ShiftCard({ shift }: { shift: any }) {
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  return (
    <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
      <div className="text-center flex-shrink-0 w-12">
        <p className="text-lg font-black font-headline text-primary leading-none">{start.getDate()}</p>
        <p className="text-[10px] uppercase text-on-surface-variant font-bold">{start.toLocaleDateString('en-AU', { month: 'short' })}</p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm font-headline text-on-surface">{shift.clients?.full_name ?? 'Client'}</p>
        <p className="text-xs text-on-surface-variant">
          {start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
        </p>
        {shift.clients?.address && (
          <p className="text-xs text-outline mt-0.5 flex items-center gap-1 truncate">
            <span className="material-symbols-outlined text-sm flex-shrink-0">location_on</span>
            {shift.clients.address}
          </p>
        )}
      </div>
      <Badge variant={shift.status} />
    </div>
  )
}
