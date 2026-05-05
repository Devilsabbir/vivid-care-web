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
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-[#1a1a18]/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        onKeyDown={handleTrapFocus}
        className={`relative flex h-full flex-col bg-white ${wide ? 'w-full max-w-2xl' : 'w-full max-w-md'} shadow-[0_24px_44px_rgba(23,23,22,0.26)] animate-slide-in-right`}
      >
        <div className="flex items-center justify-between border-b border-[#f0ece5] px-6 py-4">
          <h2 id="drawer-title" className="text-lg font-bold font-headline text-[#1a1a18]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a877f] hover:bg-[#f4f2ed] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c852ff]"
            aria-label="Close drawer"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
