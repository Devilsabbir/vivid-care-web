import Link from 'next/link'
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

  const { data } = await supabase
    .from('notifications')
    .select('id, type, title, message, created_at, read')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications = (data ?? []) as NotificationRow[]
  const unreadCount = notifications.filter(notification => !notification.read).length

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Notifications</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">notifications</span>
              live feed
            </span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">for operations alerts</span>
          </div>
          <p className="text-sm text-[#6c6b66]">
            {unreadCount} unread item{unreadCount === 1 ? '' : 's'} across roster, attendance, incident, and compliance activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/dashboard"
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]"
          >
            <span className="material-symbols-outlined text-[20px]">dashboard</span>
            <span className="sr-only">Dashboard</span>
          </Link>
          <Link
            href="/admin/incidents"
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Review incidents
          </Link>
        </div>
      </header>

      <NotificationsClient initialNotifications={notifications} userId={user!.id} />
    </div>
  )
}
