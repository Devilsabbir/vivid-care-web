import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ClientsTable from './ClientsTable'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-6xl">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Clients</h2>
          <p className="text-on-surface-variant text-sm mt-1">{clients?.length ?? 0} registered clients</p>
        </div>
        <Link
          href="/admin/clients/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl primary-gradient text-white font-headline text-sm font-bold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add Client
        </Link>
      </header>

      <ClientsTable clients={clients ?? []} />
    </div>
  )
}
