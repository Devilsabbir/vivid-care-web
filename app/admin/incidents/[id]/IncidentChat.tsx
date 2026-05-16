'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Message {
  id: string
  incident_id: string
  sender_id: string
  sender_role: 'staff' | 'admin' | 'client'
  body: string
  created_at: string
  sender?: { full_name: string | null } | null
}

interface IncidentChatProps {
  incidentId: string
  adminId: string
  reporterName: string
}

/**
 * Admin-side incident chat thread. Mirrors the mobile app's chat UI so a
 * staff member's message lands here in real time and any admin reply
 * lands on their phone in real time. Posts as sender_role='admin'.
 */
export default function IncidentChat({ incidentId, adminId, reporterName }: IncidentChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [supabase] = useState(() => createClient())

  // Initial fetch
  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: fetchErr } = await supabase
        .from('incident_messages')
        .select('id, incident_id, sender_id, sender_role, body, created_at, sender:profiles!sender_id(full_name)')
        .eq('incident_id', incidentId)
        .order('created_at', { ascending: true })
      if (cancelled) return
      if (fetchErr) {
        console.warn('[IncidentChat] fetch failed:', fetchErr.message)
        return
      }
      const normalized = (data ?? []).map((row: any) => ({
        ...row,
        sender: Array.isArray(row.sender) ? row.sender[0] ?? null : row.sender ?? null,
      }))
      setMessages(normalized as Message[])
    }
    load()
    return () => {
      cancelled = true
    }
  }, [incidentId, supabase])

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`admin-incident-chat-${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'incident_messages',
          filter: `incident_id=eq.${incidentId}`,
        },
        async (payload) => {
          const row = payload.new as any
          // Fetch sender name to render properly.
          const { data: senderRow } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', row.sender_id)
            .maybeSingle()
          const msg: Message = {
            id: row.id,
            incident_id: row.incident_id,
            sender_id: row.sender_id,
            sender_role: row.sender_role,
            body: row.body,
            created_at: row.created_at,
            sender: senderRow ?? null,
          }
          setMessages((current) => {
            if (current.some((m) => m.id === msg.id)) return current
            return [...current, msg]
          })
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [incidentId, supabase])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    setSending(true)
    setError(null)
    const { error: insertErr } = await supabase.from('incident_messages').insert({
      incident_id: incidentId,
      sender_id: adminId,
      sender_role: 'admin',
      body,
    })
    setSending(false)
    if (insertErr) {
      setError(insertErr.message)
      return
    }
    setDraft('')
  }

  return (
    <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="border-b border-[#F1EEF4] px-5 pt-5 pb-3">
        <h3 className="text-[16px] font-semibold leading-none text-[#1A1320]">
          Chat with {reporterName}
        </h3>
        <p className="mt-1.5 text-[12.5px] text-[#6B6371]">
          Messages here go straight to the staff member’s phone. They see it in real time.
        </p>
      </div>

      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex max-h-[440px] flex-col gap-2.5 overflow-y-auto bg-[#F8F6FA] px-5 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="material-symbols-outlined text-[28px] text-[#C7C2CB]" aria-hidden="true">
              forum
            </span>
            <p className="mt-2 text-[13px] font-medium text-[#6B6371]">No messages yet.</p>
            <p className="mt-1 text-[11.5px] text-[#97909C]">
              Start the conversation — let {reporterName} know you’ve seen this.
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isAdmin = m.sender_role === 'admin'
            const time = new Date(m.created_at).toLocaleTimeString('en-AU', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Australia/Perth',
            })
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[78%] rounded-[14px] px-3.5 py-2 text-[13.5px] leading-[1.4] ${
                    isAdmin
                      ? 'rounded-tr-[4px] bg-[#6B2C91] text-white'
                      : 'rounded-tl-[4px] border border-[#F1EEF4] bg-white text-[#1A1320]'
                  }`}
                >
                  {m.body}
                </div>
                <p className="mt-1 text-[10.5px] font-medium text-[#97909C]">
                  {isAdmin ? (m.sender?.full_name ?? 'You') : reporterName} · {time}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 border-t border-[#F1EEF4] bg-white px-5 py-3"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={1}
          maxLength={2000}
          placeholder={`Reply to ${reporterName}…`}
          className="min-h-[38px] flex-1 resize-none rounded-[12px] bg-[#F8F6FA] px-3 py-2 text-[13.5px] text-[#1A1320] outline-none placeholder:text-[#97909C] focus:bg-white focus:shadow-[0_0_0_1.5px_#E6D4F0]"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e as unknown as React.FormEvent)
            }
          }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || sending}
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[12px] bg-[#6B2C91] text-white shadow-[0_2px_6px_rgba(107,44,145,0.25)] transition-opacity hover:bg-[#54206F] disabled:opacity-50"
          aria-label="Send message"
        >
          {sending ? (
            <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          ) : (
            <span className="material-symbols-outlined text-[16px]">send</span>
          )}
        </button>
      </form>
      {error && (
        <div className="border-t border-[#FCE7E7] bg-[#FCE7E7] px-5 py-2 text-[12px] font-medium text-[#991b1b]">
          {error}
        </div>
      )}
    </section>
  )
}
