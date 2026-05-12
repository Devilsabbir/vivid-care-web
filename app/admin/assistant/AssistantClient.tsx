'use client'

import { useEffect, useRef, useState } from 'react'

type Message = {
  role: 'user' | 'assistant'
  content: string
  id: string
}

const SUGGESTED_PROMPTS = [
  'How do I generate an NDIS service agreement?',
  'A staff member missed clocking out — what do I do?',
  "Walk me through marking a staff member's shifts as paid.",
  'Explain NDIA-managed vs plan-managed funding.',
  'Draft a notice to staff about updated police-check requirements.',
]

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function AssistantClient({ adminName }: { adminName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setError(null)
    const userMessage: Message = { role: 'user', content: trimmed, id: newId() }
    const next = [...messages, userMessage]
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
        setError(data.error ?? 'The assistant could not respond. Please try again.')
        setSending(false)
        return
      }

      const reply: Message = {
        role: 'assistant',
        content: data.content ?? 'Sorry, I did not generate a response.',
        id: newId(),
      }
      setMessages(current => [...current, reply])
    } catch (err) {
      console.error('[AssistantClient] send failed:', err)
      setError('Network error. Please check your connection and try again.')
    } finally {
      setSending(false)
      // Refocus the input for the next message
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    send(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function clearChat() {
    if (!messages.length) return
    if (!confirm('Start a new conversation? Current messages will be cleared.')) return
    setMessages([])
    setError(null)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      {/* Chat panel */}
      <section className="flex h-[calc(100vh-220px)] min-h-[480px] flex-col overflow-hidden rounded-[28px] border border-[#e6e8ec] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
        {/* Chat header */}
        <div className="flex items-center justify-between border-b border-[#f0f1f3] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#0d9488] text-white">
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">auto_awesome</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0f172a]">Operations Assistant</p>
              <p className="text-[11px] text-[#94a3b8]">Powered by Claude · responses can be inaccurate</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearChat}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e6e8ec] bg-white px-3 py-1.5 text-[11px] font-medium text-[#64748b] hover:text-[#0f172a]"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              New chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0fdfa] text-[#0d9488]">
                <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
              </div>
              <h3 className="mt-4 font-headline text-xl font-semibold text-[#0f172a]">Hi {adminName.split(' ')[0]}, how can I help?</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-[#64748b]">
                Ask about workflows, NDIS terminology, drafting communications, or anything about the Vivid Care admin portal.
              </p>

              <div className="mt-6 grid w-full max-w-md gap-2">
                {SUGGESTED_PROMPTS.map(prompt => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="rounded-2xl border border-[#e6e8ec] bg-white px-4 py-3 text-left text-sm text-[#0f172a] transition-colors hover:bg-[#f7f8f9] hover:border-[#0d9488]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <ChatBubble key={message.id} message={message} />
              ))}
              {sending && <ChatBubble message={{ role: 'assistant', content: '', id: 'typing' }} typing />}
            </div>
          )}
        </div>

        {error && (
          <div className="border-t border-[#fee2e2] bg-[#fef2f2] px-5 py-2.5 text-xs text-[#991b1b]">
            {error}
          </div>
        )}

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t border-[#f0f1f3] bg-[#fafbfc] px-4 py-3">
          <div className="flex items-end gap-2 rounded-2xl border border-[#e6e8ec] bg-white px-4 py-2.5 focus-within:border-[#0d9488] focus-within:ring-2 focus-within:ring-[#ccfbf1]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything…"
              disabled={sending}
              className="flex-1 resize-none bg-transparent text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8] disabled:opacity-60"
              style={{ minHeight: 24, maxHeight: 160 }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0d9488] text-white transition-opacity disabled:opacity-40"
              aria-label="Send"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
            </button>
          </div>
          <p className="mt-2 text-[10px] text-[#94a3b8]">Press Enter to send · Shift+Enter for new line</p>
        </form>
      </section>

      {/* Sidebar guidance */}
      <aside className="space-y-4">
        <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
          <div className="border-b border-[#f0f1f3] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#0f172a]">What this is good for</h3>
          </div>
          <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#64748b]">
            <p>Quick answers about admin workflows, NDIS terminology, and common operational situations.</p>
            <p>Drafting staff communications, incident notes, or compliance reminders.</p>
            <p>Decoding funding types, payment methods, and platform behaviour.</p>
          </div>
        </section>

        <section className="overflow-hidden rounded-[24px] border border-[#fef08a] bg-[#fefce8]">
          <div className="px-4 py-4 text-[12px] leading-6 text-[#92400e]">
            <p className="font-semibold">Don't use for</p>
            <p className="mt-1">Clinical decisions, legal advice, or live data queries (the assistant doesn't have access to live records).</p>
          </div>
        </section>
      </aside>
    </div>
  )
}

function ChatBubble({ message, typing }: { message: Message; typing?: boolean }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#f0fdfa] text-[#0d9488]">
          <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
        </div>
      )}
      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
        isUser
          ? 'bg-[#0d9488] text-white'
          : 'border border-[#e6e8ec] bg-white text-[#0f172a]'
      }`}>
        {typing ? <TypingDots /> : <p className="whitespace-pre-wrap">{message.content}</p>}
      </div>
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-white">
          <span className="material-symbols-outlined text-[16px]">person</span>
        </div>
      )}
    </div>
  )
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94a3b8]" style={{ animationDelay: '0ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94a3b8]" style={{ animationDelay: '150ms' }} />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#94a3b8]" style={{ animationDelay: '300ms' }} />
    </div>
  )
}
