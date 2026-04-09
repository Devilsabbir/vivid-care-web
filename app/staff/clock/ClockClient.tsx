'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinGeofence, isWithinShiftWindow } from '@/lib/utils/distance'

export default function ClockClient({ shifts, staffId, adminIds }: {
  shifts: any[]; staffId: string; adminIds: string[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    })
  }

  async function handleClockIn(shift: any) {
    setLoading(shift.id)
    setMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      // Time window check
      if (!isWithinShiftWindow(shift.start_time)) {
        setMessage({ text: 'You can only clock in within 15 minutes of your shift start time.', type: 'error' })
        setLoading(null); return
      }

      // Geofence check
      if (shift.clients?.lat && shift.clients?.lng) {
        if (!isWithinGeofence(lat, lng, shift.clients.lat, shift.clients.lng)) {
          setMessage({ text: 'You must be within 300m of the client location to clock in.', type: 'error' })
          setLoading(null); return
        }
      }

      await supabase.from('shifts').update({
        status: 'active', clock_in_time: new Date().toISOString(),
        clock_in_lat: lat, clock_in_lng: lng,
      }).eq('id', shift.id)

      // Notify all admins
      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId, type: 'clock_in',
          title: 'Staff Clocked In',
          message: `Shift started for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        })
      ))

      setMessage({ text: 'Clocked in successfully!', type: 'success' })
      router.refresh()
    } catch (err: any) {
      setMessage({ text: err.message ?? 'Location access denied. Please enable GPS.', type: 'error' })
    }
    setLoading(null)
  }

  async function handleClockOut(shift: any) {
    setLoading(shift.id)
    setMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      await supabase.from('shifts').update({
        status: 'completed', clock_out_time: new Date().toISOString(),
        clock_out_lat: lat, clock_out_lng: lng,
      }).eq('id', shift.id)

      // Notify all admins
      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId, type: 'clock_out',
          title: 'Staff Clocked Out',
          message: `Shift completed for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        })
      ))

      setMessage({ text: 'Clocked out successfully!', type: 'success' })
      router.refresh()
    } catch (err: any) {
      setMessage({ text: err.message ?? 'Location access denied.', type: 'error' })
    }
    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-xl ${message.type === 'success' ? 'bg-secondary-container/40 text-secondary' : 'bg-error-container text-error'}`}>
          <span className="material-symbols-outlined text-base">
            {message.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {message.text}
        </div>
      )}

      {shifts.length > 0 ? (
        shifts.map(shift => {
          const isActive = shift.status === 'active'
          const start = new Date(shift.start_time)
          const end = new Date(shift.end_time)
          const isThisLoading = loading === shift.id

          return (
            <div key={shift.id} className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
              {/* Shift info */}
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="font-bold font-headline text-on-surface">{shift.clients?.full_name ?? 'Client'}</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    {start.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {shift.clients?.address && (
                    <p className="text-xs text-outline mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {shift.clients.address}
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="flex items-center gap-1.5 text-secondary text-xs font-bold">
                    <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                    Active
                  </div>
                )}
              </div>

              {/* Clock button */}
              {isActive ? (
                <button
                  onClick={() => handleClockOut(shift)}
                  disabled={!!loading}
                  className="w-full py-4 rounded-2xl bg-error-container text-error font-bold text-base font-headline flex items-center justify-center gap-3 disabled:opacity-60 transition-all hover:opacity-90"
                >
                  {isThisLoading ? (
                    <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">logout</span>
                  )}
                  {isThisLoading ? 'Getting location…' : 'Clock Out'}
                </button>
              ) : (
                <button
                  onClick={() => handleClockIn(shift)}
                  disabled={!!loading}
                  className="w-full py-4 rounded-2xl primary-gradient text-white font-bold text-base font-headline flex items-center justify-center gap-3 disabled:opacity-60 transition-all hover:opacity-90"
                >
                  {isThisLoading ? (
                    <span className="material-symbols-outlined text-2xl animate-spin">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-2xl">login</span>
                  )}
                  {isThisLoading ? 'Getting location…' : 'Clock In'}
                </button>
              )}

              {shift.clients?.lat && shift.clients?.lng && (
                <p className="text-center text-[10px] text-outline mt-3 font-label">
                  GPS verification required • Must be within 300m
                </p>
              )}
            </div>
          )
        })
      ) : (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">timer_off</span>
          <p className="font-semibold text-sm">No shifts scheduled for today</p>
        </div>
      )}
    </div>
  )
}
