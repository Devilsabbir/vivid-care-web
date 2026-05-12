import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { daysUntilExpiry, getExpiryStatus } from '@/lib/utils/expiry'
import DashboardRealtimeRefresh from '@/components/admin/DashboardRealtimeRefresh'
import AlertBanner from '@/components/admin/dashboard/AlertBanner'

type Shift = {
  id: string
  staff_id: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  start_time: string
  end_time: string
}

type BoardShift = Shift & {
  staff: { full_name: string | null } | null
  clients: { full_name: string | null; address: string | null } | null
}

type BoardShiftRow = Shift & {
  staff: { full_name: string | null } | { full_name: string | null }[] | null
  clients: { full_name: string | null; address: string | null } | { full_name: string | null; address: string | null }[] | null
}

type Doc = {
  id: string
  owner_id: string
  owner_type: 'staff' | 'client'
  doc_type: string
  expiry_date: string | null
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = dayStart(new Date())
  const chartStart = addDays(today, -3)
  const chartEnd = dayEnd(addDays(today, 3))
  const weekStart = monday(today)
  const weekEnd = dayEnd(addDays(weekStart, 6))

  const [
    { count: staffCount, error: staffCountError },
    { count: clientCount, error: clientCountError },
    { data: weekShifts, error: weekShiftsError },
    { data: chartShifts, error: chartShiftsError },
    { data: boardShifts, error: boardShiftsError },
    { data: docs, error: docsError },
    { data: incidents, error: incidentsError },
    { data: unreadNotifications, error: notificationsError },
    { data: criticalIncidents, error: criticalIncidentsError },
    { data: adminProfile },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time').gte('start_time', weekStart.toISOString()).lte('start_time', weekEnd.toISOString()),
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time').gte('start_time', chartStart.toISOString()).lte('start_time', chartEnd.toISOString()),
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time, staff:profiles!staff_id(full_name), clients(full_name, address)').in('status', ['active', 'scheduled']).order('start_time', { ascending: true }).limit(6),
    supabase.from('documents').select('id, owner_id, owner_type, doc_type, expiry_date').not('expiry_date', 'is', null).order('expiry_date', { ascending: true }).limit(8),
    supabase.from('incidents').select('id').neq('status', 'resolved'),
    supabase.from('notifications').select('id').eq('read', false),
    supabase.from('incidents')
      .select('id, severity, reported_at, clients(full_name)')
      .eq('status', 'open')
      .in('severity', ['high', 'emergency'])
      .order('reported_at', { ascending: false })
      .limit(1),
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null }
      return supabase.from('profiles').select('full_name').eq('id', user.id).single()
    })(),
  ])
  if (criticalIncidentsError) console.error('[dashboard page] critical incidents fetch failed:', criticalIncidentsError)
  if (staffCountError) console.error('[dashboard page] profiles count fetch failed:', staffCountError)
  if (clientCountError) console.error('[dashboard page] clients count fetch failed:', clientCountError)
  if (weekShiftsError) console.error('[dashboard page] week shifts fetch failed:', weekShiftsError)
  if (chartShiftsError) console.error('[dashboard page] chart shifts fetch failed:', chartShiftsError)
  if (boardShiftsError) console.error('[dashboard page] board shifts fetch failed:', boardShiftsError)
  if (docsError) console.error('[dashboard page] documents fetch failed:', docsError)
  if (incidentsError) console.error('[dashboard page] incidents fetch failed:', incidentsError)
  if (notificationsError) console.error('[dashboard page] notifications fetch failed:', notificationsError)

  const shifts = (weekShifts ?? []) as Shift[]
  const chart = (chartShifts ?? []) as Shift[]
  const board = ((boardShifts ?? []) as BoardShiftRow[]).map(shift => ({
    ...shift,
    staff: Array.isArray(shift.staff) ? (shift.staff[0] ?? null) : (shift.staff ?? null),
    clients: Array.isArray(shift.clients) ? (shift.clients[0] ?? null) : (shift.clients ?? null),
  })) as BoardShift[]
  const urgentDocs = ((docs ?? []) as Doc[]).filter(doc => {
    const status = getExpiryStatus(doc.expiry_date)
    return status === 'near_expiry' || status === 'expired'
  })

  const completed = shifts.filter(shift => shift.status === 'completed' || shift.status === 'active').length
  const planned = shifts.filter(shift => shift.status !== 'cancelled').length
  const activeBoard = board.filter(shift => shift.status === 'active')
  const scheduledBoard = board.filter(shift => shift.status === 'scheduled')
  const liveStaff = new Set(activeBoard.map(shift => shift.staff_id)).size
  const liveBoard = activeBoard.length > 0 ? [...activeBoard, ...scheduledBoard].slice(0, 6) : scheduledBoard.slice(0, 6)

  // Header & alert banner data
  const firstName = (adminProfile?.full_name ?? '').split(' ')[0] || 'there'
  const shiftsToday = (chart ?? []).filter(s => stamp(new Date(s.start_time)) === stamp(today)).length
  const staffWorkingToday = new Set(
    (chart ?? []).filter(s => stamp(new Date(s.start_time)) === stamp(today)).map(s => s.staff_id).filter(Boolean),
  ).size
  const topCriticalIncident = (criticalIncidents ?? [])[0] as
    | { id: string; severity: string; reported_at: string; clients: { full_name: string | null } | { full_name: string | null }[] | null }
    | undefined
  const topIncidentClientName = topCriticalIncident
    ? Array.isArray(topCriticalIncident.clients)
      ? topCriticalIncident.clients[0]?.full_name ?? 'Client'
      : topCriticalIncident.clients?.full_name ?? 'Client'
    : ''

  // NDIS reporting window — show next Thursday as a reasonable default
  const nextThursday = (() => {
    const d = new Date(today)
    const day = d.getDay() // 0 Sun
    const delta = (4 - day + 7) % 7 || 7 // distance to Thursday (4)
    d.setDate(d.getDate() + delta)
    return d.toLocaleDateString('en-AU', { weekday: 'long' })
  })()

  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 3)).map(date => {
    const key = stamp(date)
    const dayShifts = chart.filter(shift => stamp(new Date(shift.start_time)) === key)
    return {
      label: date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
      isToday: stamp(today) === key,
      complete: dayShifts.filter(shift => shift.status === 'completed' || shift.status === 'active').length,
      upcoming: dayShifts.filter(shift => shift.status === 'scheduled').length,
      future: date > today,
    }
  })
  const maxBar = Math.max(...days.map(day => Math.max(day.complete, day.upcoming)), 1)

  return (
    <div className="flex flex-col gap-6">
      <DashboardRealtimeRefresh />
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-[#0f172a] md:text-[32px]">
            Good morning, {firstName}
          </h1>
          <p className="mt-1 text-[13px] text-[#64748b]">
            {today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {' · '}
            {shiftsToday} shifts scheduled across {staffWorkingToday} support workers
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-[#f0f1f3] p-1 text-[12px] font-medium">
            <button type="button" className="rounded-full px-3 py-1.5 text-[#64748b] hover:text-[#0f172a]">Day</button>
            <button type="button" className="rounded-full bg-[#0f172a] px-3 py-1.5 text-white">Week</button>
            <button type="button" className="rounded-full px-3 py-1.5 text-[#64748b] hover:text-[#0f172a]">Month</button>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#e6e8ec] bg-white px-4 py-1.5 text-[12px] font-semibold text-[#0f172a] hover:bg-[#f7f8f9]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
            Export
          </button>
          <Link
            href="/admin/roster"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#6B2C91] px-4 py-1.5 text-[12px] font-semibold text-white shadow-[0_4px_14px_rgba(107,44,145,0.25)] hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
            New shift
          </Link>
        </div>
      </header>

      {topCriticalIncident && (
        <AlertBanner
          clientName={topIncidentClientName}
          reportedAt={topCriticalIncident.reported_at}
          severity={topCriticalIncident.severity}
          deadline={nextThursday}
          href={`/admin/incidents/${topCriticalIncident.id}`}
        />
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_320px]">
        <div className="rounded-[24px] border border-[#e6e8ec] bg-white p-6 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#f3f1eb]">
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
            </span>
            <span className="rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[11px] font-semibold text-[#64748b]">{percent(completed, planned)}%</span>
          </div>
          <p className="mt-5 text-[12px] text-[#9a978f]">Shifts this week</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-headline text-[3rem] leading-none tracking-[-0.08em]">{planned}</span>
            <span className="pb-1 text-xs text-[#9a978f]">{completed} fulfilled</span>
          </div>
          <p className="mt-3 text-xs text-[#9a978f]">Across {clientCount ?? 0} active clients</p>
        </div>

        <div className="rounded-[24px] bg-[#6B2C91] p-6 shadow-[0_14px_32px_rgba(26,26,24,0.04)]">
          <div className="flex items-start justify-between">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black/10">
              <span className="material-symbols-outlined text-[20px]">badge</span>
            </span>
            <span className="rounded-full bg-black/10 px-2.5 py-1 text-[11px] font-semibold text-[#0f172a]">{percent(liveStaff, staffCount ?? 0)}%</span>
          </div>
          <p className="mt-5 text-[12px] text-[#54206F]">Staff on shift</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-headline text-[3rem] leading-none tracking-[-0.08em]">{liveStaff}</span>
            <span className="pb-1 text-xs text-[#54206F]">/ {staffCount ?? 0}</span>
          </div>
          <p className="mt-3 text-xs text-[#54206F]">Live clock-in coverage right now</p>
        </div>

        <div className="relative overflow-hidden rounded-[24px] bg-[#0f172a] p-6 text-white">
          <div className="absolute right-[-24px] top-[-24px] h-36 w-36 rounded-full bg-white/5" />
          <div className="relative flex h-full flex-col justify-between gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-white/45">Rostering intelligence</p>
              <h2 className="mt-4 max-w-[18rem] text-[1.5rem] leading-tight tracking-[-0.04em]">
                Keep your roster ready for AI suggestions and conflict review.
              </h2>
            </div>
            <Link href="/admin/roster" className="inline-flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-[#0f172a]">
              Open roster planner
              <span className="material-symbols-outlined text-[18px]">north_east</span>
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">bar_chart</span>
                <h3 className="text-sm font-semibold">Shift statistics</h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#87847d]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-[#0f172a]" />
                  Completed
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full border border-[#a8a49b] bg-[#6B2C91]" />
                  Upcoming
                </span>
              </div>
              <span className="ml-auto rounded-xl bg-[#f7f8f9] px-3 py-1.5 text-[11px] text-[#64748b]">
                {today.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="overflow-x-auto">
              <div className="grid min-w-[320px] grid-cols-7 gap-3">
                {days.map(day => {
                  const completeHeight = day.complete > 0 ? Math.max(28, (day.complete / maxBar) * 116) : 22
                  const upcomingHeight = day.upcoming > 0 ? Math.max(18, (day.upcoming / maxBar) * 66) : 16
                  const empty = day.complete === 0 && day.upcoming === 0
                  return (
                    <div key={day.label} className="flex flex-col items-center gap-3">
                      <div className="flex h-[160px] w-full items-end justify-center gap-1.5">
                        <div className={`w-full max-w-[22px] rounded-full ${empty && day.future ? 'border border-dashed border-[#d1d5db] bg-[#f0f1f3]' : 'bg-[#0f172a]'}`} style={{ height: `${completeHeight}px` }} />
                        <div className={`w-full max-w-[22px] rounded-full ${empty ? 'border border-dashed border-[#e6e8ec] bg-[#f7f8f9]' : 'border border-[#94a3b8] bg-[#6B2C91]'}`} style={{ height: `${upcomingHeight}px` }} />
                      </div>
                      <span className={`text-[10px] ${day.isToday ? 'font-semibold text-[#0f172a]' : 'text-[#97938a]'}`}>{day.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Live roster board</h3>
                <p className="text-xs text-[#64748b]">
                  {activeBoard.length > 0 ? `${activeBoard.length} active shifts right now` : 'Next scheduled shifts ready to review'}
                </p>
              </div>
              <Link href="/admin/active-shifts" className="rounded-full bg-[#f7f8f9] px-3 py-1.5 text-[11px] font-medium text-[#64748b]">View live board</Link>
            </div>

            {liveBoard.length > 0 ? (
              <div className="space-y-3">
                {liveBoard.map(shift => (
                  <Link key={shift.id} href={`/admin/shifts/${shift.id}`} className="flex flex-col gap-3 rounded-[22px] border border-[#f0f1f3] bg-[#fafbfc] p-4 md:flex-row md:items-center hover:bg-[#f7f8f9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0f172a] text-sm font-semibold uppercase tracking-[0.14em] text-[#6B2C91]">
                        {initials(shift.staff?.full_name)}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[#0f172a]">{shift.staff?.full_name ?? 'Unassigned staff'}</h4>
                        <p className="text-xs text-[#64748b]">
                          {shift.clients?.full_name ?? 'Client pending'}
                          {shift.clients?.address ? ` Â· ${shift.clients.address}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="md:ml-auto md:text-right">
                      <span className={shift.status === 'active' ? 'inline-flex rounded-full bg-[#F4ECF8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#54206F]' : 'inline-flex rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#92400e]'}>
                        {shift.status === 'active' ? 'Active now' : 'Scheduled'}
                      </span>
                      <p className="mt-2 text-xs text-[#68655e]">{clock(shift.start_time)} - {clock(shift.end_time)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-6 py-12 text-center">
                <span className="material-symbols-outlined text-[36px] text-[#94a3b8]">calendar_month</span>
                <p className="mt-3 text-sm font-medium text-[#0f172a]">No active or scheduled shifts in this window</p>
                <p className="mt-1 text-xs text-[#64748b]">Use the scheduler to publish the next wave of care visits.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[24px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <h3 className="text-sm font-semibold text-[#0f172a]">Quick links</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                ['Roster', '/admin/roster', 'calendar_month'],
                ['Doc hub', '/admin/compliance', 'description'],
                ['Staff', '/admin/staff', 'badge'],
                ['Clients', '/admin/clients', 'group'],
              ].map(([label, href, icon]) => (
                <Link key={href} href={href} className="flex flex-col gap-3 rounded-[18px] border border-[#ece8e1] bg-[#fafbfc] p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f0ede7] text-[#69665e]">
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-[#64748b]">north_east</span>
                  </div>
                  <span className="text-[12px] font-medium text-[#0f172a]">{label}</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Compliance watch</h3>
                <p className="text-xs text-[#64748b]">Expiring within 45 days</p>
              </div>
              <Link href="/admin/compliance" className="text-[11px] font-medium text-[#64748b]">Open</Link>
            </div>
            <div className="mt-4 space-y-3">
              {urgentDocs.length > 0 ? urgentDocs.map(doc => {
                const left = daysUntilExpiry(doc.expiry_date)
                const docHref = doc.owner_type === 'staff'
                  ? `/admin/staff/${doc.owner_id}?tab=documents`
                  : `/admin/clients/${doc.owner_id}?tab=documents`
                return (
                  <Link key={doc.id} href={docHref} className="flex items-center gap-3 rounded-[18px] bg-[#fafbfc] px-3 py-3 hover:bg-[#f7f8f9] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] text-white ${doc.owner_type === 'staff' ? 'bg-[#2f5fda]' : 'bg-[#54206F]'}`}>
                      {doc.owner_type === 'staff' ? 'ST' : 'CL'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-[#0f172a]">{doc.doc_type}</p>
                      <p className="text-[10px] text-[#98958c]">{doc.owner_type === 'staff' ? 'Staff document' : 'Client document'}</p>
                    </div>
                    <span className={getExpiryStatus(doc.expiry_date) === 'expired' ? 'inline-flex rounded-full bg-[#fee2e2] px-2 py-1 text-[10px] font-semibold text-[#991b1b]' : 'inline-flex rounded-full bg-[#fef9c3] px-2 py-1 text-[10px] font-semibold text-[#92400e]'}>
                      {left !== null && left < 0 ? `${Math.abs(left)}d overdue` : `${left ?? 0}d left`}
                    </span>
                  </Link>
                )
              }) : (
                <div className="rounded-[18px] bg-[#fafbfc] px-4 py-6 text-center text-xs text-[#7c7a72]">No urgent document renewals in the current queue.</div>
              )}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#e6e8ec] bg-white p-4 shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <h3 className="text-sm font-semibold text-[#0f172a]">Operational pulse</h3>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Open incidents', href: '/admin/incidents', value: incidents?.length ?? 0 },
                { label: 'Unread notifications', href: '/admin/notifications', value: unreadNotifications?.length ?? 0 },
                { label: 'Active clients', href: '/admin/clients', value: clientCount ?? 0 },
              ].map(item => (
                <Link key={item.href} href={item.href} className="flex items-center justify-between rounded-[18px] bg-[#fafbfc] px-3 py-3">
                  <span className="text-[12px] text-[#58554f]">{item.label}</span>
                  <span className="font-headline text-xl tracking-[-0.05em] text-[#0f172a]">{item.value}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function initials(name?: string | null) {
  return name ? name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') : 'VC'
}

function clock(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function dayStart(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function dayEnd(date: Date) {
  const next = new Date(date)
  next.setHours(23, 59, 59, 999)
  return next
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return dayStart(next)
}

function monday(date: Date) {
  const next = dayStart(date)
  const day = next.getDay()
  next.setDate(next.getDate() + (day === 0 ? -6 : 1 - day))
  return next
}

function stamp(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
