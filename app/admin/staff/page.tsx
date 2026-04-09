import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import StaffTable from './StaffTable'

export default async function StaffPage() {
  const supabase = await createClient()
  const { data: staff } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'staff')
    .order('full_name', { ascending: true })

  return (
    <div className="max-w-6xl">
      <header className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">Staff</h2>
          <p className="text-on-surface-variant text-sm mt-1">{staff?.length ?? 0} registered staff members</p>
        </div>
        <Link
          href="/admin/staff/new"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl primary-gradient text-white font-headline text-sm font-bold hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">person_add</span>
          Add Staff
        </Link>
      </header>
      <StaffTable staff={staff ?? []} />
    </div>
  )
}
