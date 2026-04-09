'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const STATUSES = ['open', 'investigating', 'resolved'] as const

export default function IncidentStatusUpdate({ incidentId, currentStatus }: {
  incidentId: string; currentStatus: string
}) {
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function update(newStatus: string) {
    setSaving(true)
    await supabase.from('incidents').update({ status: newStatus }).eq('id', incidentId)
    setStatus(newStatus)
    setSaving(false)
    router.refresh()
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant font-label mb-3">Update Status</p>
      <div className="flex gap-2">
        {STATUSES.map(s => (
          <button
            key={s}
            disabled={saving || status === s}
            onClick={() => update(s)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold font-headline capitalize transition-all disabled:opacity-50 ${
              status === s
                ? 'primary-gradient text-white'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
