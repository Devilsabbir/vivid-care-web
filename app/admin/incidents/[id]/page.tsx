import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import IncidentStatusUpdate from './IncidentStatusUpdate'

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const { data: inc } = await supabase
    .from('incidents')
    .select('*, profiles(full_name), clients(full_name), shifts(start_time, end_time)')
    .eq('id', params.id)
    .single()

  if (!inc) notFound()

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/incidents" className="p-2 rounded-lg hover:bg-surface-container transition-colors text-outline">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Incident Report</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">
            {new Date(inc.reported_at).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold font-headline text-on-surface">{inc.title}</h3>
          </div>
          <div className="flex gap-2">
            <Badge variant={inc.severity} />
            <Badge variant={inc.status} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4 border-y border-outline-variant/10">
          {[
            { label: 'Reported by', value: inc.profiles?.full_name },
            { label: 'Client', value: inc.clients?.full_name },
            { label: 'Reported at', value: new Date(inc.reported_at).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) },
            { label: 'Shift', value: inc.shifts ? `${new Date(inc.shifts.start_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })} – ${new Date(inc.shifts.end_time).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label">{label}</p>
              <p className="text-sm text-on-surface mt-0.5">{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {inc.description && (
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label mb-2">Description</p>
            <p className="text-sm text-on-surface leading-relaxed bg-surface-container-low rounded-xl p-4">{inc.description}</p>
          </div>
        )}

        <IncidentStatusUpdate incidentId={inc.id} currentStatus={inc.status} />
      </div>
    </div>
  )
}
