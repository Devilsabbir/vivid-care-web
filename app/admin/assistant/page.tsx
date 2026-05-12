import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AssistantClient from './AssistantClient'

export default async function AdminAssistantPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/login')

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
          <span className="font-headline">Assistant</span>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#0d9488] px-4 py-1 text-sm font-semibold tracking-normal text-[#0f172a]">
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            AI helper
          </span>
        </div>
        <p className="text-sm text-[#64748b]">
          Ask the operations assistant for help with workflows, NDIS terminology, drafting communications, or platform questions.
        </p>
      </header>

      <AssistantClient adminName={profile?.full_name ?? 'Admin'} />
    </div>
  )
}
