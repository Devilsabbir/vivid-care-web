'use client'

import { useState, useRef, useEffect } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'How do I clock in for a shift?',
  'How do I upload a document?',
  'How do I report an incident?',
  'How do I view my payments?',
]

export default function SupportClient() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi! I'm your Vivid Care assistant. How can I help you today?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'chat' | 'contact'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, { role: 'user', content: msg }] }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content ?? 'Sorry, I could not process that.' }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-surface-container-low rounded-xl p-1">
        {(['chat', 'contact'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-headline capitalize transition-all ${tab === t ? 'bg-white text-sky-900 shadow-sm' : 'text-slate-600 hover:text-sky-800'}`}>
            {t === 'chat' ? '🤖 AI Assistant' : '📞 Contact Support'}
          </button>
        ))}
      </div>

      {tab === 'chat' && (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: '60vh' }}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === 'user'
                    ? 'primary-gradient text-white rounded-br-sm'
                    : 'bg-surface-container-low text-on-surface rounded-bl-sm'
                }`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-surface-container-low rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 bg-outline rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick prompts */}
          {messages.length === 1 && (
            <div className="px-4 pb-2 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-xs bg-surface-container text-on-surface-variant px-3 py-1.5 rounded-full hover:bg-surface-container-high transition-colors">
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-outline-variant/10">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Ask anything about the app…"
                className="flex-1 bg-surface-container-highest rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="p-3 rounded-xl primary-gradient text-white disabled:opacity-40 transition-opacity"
              >
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'contact' && (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5">
          <p className="text-sm text-on-surface-variant">
            If the AI assistant couldn't help, reach out to our support team directly.
          </p>
          <div className="space-y-3">
            {[
              { icon: 'mail', label: 'Email Support', value: 'support@vividcare.com', href: 'mailto:support@vividcare.com' },
              { icon: 'phone', label: 'Phone Support', value: '1800 VIVID CARE', href: 'tel:1800848423' },
              { icon: 'chat', label: 'Live Chat', value: 'Available Mon–Fri, 9am–5pm AEST', href: null },
            ].map(({ icon, label, value, href }) => (
              <div key={label} className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl">
                <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white flex-shrink-0">
                  <span className="material-symbols-outlined text-xl">{icon}</span>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant font-label">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm font-semibold text-primary hover:underline">{value}</a>
                  ) : (
                    <p className="text-sm text-on-surface">{value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
