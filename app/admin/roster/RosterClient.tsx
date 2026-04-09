'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import dynamic from 'next/dynamic'

const FullCalendar = dynamic(() => import('@fullcalendar/react'), { ssr: false })

export default function RosterClient({ shifts, staff, clients }: {
  shifts: any[]; staff: any[]; clients: any[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    staff_id: '', client_id: '', title: '',
    start_time: '', end_time: '', notes: ''
  })
  const router = useRouter()
  const supabase = createClient()

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')

    const { error: err } = await supabase.from('shifts').insert({
      staff_id: form.staff_id,
      client_id: form.client_id,
      title: form.title || null,
      start_time: form.start_time,
      end_time: form.end_time,
      notes: form.notes || null,
    })

    if (err) { setError(err.message); setSaving(false); return }

    // Notify the staff member
    await supabase.from('notifications').insert({
      user_id: form.staff_id,
      type: 'roster',
      title: 'New Shift Assigned',
      message: `You have a new shift on ${new Date(form.start_time).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}`,
    })

    setSaving(false); setOpen(false)
    setForm({ staff_id: '', client_id: '', title: '', start_time: '', end_time: '', notes: '' })
    router.refresh()
  }

  const [selectedEvent, setSelectedEvent] = useState<null | {
    staffName: string
    clientName: string
    status: string
    notes: string
    start: string
    end: string
  }>(null)

  const events = shifts.map(s => ({
    id: s.id,
    title: `${s.profiles?.full_name ?? 'Staff'} → ${s.clients?.full_name ?? 'Client'}`,
    start: s.start_time,
    end: s.end_time,
    backgroundColor:
      s.status === 'active' ? '#2c694e' :
      s.status === 'completed' ? '#717881' :
      s.status === 'cancelled' ? '#ba1a1a' : '#00446f',
    borderColor: 'transparent',
    extendedProps: {
      staffName: s.profiles?.full_name ?? 'Unknown Staff',
      clientName: s.clients?.full_name ?? 'Unknown Client',
      status: s.status ?? 'scheduled',
      notes: s.notes ?? '',
    },
  }))

  return (
    <>
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-3 text-xs font-label">
            {[
              { color: 'bg-primary', label: 'Scheduled' },
              { color: 'bg-secondary', label: 'Active' },
              { color: 'bg-outline', label: 'Completed' },
              { color: 'bg-error', label: 'Cancelled' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full ${color}`} />
                <span className="text-on-surface-variant font-semibold">{label}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl primary-gradient text-white font-headline text-sm font-bold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Create Shift
          </button>
        </div>

        <CalendarWrapper
          events={events}
          onEventClick={(info: any) => {
            setSelectedEvent({
              staffName: info.event.extendedProps.staffName,
              clientName: info.event.extendedProps.clientName,
              status: info.event.extendedProps.status,
              notes: info.event.extendedProps.notes,
              start: info.event.startStr,
              end: info.event.endStr,
            })
          }}
        />
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <h3 className="text-lg font-bold font-headline text-on-surface">Shift Details</h3>
              <button onClick={() => setSelectedEvent(null)} className="text-outline hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full primary-gradient flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {selectedEvent.staffName.charAt(0)}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Staff</p>
                  <p className="text-sm font-semibold text-on-surface">{selectedEvent.staffName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-secondary text-base">person</span>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Client</p>
                  <p className="text-sm font-semibold text-on-surface">{selectedEvent.clientName}</p>
                </div>
              </div>

              <div className="bg-surface-container rounded-xl px-4 py-3 space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Time</p>
                <p className="text-sm font-semibold text-on-surface">
                  {new Date(selectedEvent.start).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-on-surface-variant">
                  {new Date(selectedEvent.start).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                  {' → '}
                  {new Date(selectedEvent.end).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Status</p>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white ${
                  selectedEvent.status === 'active' ? 'bg-secondary' :
                  selectedEvent.status === 'completed' ? 'bg-outline' :
                  selectedEvent.status === 'cancelled' ? 'bg-error' : 'bg-primary'
                }`}>
                  {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                </span>
              </div>

              {selectedEvent.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Notes</p>
                  <p className="text-sm text-on-surface bg-surface-container rounded-xl px-4 py-3">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Create New Shift">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Staff Member *</label>
            <select required value={form.staff_id} onChange={e => set('staff_id', e.target.value)}
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none">
              <option value="">Select staff…</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Client *</label>
            <select required value={form.client_id} onChange={e => set('client_id', e.target.value)}
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none">
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name} — {c.address ?? 'No address'}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Shift Title (optional)</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Morning Care"
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Start Time *</label>
              <input type="datetime-local" required value={form.start_time} onChange={e => set('start_time', e.target.value)}
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">End Time *</label>
              <input type="datetime-local" required value={form.end_time} onChange={e => set('end_time', e.target.value)}
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="Any special instructions…"
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none resize-none" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-base">error</span>{error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl primary-gradient text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Saving…</> : <><span className="material-symbols-outlined text-base">save</span>Create Shift</>}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}

function CalendarWrapper({ events, onEventClick }: { events: any[], onEventClick: (info: any) => void }) {
  const [pluginsLoaded, setPluginsLoaded] = useState(false)
  const [FC, setFC] = useState<any>(null)
  const [dayGridPlugin, setDayGridPlugin] = useState<any>(null)
  const [timeGridPlugin, setTimeGridPlugin] = useState<any>(null)
  const [interactionPlugin, setInteractionPlugin] = useState<any>(null)

  if (typeof window !== 'undefined' && !FC) {
    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/interaction'),
    ]).then(([fc, dg, tg, ip]) => {
      setFC(() => fc.default)
      setDayGridPlugin(() => dg.default)
      setTimeGridPlugin(() => tg.default)
      setInteractionPlugin(() => ip.default)
    })
  }

  if (!FC) return (
    <div className="h-96 flex items-center justify-center text-on-surface-variant">
      <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
    </div>
  )

  return (
    <FC
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="dayGridMonth"
      headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek' }}
      events={events}
      eventClick={onEventClick}
      height="auto"
    />
  )
}
