'use client'

import Link from 'next/link'
import StatusBadge from '@/components/ui/StatusBadge'
import Field from '@/components/ui/Field'
import MetricCard from '@/components/ui/MetricCard'
import { Card, RailCard } from '@/components/ui/Card'

interface ShiftDetailClientProps {
  shift: any
  staff: any
  client: any
  clockEvents: any[]
  incidents: any[]
}

export default function ShiftDetailClient({ shift, staff, client, clockEvents, incidents }: ShiftDetailClientProps) {
  const startDate = new Date(shift.start_time)
  const endDate = new Date(shift.end_time)
  const actualStart = shift.clock_in_time ? new Date(shift.clock_in_time) : null
  const actualEnd = shift.clock_out_time ? new Date(shift.clock_out_time) : null

  const formatTime = (d: Date) => d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
  const formatDate = (d: Date) => d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const durationMinutes = actualStart && actualEnd
    ? Math.round((actualEnd.getTime() - actualStart.getTime()) / 60000)
    : Math.round((endDate.getTime() - startDate.getTime()) / 60000)
  const hours = Math.floor(durationMinutes / 60)
  const mins = durationMinutes % 60

  const geoReady = Boolean(client?.lat && client?.lng)

  return (
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
              <p className="text-xs text-[#8a877f] italic">No staff assigned to this shift.</p>
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
              <p className="text-xs text-[#8a877f] italic">No client linked.</p>
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
              {/* TODO: Implement edit shift functionality */}
              <button
                type="button"
                disabled
                className="w-full rounded-2xl border border-[#dfd9cf] px-4 py-2.5 text-left text-sm font-medium text-[#5e5b54] opacity-60"
                aria-label="Edit shift (coming soon)"
              >
                <span className="material-symbols-outlined mr-2 text-[16px] align-middle" aria-hidden="true">edit</span>
                Edit shift
              </button>
              {/* TODO: Implement cancel shift functionality */}
              <button
                type="button"
                disabled
                className="w-full rounded-2xl border border-[#dfd9cf] px-4 py-2.5 text-left text-sm font-medium text-[#5e5b54] opacity-60"
                aria-label="Cancel shift (coming soon)"
              >
                <span className="material-symbols-outlined mr-2 text-[16px] align-middle" aria-hidden="true">event_busy</span>
                Cancel shift
              </button>
              {/* TODO: Implement reassign staff functionality */}
              <button
                type="button"
                disabled
                className="w-full rounded-2xl border border-[#dfd9cf] px-4 py-2.5 text-left text-sm font-medium text-[#5e5b54] opacity-60"
                aria-label="Reassign staff (coming soon)"
              >
                <span className="material-symbols-outlined mr-2 text-[16px] align-middle" aria-hidden="true">swap_horiz</span>
                Reassign staff
              </button>
            </div>
          </RailCard>
        </aside>
      </div>
    </div>
  )
}
