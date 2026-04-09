import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'

export default async function IncidentsPage() {
  const supabase = await createClient()

  const { data: incidents } = await supabase
    .from('incidents')
    .select('*, profiles(full_name), clients(full_name)')
    .order('reported_at', { ascending: false })

  return (
    <div className="max-w-5xl">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Incidents</h2>
        <p className="text-on-surface-variant text-sm mt-1">{incidents?.length ?? 0} total incidents</p>
      </header>

      <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
        <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label border-b border-outline-variant/10">
          <div className="col-span-4">Incident</div>
          <div className="col-span-2">Staff</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Severity</div>
          <div className="col-span-2">Status</div>
        </div>

        {incidents && incidents.length > 0 ? (
          <div>
            {incidents.map((inc, i) => (
              <Link
                key={inc.id}
                href={`/admin/incidents/${inc.id}`}
                className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/50 transition-colors ${i % 2 === 1 ? 'bg-surface-container-low/20' : ''}`}
              >
                <div className="col-span-4">
                  <p className="font-bold text-sm font-headline text-on-surface line-clamp-1">{inc.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(inc.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="col-span-2 text-sm text-on-surface-variant">{inc.profiles?.full_name ?? '—'}</div>
                <div className="col-span-2 text-sm text-on-surface-variant">{inc.clients?.full_name ?? '—'}</div>
                <div className="col-span-2"><Badge variant={inc.severity} /></div>
                <div className="col-span-2"><Badge variant={inc.status} /></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-3 block">report_problem</span>
            <p className="text-sm font-semibold">No incidents reported</p>
          </div>
        )}
      </div>
    </div>
  )
}
