import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import DashboardRealtimeRefresh from '@/components/admin/DashboardRealtimeRefresh'
import TimeGreeting from '@/components/admin/dashboard/TimeGreeting'
import AlertBanner from '@/components/admin/dashboard/AlertBanner'
import KpiGrid, { type KpiTile } from '@/components/admin/dashboard/KpiGrid'
import DashboardLiveMap from '@/components/admin/dashboard/DashboardLiveMap'
import RosterTimeline, { type ShiftBlock, type StaffRow } from '@/components/admin/dashboard/RosterTimeline'
import ClientMixDonut from '@/components/admin/dashboard/ClientMixDonut'
import ComplianceWidget, { type ExpiringDoc } from '@/components/admin/dashboard/ComplianceWidget'
import ActivityFeed, { type ActivityRow } from '@/components/admin/dashboard/ActivityFeed'
import TeamStatusPanel, { type TeamMember } from '@/components/admin/dashboard/TeamStatusPanel'

/**
 * Decimal hour-of-day in Australia/Perth (UTC+8, no DST) for a UTC date.
 * Used by the roster timeline so a shift at 8:35 Perth lands at slot 8.58
 * regardless of where this code runs.
 */
function perthDecimalHour(d: Date): number {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Perth',
    hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(d)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  return (h === 24 ? 0 : h) + m / 60
}

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

export default async function AdminDashboard() {
  const supabase = await createClient()
  const today = dayStart(new Date())
  const chartStart = addDays(today, -3)
  const chartEnd = dayEnd(addDays(today, 3))
  const weekStart = monday(today)
  const weekEnd = dayEnd(addDays(weekStart, 6))
  const eightDaysAgo = addDays(today, -7)
  const thirtyDaysOut = addDays(today, 30)
  const todayStartMs = dayStart(today).getTime()
  const todayEndMs = dayEnd(today).getTime()

  // ── Single round-trip wave: 14 independent queries in parallel ──
  // Co-located with Supabase in syd1, this resolves in ~50-100ms instead of
  // the ~1s the previous 3-wave sequence took with Vercel in US East.
  const [
    { data: weekShifts, error: weekShiftsError },
    { data: chartShifts, error: chartShiftsError },
    { data: boardShifts, error: boardShiftsError },
    { data: criticalIncidents, error: criticalIncidentsError },
    { data: adminProfile },
    { data: sparkShifts },
    { data: sparkIncidents },
    { data: mapShifts },
    { data: initialStaffLocations },
    { data: timelineRows },
    { data: allClients },
    { data: expiringDocs },
    { data: recentNotifs },
    { data: allStaff },
  ] = await Promise.all([
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time').gte('start_time', weekStart.toISOString()).lte('start_time', weekEnd.toISOString()),
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time').gte('start_time', chartStart.toISOString()).lte('start_time', chartEnd.toISOString()),
    supabase.from('shifts').select('id, staff_id, status, start_time, end_time, staff:profiles!staff_id(full_name), clients(full_name, address)').in('status', ['active', 'scheduled']).order('start_time', { ascending: true }).limit(40),
    supabase.from('incidents').select('id, severity, reported_at, clients(full_name)').eq('status', 'open').in('severity', ['high', 'emergency']).order('reported_at', { ascending: false }).limit(1),
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: null }
      return supabase.from('profiles').select('full_name').eq('id', user.id).single()
    })(),
    supabase.from('shifts').select('start_time, status, clock_in_time, clock_out_time, staff:profiles!staff_id(hourly_rate), clients(client_type)').gte('start_time', eightDaysAgo.toISOString()),
    supabase.from('incidents').select('reported_at, status').gte('reported_at', eightDaysAgo.toISOString()),
    supabase.from('shifts').select('id, staff_id, client_id, status, staff:profiles!staff_id(full_name), clients(full_name, address, lat, lng)').in('status', ['active', 'scheduled']).gte('start_time', new Date(Date.now() - 86_400_000).toISOString()).order('start_time', { ascending: true }),
    supabase.from('staff_locations').select('staff_id, lat, lng, updated_at, shift_id'),
    supabase.from('shifts').select('id, staff_id, start_time, end_time, status, clock_in_time, clock_out_time, staff:profiles!staff_id(full_name), clients(full_name, client_type)').gte('start_time', new Date(todayStartMs).toISOString()).lte('start_time', new Date(todayEndMs).toISOString()).order('start_time', { ascending: true }),
    supabase.from('clients').select('client_type'),
    supabase.from('documents').select('id, doc_type, expiry_date, owner_id, owner_type').not('expiry_date', 'is', null).lte('expiry_date', thirtyDaysOut.toISOString().split('T')[0]).gte('expiry_date', today.toISOString().split('T')[0]).order('expiry_date', { ascending: true }).limit(20),
    supabase.from('notifications').select('id, type, title, created_at').order('created_at', { ascending: false }).limit(8),
    supabase.from('profiles').select('id, full_name').eq('role', 'staff').order('full_name'),
  ])
  if (criticalIncidentsError) console.error('[dashboard page] critical incidents fetch failed:', criticalIncidentsError)
  if (weekShiftsError) console.error('[dashboard page] week shifts fetch failed:', weekShiftsError)
  if (chartShiftsError) console.error('[dashboard page] chart shifts fetch failed:', chartShiftsError)
  if (boardShiftsError) console.error('[dashboard page] board shifts fetch failed:', boardShiftsError)

  const shifts = (weekShifts ?? []) as Shift[]
  const chart = (chartShifts ?? []) as Shift[]
  const board = ((boardShifts ?? []) as BoardShiftRow[]).map(shift => ({
    ...shift,
    staff: Array.isArray(shift.staff) ? (shift.staff[0] ?? null) : (shift.staff ?? null),
    clients: Array.isArray(shift.clients) ? (shift.clients[0] ?? null) : (shift.clients ?? null),
  })) as BoardShift[]

  const completed = shifts.filter(shift => shift.status === 'completed' || shift.status === 'active').length
  const planned = shifts.filter(shift => shift.status !== 'cancelled').length

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

  // KPI sparkline buckets — derived from sparkShifts/sparkIncidents (already fetched above)
  const shiftsSpark: number[] = []
  const hoursSpark: number[] = []
  const revenueSpark: number[] = []
  const incidentsSpark: number[] = []

  for (let d = 7; d >= 0; d--) {
    const dayDate = addDays(today, -d)
    const dStart = dayStart(dayDate).getTime()
    const dEnd = dayEnd(dayDate).getTime()
    const onDay = ((sparkShifts ?? []) as any[]).filter(s => {
      const t = new Date(s.start_time).getTime()
      return t >= dStart && t <= dEnd
    })
    shiftsSpark.push(onDay.length)
    let hSum = 0
    let rSum = 0
    onDay.forEach(s => {
      if (s.clock_in_time && s.clock_out_time) {
        const h = (new Date(s.clock_out_time).getTime() - new Date(s.clock_in_time).getTime()) / 3600000
        if (h > 0) {
          hSum += h
          const staffRow = Array.isArray(s.staff) ? s.staff[0] : s.staff
          const clientRow = Array.isArray(s.clients) ? s.clients[0] : s.clients
          if (clientRow?.client_type === 'ndis') {
            rSum += h * Number(staffRow?.hourly_rate ?? 0)
          }
        }
      }
    })
    hoursSpark.push(Math.round(hSum))
    revenueSpark.push(Math.round(rSum))
    incidentsSpark.push(((sparkIncidents ?? []) as any[]).filter(i => {
      const t = new Date(i.reported_at).getTime()
      return t >= dStart && t <= dEnd
    }).length)
  }

  const hoursThisWeek = hoursSpark.slice(-7).reduce((a, b) => a + b, 0)
  const ndisRevenueThisWeek = revenueSpark.slice(-7).reduce((a, b) => a + b, 0)
  const openIncidentsCount = ((sparkIncidents ?? []) as any[]).filter(i => i.status === 'open').length
  const shiftsScheduledToday = (chart ?? []).filter(s => stamp(new Date(s.start_time)) === stamp(today)).length

  // Live roster timeline data — today's shifts grouped by staff (timelineRows already fetched above)
  const staffToneOptions: StaffRow['tone'][] = ['warm', 'blue', 'peach', 'green', 'amber', 'purple']
  const staffMap = new Map<string, StaffRow>()
  const timelineBlocks: ShiftBlock[] = []

  ;(timelineRows ?? []).forEach((s: any) => {
    if (!s.staff_id) return
    const staffRel = Array.isArray(s.staff) ? s.staff[0] : s.staff
    if (!staffMap.has(s.staff_id)) {
      staffMap.set(s.staff_id, {
        id: s.staff_id,
        name: staffRel?.full_name ?? 'Staff',
        role: 'Support worker',
        tone: staffToneOptions[staffMap.size % staffToneOptions.length],
      })
    }

    const start = new Date(s.start_time)
    const end = new Date(s.end_time)
    // Use Australia/Perth-local hours so blocks land in the correct slot
    // regardless of where the server / admin's browser is.
    const startHour = perthDecimalHour(start)
    const endHour = perthDecimalHour(end)
    const clientRel = Array.isArray(s.clients) ? s.clients[0] : s.clients
    const clientName = clientRel?.full_name ?? 'Client'
    const isLive = s.status === 'active' || (s.clock_in_time && !s.clock_out_time)
    const isMissed = s.status === 'missed' || (s.status === 'scheduled' && end.getTime() < Date.now())
    const isNdis = clientRel?.client_type === 'ndis'
    const color: ShiftBlock['color'] = isMissed
      ? 'red'
      : isLive
        ? 'green'
        : isNdis
          ? 'blue'
          : 'purple'

    // Format the time label in Perth time too so it matches the block position
    const fmt = (d: Date) => {
      const parts = new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Perth',
        hour: 'numeric', minute: '2-digit', hour12: true,
      }).formatToParts(d)
      const h = parts.find(p => p.type === 'hour')?.value ?? ''
      const m = parts.find(p => p.type === 'minute')?.value ?? '00'
      const ap = (parts.find(p => p.type === 'dayPeriod')?.value ?? 'am').toLowerCase()
      return `${h}:${m}${ap.charAt(0)}` // e.g. 8:35a / 4:30p
    }

    timelineBlocks.push({
      id: s.id,
      staffId: s.staff_id,
      clientName,
      startHour,
      endHour,
      color,
      sub: `${fmt(start)}–${fmt(end)}${isMissed ? ' · missed' : ''}`,
      live: isLive,
    })
  })

  const timelineStaff = Array.from(staffMap.values()).slice(0, 8)

  // Side widgets data — allClients/expiringDocs/recentNotifs/allStaff already fetched above

  // Client mix
  const ndisClientCount = ((allClients ?? []) as { client_type: string }[]).filter(c => c.client_type === 'ndis').length
  const standardClientCount = ((allClients ?? []) as { client_type: string }[]).filter(c => c.client_type === 'standard').length

  // Resolve owner names for the compliance widget
  const expiringStaffIds = ((expiringDocs ?? []) as any[]).filter(d => d.owner_type === 'staff').map(d => d.owner_id)
  const expiringClientIds = ((expiringDocs ?? []) as any[]).filter(d => d.owner_type === 'client').map(d => d.owner_id)
  const [{ data: staffNamesRes }, { data: clientNamesRes }] = await Promise.all([
    expiringStaffIds.length
      ? supabase.from('profiles').select('id, full_name').in('id', expiringStaffIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    expiringClientIds.length
      ? supabase.from('clients').select('id, full_name').in('id', expiringClientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])
  const nameMap = new Map<string, string>()
  ;((staffNamesRes ?? []) as { id: string; full_name: string | null }[]).forEach(r => nameMap.set(r.id, r.full_name ?? 'Staff'))
  ;((clientNamesRes ?? []) as { id: string; full_name: string | null }[]).forEach(r => nameMap.set(r.id, r.full_name ?? 'Client'))

  const expiringDocsList: ExpiringDoc[] = ((expiringDocs ?? []) as any[])
    .map(d => {
      const daysLeft = Math.round((new Date(d.expiry_date).getTime() - Date.now()) / 86_400_000)
      return {
        id: d.id,
        docType: d.doc_type,
        ownerName: nameMap.get(d.owner_id) ?? 'Unknown',
        ownerType: d.owner_type as 'staff' | 'client',
        ownerId: d.owner_id,
        daysLeft,
      }
    })
    .slice(0, 5)

  // Activity feed icons
  const ICON_MAP: Record<string, { icon: string; bg: string; color: string }> = {
    clock_in:    { icon: 'login',          bg: '#F1F9E1', color: '#5E8D1F' },
    clock_out:   { icon: 'logout',         bg: '#F0F1F3', color: '#475569' },
    incident:    { icon: 'warning',        bg: '#FEF3D6', color: '#78350F' },
    doc_expiry:  { icon: 'description',    bg: '#FEE2E2', color: '#991B1B' },
    roster:      { icon: 'calendar_month', bg: '#F4ECF8', color: '#54206F' },
    default:     { icon: 'notifications',  bg: '#F0F1F3', color: '#475569' },
  }
  const activityItems: ActivityRow[] = ((recentNotifs ?? []) as any[]).map(n => {
    const meta = ICON_MAP[n.type as string] ?? ICON_MAP.default
    const date = new Date(n.created_at)
    const diff = Date.now() - date.getTime()
    const mins = Math.floor(diff / 60_000)
    const hrs = Math.floor(mins / 60)
    const ds = Math.floor(hrs / 24)
    const time = ds > 0 ? `${ds}d ago` : hrs > 0 ? `${hrs}h ago` : mins > 0 ? `${mins}m ago` : 'just now'
    return { id: n.id, icon: meta.icon, iconBg: meta.bg, iconColor: meta.color, title: n.title, time }
  })

  // Team status — derive each staff member's current state from active/scheduled shifts
  const teamMembers: TeamMember[] = ((allStaff ?? []) as { id: string; full_name: string | null }[]).map(p => {
    const current = (board ?? []).find(s => s.staff_id === p.id && s.status === 'active')
    const next = (board ?? []).find(s => s.staff_id === p.id && s.status === 'scheduled' && new Date(s.start_time).getTime() > Date.now())
    let status: TeamMember['status'] = 'off'
    let detail = 'Off today'
    if (current) {
      status = 'on_shift'
      const c = current.clients
      detail = `Support · ${c?.full_name ?? 'client'}`
    } else if (next) {
      status = 'available'
      const t = new Date(next.start_time)
      detail = `Available · next ${t.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: false })}`
    }
    return { id: p.id, name: p.full_name ?? 'Staff', detail, status }
  }).slice(0, 8)

  return (
    <>
      <DashboardRealtimeRefresh />
      {/* .adm-page-head pattern from the handoff — h1 + sub + action cluster. */}
      <div className="adm-page-head">
        <div>
          <TimeGreeting firstName={firstName} />
          <div className="sub">
            {today.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Australia/Perth' })}
            {' · '}
            {shiftsToday} shifts scheduled across {staffWorkingToday} support workers
          </div>
        </div>
        <div className="actions">
          <Link href="/admin/shifts?view=past" className="adm-pillbtn">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">history</span>
            History
          </Link>
          <Link href="/admin/roster" className="adm-pillbtn primary">
            <span className="material-symbols-outlined" style={{ fontSize: 14 }} aria-hidden="true">add</span>
            New shift
          </Link>
        </div>
      </div>

      {topCriticalIncident && (
        <AlertBanner
          clientName={topIncidentClientName}
          reportedAt={topCriticalIncident.reported_at}
          severity={topCriticalIncident.severity}
          deadline={nextThursday}
          href={`/admin/incidents/${topCriticalIncident.id}`}
        />
      )}

      {/* KPI grid — admin can rearrange the tiles via "Customize" in the
          eyebrow row; order persists in localStorage per device. */}
      {(() => {
        const kpiTiles: KpiTile[] = [
          {
            key: 'shifts_today',
            icon: 'calendar_month',
            label: 'Shifts today',
            value: shiftsToday,
            sub:
              shiftsScheduledToday > 0 && shiftsScheduledToday !== shiftsToday
                ? `of ${shiftsScheduledToday} scheduled`
                : `${shiftsToday === 1 ? 'shift' : 'shifts'} on today's roster`,
            delta: (() => {
              const diff = (shiftsSpark[7] ?? 0) - (shiftsSpark[0] ?? 0)
              const sign = diff > 0 ? '+' : ''
              return `${sign}${diff} vs 7 days ago`
            })(),
            direction: shiftsSpark[7] >= (shiftsSpark[0] ?? 0) ? 'up' : 'down',
            target: percent(completed, planned || 1),
            context: percent(completed, planned || 1) >= 80 ? 'On target' : 'Below target',
            color: '#6B2C91',
            bg: '#F4ECF8',
            spark: shiftsSpark,
          },
          {
            key: 'hours_week',
            icon: 'schedule',
            label: 'Hours this week',
            value: `${hoursThisWeek}h`,
            sub: 'team total',
            delta: hoursThisWeek > 0 ? 'tracked from clock-in/out' : 'no clocked hours yet',
            direction: 'up',
            target: Math.min(100, Math.round((hoursThisWeek / 200) * 100)),
            context: hoursThisWeek >= 150 ? 'Above average' : 'Normal',
            color: '#1380AB',
            bg: '#E6F5FC',
            spark: hoursSpark,
          },
          {
            key: 'ndis_revenue',
            icon: 'payments',
            label: 'NDIS revenue',
            value: `$${(ndisRevenueThisWeek / 1000).toFixed(ndisRevenueThisWeek >= 10000 ? 0 : 1)}k`,
            sub: 'unbilled this week',
            delta: 'From clocked NDIS shifts',
            direction: 'flat',
            target: Math.min(100, Math.round((ndisRevenueThisWeek / 30000) * 100)),
            context: 'Tracking',
            color: '#5E8D1F',
            bg: '#F1F9E1',
            spark: revenueSpark,
          },
          {
            key: 'open_incidents',
            icon: 'warning',
            label: 'Open incidents',
            value: openIncidentsCount,
            sub: openIncidentsCount > 0 ? 'awaiting review' : 'all clear',
            delta: openIncidentsCount > 0 ? 'review by deadline' : 'no open items',
            direction: (() => {
              const avg =
                incidentsSpark.slice(0, -1).reduce((a, b) => a + b, 0) /
                Math.max(1, incidentsSpark.length - 1)
              if (openIncidentsCount > avg + 0.5) return 'up'
              if (openIncidentsCount < avg - 0.5) return 'down'
              return 'flat'
            })(),
            target: Math.max(0, 100 - Math.min(100, openIncidentsCount * 20)),
            context:
              openIncidentsCount === 0
                ? 'All clear'
                : openIncidentsCount > 5
                  ? 'Above threshold'
                  : 'Below threshold',
            color: '#D97706',
            bg: '#FEF3D6',
            spark: incidentsSpark,
          },
        ]
        return <KpiGrid tiles={kpiTiles} />
      })()}

      <DashboardLiveMap
        initialShifts={(mapShifts ?? []) as any}
        initialStaffLocations={(initialStaffLocations ?? []) as any}
      />

      <RosterTimeline staff={timelineStaff} blocks={timelineBlocks} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ClientMixDonut ndis={ndisClientCount} standard={standardClientCount} />
        <ComplianceWidget docs={expiringDocsList} totalCount={(expiringDocs ?? []).length} />
        <ActivityFeed items={activityItems} />
        <TeamStatusPanel members={teamMembers} />
      </div>
    </>
  )
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

/**
 * All KPI / sparkline date math runs in Australia/Perth time so the
 * "today" / "this week" windows align with how VividCare staff actually
 * operate. Vercel functions run in UTC; without these helpers, "today"
 * would shift by 8h and the early/late hours of a Perth day would land
 * in the wrong sparkline bucket.
 */

const PERTH_TZ = 'Australia/Perth'

/** YYYY-MM-DD for `date`, expressed in Perth local time. */
function perthYmd(date: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: PERTH_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date)
  const y = Number(parts.find(p => p.type === 'year')?.value ?? 1970)
  const m = Number(parts.find(p => p.type === 'month')?.value ?? 1)
  const d = Number(parts.find(p => p.type === 'day')?.value ?? 1)
  return { y, m, d }
}

/** Returns the Perth-local midnight (00:00 Perth) for the given moment, as a Date. */
function dayStart(date: Date) {
  const { y, m, d } = perthYmd(date)
  // Perth = UTC+8, no DST. 00:00 Perth = 16:00 UTC of the previous day.
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - 8 * 3600 * 1000)
}

/** Returns 23:59:59.999 Perth time for the given moment, as a Date. */
function dayEnd(date: Date) {
  const start = dayStart(date)
  return new Date(start.getTime() + 24 * 3600 * 1000 - 1)
}

/** Add `days` Perth-days and return the resulting Perth-midnight. */
function addDays(date: Date, days: number) {
  const start = dayStart(date)
  return new Date(start.getTime() + days * 24 * 3600 * 1000)
}

/** Monday-of-week (Perth) for the given moment, as Perth-midnight. */
function monday(date: Date) {
  const start = dayStart(date)
  // Get Perth weekday: format "narrow weekday" gives Mon=2, etc — easier
  // path is to take Perth Y/M/D, construct that as UTC midnight, and use
  // getUTCDay (0=Sun..6=Sat). Then offset.
  const { y, m, d } = perthYmd(date)
  const perthMidnightAsUtc = new Date(Date.UTC(y, m - 1, d))
  const day = perthMidnightAsUtc.getUTCDay()
  const offsetToMonday = day === 0 ? -6 : 1 - day
  return new Date(start.getTime() + offsetToMonday * 24 * 3600 * 1000)
}

/** YYYY-MM-DD stamp in Perth, used as a chart bucket key. */
function stamp(date: Date) {
  const { y, m, d } = perthYmd(date)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
