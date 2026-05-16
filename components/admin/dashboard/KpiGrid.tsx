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
  /** localStorage key namespace — lets us reuse for staff/admin layouts. */
  storageKey?: string
}

/**
 * Drag-and-drop reorderable KPI grid. Persists tile order in localStorage
 * (per-device, per-user) and gates dragging behind an explicit "Edit
 * layout" toggle so day-to-day clicks don't accidentally rearrange.
 *
 * Why localStorage and not the DB? Two reasons:
 *  1. Personal preference — one admin's tile order shouldn't override
 *     a teammate's. Per-device is the right scope.
 *  2. Zero schema migration, zero round-trips. Persistence is local.
 */
export default function KpiGrid({ tiles, storageKey = 'admin:kpi-order' }: KpiGridProps) {
  // hydrated controls whether we apply the persisted order on mount —
  // server-rendered HTML uses the prop order, then we re-shuffle once
  // localStorage is readable to avoid hydration mismatch warnings.
  const [hydrated, setHydrated] = useState(false)
  const [order, setOrder] = useState<string[]>(() => tiles.map((t) => t.key))
  const [editing, setEditing] = useState(false)
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  // On mount: read persisted order from localStorage and merge with the
  // tiles we got. If new tiles were added since the user last sorted, we
  // append them at the end instead of dropping them.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as string[]
        const known = new Set(tiles.map((t) => t.key))
        const validSaved = saved.filter((k) => known.has(k))
        const missing = tiles.map((t) => t.key).filter((k) => !validSaved.includes(k))
        setOrder([...validSaved, ...missing])
      }
    } catch {
      /* localStorage unavailable (private browsing, etc) — just stick with prop order */
    }
    setHydrated(true)
    // Only run on the FIRST mount with the original tiles set; if the
    // server sends a new tiles list the existing order auto-reconciles
    // via the same logic on the next mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function persist(next: string[]) {
    setOrder(next)
    try {
      localStorage.setItem(storageKey, JSON.stringify(next))
    } catch {
      /* swallow — non-fatal */
    }
  }

  function resetOrder() {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      /* swallow */
    }
    setOrder(tiles.map((t) => t.key))
  }

  function handleDragStart(e: React.DragEvent, key: string) {
    if (!editing) return
    setDraggingKey(key)
    e.dataTransfer.effectAllowed = 'move'
    // Some browsers need a payload to start the drag at all.
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
    persist(next)
    setDraggingKey(null)
  }

  function handleDragEnd() {
    setDraggingKey(null)
  }

  // Map tiles by key so we can render in the current order.
  const byKey = new Map(tiles.map((t) => [t.key, t]))
  // Until hydration completes, use the original prop order to match SSR.
  const renderKeys = hydrated ? order : tiles.map((t) => t.key)

  return (
    <>
      {/* Eyebrow + edit toggle row */}
      <div className="mb-2.5 flex items-baseline justify-between px-0.5">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6B6371]">
          Today at a glance
        </div>
        <div className="flex items-center gap-3">
          {editing && (
            <button
              type="button"
              onClick={resetOrder}
              className="text-[11.5px] font-medium text-[#6B6371] underline-offset-2 hover:text-[#1A1320] hover:underline"
            >
              Reset order
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
            aria-label={editing ? 'Finish editing dashboard layout' : 'Edit dashboard layout'}
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
              {editing ? 'check' : 'drag_indicator'}
            </span>
            {editing ? 'Done' : 'Customize'}
          </button>
        </div>
      </div>

      {/* Tile grid */}
      <section
        className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4"
        aria-label="Dashboard KPIs"
      >
        {renderKeys.map((k) => {
          const tile = byKey.get(k)
          if (!tile) return null
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
                <div
                  className="pointer-events-none absolute -top-1.5 left-2 z-10 inline-flex items-center gap-1 rounded-full bg-[#6B2C91] px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white"
                  style={{ letterSpacing: '0.06em' }}
                  aria-hidden="true"
                >
                  <span className="material-symbols-outlined text-[10px]">drag_indicator</span>
                  Drag
                </div>
              )}
              <KpiCard
                icon={tile.icon}
                label={tile.label}
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
