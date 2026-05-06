'use client'

import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'

interface StaffShiftDetailClientProps {
  shift: any
  client: any
  clockEvents: any[]
}

function getShiftState(shift: any): {
  label: string
  status: string
  canClockIn: boolean
  description: string
} {
  const now = new Date()
  const start = new Date(shift.start_time)
  const end = new Date(shift.end_time)
  const windowBefore = 15 * 60 * 1000 // 15 minutes
  const windowAfter = 60 * 60 * 1000 // 60 minutes

  if (shift.status === 'cancelled') {
    return { label: 'Cancelled', status: 'cancelled', canClockIn: false, description: 'This shift has been cancelled.' }
  }

  if (shift.clock_out_time) {
    return { label: 'Completed', status: 'completed', canClockIn: false, description: 'You have clocked out of this shift.' }
  }

  if (shift.clock_in_time) {
    return { label: 'In progress', status: 'in_progress', canClockIn: false, description: 'You are currently clocked in.' }
  }

  if (now < new Date(start.getTime() - windowBefore)) {
    return { label: 'Scheduled', status: 'scheduled', canClockIn: false, description: 'Clock-in will be available 15 minutes before the shift.' }
  }

  if (now >= new Date(start.getTime() - windowBefore) && now <= new Date(end.getTime() + windowAfter)) {
    return { label: 'Ready to clock in', status: 'active', canClockIn: true, description: 'You can now clock in for this shift.' }
  }

  return { label: 'Missed', status: 'missed', canClockIn: false, description: 'The clock-in window for this shift has passed.' }
}

export default function StaffShiftDetailClient({ shift, client, clockEvents }: StaffShiftDetailClientProps) {
  const startDate = new Date(shift.start_time)
  const endDate = new Date(shift.end_time)
  const formatTime = (d: Date) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })

  const state = getShiftState(shift)
  const geoReady = Boolean(client?.lat && client?.lng)

  return (
    <div className="space-y-4 pb-8">
      {/* Back link */}
      <Link
        href="/staff/home"
        className="inline-flex items-center gap-1 text-xs font-medium text-[#8a877f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] rounded"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
        Back to home
      </Link>

      {/* Status header */}
      <div className="rounded-[24px] bg-[#1a1a18] p-5 text-white shadow-[0_16px_40px_rgba(26,26,24,0.14)]">
        <div className="flex items-center justify-between">
          <StatusBadge status={state.status as any} label={state.label} />
          {geoReady ? (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-[#7BC143]">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_on</span>
              Geofence active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-medium text-[#fef08a]">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">location_off</span>
              No geofence
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-white/70">{state.description}</p>
      </div>

      {/* Client card */}
      <div className="rounded-[24px] border border-[#e8e4dc] bg-white p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Client</p>
        <p className="mt-2 text-lg font-semibold text-[#1a1a18]">{client?.full_name ?? 'Client'}</p>
        {client?.address && (
          <p className="mt-1 text-sm text-[#66635b]">{client.address}</p>
        )}
      </div>

      {/* Shift details */}
      <div className="rounded-[24px] border border-[#e8e4dc] bg-white p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
        <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Shift details</p>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#8a877f]" aria-hidden="true">calendar_today</span>
            <span className="text-sm text-[#1a1a18]">{formatDate(startDate)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-[#8a877f]" aria-hidden="true">schedule</span>
            <span className="text-sm text-[#1a1a18]">{formatTime(startDate)} – {formatTime(endDate)}</span>
          </div>
          {shift.support_type && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#8a877f]" aria-hidden="true">category</span>
              <span className="text-sm text-[#1a1a18]">{shift.support_type}</span>
            </div>
          )}
          {client?.address && (
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-[#8a877f]" aria-hidden="true">location_on</span>
              <span className="text-sm text-[#1a1a18]">{client.address}</span>
            </div>
          )}
        </div>
      </div>

      {/* Notes */}
      {shift.notes && (
        <div className="rounded-[24px] border border-[#e8e4dc] bg-white p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Notes</p>
          <p className="mt-2 text-sm leading-6 text-[#4f4c45]">{shift.notes}</p>
        </div>
      )}

      {/* Clock events */}
      {clockEvents.length > 0 && (
        <div className="rounded-[24px] border border-[#e8e4dc] bg-white p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Clock history</p>
          <div className="mt-3 space-y-2">
            {clockEvents.map((event: any) => (
              <div key={event.id} className="flex items-center gap-3 rounded-[16px] bg-[#faf9f6] px-3 py-2">
                <span className={`material-symbols-outlined text-[16px] ${event.type === 'clock_in' ? 'text-[#166534]' : 'text-[#6b21a8]'}`} aria-hidden="true">
                  {event.type === 'clock_in' ? 'login' : 'logout'}
                </span>
                <span className="text-sm text-[#1a1a18]">
                  {event.type === 'clock_in' ? 'Clock in' : 'Clock out'} – {new Date(event.created_at).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Primary action */}
      {state.canClockIn && (
        <Link
          href="/staff/clock"
          className="block w-full rounded-2xl bg-[#7BC143] py-4 text-center text-sm font-bold text-[#1a1a18] shadow-[0_14px_32px_rgba(123,193,67,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] focus-visible:ring-offset-2"
        >
          <span className="material-symbols-outlined mr-2 text-[18px] align-middle" aria-hidden="true">timer</span>
          Go to clock
        </Link>
      )}

      {state.status === 'in_progress' && (
        <Link
          href="/staff/clock"
          className="block w-full rounded-2xl bg-[#1a1a18] py-4 text-center text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] focus-visible:ring-offset-2"
        >
          <span className="material-symbols-outlined mr-2 text-[18px] align-middle" aria-hidden="true">timer</span>
          Clock out
        </Link>
      )}
    </div>
  )
}
