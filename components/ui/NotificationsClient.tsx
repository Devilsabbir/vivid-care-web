'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
}: {
  initialNotifications: NotificationRow[]
  userId: string
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
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
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(current => current.map(notification => {
      if (notification.id === id) return { ...notification, read: true }
      return notification
    }))
  }

  async function markAllRead() {
    const unreadIds = notifications.filter(notification => !notification.read).map(notification => notification.id)
    if (!unreadIds.length) return

    await supabase.from('notifications').update({ read: true }).in('id', unreadIds)
    setNotifications(current => current.map(notification => ({ ...notification, read: true })))
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
      <section className="space-y-4">
        <div className="flex flex-col gap-4 rounded-[28px] border border-[#e8e4dc] bg-white p-5 shadow-[0_16px_40px_rgba(26,26,24,0.04)] md:flex-row md:items-center md:justify-between md:p-6">
          <div>
            <h3 className="text-sm font-semibold text-[#1a1a18]">Live notification feed</h3>
            <p className="text-xs text-[#8a877f]">Realtime inserts are shown here as rostering, attendance, and compliance activity happens.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-full px-4 py-2 text-xs font-medium ${filter === 'all' ? 'bg-[#1a1a18] text-white' : 'bg-[#f4f2ed] text-[#5f5c55]'}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`rounded-full px-4 py-2 text-xs font-medium ${filter === 'unread' ? 'bg-[#1a1a18] text-white' : 'bg-[#f4f2ed] text-[#5f5c55]'}`}
            >
              Unread
            </button>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!unreadCount}
              className="rounded-full bg-[#cdff52] px-4 py-2 text-xs font-semibold text-[#1a1a18] disabled:opacity-50"
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
                    ? 'border-[#e8e4dc] bg-white'
                    : 'border-[#dfe8bf] bg-[#fcfff2]'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${notification.read ? 'bg-[#f3f1eb] text-[#66625c]' : 'bg-[#1a1a18] text-[#cdff52]'}`}>
                    <span className="material-symbols-outlined text-[20px]">
                      {TYPE_ICONS[notification.type] ?? TYPE_ICONS.default}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-semibold text-[#1a1a18]">{notification.title}</h4>
                          <span className="rounded-full bg-[#f4f2ed] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6a665f]">
                            {TYPE_LABELS[notification.type] ?? 'General'}
                          </span>
                          {!notification.read ? (
                            <span className="rounded-full bg-[#cdff52] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1a1a18]">
                              New
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[#5c5953]">{notification.message}</p>
                      </div>

                      <div className="text-right text-[11px] text-[#8a877f]">
                        <p>{formatNotificationDate(notification.created_at)}</p>
                        {!notification.read ? (
                          <button
                            type="button"
                            onClick={() => markRead(notification.id)}
                            className="mt-3 rounded-full bg-[#1a1a18] px-3 py-1.5 text-[11px] font-medium text-white"
                          >
                            Mark read
                          </button>
                        ) : (
                          <span className="mt-3 inline-flex rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[11px] font-medium text-[#6a665f]">
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
          <div className="rounded-[24px] border border-dashed border-[#d8d3ca] bg-white px-6 py-16 text-center">
            <span className="material-symbols-outlined text-[44px] text-[#bbb6ad]">notifications_none</span>
            <p className="mt-3 text-sm font-medium text-[#1a1a18]">No notifications in this view</p>
            <p className="mt-1 text-xs text-[#8a877f]">Switch filters or wait for new roster and compliance activity.</p>
          </div>
        )}
      </section>

      <aside className="space-y-4">
        <SummaryPanel label="Unread items" value={unreadCount} sub="Needs acknowledgement" accent />
        <SummaryPanel label="Incident alerts" value={incidentCount} sub="Watch for open investigations" />
        <SummaryPanel label="Compliance alerts" value={complianceCount} sub="Expiry and document reminders" />

        <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
          <div className="border-b border-[#f0ece5] px-4 py-3">
            <h3 className="text-sm font-semibold text-[#1a1a18]">Feed notes</h3>
          </div>
          <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#66635b]">
            <p>Roster assignment notifications are generated as soon as a shift is published to a worker.</p>
            <p>Incident and compliance alerts are the highest-value signals to keep unread.</p>
            <p>Realtime delivery is powered by Supabase channel subscriptions for the signed-in admin.</p>
          </div>
        </section>
      </aside>
    </div>
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
        accent ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'
      }`}
    >
      <p className={`text-[12px] ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
    </section>
  )
}

function formatNotificationDate(value: string) {
  const date = new Date(value)
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) +
    ' at ' +
    date.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}
