import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ActiveShiftsClient from './ActiveShiftsClient'

export default async function ActiveShiftsPage() {
  const supabase = await createClient()

  const { data: shifts } = await supabase
    .from('shifts')
    .select('*, profiles(full_name, phone), clients(full_name, address, lat, lng)')
    .in('status', ['active', 'scheduled'])
    .gte('start_time', new Date(Date.now() - 86400000).toISOString())
    .order('start_time', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Live shifts</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#cdff52] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]">
              <span className="material-symbols-outlined text-[18px]">location_on</span>
              monitoring board
            </span>
          </div>
          <p className="text-sm text-[#6c6b66]">Realtime attendance visibility for the active roster and the next shifts about to start</p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/roster" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </Link>
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white">
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            Back to dashboard
          </Link>
        </div>
      </header>

      <ActiveShiftsClient initialShifts={shifts ?? []} />
    </div>
  )
}
