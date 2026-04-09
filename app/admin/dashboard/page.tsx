import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getExpiryStatus } from '@/lib/utils/expiry'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: staffCount },
    { count: clientCount },
    { count: pendingShifts },
    { data: activeShifts },
    { data: documents },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'staff'),
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('shifts').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    supabase.from('shifts')
      .select('*, profiles(full_name), clients(full_name, address)')
      .eq('status', 'active')
      .limit(5),
    supabase.from('documents').select('expiry_date').not('expiry_date', 'is', null),
  ])

  const expiringDocs = (documents ?? []).filter(d => {
    const s = getExpiryStatus(d.expiry_date)
    return s === 'near_expiry' || s === 'expired'
  }).length

  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-7xl">
      {/* Header */}
      <header className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Clinical Overview</h2>
          <p className="text-on-surface-variant text-sm mt-1">Status as of {today}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/clients/new"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container-lowest text-primary font-headline text-sm font-bold shadow-sm hover:bg-surface-container-low transition-all"
            style={{ outline: '1px solid rgba(193,199,209,0.15)' }}
          >
            <span className="material-symbols-outlined text-lg">person_add</span>
            Add Client
          </Link>
          <Link
            href="/admin/roster"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl primary-gradient text-white font-headline text-sm font-bold hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined text-lg">calendar_add_on</span>
            Assign Roster
          </Link>
        </div>
      </header>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard
          icon="medical_services"
          iconBg="bg-primary-fixed"
          iconColor="text-primary"
          value={staffCount ?? 0}
          label="Total Staff"
          badge="+4 this week"
          badgeColor="text-secondary bg-secondary-container/30"
          delay={0}
        />
        <StatCard
          icon="health_and_safety"
          iconBg="bg-secondary-fixed"
          iconColor="text-secondary"
          value={clientCount ?? 0}
          label="Active Clients"
          badge="Active"
          badgeColor="text-secondary bg-secondary-container/30"
          delay={75}
        />
        <StatCard
          icon="pending_actions"
          iconBg="bg-tertiary-fixed"
          iconColor="text-tertiary"
          value={pendingShifts ?? 0}
          label="Pending Shifts"
          badge="Urgent"
          badgeColor="text-error bg-error-container/50"
          delay={150}
        />
        <StatCard
          icon="warning"
          iconBg="bg-error-container"
          iconColor="text-error"
          value={expiringDocs}
          label="Expiring Documents"
          badge="45-day cycle"
          badgeColor="text-on-surface-variant bg-surface-container"
          valueColor="text-error"
          delay={225}
        />
      </section>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active shifts (2/3) */}
        <div className="lg:col-span-2">
          <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold font-headline text-on-surface">Real-time Shift Status</h3>
                <p className="text-sm text-on-surface-variant mt-0.5">
                  {activeShifts?.length ?? 0} currently active placements
                </p>
              </div>
              <Link href="/admin/active-shifts" className="text-primary text-sm font-bold font-headline hover:underline">
                View All →
              </Link>
            </div>

            {activeShifts && activeShifts.length > 0 ? (
              <div className="space-y-3">
                {activeShifts.map((shift: any) => (
                  <div key={shift.id} className="flex items-center bg-surface-container-low/50 p-4 rounded-2xl hover:bg-white hover:shadow-md transition-all">
                    <div className="w-10 h-10 primary-gradient rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {shift.profiles?.full_name?.charAt(0) ?? '?'}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <h4 className="font-bold font-headline text-sm text-on-surface truncate">
                        {shift.profiles?.full_name ?? 'Staff'}
                      </h4>
                      <p className="text-xs text-on-surface-variant truncate">
                        Client: {shift.clients?.full_name ?? '—'}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-1 text-[10px] font-bold text-on-surface-variant uppercase tracking-wider ml-4">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      <span className="truncate max-w-[100px]">{shift.clients?.address ?? '—'}</span>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <span className="text-[10px] font-black font-label text-secondary px-2 py-1 bg-secondary-container/40 rounded-lg uppercase">
                        Active
                      </span>
                      <p className="text-xs text-on-surface-variant mt-1 text-right">
                        Until {new Date(shift.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl mb-3 block">location_off</span>
                <p className="text-sm">No active shifts right now</p>
              </div>
            )}
          </div>
        </div>

        {/* Compliance sidebar (1/3) */}
        <ComplianceSidebar />
      </div>
    </div>
  )
}

function StatCard({
  icon, iconBg, iconColor, value, label, badge, badgeColor, valueColor, delay
}: {
  icon: string; iconBg: string; iconColor: string; value: number; label: string;
  badge: string; badgeColor: string; valueColor?: string; delay: number
}) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container-high animate-fade-slide-up transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center ${iconColor}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        <span className={`text-[11px] font-bold px-2 py-1 rounded-full font-label ${badgeColor}`}>
          {badge}
        </span>
      </div>
      <div className="mt-4">
        <p className={`text-4xl font-black font-headline ${valueColor ?? 'text-on-surface'}`}>{value}</p>
        <p className="text-sm font-medium text-on-surface-variant font-label mt-1">{label}</p>
      </div>
    </div>
  )
}

async function ComplianceSidebar() {
  const supabase = await createClient()
  const { data: docs } = await supabase
    .from('documents')
    .select('id, doc_type, owner_id, owner_type, expiry_date, profiles:uploaded_by(full_name)')
    .not('expiry_date', 'is', null)
    .order('expiry_date', { ascending: true })
    .limit(5)

  const nearExpiry = (docs ?? []).filter(d => {
    const s = getExpiryStatus(d.expiry_date)
    return s === 'near_expiry' || s === 'expired'
  })

  return (
    <div className="bg-surface-container-low rounded-3xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-error">assignment_late</span>
        <h3 className="text-xl font-bold font-headline text-on-surface">Critical Compliance</h3>
      </div>

      {nearExpiry.length > 0 ? (
        <div className="space-y-4">
          {nearExpiry.slice(0, 3).map((doc: any) => {
            const status = getExpiryStatus(doc.expiry_date)
            const borderColor = status === 'expired' ? 'border-error' : 'border-tertiary'
            const tagColor = status === 'expired' ? 'text-error' : 'text-tertiary'
            const daysLeft = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / 86400000)
            return (
              <div key={doc.id} className={`bg-white p-4 rounded-2xl shadow-sm border-l-4 ${borderColor}`}>
                <p className={`text-[10px] font-black font-label ${tagColor} uppercase tracking-widest mb-1`}>
                  {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)}d ago` : `Expires in ${daysLeft}d`}
                </p>
                <h4 className="font-bold text-sm font-headline text-sky-900 leading-tight">{doc.doc_type}</h4>
                <p className="text-xs text-on-surface-variant mt-0.5">{doc.owner_type === 'staff' ? 'Staff document' : 'Client document'}</p>
                <Link
                  href="/admin/compliance"
                  className="mt-3 w-full py-2 bg-surface-container rounded-lg text-[11px] font-bold font-headline text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center"
                >
                  View
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-8 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2 block text-secondary">verified</span>
          <p className="text-sm font-semibold">All documents compliant</p>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-outline-variant/20">
        <p className="text-[10px] font-bold text-outline uppercase font-label text-center">
          45-Day Forecasting Window Active
        </p>
      </div>
    </div>
  )
}
