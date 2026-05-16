import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NotificationsClient from '@/components/ui/NotificationsClient'

type NotificationRow = {
  id: string
  type: string
  title: string
  message: string
  created_at: string
  read: boolean
}

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error: notificationsError } = await supabase
    .from('notifications')
    .select('id, type, title, message, created_at, read')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (notificationsError) console.error('[admin notifications page] notifications fetch failed:', notificationsError)

  const notifications = (data ?? []) as NotificationRow[]
  const unreadCount = notifications.filter(notification => !notification.read).length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Notifications
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            {unreadCount} unread item{unreadCount === 1 ? '' : 's'} across roster, attendance, incident, and compliance activity.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/incidents"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">warning</span>
            Review incidents
          </Link>
        </div>
      </header>

      <NotificationsClient initialNotifications={notifications ?? []} userId={user.id} />
    </div>
  )
}
