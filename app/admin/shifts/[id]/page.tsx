import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ShiftDetailClient from './ShiftDetailClient'

export default async function ShiftDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [
    { data: shift, error: shiftError },
    { data: clockEvents, error: clockEventsError },
    { data: incidents, error: incidentsError },
  ] = await Promise.all([
    supabase
      .from('shifts')
      .select('*, staff:profiles!staff_id(id, full_name, phone, email), clients(id, full_name, address, lat, lng)')
      .eq('id', params.id)
      .single(),
    supabase
      .from('clock_events')
      .select('*')
      .eq('shift_id', params.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('incidents')
      .select('id, title, severity, status')
      .eq('shift_id', params.id),
  ])
  if (shiftError) console.error('[shift detail page] shifts fetch failed:', shiftError)
  if (clockEventsError) console.error('[shift detail page] clock_events fetch failed:', clockEventsError)
  if (incidentsError) console.error('[shift detail page] incidents fetch failed:', incidentsError)

  if (!shift) notFound()

  const staffProfile = Array.isArray(shift.staff) ? shift.staff[0] : shift.staff
  const clientRecord = Array.isArray(shift.clients) ? shift.clients[0] : shift.clients

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Link
            href="/admin/shifts"
            className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_back</span>
            Back to shifts
          </Link>
          <div className="space-y-2">
            <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
              <span className="font-headline">Shift detail</span>
            </h1>
            <p className="text-sm text-[#6c6b66]">
              {clientRecord?.full_name ?? 'Client'} · {new Date(shift.start_time).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </header>

      <ShiftDetailClient
        shift={shift}
        staff={staffProfile}
        client={clientRecord}
        clockEvents={clockEvents ?? []}
        incidents={incidents ?? []}
      />
    </div>
  )
}
