import { createClient } from '@/lib/supabase/server'
import NotificationsClient from '@/components/ui/NotificationsClient'

export default async function StaffNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold font-headline text-on-surface">Notifications</h2>
        <p className="text-on-surface-variant text-sm mt-0.5">
          {notifications?.filter(n => !n.read).length ?? 0} unread
        </p>
      </div>
      <NotificationsClient initialNotifications={notifications ?? []} userId={user!.id} />
    </div>
  )
}
