'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'

/** Tone determines colour + icon. */
type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface ToastInput {
  /** Headline; required. */
  title: string
  /** Optional secondary line under the title. */
  body?: string
  /** success | error | info | warning. Default = info. */
  tone?: ToastTone
  /** Auto-dismiss ms (default 4500). 0 = sticky until manual dismiss. */
  duration?: number
}

interface ToastRow extends Required<Omit<ToastInput, 'body' | 'duration'>> {
  id: string
  body?: string
  duration: number
}

interface ToastContextValue {
  show: (t: ToastInput) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

/**
 * Mount once near the root (admin shell). All children can call
 * `useToast().show({ ... })`.
 *
 * Visual treatment ported from admin-toasts.jsx in the design handoff:
 *  - Bottom-right stack, slide+fade in
 *  - 14px radius white card with tone-tinted left border
 *  - 32px tinted icon square, title 13.5/600, body 12.5 slate-500
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRow[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((input: ToastInput) => {
    const id = `t_${Math.random().toString(36).slice(2, 10)}`
    const row: ToastRow = {
      id,
      title: input.title,
      tone: input.tone ?? 'info',
      body: input.body,
      duration: input.duration ?? 4500,
    }
    setToasts((current) => [...current, row])
    if (row.duration > 0) {
      setTimeout(() => {
        setToasts((current) => current.filter((t) => t.id !== id))
      }, row.duration)
    }
  }, [])

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

/** Hook — must be called inside <ToastProvider>. */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    // Safe fallback so callers never crash if the provider is missing —
    // log instead of throwing during dev.
    return {
      show: (t: ToastInput) =>
        console.warn('[Toast] no <ToastProvider> mounted —', t.tone ?? 'info', t.title),
      dismiss: () => {},
    }
  }
  return ctx
}

function ToastViewport({ toasts, dismiss }: { toasts: ToastRow[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed bottom-5 right-5 z-[300] flex flex-col gap-2.5"
      style={{ maxWidth: 'calc(100vw - 40px)' }}
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} t={t} onClose={() => dismiss(t.id)} />
      ))}
      <style jsx global>{`
        @keyframes vc-toast-in {
          from { opacity: 0; transform: translateX(20px) translateY(4px); }
          to { opacity: 1; transform: translateX(0) translateY(0); }
        }
      `}</style>
    </div>
  )
}

const TONE_STYLES: Record<ToastTone, { bg: string; fg: string; icon: string; left: string }> = {
  success: { bg: '#F1F9E1', fg: '#5E8D1F', icon: 'check_circle', left: '#8DC63F' },
  error:   { bg: '#FCE7E7', fg: '#DC2626', icon: 'error',        left: '#DC2626' },
  warning: { bg: '#FEF3D6', fg: '#5C3A06', icon: 'warning',      left: '#D97706' },
  info:    { bg: '#F4ECF8', fg: '#54206F', icon: 'info',         left: '#6B2C91' },
}

function ToastCard({ t, onClose }: { t: ToastRow; onClose: () => void }) {
  const tone = TONE_STYLES[t.tone]
  // Pause auto-dismiss on hover so users can read longer toasts.
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused) return
    if (t.duration <= 0) return
    // Note: parent already schedules the dismiss; this is a no-op hook
    // kept here in case we want hover-pause semantics later.
  }, [paused, t.duration])

  return (
    <div
      role="status"
      className="pointer-events-auto flex items-start gap-3 rounded-[14px] bg-white px-3.5 py-3 shadow-[0_18px_40px_rgba(20,12,32,0.18),0_1px_2px_rgba(20,12,32,0.06)]"
      style={{
        width: 340,
        borderLeft: `4px solid ${tone.left}`,
        animation: 'vc-toast-in 200ms ease-out',
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px]"
        style={{ backgroundColor: tone.bg, color: tone.fg }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{tone.icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold leading-tight text-[#1A1320]">{t.title}</p>
        {t.body && <p className="mt-1 text-[12.5px] leading-[1.4] text-[#6B6371]">{t.body}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#97909C] hover:bg-[#F8F6FA] hover:text-[#1A1320]"
        aria-label="Dismiss notification"
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
      </button>
    </div>
  )
}
