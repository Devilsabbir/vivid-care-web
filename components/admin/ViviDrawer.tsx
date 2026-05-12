'use client'

import { useEffect, useRef, useState } from 'react'

type Message = { id: string; role: 'user' | 'assistant'; content: string }

const SUGGESTED_PROMPTS = [
  'Show me live shifts',
  'Any open incidents?',
  'Run an NDIS claim summary',
  'Explain SCHADS pay rates',
  'Whose credentials expire this month?',
  'Find shift clashes this week',
]

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

interface ViviDrawerProps {
  open: boolean
  onClose: () => void
}

export default function ViviDrawer({ open, onClose }: ViviDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Esc closes the drawer
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Auto-scroll on new content
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(t)
    }
  }, [open])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setError(null)
    const userMsg: Message = { id: newId(), role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content })),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'The assistant could not respond.')
        setSending(false)
        return
      }
      setMessages(curr => [...curr, { id: newId(), role: 'assistant', content: data.content ?? '' }])
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSending(false)
    }
  }

  function newChat() {
    if (messages.length === 0) return
    if (!confirm('Start a new conversation?')) return
    setMessages([])
    setError(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close Vivi"
        onClick={onClose}
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="vivi-title"
        className="absolute right-0 top-0 flex h-full w-full max-w-[460px] flex-col bg-white shadow-[0_24px_44px_rgba(46,18,64,0.25)] animate-slide-in-right"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#e6e8ec] px-5 py-4">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6B2C91] to-[#2BAEE0] text-white">
            <span className="absolute inset-0 rounded-[10px] bg-white/10 blur-sm animate-pulse" />
            <span className="material-symbols-outlined relative text-[18px]" aria-hidden="true">auto_awesome</span>
          </span>
          <div className="flex-1">
            <p id="vivi-title" className="text-[14px] font-semibold text-[#0f172a]">Ask Vivi</p>
            <p className="text-[11px] text-[#94a3b8]">Operations assistant · powered by Claude</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={newChat}
              className="rounded-[8px] border border-[#e6e8ec] bg-white px-2.5 py-1 text-[11px] font-medium text-[#475569] hover:bg-[#f7f8f9]"
            >
              New chat
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[#94a3b8] hover:bg-[#f7f8f9]"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#F4ECF8] to-[#E6F5FC] text-[#54206F]">
                <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
              </div>
              <h3 className="mt-4 text-[18px] font-semibold tracking-[-0.01em] text-[#0f172a]">How can I help?</h3>
              <p className="mt-1 max-w-[300px] text-[13px] text-[#64748b]">
                Ask about workflows, NDIS terms, drafting comms, or anything in the admin platform.
              </p>
              <div className="mt-5 grid w-full grid-cols-2 gap-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-[10px] border border-[#e6e8ec] bg-white px-3 py-2.5 text-left text-[12px] text-[#0f172a] transition-colors hover:border-[#6B2C91] hover:bg-[#F4ECF8]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(m => <ViviBubble key={m.id} message={m} />)}
              {sending && <ViviBubble message={{ id: 't', role: 'assistant', content: '' }} typing />}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-[#fee2e2] bg-[#fef2f2] px-5 py-2 text-[11.5px] text-[#991b1b]">
            {error}
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="border-t border-[#e6e8ec] bg-[#fafbfc] px-4 py-3"
        >
          <div className="flex items-end gap-2 rounded-[14px] border border-[#e6e8ec] bg-white px-3 py-2 focus-within:border-[#6B2C91] focus-within:ring-2 focus-within:ring-[#E6D4F0]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
              }}
              rows={1}
              placeholder="Ask anything…"
              disabled={sending}
              className="flex-1 resize-none bg-transparent text-[13px] text-[#0f172a] outline-none placeholder:text-[#94a3b8] disabled:opacity-60"
              style={{ minHeight: 22, maxHeight: 140 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#6B2C91] text-white disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
            </button>
          </div>
          <p className="mt-1.5 text-[10px] text-[#94a3b8]">Enter to send · Shift+Enter for newline · ⌘/ to toggle</p>
        </form>
      </aside>
    </div>
  )
}

function ViviBubble({ message, typing }: { message: Message; typing?: boolean }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#F4ECF8] to-[#E6F5FC] text-[#54206F]">
          <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-[14px] px-3 py-2 text-[13px] leading-[20px] ${
          isUser
            ? 'bg-[#6B2C91] text-white'
            : 'border border-[#e6e8ec] bg-white text-[#0f172a]'
        }`}
      >
        {typing ? <TypingDots /> : <FormattedContent content={message.content} />}
      </div>
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 rounded-full bg-[#6B2C91] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

/**
 * Minimal inline formatter — handles **bold** and lines starting with `• ` or `- ` as a bulleted list.
 * Avoids pulling in a full markdown library.
 */
function FormattedContent({ content }: { content: string }) {
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let bullets: string[] = []

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul key={`b-${blocks.length}`} className="my-1 ml-4 list-disc space-y-0.5">
          {bullets.map((b, i) => <li key={i} dangerouslySetInnerHTML={{ __html: boldify(b) }} />)}
        </ul>,
      )
      bullets = []
    }
  }

  lines.forEach((line, i) => {
    const m = line.match(/^\s*[•\-]\s+(.*)$/)
    if (m) {
      bullets.push(m[1])
    } else {
      flushBullets()
      if (line.trim()) {
        blocks.push(
          <p key={i} className="whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: boldify(line) }} />,
        )
      }
    }
  })
  flushBullets()
  return <>{blocks}</>
}

function boldify(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
}
