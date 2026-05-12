'use client'

import Link from 'next/link'
import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal from '@/components/ui/Modal'
import RosterValidationPanel from '@/components/roster/RosterValidationPanel'
import { useRosterValidation } from './useRosterValidation'

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ShiftStatus = 'scheduled' | 'active' | 'completed' | 'cancelled'
type RosterView = 'week' | 'day' | 'staff'

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
  support_type_key: string | null
  documentation_status: string | null
  start_time: string
  end_time: string
  notes: string | null
  status: ShiftStatus
  profiles: ShiftRelation | ShiftRelation[] | null
  clients: ShiftRelation | ShiftRelation[] | null
}

type StaffOption = { id: string; full_name: string | null }
type ClientOption = { id: string; full_name: string | null; address: string | null; lat: number | null; lng: number | null }
type SupportTypeOption = { key: string; title: string | null }

type NormalizedShift = {
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
  supportTypeKey: string | null
  documentationStatus: string | null
  startHour: number   // e.g. 9.5 = 9:30 am
  endHour: number
  weekDayIdx: number  // 0=Mon â€¦ 6=Sun
}

type CreateShiftForm = {
  staff_id: string
  client_id: string
  title: string
  support_type_key: string
  start_time: string
  end_time: string
  notes: string
}

const EMPTY_FORM: CreateShiftForm = {
  staff_id: '', client_id: '', title: '',
  support_type_key: 'general_support',
  start_time: '', end_time: '', notes: '',
}

// â”€â”€â”€ Roster hour range â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const HOUR_START = 6   // 6 am
const HOUR_END   = 22  // 10 pm
const HOURS      = Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => HOUR_START + i)

// â”€â”€â”€ Utility â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getWeekStart(d: Date): Date {
  const s = new Date(d)
  s.setHours(0, 0, 0, 0)
  const day = s.getDay()
  s.setDate(s.getDate() - (day === 0 ? 6 : day - 1))
  return s
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function toHours(iso: string): number {
  const d = new Date(iso)
  return d.getHours() + d.getMinutes() / 60
}

function weekDayIdx(iso: string, weekStart: Date): number {
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  const ws = new Date(weekStart)
  ws.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - ws.getTime()) / 86400000)
}

function fmtHour(h: number): string {
  const hour = Math.floor(h)
  const min  = Math.round((h - hour) * 60)
  const ap   = hour < 12 ? 'am' : 'pm'
  const hh   = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  return min ? `${hh}:${String(min).padStart(2, '0')} ${ap}` : `${hh} ${ap}`
}

function fmtWeekRange(start: Date): string {
  const end = addDays(start, 6)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  const s = start.toLocaleDateString('en-AU', opts)
  const e = end.toLocaleDateString('en-AU', { ...opts, year: 'numeric' })
  return `${s} â€“ ${e}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function statusStyle(status: ShiftStatus, unassigned: boolean): {
  bg: string; borderLeft: string; text: string; muted: string
} {
  if (unassigned && status !== 'cancelled')
    return { bg: '#fffbeb', borderLeft: '#f59e0b', text: '#78350f', muted: '#92400e' }
  if (status === 'active')
    return { bg: '#faf0ff', borderLeft: '#0d9488', text: '#0f766e', muted: '#0f766e' }
  if (status === 'completed')
    return { bg: '#f3f0ec', borderLeft: '#b9b3a8', text: '#59554f', muted: '#78746b' }
  if (status === 'cancelled')
    return { bg: '#fef2f2', borderLeft: '#ef4444', text: '#991b1b', muted: '#b91c1c' }
  return { bg: '#eff6ff', borderLeft: '#3b82f6', text: '#1d4ed8', muted: '#2563eb' }
}

function initials(name: string | null): string {
  return (name ?? 'S')
    .split(' ').filter(Boolean).slice(0, 2)
    .map(p => p[0]?.toUpperCase()).join('')
}

function relationRow<T>(v: T | T[] | null): T | null {
  if (Array.isArray(v)) return v[0] ?? null
  return v ?? null
}

function setField(
  setForm: React.Dispatch<React.SetStateAction<CreateShiftForm>>,
  field: keyof CreateShiftForm, value: string,
) { setForm(c => ({ ...c, [field]: value })) }

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-AU', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  }).toLowerCase()
}

function overlaps(as: string, ae: string, bs: string, be: string) {
  return new Date(as) < new Date(be) && new Date(bs) < new Date(ae)
}

function labelSupportType(v: string | null) {
  return v ? v.replace(/_/g, ' ') : 'general support'
}

function copyDocStatus(v: string | null) {
  if (v === 'documented')  return 'documented'
  if (v === 'in_progress') return 'in progress'
  if (v === 'overdue')     return 'overdue'
  if (v === 'not_required') return 'not required'
  return 'pending'
}

function statusLabel(s: ShiftStatus): string {
  if (s === 'active')    return 'Active now'
  if (s === 'completed') return 'Completed'
  if (s === 'cancelled') return 'Cancelled'
  return 'Scheduled'
}

function statusBadgeCls(s: ShiftStatus): string {
  if (s === 'active')    return 'rounded-full bg-[#f0fdfa] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f766e]'
  if (s === 'completed') return 'rounded-full bg-[#ebe7df] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#59554f]'
  if (s === 'cancelled') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#991b1b]'
  return 'rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1d4ed8]'
}

// â”€â”€â”€ Shift Pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ShiftPill({
  shift, onClick, compact = false,
}: { shift: NormalizedShift; onClick: () => void; compact?: boolean }) {
  const unassigned = !shift.staffId
  const s = statusStyle(shift.status, unassigned)
  const isActive = shift.status === 'active'
  const isCancelled = shift.status === 'cancelled'

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg text-left transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
      style={{
        background: s.bg,
        borderLeft: `3px solid ${s.borderLeft}`,
        padding: compact ? '3px 6px' : '5px 8px',
        textDecoration: isCancelled ? 'line-through' : 'none',
        fontSize: 11,
      }}
    >
      {/* Time + live badge */}
      <div className="flex items-center gap-1" style={{ color: s.text, fontWeight: 600 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 10.5 }}>
          {fmtHour(shift.startHour)}â€“{fmtHour(shift.endHour)}
        </span>
        {isActive && (
          <span className="ml-auto flex items-center gap-1 text-[9px] font-bold" style={{ color: '#0d9488' }}>
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#0d9488]" />
            LIVE
          </span>
        )}
        {unassigned && !isActive && (
          <span className="material-symbols-outlined ml-auto text-[12px]" style={{ color: s.borderLeft }}>
            warning
          </span>
        )}
      </div>

      {!compact && (
        <>
          <div className="mt-0.5 truncate font-semibold" style={{ color: s.text, fontSize: 11.5 }}>
            {shift.clientName}
          </div>
          {shift.supportTypeKey && (
            <div className="mt-0.5 truncate" style={{ color: s.muted, fontSize: 10.5 }}>
              {labelSupportType(shift.supportTypeKey)}
            </div>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            {shift.staffId ? (
              <>
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                  style={{ background: s.borderLeft }}
                >
                  {initials(shift.staffName)}
                </span>
                <span className="truncate" style={{ color: s.muted, fontSize: 10 }}>
                  {shift.staffName.split(' ')[0]}
                </span>
              </>
            ) : (
              <span style={{ color: '#92400e', fontSize: 10, fontWeight: 600 }}>Unassigned</span>
            )}
          </div>
        </>
      )}
    </button>
  )
}

// â”€â”€â”€ Week View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WeekView({
  weekShifts, staff, todayIdx, weekStart: ws,
  onShiftClick,
}: {
  weekShifts: NormalizedShift[]
  staff: StaffOption[]
  todayIdx: number
  weekStart: Date
  onShiftClick: (id: string) => void
}) {
  const unassigned = weekShifts.filter(s => !s.staffId)

  const cellShifts = (staffId: string, day: number) =>
    weekShifts.filter(s => s.staffId === staffId && s.weekDayIdx === day)

  const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i))

  return (
    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      {/*
        Single CSS grid spanning all rows.
        All cells are direct grid children so column tracks are shared â€”
        this guarantees pixel-perfect alignment regardless of scroll position.
        Header corner: sticky top-0 + left-0  (always visible)
        Header day cells: sticky top-0         (visible when scrolling down)
        Staff-name cells: sticky left-0        (visible when scrolling right)
      */}
      <div
        className="grid"
        style={{ minWidth: 900, gridTemplateColumns: '180px repeat(7, 1fr)' }}
      >
        {/* â”€â”€ Header row â”€â”€ */}
        <div className="sticky top-0 left-0 z-30 border-b border-[#e6e8ec] bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">
          Staff
        </div>
        {days.map((d, i) => {
          const isToday = i === todayIdx
          return (
            <div
              key={i}
              className="sticky top-0 z-20 border-b border-l border-[#e6e8ec] px-3 py-2"
              style={{ background: isToday ? '#faf0ff' : 'white' }}
            >
              <div
                className="text-[10px] font-semibold uppercase tracking-[0.08em]"
                style={{ color: isToday ? '#0d9488' : '#94a3b8' }}
              >
                {DAY_LABELS[i]}
              </div>
              <div
                className="text-[13px] font-semibold"
                style={{ color: isToday ? '#0d9488' : '#0f172a' }}
              >
                {d.getDate()}
                {isToday && (
                  <span className="ml-1.5 text-[9px] font-bold tracking-[0.06em]">TODAY</span>
                )}
              </div>
            </div>
          )
        })}

        {/* â”€â”€ Unassigned row â”€â”€ */}
        {unassigned.length > 0 && (
          <>
            <div className="sticky left-0 z-10 flex items-center gap-2.5 border-b border-[#e6e8ec] bg-[#fffdf5] px-4 py-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7]">
                <span className="material-symbols-outlined text-[14px] text-[#d97706]">warning</span>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-[#78350f]">Unassigned</div>
                <div className="text-[10px] text-[#92400e]">{unassigned.length} shifts</div>
              </div>
            </div>
            {Array.from({ length: 7 }, (_, day) => {
              const items = unassigned.filter(s => s.weekDayIdx === day)
              const isToday = day === todayIdx
              return (
                <div
                  key={day}
                  className="flex min-h-[56px] flex-col gap-1 border-b border-l border-[#e6e8ec] p-1.5"
                  style={{ background: isToday ? 'rgba(248,216,255,0.08)' : '#fffdf5' }}
                >
                  {items.map(s => (
                    <ShiftPill key={s.id} shift={s} onClick={() => onShiftClick(s.id)} compact />
                  ))}
                </div>
              )
            })}
          </>
        )}

        {/* â”€â”€ Staff rows â”€â”€ */}
        {staff.map(person => (
          <Fragment key={person.id}>
            <div className="sticky left-0 z-10 flex items-center gap-2.5 border-b border-[#e6e8ec] bg-white px-4 py-2.5">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                style={{ background: '#0f172a' }}
              >
                {initials(person.full_name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-semibold text-[#0f172a]">
                  {person.full_name ?? 'Staff'}
                </div>
              </div>
            </div>
            {Array.from({ length: 7 }, (_, day) => {
              const items = cellShifts(person.id, day)
              const isToday = day === todayIdx
              return (
                <div
                  key={day}
                  className="flex min-h-[72px] flex-col gap-1 border-b border-l border-[#e6e8ec] p-1.5"
                  style={{ background: isToday ? 'rgba(13,148,136,0.04)' : undefined }}
                >
                  {items.map(s => (
                    <ShiftPill key={s.id} shift={s} onClick={() => onShiftClick(s.id)} />
                  ))}
                </div>
              )
            })}
          </Fragment>
        ))}
      </div>
    </div>
  )
}

// â”€â”€â”€ Day View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function DayView({
  dayShifts, staff, nowHour,
  onShiftClick,
}: {
  dayShifts: NormalizedShift[]
  staff: StaffOption[]
  nowHour: number
  onShiftClick: (id: string) => void
}) {
  const ROW_H = 44  // px per hour
  const unassigned = dayShifts.filter(s => !s.staffId)

  return (
    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <div style={{ minWidth: Math.max(700, 60 + staff.length * 140) }}>
        {/* Staff column headers */}
        <div
          className="sticky top-0 z-10 grid border-b border-[#e6e8ec] bg-white"
          style={{ gridTemplateColumns: `60px repeat(${staff.length}, 1fr)` }}
        >
          <div className="px-2 py-2.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">
            Time
          </div>
          {staff.map(p => (
            <div
              key={p.id}
              className="flex items-center gap-2 border-l border-[#e6e8ec] px-3 py-2"
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                style={{ background: '#0f172a' }}
              >
                {initials(p.full_name)}
              </div>
              <span className="truncate text-[11px] font-semibold text-[#0f172a]">
                {p.full_name?.split(' ')[0] ?? 'Staff'}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline body */}
        <div
          className="relative grid bg-white"
          style={{ gridTemplateColumns: `60px repeat(${staff.length}, 1fr)` }}
        >
          {/* Hour gutter */}
          <div className="relative border-r border-[#e6e8ec]">
            {HOURS.map(h => (
              <div
                key={h}
                style={{ height: ROW_H }}
                className="border-t border-[#e6e8ec] px-2 pt-1 font-mono text-[10px] text-[#94a3b8]"
              >
                {fmtHour(h)}
              </div>
            ))}
          </div>

          {/* Staff columns */}
          {staff.map(p => {
            const pShifts = dayShifts.filter(s => s.staffId === p.id)
            return (
              <div
                key={p.id}
                className="relative border-l border-[#e6e8ec]"
                style={{ height: HOURS.length * ROW_H }}
              >
                {HOURS.map(h => (
                  <div
                    key={h}
                    style={{ height: ROW_H }}
                    className="border-t border-[#e6e8ec]"
                  />
                ))}
                {pShifts.map(s => {
                  const top = Math.max(0, (s.startHour - HOUR_START) * ROW_H)
                  const height = Math.max(ROW_H * 0.5, (s.endHour - s.startHour) * ROW_H - 2)
                  return (
                    <div
                      key={s.id}
                      style={{ position: 'absolute', top: top + 1, left: 3, right: 3, height }}
                    >
                      <ShiftPill shift={s} onClick={() => onShiftClick(s.id)} />
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Now line */}
          {nowHour >= HOUR_START && nowHour <= HOUR_END && (
            <div
              className="pointer-events-none absolute z-10"
              style={{
                left: 60, right: 0,
                top: (nowHour - HOUR_START) * ROW_H,
                height: 0,
                borderTop: '2px solid #0d9488',
              }}
            >
              <div
                className="absolute -left-1 -top-[5px] h-2.5 w-2.5 rounded-full bg-[#0d9488]"
              />
              <div
                className="absolute left-3 -top-[14px] rounded px-1.5 py-0.5 text-[9px] font-bold text-[#0d9488]"
                style={{ background: 'white', border: '1px solid #f0fdfa' }}
              >
                {fmtHour(nowHour)}
              </div>
            </div>
          )}
        </div>

        {/* Unassigned tray */}
        {unassigned.length > 0 && (
          <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-[#e6e8ec] bg-[#fffdf5] px-4 py-2.5">
            <span className="text-[11px] font-semibold text-[#92400e]">
              {unassigned.length} unassigned today:
            </span>
            {unassigned.map(s => (
              <div key={s.id} className="w-44 shrink-0">
                <ShiftPill shift={s} onClick={() => onShiftClick(s.id)} compact />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// â”€â”€â”€ Staff View â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function StaffView({
  dayShifts, staff, nowHour,
  onShiftClick,
}: {
  dayShifts: NormalizedShift[]
  staff: StaffOption[]
  nowHour: number
  onShiftClick: (id: string) => void
}) {
  const HOUR_PX = 52
  const totalW = (HOUR_END - HOUR_START) * HOUR_PX

  return (
    <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
      <div style={{ minWidth: 220 + totalW + 24 }}>
        {/* Hour ruler */}
        <div
          className="sticky top-0 z-10 flex border-b border-[#e6e8ec] bg-white"
        >
          <div className="w-[200px] shrink-0 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">
            Staff
          </div>
          <div className="relative" style={{ width: totalW, height: 36 }}>
            {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
              <div
                key={i}
                className="absolute top-2 font-mono text-[10px] text-[#94a3b8]"
                style={{ left: i * HOUR_PX, transform: 'translateX(-50%)' }}
              >
                {fmtHour(HOUR_START + i)}
              </div>
            ))}
          </div>
        </div>

        {/* Staff rows */}
        {staff.map(p => {
          const pShifts = dayShifts.filter(s => s.staffId === p.id)
          return (
            <div
              key={p.id}
              className="flex border-b border-[#e6e8ec] bg-white"
            >
              <div className="flex w-[200px] shrink-0 items-center gap-2.5 px-4 py-3">
                <div
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ background: '#0f172a' }}
                >
                  {initials(p.full_name)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-semibold text-[#0f172a]">
                    {p.full_name ?? 'Staff'}
                  </div>
                </div>
              </div>

              <div className="relative" style={{ width: totalW, height: 60 }}>
                {/* Hour grid lines */}
                {Array.from({ length: HOUR_END - HOUR_START + 1 }, (_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-[#e6e8ec]"
                    style={{ left: i * HOUR_PX }}
                  />
                ))}

                {/* Now line */}
                {nowHour >= HOUR_START && nowHour <= HOUR_END && (
                  <div
                    className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-[#0d9488]"
                    style={{ left: (nowHour - HOUR_START) * HOUR_PX }}
                  />
                )}

                {/* Shift blocks */}
                {pShifts.map(s => {
                  const left = Math.max(0, (s.startHour - HOUR_START) * HOUR_PX) + 1
                  const width = Math.max(16, (s.endHour - s.startHour) * HOUR_PX - 2)
                  return (
                    <div
                      key={s.id}
                      style={{ position: 'absolute', left, top: 6, width, height: 48 }}
                    >
                      <ShiftPill shift={s} onClick={() => onShiftClick(s.id)} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// â”€â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FilterBar({
  view, setView, weekStart: ws, weekOffset, setWeekOffset,
  onCreateShift, conflictCount, selectedDay, setSelectedDay,
}: {
  view: RosterView
  setView: (v: RosterView) => void
  weekStart: Date
  weekOffset: number
  setWeekOffset: (n: number) => void
  onCreateShift: () => void
  conflictCount: number
  selectedDay: Date
  setSelectedDay: (d: Date) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#e6e8ec] bg-white px-4 py-2.5">
      {/* Week nav */}
      <button
        type="button"
        onClick={() => setWeekOffset(weekOffset - 1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e6e8ec] bg-white text-[#64748b] hover:bg-[#f7f8f9]"
        title="Previous week"
      >
        <span className="material-symbols-outlined text-[16px]">chevron_left</span>
      </button>

      <div className="min-w-[180px] text-[13px] font-semibold text-[#0f172a]">
        {fmtWeekRange(ws)}
      </div>

      <button
        type="button"
        onClick={() => setWeekOffset(weekOffset + 1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#e6e8ec] bg-white text-[#64748b] hover:bg-[#f7f8f9]"
        title="Next week"
      >
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
      </button>

      <button
        type="button"
        onClick={() => setWeekOffset(0)}
        className="h-8 rounded-xl border border-[#e6e8ec] bg-white px-3 text-[12px] font-medium text-[#64748b] hover:bg-[#f7f8f9]"
      >
        Today
      </button>

      <div className="mx-1 h-5 w-px bg-[#e6e8ec]" />

      {/* View switcher */}
      <div className="flex rounded-xl border border-[#e6e8ec] bg-[#f7f8f9] p-0.5">
        {(['week', 'day', 'staff'] as RosterView[]).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`h-7 rounded-[9px] px-3 text-[12px] font-medium transition-all ${
              view === v
                ? 'bg-white text-[#0f172a] shadow-sm'
                : 'text-[#64748b] hover:text-[#0f172a]'
            }`}
          >
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </button>
        ))}
      </div>

      {/* Day selector (shown for day + staff views) */}
      {(view === 'day' || view === 'staff') && (
        <div className="flex rounded-xl border border-[#e6e8ec] bg-[#f7f8f9] p-0.5">
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(ws, i)
            const isSelected = d.toDateString() === selectedDay.toDateString()
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`h-7 rounded-[9px] px-2.5 text-[11px] font-medium transition-all ${
                  isSelected
                    ? 'bg-[#0f172a] text-[#0d9488] shadow-sm'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {DAY_LABELS[i]}
              </button>
            )
          })}
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        {conflictCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fef3c7] px-3 py-1 text-[11px] font-semibold text-[#92400e]">
            <span className="material-symbols-outlined text-[13px] text-[#d97706]">warning</span>
            {conflictCount} unassigned
          </span>
        )}
        <button
          type="button"
          onClick={onCreateShift}
          className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-[#0f172a] px-4 text-[12px] font-semibold text-white hover:bg-[#2a2a26]"
        >
          <span className="material-symbols-outlined text-[15px]">add</span>
          New shift
        </button>
      </div>
    </div>
  )
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function RosterClient({
  shifts, staff, clients, supportTypes,
}: {
  shifts: ShiftRow[]
  staff: StaffOption[]
  clients: ClientOption[]
  supportTypes: SupportTypeOption[]
}) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CreateShiftForm>(EMPTY_FORM)
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  // Roster view state
  const [rosterView, setRosterView] = useState<RosterView>('week')
  const [weekOffset, setWeekOffset] = useState(0)
  const today = useMemo(() => new Date(), [])
  const weekStart = useMemo(() => {
    const ws = getWeekStart(today)
    ws.setDate(ws.getDate() + weekOffset * 7)
    return ws
  }, [today, weekOffset])
  const todayIdx = useMemo(() => weekDayIdx(today.toISOString(), weekStart), [today, weekStart])
  const nowHour = useMemo(() => toHours(today.toISOString()), [today])
  const [selectedDay, setSelectedDay] = useState<Date>(today)

  // Normalize shifts
  const normalizedShifts = useMemo<NormalizedShift[]>(() => {
    return shifts.map(shift => {
      const staffMember = relationRow(shift.profiles)
      const client = relationRow(shift.clients)
      return {
        id: shift.id,
        title: shift.title,
        staffId: shift.staff_id,
        clientId: shift.client_id,
        staffName: staffMember?.full_name ?? 'Unassigned',
        clientName: client?.full_name ?? 'Client',
        clientAddress: client?.address ?? null,
        clientLat: client?.lat ?? null,
        clientLng: client?.lng ?? null,
        start: shift.start_time,
        end: shift.end_time,
        notes: shift.notes,
        status: shift.status ?? 'scheduled',
        supportTypeKey: shift.support_type_key,
        documentationStatus: shift.documentation_status,
        startHour: toHours(shift.start_time),
        endHour: toHours(shift.end_time),
        weekDayIdx: weekDayIdx(shift.start_time, weekStart),
      }
    })
  }, [shifts, weekStart])

  // Shifts in the current week window
  const weekShifts = useMemo(() => {
    const end = addDays(weekStart, 7)
    return normalizedShifts.filter(s => {
      const d = new Date(s.start)
      return d >= weekStart && d < end
    })
  }, [normalizedShifts, weekStart])

  // Shifts for the selected day (day/staff views)
  const dayShifts = useMemo(() => {
    const dayStr = selectedDay.toDateString()
    return normalizedShifts.filter(s => new Date(s.start).toDateString() === dayStr)
  }, [normalizedShifts, selectedDay])

  const conflictCount = weekShifts.filter(s => !s.staffId).length

  // Validation
  const selectedClient = useMemo(() => {
    const c = clients.find(cl => cl.id === form.client_id)
    return c ? { id: c.id, lat: c.lat, lng: c.lng } : null
  }, [clients, form.client_id])

  const existingShiftsForValidation = useMemo(() => shifts.map(s => ({
    id: s.id, staff_id: s.staff_id, start_time: s.start_time, end_time: s.end_time,
  })), [shifts])

  const validationResults = useRosterValidation({
    staffId: form.staff_id,
    clientId: form.client_id,
    startTime: form.start_time,
    endTime: form.end_time,
    existingShifts: existingShiftsForValidation,
    staffDocuments: [],
    client: selectedClient,
  })

  const hasValidationErrors = validationResults.some(r => r.type === 'error')

  const selectedShift = normalizedShifts.find(s => s.id === selectedShiftId) ?? null

  const coverageSuggestions = useMemo(() => {
    if (!selectedShift) return []
    return staff
      .filter(m => m.id !== selectedShift.staffId)
      .filter(m => !normalizedShifts.some(
        s => s.id !== selectedShift.id && s.staffId === m.id &&
             s.status !== 'cancelled' && overlaps(s.start, s.end, selectedShift.start, selectedShift.end),
      ))
      .slice(0, 3)
  }, [normalizedShifts, selectedShift, staff])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form.client_id || !form.start_time || !form.end_time) {
      setError('Client, start time, and end time are required.')
      return
    }
    setSaving(true); setError('')

    const { data: createdShift, error: createError } = await supabase
      .from('shifts')
      .insert({
        staff_id: form.staff_id || null,
        client_id: form.client_id,
        title: form.title || null,
        support_type_key: form.support_type_key || 'general_support',
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        notes: form.notes || null,
        published_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (createError) { setError(createError.message); setSaving(false); return }

    if (form.staff_id) {
      const shiftDate = new Date(form.start_time)
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: form.staff_id,
        type: 'shift_assigned',
        title: 'New shift assigned',
        message: `You've been assigned a shift on ${shiftDate.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })} at ${shiftDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}.`,
        related_id: createdShift?.id ?? null,
      })
      if (notifError) console.error('[RosterClient] notification insert failed:', notifError)
    }

    setSaving(false); setOpen(false); setForm(EMPTY_FORM)
    setSelectedShiftId(createdShift?.id ?? null)
    router.refresh()
  }

  // â”€â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <header className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
            <span className="font-headline">Roster</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
              planner
            </span>
          </div>
          <p className="text-sm text-[#64748b]">
            Weekly scheduling, shift assignment, and compliance readiness
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/active-shifts"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e6e8ec] bg-white text-[#64748b] hover:bg-[#f7f8f9]"
            title="Live shifts"
          >
            <span className="material-symbols-outlined text-[18px]">location_on</span>
          </Link>
        </div>
      </header>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            icon: 'calendar_view_week', label: 'This week',
            value: weekShifts.length,
            sub: `${weekShifts.filter(s => s.status === 'scheduled').length} scheduled`,
          },
          {
            icon: 'schedule', label: 'Live now',
            value: weekShifts.filter(s => s.status === 'active').length,
            sub: `${weekShifts.filter(s => s.status === 'completed').length} completed`,
            accent: true,
          },
          {
            icon: 'warning', label: 'Unassigned',
            value: conflictCount,
            sub: conflictCount > 0 ? 'Need coverage' : 'All covered',
            warn: conflictCount > 0,
          },
          {
            icon: 'group', label: 'Staff on roster',
            value: new Set(weekShifts.filter(s => s.staffId).map(s => s.staffId)).size,
            sub: `of ${staff.length} total`,
          },
        ].map(card => (
          <div
            key={card.label}
            className={`rounded-[20px] p-4 shadow-[0_8px_24px_rgba(26,26,24,0.04)] ${
              card.accent
                ? 'bg-[#0d9488]'
                : card.warn
                ? 'border border-[#fde8c8] bg-[#fff8f0]'
                : 'border border-[#e6e8ec] bg-white'
            }`}
          >
            <div
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${
                card.accent ? 'bg-black/10 text-[#0f172a]'
                : card.warn ? 'bg-[#fef3c7] text-[#d97706]'
                : 'bg-[#f3f1eb] text-[#6c6962]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{card.icon}</span>
            </div>
            <p className={`mt-3 text-[11px] font-medium ${card.accent ? 'text-[#0f766e]' : card.warn ? 'text-[#92400e]' : 'text-[#64748b]'}`}>
              {card.label}
            </p>
            <p className="font-headline text-[1.75rem] leading-none tracking-[-0.06em] text-[#0f172a]">
              {card.value}
            </p>
            <p className={`mt-1 text-[11px] ${card.accent ? 'text-[#0f766e]' : card.warn ? 'text-[#92400e]' : 'text-[#64748b]'}`}>
              {card.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Roster grid + detail panel */}
      <div className="grid gap-4 xl:grid-cols-[1fr_300px]">
        {/* Roster card */}
        <div className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
          <FilterBar
            view={rosterView}
            setView={setRosterView}
            weekStart={weekStart}
            weekOffset={weekOffset}
            setWeekOffset={setWeekOffset}
            onCreateShift={() => setOpen(true)}
            conflictCount={conflictCount}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
          />

          {rosterView === 'week' && (
            <WeekView
              weekShifts={weekShifts}
              staff={staff}
              todayIdx={todayIdx}
              weekStart={weekStart}
              onShiftClick={id => setSelectedShiftId(id)}
            />
          )}
          {rosterView === 'day' && (
            <DayView
              dayShifts={dayShifts}
              staff={staff}
              nowHour={nowHour}
              onShiftClick={id => setSelectedShiftId(id)}
            />
          )}
          {rosterView === 'staff' && (
            <StaffView
              dayShifts={dayShifts}
              staff={staff}
              nowHour={nowHour}
              onShiftClick={id => setSelectedShiftId(id)}
            />
          )}

          {/* Empty state */}
          {weekShifts.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[#7d7a73]">
              <span className="material-symbols-outlined text-[40px] text-[#ccc8c0]">calendar_month</span>
              <div>
                <p className="font-medium text-[#0f172a]">No shifts this week</p>
                <p className="mt-1 text-xs text-[#64748b]">
                  {fmtWeekRange(weekStart)} Â· use the controls above to navigate
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="mt-1 inline-flex items-center gap-2 rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Create first shift
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-3">
          {/* Shift detail */}
          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0f1f3] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Shift detail</h3>
            </div>
            {selectedShift ? (
              <div className="space-y-4 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#94a3b8]">
                      {fmtDate(new Date(selectedShift.start))}
                    </p>
                    <h4 className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#0f172a]">
                      {selectedShift.clientName}
                    </h4>
                    <p className="text-[12px] text-[#7d7a73]">
                      {formatTime(selectedShift.start)} â€“ {formatTime(selectedShift.end)}
                    </p>
                  </div>
                  <span className={statusBadgeCls(selectedShift.status)}>
                    {statusLabel(selectedShift.status)}
                  </span>
                </div>

                <div className="rounded-[16px] bg-[#fafbfc] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Staff</p>
                  <p className="mt-1 text-[13px] font-medium text-[#0f172a]">
                    {selectedShift.staffName}
                  </p>
                  <p className="text-[11px] text-[#7d7a73]">
                    {labelSupportType(selectedShift.supportTypeKey)}
                    {' Â· '}
                    {copyDocStatus(selectedShift.documentationStatus)}
                  </p>
                </div>

                {selectedShift.clientAddress && (
                  <p className="text-[11px] text-[#7d7a73]">
                    <span className="material-symbols-outlined mr-1 align-middle text-[13px]">location_on</span>
                    {selectedShift.clientAddress}
                  </p>
                )}

                {/* Checklist */}
                <div className="space-y-1.5">
                  {[
                    {
                      label: 'Staff assigned',
                      done: Boolean(selectedShift.staffId),
                      doneClass: 'bg-[#f0fdfa] text-[#0f766e]',
                    },
                    {
                      label: 'Location set',
                      done: Boolean(selectedShift.clientLat && selectedShift.clientLng),
                      doneClass: 'bg-[#dbeafe] text-[#1d4ed8]',
                    },
                    {
                      label: 'Notes ready',
                      done: Boolean(selectedShift.notes),
                      doneClass: 'bg-[#f0fdfa] text-[#6d28d9]',
                    },
                    {
                      label: 'Clock-in done',
                      done: selectedShift.status === 'active' || selectedShift.status === 'completed',
                      doneClass: 'bg-[#f0fdfa] text-[#0f766e]',
                    },
                    {
                      label: 'Completed',
                      done: selectedShift.status === 'completed',
                      doneClass: 'bg-[#d1fae5] text-[#065f46]',
                    },
                  ].map(item => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2.5 rounded-[14px] bg-[#fafbfc] px-3 py-2"
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] ${
                          item.done ? item.doneClass : 'bg-[#ebe7df] text-[#8f8b84]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[13px]">
                          {item.done ? 'check' : 'schedule'}
                        </span>
                      </span>
                      <p className="text-[12px] font-medium text-[#0f172a]">{item.label}</p>
                    </div>
                  ))}
                </div>

                <Link
                  href={`/admin/shifts/${selectedShift.id}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f7f8f9] px-4 py-2.5 text-[12px] font-semibold text-[#64748b] hover:bg-[#eae6df]"
                >
                  View full detail
                  <span className="material-symbols-outlined text-[14px]">north_east</span>
                </Link>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-[12px] text-[#7d7a73]">
                Click a shift on the roster to review its detail
              </div>
            )}
          </section>

          {/* Coverage suggestions */}
          {selectedShift && (
            <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
              <div className="border-b border-[#f0f1f3] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Coverage suggestions</h3>
              </div>
              <div className="space-y-2 px-4 py-3">
                {coverageSuggestions.length > 0 ? (
                  coverageSuggestions.map((member, i) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2.5 rounded-[16px] border border-[#ede8ff] bg-[#fbf9ff] px-3 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e9ddff] text-[10px] font-bold uppercase tracking-[0.12em] text-[#5b21b6]">
                        {initials(member.full_name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] font-medium text-[#0f172a]">
                          {member.full_name ?? 'Staff'}
                        </p>
                        <p className="text-[10px] text-[#7f7a9f]">
                          {i === 0 ? 'Best match' : 'Available'}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#f0fdfa] px-2 py-0.5 text-[10px] font-semibold text-[#6d28d9]">
                        {98 - i * 6}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="py-3 text-[12px] text-[#64748b]">
                    No free staff for this exact time block.
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Quick summary */}
          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0f1f3] px-4 py-3">
              <h3 className="text-sm font-semibold text-[#0f172a]">Week summary</h3>
            </div>
            <div className="space-y-1.5 px-4 py-3 text-[12px] text-[#56524c]">
              {[
                { label: 'Scheduled', value: weekShifts.filter(s => s.status === 'scheduled').length },
                { label: 'Active now', value: weekShifts.filter(s => s.status === 'active').length },
                { label: 'Completed', value: weekShifts.filter(s => s.status === 'completed').length },
                { label: 'Cancelled', value: weekShifts.filter(s => s.status === 'cancelled').length },
                { label: 'Unassigned', value: conflictCount },
              ].map(row => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-[12px] bg-[#fafbfc] px-3 py-2"
                >
                  <span>{row.label}</span>
                  <strong className="font-semibold text-[#0f172a]">{row.value}</strong>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Create shift modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="Create new shift" wide>
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                Staff member
              </label>
              <select
                value={form.staff_id}
                onChange={e => setField(setForm, 'staff_id', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
              >
                <option value="">Leave unassigned</option>
                {staff.map(m => (
                  <option key={m.id} value={m.id}>{m.full_name ?? 'Unnamed staff'}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                Client
              </label>
              <select
                required
                value={form.client_id}
                onChange={e => setField(setForm, 'client_id', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
              >
                <option value="">Select client</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name ?? 'Unnamed client'}{c.address ? ` â€“ ${c.address}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
              Shift label
            </label>
            <input
              value={form.title}
              onChange={e => setField(setForm, 'title', e.target.value)}
              placeholder="Morning support, community accessâ€¦"
              className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
              Support type
            </label>
            <select
              value={form.support_type_key}
              onChange={e => setField(setForm, 'support_type_key', e.target.value)}
              className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
            >
              {supportTypes.map(t => (
                <option key={t.key} value={t.key}>{t.title ?? t.key}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                Start time
              </label>
              <input
                type="datetime-local"
                required
                value={form.start_time}
                onChange={e => setField(setForm, 'start_time', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
                End time
              </label>
              <input
                type="datetime-local"
                required
                value={form.end_time}
                onChange={e => setField(setForm, 'end_time', e.target.value)}
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
              Notes
            </label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => setField(setForm, 'notes', e.target.value)}
              placeholder="Travel notes, medication handover, contact instructionsâ€¦"
              className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
            />
          </div>

          {validationResults.length > 0 && (
            <RosterValidationPanel results={validationResults} />
          )}

          {error && (
            <div className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-[#efeae2] pt-4 md:flex-row">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-2xl bg-[#f7f8f9] px-4 py-3 text-sm font-semibold text-[#64748b]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || hasValidationErrors}
              className="flex-1 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving shiftâ€¦' : 'Create shift'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
