'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUSES = ['open', 'investigating', 'resolved'] as const

export default function IncidentStatusUpdate({
  incidentId,
  currentStatus,
}: {
  incidentId: string
  currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [supabase] = useState(() => createClient())
  const router = useRouter()

  async function update(nextStatus: string) {
    setSaving(true)
    setErrorMsg(null)
    const { error } = await supabase.from('incidents').update({ status: nextStatus }).eq('id', incidentId)
    if (error) {
      console.error('[IncidentStatusUpdate] status update failed:', error)
      setErrorMsg('Failed to update status. Please try again.')
      setSaving(false)
      return
    }
    setStatus(nextStatus)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Workflow status</p>
      <div className="space-y-2">
        {STATUSES.map(option => {
          const active = status === option
          return (
            <button
              key={option}
              type="button"
              disabled={saving || active}
              onClick={() => update(option)}
              className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition-colors disabled:opacity-60 ${
                active ? 'bg-[#1a1a18] text-white' : 'bg-[#f4f2ed] text-[#4f4c45] hover:bg-[#ebe7df]'
              }`}
            >
              <span className="capitalize">{option === 'investigating' ? 'Under review' : option}</span>
              <span className="material-symbols-outlined text-[18px]">
                {active ? 'check_circle' : 'chevron_right'}
              </span>
            </button>
          )
        })}
      </div>
      {errorMsg && (
        <p className="text-xs font-medium text-red-600">{errorMsg}</p>
      )}
    </div>
  )
}
