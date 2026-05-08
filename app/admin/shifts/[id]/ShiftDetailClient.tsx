'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import StatusBadge from '@/components/ui/StatusBadge'
import Field from '@/components/ui/Field'
import MetricCard from '@/components/ui/MetricCard'
import { Card, RailCard } from '@/components/ui/Card'
import Modal from '@/components/ui/Modal'
import { checkDoubleBooking, checkTimeRange } from '@/lib/utils/roster-validation'
import LiveMap from '@/components/maps/LiveMap'
import type { MapMarker } from '@/components/maps/LiveMap'

// ─── Types ────────────────────────────────────────────────────────────────────

type ExistingShift = { id: string; staff_id: string | null; start_time: string; end_time: string }
type StaffOption = { id: string; full_name: string | null }
type ClientOption = {
  id: string
  full_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
  status: string | null
}

interface ShiftDetailClientProps {
  shift: any
  staff: any
  client: any
  clockEvents: any[]
  incidents: any[]
  allStaff: StaffOption[]
  allClients: ClientOption[]
  allShifts: ExistingShift[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert a UTC ISO string to the value required by <input type="datetime-local"> */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function fmtShiftDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }) +
    ' at ' +
    d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
}

// ─── Shared form field style ──────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-2.5 text-sm text-[#1a1a18] outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]'
const labelCls = 'mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8a877f]'

// ─── Main component ───────────────────────────────────────────────────────────

export default function ShiftDetailClient({
  shift,
  staff,
  client,
  clockEvents,
  incidents,
  allStaff,
  allClients,
  allShifts,
}: ShiftDetailClientProps) {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  // ── Live staff location for this shift ────────────────────────────────
  const [liveLocation, setLiveLocation] = useState<{ lat: number; lng: number; updated_at: string } | null>(null)

  useEffect(() => {
    if (!shift.staff_id) return
    let cancelled = false

    supabase
      .from('staff_locations')
      .select('lat, lng, updated_at')
      .eq('staff_id', shift.staff_id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data) setLiveLocation(data)
      })

    return () => { cancelled = true }
  }, [supabase, shift.staff_id])

  // ── Modal visibility ──────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)

  // ── Shared action state ───────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState('')

  // ── Edit form state ───────────────────────────────────────────────────────
  const [editForm, setEditForm] = useState({
    staff_id: shift.staff_id ?? '',
    client_id: shift.client_id ?? '',
    start_time: isoToDatetimeLocal(shift.start_time),
    end_time: isoToDatetimeLocal(shift.end_time),
    support_type: shift.support_type ?? '',
    notes: shift.notes ?? '',
  })

  // ── Reassign state ────────────────────────────────────────────────────────
  const [newStaffId, setNewStaffId] = useState('')

  // ── Derived display values ────────────────────────────────────────────────
  const startDate = new Date(shift.start_time)
  const endDate = new Date(shift.end_time)
  const actualStart = shift.clock_in_time ? new Date(shift.clock_in_time) : null
  const actualEnd = shift.clock_out_time ? new Date(shift.clock_out_time) : null

  const formatTime = (d: Date) =>
    d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const durationMinutes = actualStart && actualEnd
    ? Math.round((actualEnd.getTime() - actualStart.getTime()) / 60000)
    : Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60

  const geoReady = Boolean(client?.lat && client?.lng)

  const isEditable = shift.status === 'scheduled' || shift.status === 'active'
  const isCancellable = shift.status === 'scheduled' || shift.status === 'active'

  // ── Edit handler ──────────────────────────────────────────────────────────

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setActionError('')

    // Time validation
    const timeCheck = checkTimeRange(
      new Date(editForm.start_time).toISOString(),
      new Date(editForm.end_time).toISOString(),
    )
    if (timeCheck) { setActionError(timeCheck.message); return }

    // Double-booking check (exclude the shift being edited)
    if (editForm.staff_id) {
      const bookingCheck = checkDoubleBooking(
        allShifts,
        {
          staff_id: editForm.staff_id,
          start_time: new Date(editForm.start_time).toISOString(),
          end_time: new Date(editForm.end_time).toISOString(),
        },
        shift.id,
      )
      if (bookingCheck) { setActionError(bookingCheck.message); return }
    }

    setSaving(true)

    const updates: Record<string, any> = {
      staff_id: editForm.staff_id || null,
      client_id: editForm.client_id || null,
      start_time: new Date(editForm.start_time).toISOString(),
      end_time: new Date(editForm.end_time).toISOString(),
      support_type: editForm.support_type || null,
      notes: editForm.notes || null,
    }

    const { error: updateErr } = await supabase
      .from('shifts')
      .update(updates)
      .eq('id', shift.id)

    if (updateErr) {
      setActionError(updateErr.message)
      setSaving(false)
      return
    }

    const oldStaffId = shift.staff_id
    const newStaffIdEdit = editForm.staff_id || null

    if (newStaffIdEdit !== oldStaffId) {
      // Staff assignment changed — notify incoming and outgoing staff
      if (newStaffIdEdit) {
        await supabase.from('notifications').insert({
          user_id: newStaffIdEdit,
          type: 'shift_assigned',
          title: 'New shift assigned',
          message: `You've been assigned a shift on ${fmtShiftDate(editForm.start_time)}.`,
          related_id: shift.id,
        })
      }
      if (oldStaffId) {
        await supabase.from('notifications').insert({
          user_id: oldStaffId,
          type: 'shift_removed',
          title: 'Shift updated',
          message: `A shift on ${fmtShiftDate(shift.start_time)} has been updated and you are no longer assigned.`,
          related_id: shift.id,
        })
      }
    } else if (newStaffIdEdit) {
      // Same staff member — notify them the shift details changed
      await supabase.from('notifications').insert({
        user_id: newStaffIdEdit,
        type: 'roster',
        title: 'Shift updated',
        message: `Your shift on ${fmtShiftDate(editForm.start_time)} has been updated. Please check the new details.`,
        related_id: shift.id,
      })
    }

    setSaving(false)
    setEditOpen(false)
    router.refresh()
  }

  // ── Cancel handler ────────────────────────────────────────────────────────

  async function handleCancel() {
    setSaving(true)
    setActionError('')

    const { error: cancelErr } = await supabase
      .from('shifts')
      .update({ status: 'cancelled' })
      .eq('id', shift.id)

    if (cancelErr) {
      setActionError(cancelErr.message)
      setSaving(false)
      return
    }

    // Notify assigned staff
    if (shift.staff_id) {
      await supabase.from('notifications').insert({
        user_id: shift.staff_id,
        type: 'shift_cancelled',
        title: 'Shift cancelled',
        message: `Your shift on ${fmtShiftDate(shift.start_time)} has been cancelled.`,
        related_id: shift.id,
      })
    }

    setSaving(false)
    setCancelOpen(false)
    router.refresh()
  }

  // ── Reassign handler ──────────────────────────────────────────────────────

  async function handleReassign(e: React.FormEvent) {
    e.preventDefault()
    if (!newStaffId) { setActionError('Please select a staff member.'); return }
    setActionError('')

    // Double-booking check for new staff
    const bookingCheck = checkDoubleBooking(
      allShifts,
      {
        staff_id: newStaffId,
        start_time: shift.start_time,
        end_time: shift.end_time,
      },
      shift.id,
    )
    if (bookingCheck) { setActionError(bookingCheck.message); return }

    setSaving(true)

    const { error: updateErr } = await supabase
      .from('shifts')
      .update({ staff_id: newStaffId })
      .eq('id', shift.id)

    if (updateErr) {
      setActionError(updateErr.message)
      setSaving(false)
      return
    }

    // Notify new staff
    await supabase.from('notifications').insert({
      user_id: newStaffId,
      type: 'shift_assigned',
      title: 'New shift assigned',
      message: `You've been assigned a shift on ${fmtShiftDate(shift.start_time)}.`,
      related_id: shift.id,
    })

    // Notify previous staff they were removed
    if (shift.staff_id && shift.staff_id !== newStaffId) {
      await supabase.from('notifications').insert({
        user_id: shift.staff_id,
        type: 'shift_removed',
        title: 'Shift reassigned',
        message: `You have been removed from the shift on ${fmtShiftDate(shift.start_time)}.`,
        related_id: shift.id,
      })
    }

    setSaving(false)
    setReassignOpen(false)
    setNewStaffId('')
    router.refresh()
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <MetricCard label="Scheduled" value={`${hours}h ${mins}m`} sub={`${formatTime(startDate)} – ${formatTime(endDate)}`} />
          <MetricCard
            label="Actual"
            value={actualStart ? `${formatTime(actualStart)} – ${actualEnd ? formatTime(actualEnd) : 'ongoing'}` : '—'}
            sub={actualStart ? 'Clock recorded' : 'Not yet clocked'}
          />
          <MetricCard label="Geofence" value={geoReady ? 'Active' : 'N/A'} sub={geoReady ? `${client.lat}, ${client.lng}` : 'No coordinates'} accent={!geoReady} />
          <MetricCard label="Status" value={shift.status} sub="Current workflow state" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main content */}
          <div className="space-y-6">
            {/* Shift info */}
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1a1a18]">Shift information</h3>
                  <StatusBadge status={shift.status} />
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Field label="Date" value={formatDate(startDate)} />
                  <Field label="Time window" value={`${formatTime(startDate)} – ${formatTime(endDate)}`} />
                  <Field label="Support type" value={shift.support_type ?? 'Not specified'} />
                  <Field label="Location" value={client?.address ?? 'No address recorded'} />
                </div>
                {shift.notes && (
                  <div className="mt-4 rounded-[18px] bg-[#faf9f6] p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Notes</p>
                    <p className="mt-2 text-sm leading-6 text-[#4f4c45]">{shift.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Location map — shown when at least one coordinate is available */}
            {(() => {
              const locationMarkers: MapMarker[] = []

              if (client?.lat && client?.lng) {
                locationMarkers.push({
                  id: 'client-location',
                  lat: client.lat,
                  lng: client.lng,
                  type: 'client',
                  label: client.full_name ?? 'Client',
                  sublabel: client.address ?? undefined,
                  geofenceRadius: 300,
                })
              }

              if (shift.clock_in_lat && shift.clock_in_lng) {
                locationMarkers.push({
                  id: 'clock-in',
                  lat: shift.clock_in_lat,
                  lng: shift.clock_in_lng,
                  type: 'clock',
                  label: staff?.full_name ?? 'Staff',
                  sublabel: 'Clock in',
                })
              }

              if (shift.clock_out_lat && shift.clock_out_lng) {
                locationMarkers.push({
                  id: 'clock-out',
                  lat: shift.clock_out_lat,
                  lng: shift.clock_out_lng,
                  type: 'clock',
                  label: staff?.full_name ?? 'Staff',
                  sublabel: 'Clock out',
                })
              }

              if (liveLocation) {
                locationMarkers.push({
                  id: 'staff-live',
                  lat: liveLocation.lat,
                  lng: liveLocation.lng,
                  type: 'staff',
                  label: staff?.full_name ?? 'Staff',
                  sublabel: 'Live position',
                  status: 'active',
                  updatedAt: liveLocation.updated_at,
                })
              }

              if (locationMarkers.length === 0) return null

              return (
                <Card>
                  <div className="p-6">
                    <h3 className="text-sm font-semibold text-[#1a1a18]">Location</h3>
                    <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-[#8a877f]">
                      {client?.lat && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#00AAEF]" />Client</span>}
                      {(shift.clock_in_lat || shift.clock_out_lat) && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />Clock in / out</span>}
                      {liveLocation && <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#8B45A6]" />Live</span>}
                    </div>
                    <div className="mt-3 overflow-hidden rounded-[16px]">
                      <LiveMap markers={locationMarkers} height="220px" showGeofences />
                    </div>
                  </div>
                </Card>
              )
            })()}

            {/* Clock events timeline */}
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-[#1a1a18]">Clock events</h3>
                {clockEvents.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {clockEvents.map((event: any) => (
                      <div key={event.id} className="flex items-center gap-3 rounded-[18px] bg-[#faf9f6] px-4 py-3">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${event.type === 'clock_in' ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#f3e8ff] text-[#6b21a8]'}`}>
                          <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                            {event.type === 'clock_in' ? 'login' : 'logout'}
                          </span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-[#1a1a18]">
                            {event.type === 'clock_in' ? 'Clock in' : 'Clock out'}
                          </p>
                          <p className="text-[11px] text-[#8a877f]">
                            {new Date(event.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
                            {event.lat && event.lng ? ` · ${event.lat.toFixed(4)}, ${event.lng.toFixed(4)}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[#8a877f]">No clock events recorded for this shift.</p>
                )}
              </div>
            </Card>

            {/* Linked incidents */}
            {incidents.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-[#1a1a18]">Linked incidents</h3>
                  <div className="mt-4 space-y-2">
                    {incidents.map((incident: any) => (
                      <Link
                        key={incident.id}
                        href={`/admin/incidents/${incident.id}`}
                        className="flex items-center justify-between rounded-[18px] bg-[#faf9f6] px-4 py-3 hover:bg-[#f4f2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
                      >
                        <span className="text-sm font-medium text-[#1a1a18]">{incident.title}</span>
                        <div className="flex gap-2">
                          <StatusBadge status={incident.severity} />
                          <StatusBadge status={incident.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Side rail */}
          <aside className="space-y-4">
            {/* Staff card */}
            <RailCard title="Staff member">
              {staff ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#1a1a18]">{staff.full_name}</p>
                  {staff.phone && <p className="text-xs text-[#66635b]">{staff.phone}</p>}
                  {staff.email && <p className="text-xs text-[#66635b]">{staff.email}</p>}
                  <Link
                    href={`/admin/staff/${staff.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#8B45A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
                  >
                    View profile
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                </div>
              ) : (
                <p className="text-xs italic text-[#8a877f]">No staff assigned to this shift.</p>
              )}
            </RailCard>

            {/* Client card */}
            <RailCard title="Client">
              {client ? (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#1a1a18]">{client.full_name}</p>
                  {client.address && <p className="text-xs text-[#66635b]">{client.address}</p>}
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#8B45A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
                  >
                    View profile
                    <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
                  </Link>
                </div>
              ) : (
                <p className="text-xs italic text-[#8a877f]">No client linked.</p>
              )}
            </RailCard>

            {/* Geofence status */}
            <RailCard title="Geofence">
              <div className="space-y-2 text-xs text-[#66635b]">
                {geoReady ? (
                  <>
                    <p className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#166534]" aria-hidden="true">check_circle</span>
                      Geofence configured
                    </p>
                    <p>Radius: 300m (default)</p>
                    <p>Coordinates: {client.lat}, {client.lng}</p>
                  </>
                ) : (
                  <p className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#92400e]" aria-hidden="true">warning</span>
                    No geofence — client coordinates missing
                  </p>
                )}
              </div>
            </RailCard>

            {/* Actions */}
            <RailCard title="Actions">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => { setActionError(''); setEditOpen(true) }}
                  disabled={!isEditable}
                  className="w-full rounded-2xl border border-[#dfd9cf] px-4 py-2.5 text-left text-sm font-medium text-[#1a1a18] transition hover:bg-[#f4f2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Edit shift"
                >
                  <span className="material-symbols-outlined mr-2 align-middle text-[16px]" aria-hidden="true">edit</span>
                  Edit shift
                </button>

                <button
                  type="button"
                  onClick={() => { setActionError(''); setReassignOpen(true); setNewStaffId('') }}
                  disabled={!isEditable}
                  className="w-full rounded-2xl border border-[#dfd9cf] px-4 py-2.5 text-left text-sm font-medium text-[#1a1a18] transition hover:bg-[#f4f2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Reassign staff"
                >
                  <span className="material-symbols-outlined mr-2 align-middle text-[16px]" aria-hidden="true">swap_horiz</span>
                  Reassign staff
                </button>

                <button
                  type="button"
                  onClick={() => { setActionError(''); setCancelOpen(true) }}
                  disabled={!isCancellable}
                  className="w-full rounded-2xl border border-[#fca5a5] px-4 py-2.5 text-left text-sm font-medium text-[#991b1b] transition hover:bg-[#fef2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#991b1b] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Cancel shift"
                >
                  <span className="material-symbols-outlined mr-2 align-middle text-[16px]" aria-hidden="true">event_busy</span>
                  Cancel shift
                </button>

                {!isEditable && (
                  <p className="pt-1 text-[11px] text-[#8a877f]">
                    {shift.status === 'completed'
                      ? 'Completed shifts cannot be edited.'
                      : 'Cancelled shifts cannot be modified.'}
                  </p>
                )}
              </div>
            </RailCard>
          </aside>
        </div>
      </div>

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit shift" wide>
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="edit-start" className={labelCls}>Start time *</label>
              <input
                id="edit-start"
                type="datetime-local"
                required
                value={editForm.start_time}
                onChange={e => setEditForm(f => ({ ...f, start_time: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="edit-end" className={labelCls}>End time *</label>
              <input
                id="edit-end"
                type="datetime-local"
                required
                value={editForm.end_time}
                onChange={e => setEditForm(f => ({ ...f, end_time: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-staff" className={labelCls}>Staff member</label>
            <select
              id="edit-staff"
              value={editForm.staff_id}
              onChange={e => setEditForm(f => ({ ...f, staff_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">— Unassigned —</option>
              {allStaff.map(s => (
                <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-client" className={labelCls}>Client *</label>
            <select
              id="edit-client"
              required
              value={editForm.client_id}
              onChange={e => setEditForm(f => ({ ...f, client_id: e.target.value }))}
              className={inputCls}
            >
              <option value="">Select client…</option>
              {allClients.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name ?? c.id}{c.status === 'inactive' ? ' (inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-support" className={labelCls}>Support type</label>
            <input
              id="edit-support"
              type="text"
              value={editForm.support_type}
              onChange={e => setEditForm(f => ({ ...f, support_type: e.target.value }))}
              placeholder="e.g. Daily living support"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="edit-notes" className={labelCls}>Notes</label>
            <textarea
              id="edit-notes"
              rows={3}
              value={editForm.notes}
              onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Any instructions or context for this shift…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {actionError && (
            <p className="rounded-xl bg-[#fef2f2] px-4 py-2.5 text-sm text-[#991b1b]">{actionError}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 rounded-xl border border-[#dfd9cf] py-2.5 text-sm font-medium text-[#5e5b54] transition hover:bg-[#f4f2ed]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1a1a18] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Cancel confirmation Modal ───────────────────────────────────── */}
      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel shift">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#4f4c45]">
            Are you sure you want to cancel this shift?
            {staff ? ` ${staff.full_name} will be notified.` : ''}
            {' '}This action sets the shift status to cancelled and cannot be undone here.
          </p>

          {actionError && (
            <p className="rounded-xl bg-[#fef2f2] px-4 py-2.5 text-sm text-[#991b1b]">{actionError}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCancelOpen(false)}
              className="flex-1 rounded-xl border border-[#dfd9cf] py-2.5 text-sm font-medium text-[#5e5b54] transition hover:bg-[#f4f2ed]"
            >
              Keep shift
            </button>
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#991b1b] py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {saving ? 'Cancelling…' : 'Yes, cancel shift'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Reassign Modal ──────────────────────────────────────────────── */}
      <Modal open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign staff">
        <form onSubmit={handleReassign} className="space-y-4">
          {staff && (
            <div className="rounded-xl bg-[#faf9f6] px-4 py-3 text-sm text-[#4f4c45]">
              <span className="font-medium">Currently assigned:</span> {staff.full_name}
            </div>
          )}

          <div>
            <label htmlFor="reassign-staff" className={labelCls}>New staff member *</label>
            <select
              id="reassign-staff"
              required
              value={newStaffId}
              onChange={e => { setNewStaffId(e.target.value); setActionError('') }}
              className={inputCls}
            >
              <option value="">Select staff…</option>
              {allStaff
                .filter(s => s.id !== shift.staff_id)
                .map(s => (
                  <option key={s.id} value={s.id}>{s.full_name ?? s.id}</option>
                ))}
            </select>
          </div>

          {actionError && (
            <p className="rounded-xl bg-[#fef2f2] px-4 py-2.5 text-sm text-[#991b1b]">{actionError}</p>
          )}

          <p className="text-[11px] text-[#8a877f]">
            The new staff member will receive a notification. The previous staff member will be notified they have been removed.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => setReassignOpen(false)}
              className="flex-1 rounded-xl border border-[#dfd9cf] py-2.5 text-sm font-medium text-[#5e5b54] transition hover:bg-[#f4f2ed]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !newStaffId}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#8B45A6] py-2.5 text-sm font-semibold text-[#1a1a18] disabled:opacity-60"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>}
              {saving ? 'Saving…' : 'Reassign'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
