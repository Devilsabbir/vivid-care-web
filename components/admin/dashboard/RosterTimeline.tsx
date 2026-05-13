'use client'

import { useEffect, useState } from 'react'

export interface ShiftBlock {
  id: string
  staffId: string
  clientName: string
  startHour: number // decimal hours 0-24 (e.g. 9.5 = 9:30) — Australia/Perth local
  endHour: number
  color: 'purple' | 'green' | 'blue' | 'amber' | 'red' | 'outline'
  sub: string
  live?: boolean
}

export interface StaffRow {
  id: string
  name: string
  role: string
  tone: 'purple' | 'blue' | 'green' | 'amber' | 'peach' | 'warm'
}

interface RosterTimelineProps {
  staff: StaffRow[]
  blocks: ShiftBlock[]
}

const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const HOUR_START = HOURS[0]
const HOUR_END = HOURS[HOURS.length - 1] + 1 // 19
const HOUR_SPAN = HOUR_END - HOUR_START      // 12

const BLOCK_PALETTE: Record<ShiftBlock['color'], { bg: string; text: string; border: string }> = {
  purple:  { bg: '#F4ECF8', text: '#54206F', border: '#C9A6DE' },
  green:   { bg: '#F1F9E1', text: '#5E8D1F', border: '#B6D896' },
  blue:    { bg: '#E6F5FC', text: '#1380AB', border: '#9BD7EE' },
  amber:   { bg: '#FEF3D6', text: '#78350F', border: '#FCD9A1' },
  red:     { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  outline: { bg: 'transparent', text: '#475569', border: '#e6e8ec' },
}

const AVATAR_TONES: Record<StaffRow['tone'], { bg: string; fg: string }> = {
  purple: { bg: '#F4ECF8', fg: '#54206F' },
  blue:   { bg: '#E6F5FC', fg: '#1380AB' },
  green:  { bg: '#F1F9E1', fg: '#5E8D1F' },
  amber:  { bg: '#FEF3D6', fg: '#78350F' },
  peach:  { bg: '#FFE4E1', fg: '#B0364E' },
  warm:   { bg: '#FCE4D6', fg: '#B85A1C' },
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('')
}

/** Current decimal hour in Australia/Perth (UTC+8, no DST). */
function perthDecimalHour(d: Date): number {
  const fmt = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Perth',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const h = Number(parts.find(p => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find(p => p.type === 'minute')?.value ?? 0)
  // en-AU sometimes returns "24" for midnight — normalise.
  return (h === 24 ? 0 : h) + m / 60
}

/** Date for the "Live roster · …" header, formatted in Perth. */
function perthDateLabel(d: Date): string {
  return d.toLocaleDateString('en-AU', {
    timeZone: 'Australia/Perth',
    weekday: 'long', day: 'numeric', month: 'short',
  })
}

/**
 * Workers × 12-hour timeline grid (Australia/Perth time).
 * The hour band lives in a track that fills the row to the right of the
 * 180px worker column. Shift blocks and the NOW line use percentage-based
 * left/width so a 15-minute shift is exactly 15 minutes wide.
 */
export default function RosterTimeline({ staff, blocks }: RosterTimelineProps) {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const nowHour = perthDecimalHour(now)
  const nowInRange = nowHour >= HOUR_START && nowHour <= HOUR_END
  const nowPct = ((nowHour - HOUR_START) / HOUR_SPAN) * 100

  return (
    <section className="overflow-hidden rounded-[16px] border border-[#e6e8ec] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <header className="flex flex-col items-start gap-3 border-b border-[#f0f1f3] px-5 py-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-[#0f172a]">
            Live roster · {perthDateLabel(now)}
          </h3>
          <p className="mt-1 text-[12px] text-[#64748b]">
            {staff.length} workers · {blocks.length} shifts · {blocks.filter(b => b.live).length} in progress
          </p>
        </div>
        <div className="flex rounded-full bg-[#f0f1f3] p-1 text-[11px] font-medium">
          <button type="button" className="rounded-full bg-[#0f172a] px-3 py-1 text-white">Today</button>
          <button type="button" className="rounded-full px-3 py-1 text-[#64748b]">Tomorrow</button>
          <button type="button" className="rounded-full px-3 py-1 text-[#64748b]">Week</button>
        </div>
      </header>

      <div className="relative overflow-x-auto">
        {/* Hour header — 180px worker col + 12 equal hour cells */}
        <div
          className="sticky top-0 z-10 grid border-b border-[#f0f1f3] bg-white"
          style={{ gridTemplateColumns: '180px repeat(12, minmax(56px, 1fr))' }}
        >
          <div className="px-4 py-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#64748b]">
            Worker
          </div>
          {HOURS.map(h => (
            <div key={h} className="border-l border-[#f0f1f3] px-2 py-2 text-[10.5px] font-medium text-[#94a3b8]">
              {h === 12 ? '12p' : h > 12 ? `${h - 12}p` : `${h}a`}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className="relative">
          {/* NOW vertical line — sits in the same coordinate system as the blocks */}
          {nowInRange && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-20"
              style={{ left: `calc(180px + (100% - 180px) * ${nowPct} / 100)` }}
            >
              <div className="h-full w-px bg-[#6B2C91]" />
              <div className="absolute -top-1 -left-1 h-2 w-2 rounded-full bg-[#6B2C91]" />
            </div>
          )}

          {staff.length === 0 ? (
            <div className="px-6 py-12 text-center text-[12px] text-[#94a3b8]">
              No staff have shifts scheduled today.
            </div>
          ) : (
            staff.map(row => {
              const tone = AVATAR_TONES[row.tone]
              const rowBlocks = blocks.filter(b => b.staffId === row.id)
              return (
                <div
                  key={row.id}
                  className="relative grid border-b border-[#f0f1f3]"
                  style={{ gridTemplateColumns: '180px 1fr', minHeight: 64 }}
                >
                  {/* Worker label column */}
                  <div className="flex items-center gap-2.5 px-4 py-3">
                    <div
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                      style={{ backgroundColor: tone.bg, color: tone.fg }}
                    >
                      {initials(row.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12.5px] font-semibold text-[#0f172a]">{row.name}</div>
                      <div className="truncate text-[10.5px] text-[#94a3b8]">{row.role}</div>
                    </div>
                  </div>

                  {/* Timeline track — single column, contains gridlines + absolute blocks */}
                  <div className="relative h-full">
                    {/* Hour gridlines — 12 equal cells */}
                    <div
                      className="absolute inset-0 grid"
                      style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
                    >
                      {HOURS.map((_, hi) => (
                        <div key={hi} className="border-l border-[#f0f1f3]" />
                      ))}
                    </div>

                    {/* Shift blocks — absolute, minute-precise */}
                    {rowBlocks.map(b => {
                      const p = BLOCK_PALETTE[b.color]
                      const clampedStart = Math.max(HOUR_START, Math.min(HOUR_END, b.startHour))
                      const clampedEnd = Math.max(HOUR_START, Math.min(HOUR_END, b.endHour))
                      const leftPct = ((clampedStart - HOUR_START) / HOUR_SPAN) * 100
                      const widthPct = Math.max(
                        // Visual floor: 1.5% of the band so a sub-15-minute block is still tappable/visible
                        1.5,
                        ((clampedEnd - clampedStart) / HOUR_SPAN) * 100,
                      )
                      return (
                        <div
                          key={b.id}
                          className="absolute flex flex-col justify-center gap-0.5 overflow-hidden rounded-[8px] px-2 py-1.5"
                          style={{
                            top: 8,
                            bottom: 8,
                            left: `${leftPct}%`,
                            width: `${widthPct}%`,
                            backgroundColor: p.bg,
                            border: `1px solid ${p.border}`,
                          }}
                        >
                          <div
                            className="flex items-center gap-1.5 text-[11px] font-semibold leading-none"
                            style={{ color: p.text }}
                          >
                            {b.live && (
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#16A34A] animate-pulse" />
                            )}
                            <span className="truncate">{b.clientName}</span>
                          </div>
                          <div
                            className="truncate text-[10px] leading-tight"
                            style={{ color: p.text, opacity: 0.75 }}
                          >
                            {b.sub}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
