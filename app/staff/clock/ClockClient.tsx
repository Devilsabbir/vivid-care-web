'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isWithinGeofence, isWithinShiftWindow } from '@/lib/utils/distance'
import { Badge } from '@/components/ui/Badge'
import ErrorToast from '@/components/ui/ErrorToast'
import { useErrorToast } from '@/lib/hooks/useErrorToast'

export default function ClockClient({ shifts, adminIds }: {
  shifts: any[]
  adminIds: string[]
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()
  const { errorMessage, showError, dismiss } = useErrorToast()

  async function getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) reject(new Error('Geolocation not supported'))
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
    })
  }

  async function handleClockIn(shift: any) {
    setLoading(shift.id)
    setSuccessMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      if (!isWithinShiftWindow(shift.start_time)) {
        showError('You can only clock in within 15 minutes of your shift start time.')
        setLoading(null)
        return
      }

      if (shift.clients?.lat && shift.clients?.lng) {
        if (!isWithinGeofence(lat, lng, shift.clients.lat, shift.clients.lng)) {
          showError('You must be within 300m of the client location to clock in.')
          setLoading(null)
          return
        }
      }

      const { error: shiftError } = await supabase.from('shifts').update({
        status: 'active',
        clock_in_time: new Date().toISOString(),
        clock_in_lat: lat,
        clock_in_lng: lng,
      }).eq('id', shift.id)

      if (shiftError) {
        console.error('[ClockClient] clock_in shift update failed:', shiftError)
        showError('Failed to record clock-in. Please try again.')
        setLoading(null)
        return
      }

      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          type: 'clock_in',
          title: 'Staff Clocked In',
          message: `Shift started for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        }),
      ))

      setSuccessMessage('Clocked in successfully.')
      router.refresh()
    } catch (err: any) {
      const msg = err?.code === 1
        ? 'Location permission denied. Please enable GPS in your browser settings.'
        : err?.code === 3
          ? 'Location request timed out. Please try again.'
          : (err?.message ?? 'Unable to get your location. Please enable GPS.')
      console.error('[ClockClient] clock_in error:', err)
      showError(msg)
    }

    setLoading(null)
  }

  async function handleClockOut(shift: any) {
    setLoading(shift.id)
    setSuccessMessage(null)

    try {
      const pos = await getPosition()
      const { latitude: lat, longitude: lng } = pos.coords

      const { error: shiftError } = await supabase.from('shifts').update({
        status: 'completed',
        clock_out_time: new Date().toISOString(),
        clock_out_lat: lat,
        clock_out_lng: lng,
      }).eq('id', shift.id)

      if (shiftError) {
        console.error('[ClockClient] clock_out shift update failed:', shiftError)
        showError('Failed to record clock-out. Please try again.')
        setLoading(null)
        return
      }

      await Promise.all(adminIds.map(adminId =>
        supabase.from('notifications').insert({
          user_id: adminId,
          type: 'clock_out',
          title: 'Staff Clocked Out',
          message: `Shift completed for client ${shift.clients?.full_name ?? 'Unknown'}`,
          related_id: shift.id,
        }),
      ))

      setSuccessMessage('Clocked out successfully.')
      router.refresh()
    } catch (err: any) {
      const msg = err?.code === 1
        ? 'Location permission denied. Please enable GPS in your browser settings.'
        : err?.code === 3
          ? 'Location request timed out. Please try again.'
          : (err?.message ?? 'Unable to get your location. Please enable GPS.')
      console.error('[ClockClient] clock_out error:', err)
      showError(msg)
    }

    setLoading(null)
  }

  return (
    <div className="space-y-4">
      {errorMessage && <ErrorToast message={errorMessage} onDismiss={dismiss} />}
      {successMessage ? (
        <div className="flex items-start gap-3 rounded-[22px] border border-[#e4c1f5] bg-[#f9f0ff] px-4 py-4 text-sm text-[#4a006f] shadow-[0_10px_24px_rgba(23,23,22,0.05)]">
          <span className="material-symbols-outlined mt-0.5 text-[18px]">check_circle</span>
          <p>{successMessage}</p>
        </div>
      ) : null}

      {shifts.length > 0 ? shifts.map(shift => {
        const isActive = shift.status === 'active'
        const isThisLoading = loading === shift.id
        const start = new Date(shift.start_time)

        return (
          <article key={shift.id} className="rounded-[28px] border border-[#e7e1d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">
                  {start.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
                <h3 className="mt-2 font-headline text-xl font-semibold text-[#171716]">{shift.clients?.full_name ?? 'Client'}</h3>
                <p className="mt-1 text-sm text-[#666258]">
                  {formatTime(shift.start_time)} to {formatTime(shift.end_time)}
                </p>
              </div>
              <Badge variant={isActive ? 'active' : shift.status} />
            </div>

            {shift.clients?.address ? (
              <div className="mt-4 rounded-[22px] bg-[#f4f1ea] px-4 py-3 text-sm text-[#666258]">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#171716]">location_on</span>
                  <div>
                    <p className="font-medium text-[#171716]">{shift.clients.address}</p>
                    <p className="mt-1 text-xs text-[#8b867b]">
                      Stay within 300 metres of the client location before attempting to clock in.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-4 rounded-[22px] border border-[#ece6dc] bg-[#fbfaf7] px-4 py-3 text-xs text-[#8b867b]">
              Clock in opens 15 minutes before shift start. Clock out captures your GPS position for attendance history.
            </div>

            {isActive ? (
              <button
                onClick={() => handleClockOut(shift)}
                disabled={!!loading}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-[22px] bg-[#1b1b1a] px-4 py-4 font-headline text-base font-semibold text-white transition hover:bg-black disabled:opacity-60"
              >
                {isThisLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[22px]">logout</span>
                )}
                {isThisLoading ? 'Capturing location...' : 'Clock out now'}
              </button>
            ) : (
              <button
                onClick={() => handleClockIn(shift)}
                disabled={!!loading}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-[22px] bg-[#c852ff] px-4 py-4 font-headline text-base font-semibold text-[#171716] transition hover:brightness-95 disabled:opacity-60"
              >
                {isThisLoading ? (
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[22px]">login</span>
                )}
                {isThisLoading ? 'Capturing location...' : 'Clock in now'}
              </button>
            )}
          </article>
        )
      }) : (
        <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-14 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#b5afa5]">timer_off</span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">No shifts scheduled for today</p>
          <p className="mt-1 text-xs text-[#8b867b]">When a coordinator assigns a visit, it will appear here for clock actions.</p>
        </section>
      )}
    </div>
  )
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}
