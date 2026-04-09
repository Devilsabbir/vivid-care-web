import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
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
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/clients" className="p-2 rounded-lg hover:bg-surface-container transition-colors text-outline">
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">{client.full_name}</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">Client Profile</p>
        </div>
      </div>

      <ClientDetailClient client={client} documents={docs ?? []} shifts={shifts ?? []} />
    </div>
  )
}
