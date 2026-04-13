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

  const unreadCount = notifications?.filter(notification => !notification.read).length ?? 0
  const incidentCount = notifications?.filter(notification => notification.type === 'incident').length ?? 0
  const complianceCount = notifications?.filter(notification => notification.type === 'doc_expiry').length ?? 0

  return (
    <div className="space-y-5">
      <section className="rounded-[28px] bg-[#171717] px-5 py-5 text-white shadow-[0_24px_44px_rgba(23,23,22,0.18)]">
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8f8a80]">Notifications</p>
        <h1 className="mt-3 font-headline text-[1.85rem] font-semibold leading-none tracking-[-0.05em]">Stay on top of updates</h1>
        <p className="mt-3 text-sm leading-6 text-[#d1ccc3]">
          Roster changes, compliance reminders, and incident alerts appear here the moment they are sent.
        </p>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <MiniStat label="Unread" value={unreadCount} />
          <MiniStat label="Incidents" value={incidentCount} accent />
          <MiniStat label="Compliance" value={complianceCount} />
        </div>
      </section>

      <NotificationsClient initialNotifications={notifications ?? []} userId={user!.id} variant="staff" />
    </div>
  )
}

function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-[22px] px-4 py-4 ${accent ? 'bg-[#cdff52] text-[#171716]' : 'bg-white/8 text-white'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${accent ? 'text-[#627100]' : 'text-[#8f8a80]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[1.8rem] font-semibold leading-none tracking-[-0.06em]">{value}</p>
    </div>
  )
}
