'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Tabs from '@/components/ui/Tabs'

type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read: boolean
}

const TYPE_ICONS: Record<string, string> = {
  clock_in: 'login',
  clock_out: 'logout',
  incident: 'warning',
  doc_expiry: 'description',
  roster: 'calendar_month',
  default: 'notifications',
}

const TYPE_LABELS: Record<string, string> = {
  clock_in: 'Clock event',
  clock_out: 'Clock event',
  incident: 'Incident',
  doc_expiry: 'Compliance',
  roster: 'Roster',
}

export default function NotificationsClient({
  initialNotifications,
  userId,
  variant = 'admin',
}: {
  initialNotifications: NotificationRow[]
  userId: string
  variant?: 'admin' | 'staff'
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [activeTab, setActiveTab] = useState('history')
  const [composeForm, setComposeForm] = useState({ audience: 'all_staff', type: 'roster', title: '', message: '' })
  const [composeSending, setComposeSending] = useState(false)
  const [composeMessage, setComposeMessage] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())

  useEffect(() => {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        payload => {
          setNotifications(current => [payload.new as NotificationRow, ...current])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, userId])

  const unreadCount = notifications.filter(notification => !notification.read).length
  const incidentCount = notifications.filter(notification => notification.type === 'incident').length
  const complianceCount = notifications.filter(notification => notification.type === 'doc_expiry').length
  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(notification => !notification.read)
    return notifications
  }, [filter, notifications])

  async function markRead(id: string) {
    // Optimistic update
    setNotifications(current => current.map(notification => {
      if (notification.id === id) return { ...notification, read: true }
      return notification
    }))
    const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
    if (error) {
      console.error('[NotificationsClient] markRead failed:', error)
      // Revert optimistic update
      setNotifications(current => current.map(notification => {
        if (notification.id === id) return { ...notification, read: false }
        return notification
      }))
    }
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(notification => !notification.read).map(notification => notification.id)
    if (!unreadIds.length) return

    // Optimistic update
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
    const { error } = await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    if (error) {
      console.error('[NotificationsClient] markAllRead failed:', error)
      // Revert optimistic update
      setNotifications(current => current.map(notification => ({
        ...notification,
        read: unreadIds.includes(notification.id) ? false : notification.read,
      })))
    }
  }

  async function handleComposeSend() {
    if (!composeForm.title.trim() || !composeForm.message.trim()) return
    setComposeSending(true)
    setComposeMessage(null)

    // TODO: In production, this would fan out to all staff/clients based on audience selector.
    // For now, insert a single notification for the current admin as a proof-of-concept.
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      type: composeForm.type,
      title: composeForm.title.trim(),
      message: composeForm.message.trim(),
      read: false,
    })

    setComposeSending(false)

    if (error) {
      setComposeMessage(error.message)
      return
    }

    setComposeForm({ audience: 'all_staff', type: 'roster', title: '', message: '' })
    setComposeMessage('Notification sent successfully.')
  }

  if (variant === 'staff') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={filter === 'all'} label="All" onClick={() => setFilter('all')} dark />
          <FilterPill active={filter === 'unread'} label="Unread" onClick={() => setFilter('unread')} dark />
          <button
            type="button"
            onClick={markAllRead}
            disabled={!unreadCount}
            className="ml-auto rounded-full bg-[#6B2C91] px-4 py-2 text-xs font-semibold text-[#0f172a] disabled:opacity-50"
          >
            Mark all read
          </button>
        </div>

        {visibleNotifications.length > 0 ? (
          <div className="space-y-3">
            {visibleNotifications.map(notification => (
              <article
                key={notification.id}
                className={`rounded-[24px] border p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)] ${
                  notification.read
                    ? 'border-[#e8e2d8] bg-white'
                    : 'border-[#E6D4F0] bg-[#F4ECF8]'
                }`}
              >
                <div className="flex gap-3">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${
                    notification.read ? 'bg-[#f3f1eb] text-[#64748b]' : 'bg-[#0f172a] text-[#6B2C91]'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {TYPE_ICONS[notification.type] ?? TYPE_ICONS.default}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-[#0f172a]">{notification.title}</p>
                          <span className="rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                            {TYPE_LABELS[notification.type] ?? 'General'}
                          </span>
                          {!notification.read ? (
                            <span className="rounded-full bg-[#6B2C91] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f172a]">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#64748b]">{notification.message}</p>
                        <p className="mt-2 text-[11px] text-[#64748b]">{formatNotificationDate(notification.created_at)}</p>
                      </div>

                      {!notification.read ? (
                        <button
                          type="button"
                          onClick={() => markRead(notification.id)}
                          className="rounded-full bg-[#0f172a] px-3 py-1.5 text-[11px] font-medium text-white"
                        >
                          Mark read
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-[#e6e8ec] bg-white px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">notifications_none</span>
            <p className="mt-3 text-sm font-medium text-[#0f172a]">No notifications in this view</p>
            <p className="mt-1 text-xs text-[#64748b]">Switch filters or wait for new roster and compliance activity.</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs
        items={[
          { key: 'history', label: 'History' },
          { key: 'compose', label: 'Compose' },
        ]}
        active={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'history' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <section className="space-y-4">
            <div className="flex flex-col gap-4 rounded-[28px] border border-[#e6e8ec] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:flex-row md:items-center md:justify-between md:p-6">
              <div>
                <h3 className="text-sm font-semibold text-[#0f172a]">Live notification feed</h3>
                <p className="text-xs text-[#64748b]">Realtime inserts are shown here as rostering, attendance, and compliance activity happens.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterPill active={filter === 'all'} label="All" onClick={() => setFilter('all')} />
                <FilterPill active={filter === 'unread'} label="Unread" onClick={() => setFilter('unread')} />
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={!unreadCount}
                  className="rounded-full bg-[#6B2C91] px-4 py-2 text-xs font-semibold text-[#0f172a] disabled:opacity-50"
                >
                  Mark all read
                </button>
              </div>
            </div>

            {visibleNotifications.length > 0 ? (
              <div className="space-y-3">
                {visibleNotifications.map(notification => (
                  <article
                    key={notification.id}
                    className={`rounded-[22px] border p-5 shadow-[0_12px_28px_rgba(26,26,24,0.04)] transition-colors ${
                      notification.read
                        ? 'border-[#e6e8ec] bg-white'
                        : 'border-[#E6D4F0] bg-[#F4ECF8]'
                    }`}
                  >
                    <div className="flex gap-4">
                      <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${notification.read ? 'bg-[#f3f1eb] text-[#64748b]' : 'bg-[#0f172a] text-[#6B2C91]'}`}>
                        <span className="material-symbols-outlined text-[20px]">
                          {TYPE_ICONS[notification.type] ?? TYPE_ICONS.default}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-sm font-semibold text-[#0f172a]">{notification.title}</h4>
                              <span className="rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#64748b]">
                                {TYPE_LABELS[notification.type] ?? 'General'}
                              </span>
                              {!notification.read ? (
                                <span className="rounded-full bg-[#6B2C91] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0f172a]">
                                  New
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-2 text-sm leading-6 text-[#64748b]">{notification.message}</p>
                          </div>

                          <div className="text-right text-[11px] text-[#64748b]">
                            <p>{formatNotificationDate(notification.created_at)}</p>
                            {!notification.read ? (
                              <button
                                type="button"
                                onClick={() => markRead(notification.id)}
                                className="mt-3 rounded-full bg-[#0f172a] px-3 py-1.5 text-[11px] font-medium text-white"
                              >
                                Mark read
                              </button>
                            ) : (
                              <span className="mt-3 inline-flex rounded-full bg-[#f7f8f9] px-3 py-1.5 text-[11px] font-medium text-[#64748b]">
                                Read
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-[#e6e8ec] bg-white px-6 py-16 text-center">
                <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">notifications_none</span>
                <p className="mt-3 text-sm font-medium text-[#0f172a]">No notifications in this view</p>
                <p className="mt-1 text-xs text-[#64748b]">Switch filters or wait for new roster and compliance activity.</p>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <SummaryPanel label="Unread items" value={unreadCount} sub="Needs acknowledgement" accent />
            <SummaryPanel label="Incident alerts" value={incidentCount} sub="Watch for open investigations" />
            <SummaryPanel label="Compliance alerts" value={complianceCount} sub="Expiry and document reminders" />

            <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
              <div className="border-b border-[#f0f1f3] px-4 py-3">
                <h3 className="text-sm font-semibold text-[#0f172a]">Feed notes</h3>
              </div>
              <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#64748b]">
                <p>Roster assignment notifications are generated as soon as a shift is published to a worker.</p>
                <p>Incident and compliance alerts are the highest-value signals to keep unread.</p>
                <p>Realtime delivery is powered by Supabase channel subscriptions for the signed-in admin.</p>
              </div>
            </section>
          </aside>
        </div>
      )}

      {activeTab === 'compose' && (
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#94a3b8]">Broadcast</p>
              <h3 className="mt-2 text-lg font-semibold text-[#0f172a]">Compose notification</h3>
              <p className="mt-1 text-xs text-[#64748b]">Send a notification to staff members. Delivered via realtime feed.</p>
            </div>

            {composeMessage && (
              <div className="mt-4 rounded-2xl border border-[#E6D4F0] bg-[#F4ECF8] px-4 py-3 text-sm text-[#54206F]">
                {composeMessage}
              </div>
            )}

            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Audience</label>
                  <select
                    value={composeForm.audience}
                    onChange={e => setComposeForm(c => ({ ...c, audience: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
                  >
                    <option value="all_staff">All staff</option>
                    <option value="active_staff">Active staff only</option>
                    <option value="admins">Admins</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Type</label>
                  <select
                    value={composeForm.type}
                    onChange={e => setComposeForm(c => ({ ...c, type: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
                  >
                    <option value="roster">Roster</option>
                    <option value="incident">Incident</option>
                    <option value="doc_expiry">Compliance</option>
                    <option value="clock_in">Clock event</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Title</label>
                <input
                  type="text"
                  value={composeForm.title}
                  onChange={e => setComposeForm(c => ({ ...c, title: e.target.value }))}
                  placeholder="e.g. Roster update for next week"
                  className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Message</label>
                <textarea
                  rows={4}
                  value={composeForm.message}
                  onChange={e => setComposeForm(c => ({ ...c, message: e.target.value }))}
                  placeholder="Write the notification body..."
                  className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
                />
              </div>

              {composeForm.title.trim() && composeForm.message.trim() && (
                <div className="rounded-[20px] border border-[#f0f1f3] bg-[#fafbfc] p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]">Preview</p>
                  <div className="mt-3 flex gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#0f172a] text-[#6B2C91]">
                      <span className="material-symbols-outlined text-[20px]">
                        {TYPE_ICONS[composeForm.type] ?? TYPE_ICONS.default}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0f172a]">{composeForm.title}</p>
                      <p className="mt-1 text-sm text-[#64748b]">{composeForm.message}</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={handleComposeSend}
                disabled={composeSending || !composeForm.title.trim() || !composeForm.message.trim()}
                className="rounded-2xl bg-[#0f172a] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {composeSending ? 'Sending...' : 'Send notification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  label,
  onClick,
  dark,
}: {
  active: boolean
  label: string
  onClick: () => void
  dark?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-xs font-medium ${
        active
          ? dark ? 'bg-[#0f172a] text-white' : 'bg-[#0f172a] text-white'
          : 'bg-[#f7f8f9] text-[#64748b]'
      }`}
    >
      {label}
    </button>
  )
}

function SummaryPanel({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
}) {
  return (
    <section
      className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${
        accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'
      }`}
    >
      <p className={`text-[12px] ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{sub}</p>
    </section>
  )
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) +
    ' at ' +
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}
