'use client'

import { useEffect, useRef, useState } from 'react'

type Message = { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = [
  'How do I clock in for a shift?',
  'How do I upload a document?',
  'How do I report an incident?',
  'Where can I check completed hours?',
]

export default function SupportClient() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hi, I'm the Vivid Care assistant. Ask me how to use the app or where to find something." },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<'chat' | 'contact'>('chat')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage(text?: string) {
    const messageText = text ?? input.trim()
    if (!messageText || loading) return

    const conversation = [...messages, { role: 'user' as const, content: messageText }]
    setInput('')
    setMessages(conversation)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: conversation }),
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
      <div className="flex gap-1 rounded-[22px] border border-[#e6e0d7] bg-white p-1.5 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        {(['chat', 'contact'] as const).map(value => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={`flex-1 rounded-[18px] py-3 text-sm font-semibold transition ${
              tab === value ? 'bg-[#171717] text-white' : 'text-[#676359] hover:text-[#171716]'
            }`}
          >
            {value === 'chat' ? 'Assistant' : 'Contact'}
          </button>
        ))}
      </div>

      {tab === 'chat' ? (
        <section className="overflow-hidden rounded-[28px] border border-[#e6e0d7] bg-white shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
          <div className="border-b border-[#eee7dc] px-4 py-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">Assistant</p>
            <h2 className="mt-2 text-lg font-semibold text-[#171716]">Ask a workflow question</h2>
          </div>

          <div className="flex h-[58vh] flex-col">
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message, index) => (
                <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] rounded-[22px] px-4 py-3 text-sm leading-6 ${
                      message.role === 'user'
                        ? 'bg-[#171717] text-white'
                        : 'bg-[#f4f1ea] text-[#171716]'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}

              {loading ? (
                <div className="flex justify-start">
                  <div className="flex gap-1 rounded-[22px] bg-[#f4f1ea] px-4 py-3">
                    {[0, 1, 2].map(index => (
                      <div key={index} className="h-2 w-2 animate-bounce rounded-full bg-[#9d988d]" style={{ animationDelay: `${index * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              ) : null}

              <div ref={bottomRef} />
            </div>

            {messages.length === 1 ? (
              <div className="border-t border-[#eee7dc] px-4 py-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b867b]">Quick prompts</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_PROMPTS.map(prompt => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="rounded-full bg-[#f4f1ea] px-3 py-1.5 text-xs font-medium text-[#171716]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="border-t border-[#eee7dc] p-4">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Ask anything about the app..."
                  className="flex-1 rounded-2xl border border-[#e7e1d7] bg-[#fbfaf7] px-4 py-3 text-sm text-[#171716] placeholder:text-[#9c978d] focus:outline-none"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={!input.trim() || loading}
                  className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#cdff52] text-[#171716] disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[20px]">send</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          {[
            { icon: 'mail', label: 'Email support', value: 'support@vividcare.com', href: 'mailto:support@vividcare.com' },
            { icon: 'phone', label: 'Phone support', value: '1800 VIVID CARE', href: 'tel:1800848423' },
            { icon: 'chat', label: 'Live chat', value: 'Available Mon-Fri, 9am-5pm AEST', href: null },
          ].map(item => (
            <article key={item.label} className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
              <div className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-[#cdff52]">
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8b867b]">{item.label}</p>
                  {item.href ? (
                    <a href={item.href} className="mt-1 inline-block text-sm font-semibold text-[#171716] hover:underline">{item.value}</a>
                  ) : (
                    <p className="mt-1 text-sm text-[#171716]">{item.value}</p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}
