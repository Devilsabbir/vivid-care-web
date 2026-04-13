'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'

type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'

type ShiftRelation = {
  full_name: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}

type ShiftRow = {
  id: string
  staff_id: string | null
  client_id: string | null
  title: string | null
  start_time: string
  end_time: string
  notes: string | null
  status: ShiftStatus
  profiles: ShiftRelation | ShiftRelation[] | null
  clients: ShiftRelation | ShiftRelation[] | null
}

type StaffOption = {
  id: string
  full_name: string | null
}

type ClientOption = {
  id: string
  full_name: string | null
  address: string | null
  lat: number | null
  lng: number | null
}

type SelectedShift = {
  id: string
  title: string | null
  staffId: string | null
  clientId: string | null
  staffName: string
  clientName: string
  clientAddress: string | null
  clientLat: number | null
  clientLng: number | null
  start: string
  end: string
  notes: string | null
  status: ShiftStatus
}

type CalendarBundle = {
  FullCalendar: any
  dayGridPlugin: any
  timeGridPlugin: any
  interactionPlugin: any
}

type CreateShiftForm = {
  staff_id: string
  client_id: string
  title: string
  start_time: string
  end_time: string
  notes: string
}

const EMPTY_FORM: CreateShiftForm = {
  staff_id: '',
  client_id: '',
  title: '',
  start_time: '',
  end_time: '',
  notes: '',
}

const legendItems = [
  { label: 'Scheduled', swatch: '#dbeafe' },
  { label: 'Active', swatch: '#dcfce7' },
  { label: 'Completed', swatch: '#ebe7df' },
  { label: 'Cancelled', swatch: '#fee2e2' },
]

export default function RosterClient({
  shifts,
  staff,
  clients,
}: {
  shifts: ShiftRow[]
  staff: StaffOption[]
  clients: ClientOption[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CreateShiftForm>(EMPTY_FORM)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [calendarBundle, setCalendarBundle] = useState<CalendarBundle | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  const normalizedShifts = useMemo<SelectedShift[]>(() => {
    return [...shifts]
      .sort((left, right) => new Date(left.start_time).getTime() - new Date(right.start_time).getTime())
      .map(shift => {
        const staffMember = relationRow(shift.profiles)
        const client = relationRow(shift.clients)
        return {
          id: shift.id,
          title: shift.title,
          staffId: shift.staff_id,
          clientId: shift.client_id,
          staffName: staffMember?.full_name ?? 'Unassigned staff',
          clientName: client?.full_name ?? 'Client pending',
          clientAddress: client?.address ?? null,
          clientLat: client?.lat ?? null,
          clientLng: client?.lng ?? null,
          start: shift.start_time,
          end: shift.end_time,
          notes: shift.notes,
          status: shift.status ?? 'scheduled',
        }
      })
  }, [shifts])

  useEffect(() => {
    let active = true

    Promise.all([
      import('@fullcalendar/react'),
      import('@fullcalendar/daygrid'),
      import('@fullcalendar/timegrid'),
      import('@fullcalendar/interaction'),
    ]).then(([calendar, dayGrid, timeGrid, interaction]) => {
      if (!active) return
      setCalendarBundle({
        FullCalendar: calendar.default,
        dayGridPlugin: dayGrid.default,
        timeGridPlugin: timeGrid.default,
        interactionPlugin: interaction.default,
      })
    })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!normalizedShifts.length) {
      setSelectedShiftId(null)
      return
    }

    if (!normalizedShifts.some(shift => shift.id === selectedShiftId)) {
      setSelectedShiftId(normalizedShifts[0].id)
    }
  }, [normalizedShifts, selectedShiftId])

  const selectedShift = normalizedShifts.find(shift => shift.id === selectedShiftId) ?? null
  const weekWindow = useMemo(() => currentWeekWindow(new Date()), [])
  const weekShifts = normalizedShifts.filter(shift => {
    const start = new Date(shift.start)
    return start >= weekWindow.start && start <= weekWindow.end
  })

  const completedThisWeek = weekShifts.filter(shift => shift.status === 'completed').length
  const activeThisWeek = weekShifts.filter(shift => shift.status === 'active').length
  const scheduledThisWeek = weekShifts.filter(shift => shift.status === 'scheduled').length
  const unassignedThisWeek = weekShifts.filter(shift => !shift.staffId).length
  const clockedThisWeek = weekShifts.filter(shift => shift.status === 'active' || shift.status === 'completed').length
  const coveragePercent = weekShifts.length ? Math.round((clockedThisWeek / weekShifts.length) * 100) : 0

  const coverageSuggestions = useMemo(() => {
    if (!selectedShift) return []

    return staff
      .filter(member => member.id !== selectedShift.staffId)
      .filter(member => {
        return !normalizedShifts.some(shift => {
          return (
            shift.id !== selectedShift.id &&
            shift.staffId === member.id &&
            shift.status !== 'cancelled' &&
            overlaps(shift.start, shift.end, selectedShift.start, selectedShift.end)
          )
        })
      })
      .slice(0, 3)
  }, [normalizedShifts, selectedShift, staff])

  const eventRows = normalizedShifts.map(shift => {
    const tone = statusTone(shift.status)
    return {
      id: shift.id,
      title: shift.staffName,
      start: shift.start,
      end: shift.end,
      backgroundColor: tone.background,
      borderColor: tone.border,
      textColor: tone.text,
      classNames: ['vivid-roster-event'],
      extendedProps: {
        clientName: shift.clientName,
        status: shift.status,
        shiftTitle: shift.title,
      },
    }
  })

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!form.client_id || !form.start_time || !form.end_time) {
      setError('Client, start time, and end time are required.')
      return
    }

    setSaving(true)
    setError('')

    const { data: createdShift, error: createError } = await supabase
      .from('shifts')
      .insert({
        staff_id: form.staff_id || null,
        client_id: form.client_id,
        title: form.title || null,
        start_time: form.start_time,
        end_time: form.end_time,
        notes: form.notes || null,
      })
      .select('id')
      .single()

    if (createError) {
      setError(createError.message)
      setSaving(false)
      return
    }

    if (form.staff_id) {
      await supabase.from('notifications').insert({
        user_id: form.staff_id,
        type: 'roster',
        title: 'New shift assigned',
        message: `You have a new shift on ${formatLongDate(form.start_time)}.`,
      })
    }

    setSaving(false)
    setOpen(false)
    setForm(EMPTY_FORM)
    setSelectedShiftId(createdShift?.id ?? null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Roster</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              planner
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">and live coverage</span>
          </div>
          <p className="text-sm text-[#6c6b66]">
            Weekly scheduling, shift assignment, and compliance readiness in one workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/active-shifts"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]"
          >
            <span className="material-symbols-outlined text-[20px]">location_on</span>
            <span className="sr-only">Live shifts</span>
          </Link>
          <Link
            href="/admin/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="sr-only">Dashboard</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New shift
          </button>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        <span className="rounded-full bg-[#1a1a18] px-4 py-2 text-white">Week planner</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Month overview</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Coverage gaps</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Compliance review</span>
      </nav>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <StatCard
          icon="calendar_view_week"
          label="Shifts this week"
          value={weekShifts.length}
          sub={`${completedThisWeek} completed and ${scheduledThisWeek} still upcoming`}
        />
        <StatCard
          accent
          icon="schedule"
          label="Live coverage"
          value={activeThisWeek}
          sub={`${coveragePercent}% of this week's roster already clocked or completed`}
        />
        <aside className="relative overflow-hidden rounded-[24px] bg-[#1a1a18] p-6 text-white">
          <div className="absolute right-[-24px] top-[-24px] h-36 w-36 rounded-full bg-white/5" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Coverage watch</p>
              <h2 className="mt-4 max-w-[18rem] text-[1.5rem] leading-tight tracking-[-0.04em]">
                {unassignedThisWeek > 0
                  ? `${unassignedThisWeek} unassigned shift${unassignedThisWeek === 1 ? '' : 's'} still need coverage.`
                  : 'This roster has no open assignment gaps right now.'}
              </h2>
            </div>
            <div className="space-y-2 text-sm text-white/65">
              <p>Week of {formatWeekRange(weekWindow.start, weekWindow.end)}</p>
              <Link
                href="/admin/incidents"
                className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#1a1a18]"
              >
                Review escalations
                <span className="material-symbols-outlined text-[18px]">north_east</span>
              </Link>
            </div>
          </div>
        </aside>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-[28px] border border-[#e8e4dc] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <div className="flex flex-col gap-4 border-b border-[#f0ece5] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
            <div>
              <h3 className="text-sm font-semibold text-[#1a1a18]">Scheduler workspace</h3>
              <p className="text-xs text-[#8a877f]">
                Click any shift for assignment detail, checklist status, and coverage review
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#66635b]">
              <span className="inline-flex items-center gap-1 rounded-xl bg-[#f7f5f0] px-3 py-1.5">
                <span className="material-symbols-outlined text-[16px]">public</span>
                Australia/Perth
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-[#f7f5f0] px-3 py-1.5">
                <span className="material-symbols-outlined text-[16px]">sync</span>
                Realtime roster
              </span>
            </div>
          </div>

          <div className="border-b border-[#f0ece5] px-5 py-4 md:px-6">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#66635b]">
              {legendItems.map(item => (
                <span key={item.label} className="inline-flex items-center gap-2 rounded-full bg-[#f6f4ee] px-3 py-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.swatch }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          <div className="px-3 py-3 md:px-4">
            {calendarBundle ? (
              <CalendarSurface
                bundle={calendarBundle}
                events={eventRows}
                onShiftSelect={setSelectedShiftId}
              />
            ) : (
              <div className="flex h-[540px] items-center justify-center rounded-[24px] bg-[#faf9f6] text-[#7e7b74]">
                <div className="flex flex-col items-center gap-3 text-sm">
                  <span className="material-symbols-outlined animate-spin text-[30px]">progress_activity</span>
                  Loading planner
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Shift detail</h3>
            </div>
            {selectedShift ? (
              <div className="space-y-4 px-4 py-4">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#9b988f]">Selected shift</p>
                      <h4 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1a1a18]">
                        {selectedShift.staffName} / {selectedShift.clientName}
                      </h4>
                    </div>
                    <span className={statusBadge(selectedShift.status)}>{statusLabel(selectedShift.status)}</span>
                  </div>
                  <p className="mt-2 text-[12px] text-[#7d7a73]">
                    {formatLongDate(selectedShift.start)} - {formatTime(selectedShift.end)}
                  </p>
                  <p className="mt-1 text-[12px] text-[#7d7a73]">
                    {selectedShift.clientAddress ?? 'Address not yet configured'}
                  </p>
                </div>

                <div className="rounded-[18px] bg-[#faf9f6] p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Assignment notes</p>
                  <p className="mt-2 text-sm leading-6 text-[#49463f]">
                    {selectedShift.notes ?? 'No handover notes added yet. Add travel, medication, or communication notes when publishing.'}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Shift checklist</p>
                  {checklistRows(selectedShift).map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-3 rounded-[16px] bg-[#faf9f6] px-3 py-3"
                    >
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] ${item.done ? item.doneClass : 'bg-[#ebe7df] text-[#8f8b84]'}`}>
                        <span className="material-symbols-outlined text-[16px]">
                          {item.done ? 'check' : 'schedule'}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#1a1a18]">{item.label}</p>
                        <p className="text-[11px] text-[#8a877f]">{item.meta}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-[#7d7a73]">
                Pick a shift on the planner to review its assignment detail.
              </div>
            )}
          </section>
          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Coverage review</h3>
            </div>
            <div className="space-y-3 px-4 py-4">
              <div className="rounded-[18px] bg-[#f5f2ff] p-4">
                <p className="text-[11px] font-medium text-[#5b21b6]">Suggested backup staff</p>
                <p className="mt-1 text-[11px] leading-5 text-[#6d28d9]">
                  Suggestions are based on staff without overlapping rostered work during this shift window.
                </p>
              </div>

              {coverageSuggestions.length > 0 ? (
                coverageSuggestions.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 rounded-[18px] border border-[#ede8ff] bg-[#fbf9ff] px-3 py-3"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9ddff] text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5b21b6]">
                      {initials(member.full_name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1a1a18]">{member.full_name ?? 'Staff record'}</p>
                      <p className="text-[11px] text-[#7f7a9f]">{index === 0 ? 'Best immediate match' : 'Available to review'}</p>
                    </div>
                    <span className="rounded-full bg-[#ede9fe] px-2.5 py-1 text-[10px] font-semibold text-[#6d28d9]">
                      {98 - index * 6}%
                    </span>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-[#d9d4e6] px-4 py-4 text-[12px] leading-6 text-[#7f7a9f]">
                  No alternative staff are currently free for this exact time block. Review schedule conflicts before reassigning.
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#1a1a18]">Quick summary</h3>
            </div>
            <div className="space-y-2 px-4 py-4 text-sm text-[#56524c]">
              <div className="flex items-center justify-between rounded-[16px] bg-[#faf9f6] px-3 py-3">
                <span>Scheduled this week</span>
                <strong className="font-semibold text-[#1a1a18]">{scheduledThisWeek}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[16px] bg-[#faf9f6] px-3 py-3">
                <span>Clocked or complete</span>
                <strong className="font-semibold text-[#1a1a18]">{clockedThisWeek}</strong>
              </div>
              <div className="flex items-center justify-between rounded-[16px] bg-[#faf9f6] px-3 py-3">
                <span>Coverage gaps</span>
                <strong className="font-semibold text-[#1a1a18]">{unassignedThisWeek}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Create new shift" wide>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Staff member</label>
              <select
                value={form.staff_id}
                onChange={event => setField(setForm, 'staff_id', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
              >
                <option value="">Leave unassigned</option>
                {staff.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.full_name ?? 'Unnamed staff'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Client</label>
              <select
                required
                value={form.client_id}
                onChange={event => setField(setForm, 'client_id', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
              >
                <option value="">Select client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.full_name ?? 'Unnamed client'}{client.address ? ` - ${client.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Shift label</label>
            <input
              value={form.title}
              onChange={event => setField(setForm, 'title', event.target.value)}
              placeholder="Morning support, community access, medication round..."
              className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Start time</label>
              <input
                type="datetime-local"
                required
                value={form.start_time}
                onChange={event => setField(setForm, 'start_time', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">End time</label>
              <input
                type="datetime-local"
                required
                value={form.end_time}
                onChange={event => setField(setForm, 'end_time', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={event => setField(setForm, 'notes', event.target.value)}
              placeholder="Add travel notes, support tasks, medication handover, or contact instructions."
              className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
            />
          </div>

          {error ? (
            <div className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-[#efeae2] pt-4 md:flex-row">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-2xl bg-[#f4f2ed] px-4 py-3 text-sm font-semibold text-[#4f4c45]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving shift...' : 'Create shift'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function CalendarSurface({
  bundle,
  events,
  onShiftSelect,
}: {
  bundle: CalendarBundle
  events: Array<Record<string, unknown>>
  onShiftSelect: (shiftId: string) => void
}) {
  const { FullCalendar, dayGridPlugin, timeGridPlugin, interactionPlugin } = bundle

  return (
    <div className="vivid-roster-calendar rounded-[24px] bg-[#faf9f6] p-3">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{ left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' }}
        height="auto"
        nowIndicator
        allDaySlot={false}
        slotMinTime="05:00:00"
        slotMaxTime="23:00:00"
        dayHeaderFormat={{ weekday: 'short', day: 'numeric' }}
        events={events}
        eventClick={(info: any) => onShiftSelect(info.event.id)}
        eventContent={renderEventContent}
      />
    </div>
  )
}

function renderEventContent(arg: any) {
  const shiftTitle = arg.event.extendedProps.shiftTitle as string | null
  const clientName = arg.event.extendedProps.clientName as string

  return (
    <div className="min-w-0 px-1.5 py-1">
      <div className="truncate text-[11px] font-semibold">{arg.event.title}</div>
      <div className="truncate text-[10px] opacity-80">{arg.timeText}</div>
      <div className="truncate text-[10px] opacity-70">{shiftTitle ?? clientName}</div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: string
  label: string
  value: number
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-[24px] p-6 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${
        accent ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'
      }`}
    >
      <div
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          accent ? 'bg-black/10 text-[#1a1a18]' : 'bg-[#f3f1eb] text-[#6c6962]'
        }`}
      >
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      </div>
      <p className={`mt-4 text-[12px] ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function relationRow<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function setField(
  setForm: React.Dispatch<React.SetStateAction<CreateShiftForm>>,
  field: keyof CreateShiftForm,
  value: string,
) {
  setForm(current => ({ ...current, [field]: value }))
}

function currentWeekWindow(today: Date) {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  start.setDate(start.getDate() + (day === 0 ? -6 : 1 - day))

  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

function formatWeekRange(start: Date, end: Date) {
  return `${start.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`
}

function formatLongDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusTone(status: ShiftStatus) {
  if (status === 'active') {
    return { background: '#dcfce7', border: '#22c55e', text: '#166534' }
  }
  if (status === 'completed') {
    return { background: '#ebe7df', border: '#b9b3a8', text: '#59554f' }
  }
  if (status === 'cancelled') {
    return { background: '#fee2e2', border: '#ef4444', text: '#991b1b' }
  }
  return { background: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' }
}

function statusBadge(status: ShiftStatus) {
  if (status === 'active') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#166534]'
  if (status === 'completed') return 'rounded-full bg-[#ebe7df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#59554f]'
  if (status === 'cancelled') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#991b1b]'
  return 'rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]'
}

function statusLabel(status: ShiftStatus) {
  if (status === 'active') return 'Active now'
  if (status === 'completed') return 'Completed'
  if (status === 'cancelled') return 'Cancelled'
  return 'Scheduled'
}

function checklistRows(shift: SelectedShift) {
  const geoReady = Boolean(shift.clientLat && shift.clientLng)
  const shiftStarted = shift.status === 'active' || shift.status === 'completed'

  return [
    {
      label: 'Staff assignment ready',
      meta: shift.staffId ? 'A worker has been allocated.' : 'This shift still needs a worker.',
      done: Boolean(shift.staffId),
      doneClass: 'bg-[#dcfce7] text-[#166534]',
    },
    {
      label: 'Client geofence configured',
      meta: geoReady ? 'Location coordinates are saved for attendance.' : 'Add client coordinates before enforcing geofence.',
      done: geoReady,
      doneClass: 'bg-[#dbeafe] text-[#1d4ed8]',
    },
    {
      label: 'Handover notes prepared',
      meta: shift.notes ? 'Notes are included for the assigned worker.' : 'Add tasks, medication, or visit notes.',
      done: Boolean(shift.notes),
      doneClass: 'bg-[#ede9fe] text-[#6d28d9]',
    },
    {
      label: 'Clock-in recorded',
      meta: shiftStarted ? 'Attendance has started for this shift.' : 'This will unlock once the worker arrives.',
      done: shiftStarted,
      doneClass: 'bg-[#dcfce7] text-[#166534]',
    },
    {
      label: 'Clock-out completed',
      meta: shift.status === 'completed' ? 'Shift is fully closed out.' : 'Awaiting clock-out and final documentation.',
      done: shift.status === 'completed',
      doneClass: 'bg-[#fee2e2] text-[#991b1b]',
    },
  ]
}

function overlaps(leftStart: string, leftEnd: string, rightStart: string, rightEnd: string) {
  const leftStartTime = new Date(leftStart).getTime()
  const leftEndTime = new Date(leftEnd).getTime()
  const rightStartTime = new Date(rightStart).getTime()
  const rightEndTime = new Date(rightEnd).getTime()
  return leftStartTime < rightEndTime && rightStartTime < leftEndTime
}

function initials(name: string | null) {
  return (name ?? 'Staff')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}
