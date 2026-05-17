'use client'

import { useEffect, useRef, useCallback, type ReactNode } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  wide?: boolean
  children: ReactNode
}

export default function Drawer({ open, onClose, title, wide, children }: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<Element | null>(null)

  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      const panel = panelRef.current
      if (panel) {
        const firstFocusable = panel.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        firstFocusable?.focus()
      }
    } else {
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus()
      }
    }
  }, [open])

  const handleTrapFocus = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    []
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[250] flex justify-end">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(20, 12, 32, 0.42)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onKeyDown={handleTrapFocus}
        className={`relative flex h-full flex-col bg-white ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} animate-slide-in-right`}
        style={{ boxShadow: '0 24px 44px rgba(20,12,32,0.26), -1px 0 0 rgba(20,12,32,0.04)' }}
      >
        <div className="flex items-center justify-between border-b border-[#F1EEF4] px-5 pt-[18px] pb-3.5">
          <h2
            id="drawer-title"
            className="text-[17px] font-bold leading-[1.1] text-[#1A1320]"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6371] transition-colors hover:bg-[#F8F6FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
            aria-label="Close drawer"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-[18px]">{children}</div>
      </div>
    </div>
  )
}
