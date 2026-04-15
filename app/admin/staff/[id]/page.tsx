import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffDetailClient from './StaffDetailClient'

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: member }, { data: docs }, { data: shifts }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', params.id).single(),
    supabase.from('documents').select('*').eq('owner_id', params.id).eq('owner_type', 'staff').order('created_at', { ascending: false }),
    supabase.from('shifts').select('*, clients(full_name)').eq('staff_id', params.id).order('start_time', { ascending: false }).limit(10),
  ])

  if (!member) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Link href="/admin/staff" className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to staff
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#1a1a18] text-xl font-semibold uppercase tracking-[0.14em] text-[#c852ff]">
              {(member.full_name ?? 'S')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part: string) => part[0]?.toUpperCase())
                .join('')}
            </div>
            <div>
              <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
                <span className="font-headline">{member.full_name ?? 'Staff profile'}</span>
              </h1>
              <p className="text-sm text-[#6c6b66]">Compliance records, recent shifts, and workforce detail for this support worker</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/roster" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </Link>
          <Link href="/admin/compliance" className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Compliance hub
          </Link>
        </div>
      </header>

      <StaffDetailClient member={member} documents={docs ?? []} shifts={shifts ?? []} />
    </div>
  )
}
