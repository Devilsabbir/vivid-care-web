import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/staff" className="p-2 rounded-lg hover:bg-surface-container transition-colors text-outline">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">{member.full_name}</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">Staff Profile</p>
        </div>
      </div>
      <StaffDetailClient member={member} documents={docs ?? []} shifts={shifts ?? []} />
    </div>
  )
}
