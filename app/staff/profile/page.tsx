import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffProfileClient from './StaffProfileClient'

export default async function StaffProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <StaffProfileClient
      fullName={profile?.full_name ?? 'Staff'}
      email={user.email ?? ''}
    />
  )
}
