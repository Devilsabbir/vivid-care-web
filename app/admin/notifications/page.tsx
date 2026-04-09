import { createClient } from '@/lib/supabase/server'
import NotificationsClient from '@/components/ui/NotificationsClient'

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Notifications</h2>
        <p className="text-on-surface-variant text-sm mt-1">
          {notifications?.filter(n => !n.read).length ?? 0} unread
        </p>
      </header>
      <NotificationsClient initialNotifications={notifications ?? []} userId={user!.id} />
    </div>
  )
}
