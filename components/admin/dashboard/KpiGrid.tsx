'use client'

import { useEffect, useState } from 'react'
import KpiCard from './KpiCard'

/**
 * One KPI tile's full data + visual config. The dashboard server page
 * builds the array; this client component renders and reorders them.
 */
export interface KpiTile {
  key: string
  icon: string
  label: string
  value: string | number
  sub?: string
  delta: string
  direction: 'up' | 'down' | 'flat'
  target: number
  context: string
  color: string
  bg: string
  spark: number[]
}

interface KpiGridProps {
  tiles: KpiTile[]
  /** localStorage namespace for order + custom titles. */
  storageKey?: string
}

/**
 * Drag-and-drop reorderable KPI grid with admin-editable titles.
 *
 * Two pieces of state are persisted to localStorage (per device, per
 * user, free of round-trips):
 *  - `<storageKey>:order`  — array of tile keys in display order
 *  - `<storageKey>:titles` — { [key]: customTitle } overrides
 *
 * Both are gated behind a "Customize" toggle so day-to-day clicks
 * don't accidentally rearrange or rename. The "Reset" link clears
 * BOTH, returning the dashboard to its default labels and order.
 */
export default function KpiGrid({ tiles, storageKey = 'admin:kpi' }: KpiGridProps) {
  const ORDER_KEY = `${storageKey}:order`
  const TITLES_KEY = `${storageKey}:titles`

  const [hydrated, setHydrated] = useState(false)
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.key))
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState(false)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  // Hydrate persisted order + titles. Done in an effect so SSR markup
  // (which uses defaults) matches the first client render.
  useEffect(() => {
    try {
      const rawOrder = localStorage.getItem(ORDER_KEY)
      if (rawOrder) {
        const saved = JSON.parse(rawOrder) as string[]
        const known = new Set(tiles.map((t) => t.key))
        const validSaved = saved.filter((k) => known.has(k))
        const missing = tiles.map((t) => t.key).filter((k) => !validSaved.includes(k))
        setOrder([...validSaved, ...missing])
      }
      const rawTitles = localStorage.getItem(TITLES_KEY)
      if (rawTitles) {
        const saved = JSON.parse(rawTitles) as Record<string, string>
        setTitles(saved ?? {})
      }
    } catch {
      /* localStorage unavailable — stick with defaults */
    }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persistOrder(next: string[]) {
    setOrder(next)
    try {
      localStorage.setItem(ORDER_KEY, JSON.stringify(next))
    } catch {
      /* swallow */
    }
  }

  function persistTitle(key: string, raw: string) {
    const trimmed = raw.trim()
    setTitles((current) => {
      const next = { ...current }
      const defaultLabel = tiles.find((t) => t.key === key)?.label
      // Empty input or back-to-default removes the override.
      if (!trimmed || trimmed === defaultLabel) {
        delete next[key]
      } else {
        next[key] = trimmed
      }
      try {
        if (Object.keys(next).length === 0) {
          localStorage.removeItem(TITLES_KEY)
        } else {
          localStorage.setItem(TITLES_KEY, JSON.stringify(next))
        }
      } catch {
        /* swallow */
      }
      return next
    })
  }

  function resetAll() {
    try {
      localStorage.removeItem(ORDER_KEY)
      localStorage.removeItem(TITLES_KEY)
    } catch {
      /* swallow */
    }
    setOrder(tiles.map((t) => t.key))
    setTitles({})
  }

  function handleDragStart(e: React.DragEvent, key: string) {
    if (!editing) return
    setDraggingKey(key)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', key)
  }

  function handleDragOver(e: React.DragEvent, overKey: string) {
    if (!editing || !draggingKey || draggingKey === overKey) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e: React.DragEvent, overKey: string) {
    if (!editing || !draggingKey || draggingKey === overKey) return
    e.preventDefault()
    const next = [...order]
    const fromIdx = next.indexOf(draggingKey)
    const toIdx = next.indexOf(overKey)
    if (fromIdx === -1 || toIdx === -1) return
    next.splice(fromIdx, 1)
    next.splice(toIdx, 0, draggingKey)
    persistOrder(next)
    setDraggingKey(null)
  }

  function handleDragEnd() {
    setDraggingKey(null)
  }

  const byKey = new Map(tiles.map((t) => [t.key, t]))
  const renderKeys = hydrated ? order : tiles.map((t) => t.key)
  const isCustomized =
    hydrated &&
    (Object.keys(titles).length > 0 ||
      order.join(',') !== tiles.map((t) => t.key).join(','))

  return (
    <>
      {/* Eyebrow + edit toggle row */}
      <div className="mb-2.5 flex items-baseline justify-between px-0.5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6371]">
          Today at a glance
        </div>
        <div className="flex items-center gap-3">
          {editing && isCustomized && (
            <button
              type="button"
              onClick={resetAll}
              className="text-[11.5px] font-medium text-[#6B6371] underline-offset-2 hover:text-[#1A1320] hover:underline"
            >
              Reset to defaults
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className={
              editing
                ? 'inline-flex h-7 items-center gap-1 rounded-[7px] bg-[#6B2C91] px-2.5 text-[11.5px] font-semibold text-white shadow-[0_2px_6px_rgba(107,44,145,0.25)]'
                : 'inline-flex h-7 items-center gap-1 rounded-[7px] border border-[#E5E1E8] bg-white px-2.5 text-[11.5px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]'
            }
            aria-pressed={editing}
            aria-label={editing ? 'Finish editing dashboard tiles' : 'Customize dashboard tiles'}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              {editing ? 'check' : 'tune'}
            </span>
            {editing ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Edit-mode hint */}
      {editing && (
        <div
          className="mb-3 inline-flex items-center gap-2 rounded-[8px] bg-[#F4ECF8] px-3 py-1.5 text-[11.5px] font-medium text-[#54206F]"
          role="status"
        >
          <span className="material-symbols-outlined text-[14px]">info</span>
          Drag a tile to reorder. Click a title to rename it. Changes save automatically.
        </div>
      )}

      {/* Tile grid */}
      <section
        className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Dashboard KPIs"
      >
        {renderKeys.map((k) => {
          const tile = byKey.get(k)
          if (!tile) return null
          const effectiveLabel = titles[k] ?? tile.label
          const isDragging = draggingKey === k
          return (
            <div
              key={k}
              draggable={editing}
              onDragStart={(e) => handleDragStart(e, k)}
              onDragOver={(e) => handleDragOver(e, k)}
              onDrop={(e) => handleDrop(e, k)}
              onDragEnd={handleDragEnd}
              className={[
                'relative transition-all',
                editing ? 'cursor-grab active:cursor-grabbing' : '',
                isDragging ? 'opacity-50 scale-[0.98]' : '',
                editing && !isDragging
                  ? 'ring-2 ring-dashed ring-[#E6D4F0] ring-offset-2 ring-offset-[#F7F5FA] rounded-[16px]'
                  : '',
              ].join(' ')}
            >
              {editing && (
                <>
                  {/* Drag chip */}
                  <div
                    className="pointer-events-none absolute -top-1.5 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#6B2C91] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
                    style={{ letterSpacing: '0.06em' }}
                    aria-hidden="true"
                  >
                    <span className="material-symbols-outlined text-[10px]">drag_indicator</span>
                    Drag
                  </div>
                  {/* Rename input row — sits above the card so the user sees
                      the new title applied to the live card preview below. */}
                  <div
                    className="mb-2 flex items-center gap-1.5 rounded-[10px] border border-dashed border-[#C9A6DE] bg-white p-1.5"
                    onClick={(e) => e.stopPropagation()}
                    // Stop pointer events from triggering the drag while the
                    // user is typing in the input.
                    onMouseDown={(e) => e.stopPropagation()}
                    draggable={false}
                  >
                    <span
                      className="material-symbols-outlined ml-1 text-[14px] text-[#6B2C91]"
                      aria-hidden="true"
                    >
                      edit
                    </span>
                    <input
                      type="text"
                      defaultValue={effectiveLabel}
                      placeholder={tile.label}
                      maxLength={36}
                      onBlur={(e) => persistTitle(k, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          ;(e.target as HTMLInputElement).blur()
                        } else if (e.key === 'Escape') {
                          ;(e.target as HTMLInputElement).value = effectiveLabel
                          ;(e.target as HTMLInputElement).blur()
                        }
                      }}
                      className="h-6 min-w-0 flex-1 bg-transparent text-[11.5px] font-semibold uppercase text-[#1A1320] outline-none placeholder:font-medium placeholder:text-[#97909C]"
                      style={{ letterSpacing: '0.06em' }}
                      aria-label={`Rename "${tile.label}" tile`}
                    />
                  </div>
                </>
              )}
              <KpiCard
                icon={tile.icon}
                label={effectiveLabel}
                value={tile.value}
                sub={tile.sub}
                delta={tile.delta}
                direction={tile.direction}
                target={tile.target}
                context={tile.context}
                color={tile.color}
                bg={tile.bg}
                spark={tile.spark}
              />
            </div>
          )
        })}
      </section>
    </>
  )
}
