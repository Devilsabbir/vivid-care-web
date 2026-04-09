'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const TYPE_ICONS: Record<string, string> = {
  clock_in: 'login',
  clock_out: 'logout',
  incident: 'report_problem',
  doc_expiry: 'assignment_late',
  roster: 'calendar_month',
  default: 'notifications',
}

export default function NotificationsClient({ initialNotifications, userId }: {
  initialNotifications: any[]; userId: string
}) {
  const [notifications, setNotifications] = useState(initialNotifications)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, payload => {
        setNotifications(prev => [payload.new as any, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  async function markRead(id: string) {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notifications').update({ read: true }).in('id', unread)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  return (
    <div className="space-y-4">
      {notifications.some(n => !n.read) && (
        <div className="flex justify-end">
          <button onClick={markAllRead} className="text-sm text-primary font-semibold hover:underline">
            Mark all read
          </button>
        </div>
      )}

      {notifications.length > 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm divide-y divide-outline-variant/10">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.read && markRead(n.id)}
              className={`px-6 py-4 flex items-start gap-4 transition-colors cursor-pointer hover:bg-surface-container-low/50 ${!n.read ? 'bg-primary-fixed/20' : ''}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!n.read ? 'primary-gradient text-white' : 'bg-surface-container text-outline'}`}>
                <span className="material-symbols-outlined text-lg">{TYPE_ICONS[n.type] ?? TYPE_ICONS.default}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold text-on-surface ${!n.read ? 'font-bold' : ''}`}>{n.title}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{n.message}</p>
                <p className="text-[10px] text-outline mt-1">
                  {new Date(n.created_at).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {!n.read && <div className="w-2 h-2 bg-primary rounded-full mt-1.5 flex-shrink-0" />}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant bg-surface-container-lowest rounded-2xl shadow-sm">
          <span className="material-symbols-outlined text-5xl mb-3 block">notifications_none</span>
          <p className="text-sm font-semibold">No notifications yet</p>
        </div>
      )}
    </div>
  )
}
