'use client'

import { useEffect, useRef, useCallback } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  wide?: boolean
}

export default function Modal({ open, onClose, title, children, wide }: ModalProps) {
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
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, open])

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
    <div
      className="fixed inset-0 z-[250] flex items-start justify-center px-5 pt-[60px] pb-5 motion-safe:animate-[vc-modal-fade_150ms_ease]"
      style={{ background: 'rgba(20, 12, 32, 0.42)', backdropFilter: 'blur(3px)' }}
    >
      {/* Backdrop click-to-close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Panel — design spec: 18px radius, deep shadow + thin inset ring */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onKeyDown={handleTrapFocus}
        className={`relative flex w-full ${wide ? 'max-w-2xl' : 'max-w-lg'} flex-col overflow-hidden rounded-[18px] bg-white motion-safe:animate-[vc-modal-pop_200ms_cubic-bezier(0.2,0.9,0.32,1.2)]`}
        style={{
          maxHeight: 'calc(100vh - 80px)',
          boxShadow: '0 30px 80px rgba(20,12,32,0.35), 0 0 0 1px rgba(20,12,32,0.04)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#F1EEF4] px-[22px] pt-[18px] pb-3.5">
          <h2
            id="modal-title"
            className="text-[17px] font-bold leading-[1.1] text-[#1A1320]"
            style={{ letterSpacing: '-0.01em' }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B6371] transition-colors hover:bg-[#F8F6FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B2C91]"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-[22px] py-[18px]">{children}</div>
      </div>

      {/* Animation keyframes — co-located with the modal so a global CSS reset can't strip them */}
      <style jsx global>{`
        @keyframes vc-modal-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes vc-modal-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
