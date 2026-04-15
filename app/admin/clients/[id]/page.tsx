import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientDetailClient from './ClientDetailClient'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()

  const [{ data: client }, { data: docs }, { data: shifts }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('documents').select('*').eq('owner_id', params.id).eq('owner_type', 'client').order('created_at', { ascending: false }),
    supabase.from('shifts').select('*, profiles(full_name)').eq('client_id', params.id).order('start_time', { ascending: false }).limit(10),
  ])

  if (!client) notFound()

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <Link href="/admin/clients" className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to clients
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#c852ff] text-xl font-semibold uppercase tracking-[0.14em] text-[#1a1a18]">
              {(client.full_name ?? 'C')
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((part: string) => part[0]?.toUpperCase())
                .join('')}
            </div>
            <div>
              <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
                <span className="font-headline">{client.full_name ?? 'Client profile'}</span>
              </h1>
              <p className="text-sm text-[#6c6b66]">Support plan detail, linked documents, and recent care activity for this client record</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/roster" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]">
            <span className="material-symbols-outlined text-[20px]">calendar_month</span>
          </Link>
          <Link href="/admin/compliance" className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white">
            <span className="material-symbols-outlined text-[18px]">description</span>
            Document hub
          </Link>
        </div>
      </header>

      <ClientDetailClient client={client} documents={docs ?? []} shifts={shifts ?? []} />
    </div>
  )
}
