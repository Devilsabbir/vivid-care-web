import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import StaffShiftDetailClient from './StaffShiftDetailClient'

export default async function StaffShiftDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: shift, error: shiftError } = await supabase
    .from('shifts')
    .select('*, clients(full_name, address, lat, lng)')
    .eq('id', params.id)
    .single()
  if (shiftError) console.error('[staff shift detail page] shifts fetch failed:', shiftError)

  if (!shift) notFound()

  // Security: ensure this shift belongs to the logged-in staff member
  if (shift.staff_id !== user.id) notFound()

  const clientRecord = Array.isArray(shift.clients) ? shift.clients[0] : shift.clients

  const { data: clockEvents, error: clockEventsError } = await supabase
    .from('clock_events')
    .select('*')
    .eq('shift_id', params.id)
    .order('created_at', { ascending: true })
  if (clockEventsError) console.error('[staff shift detail page] clock_events fetch failed:', clockEventsError)

  return (
    <StaffShiftDetailClient
      shift={shift}
      client={clientRecord}
      clockEvents={clockEvents ?? []}
    />
  )
}
