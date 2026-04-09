'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'

export default function IncidentReportClient({ shifts, staffId, adminIds, myIncidents }: {
  shifts: any[]; staffId: string; adminIds: string[]; myIncidents: any[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium', shift_id: '', client_id: '' })
  const router = useRouter()
  const supabase = createClient()

  function set(f: string, v: string) { setForm(p => ({ ...p, [f]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase.from('incidents').insert({
      staff_id: staffId,
      shift_id: form.shift_id || null,
      client_id: form.client_id || null,
      title: form.title,
      description: form.description,
      severity: form.severity,
    })

    if (error) { alert(error.message); setSaving(false); return }

    // Notify admins
    await Promise.all(adminIds.map(adminId =>
      supabase.from('notifications').insert({
        user_id: adminId, type: 'incident',
        title: `Incident Reported: ${form.severity.toUpperCase()}`,
        message: form.title,
        related_id: staffId,
      })
    ))

    setSaving(false); setShowForm(false)
    setForm({ title: '', description: '', severity: 'medium', shift_id: '', client_id: '' })
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl bg-error-container text-error font-bold font-headline text-base flex items-center justify-center gap-3 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-2xl">report_problem</span>
          Report an Incident
        </button>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold font-headline text-on-surface mb-4">New Incident Report</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Title *</label>
              <input required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Brief description of incident"
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Severity *</label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'emergency'].map(s => (
                  <button type="button" key={s} onClick={() => set('severity', s)}
                    className={`py-2 rounded-lg text-xs font-bold capitalize transition-all ${form.severity === s ? (s === 'emergency' ? 'bg-error text-white' : 'primary-gradient text-white') : 'bg-surface-container text-on-surface'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            {shifts.length > 0 && (
              <div>
                <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Related Shift</label>
                <select value={form.shift_id} onChange={e => {
                  const shift = shifts.find(s => s.id === e.target.value)
                  setForm(p => ({ ...p, shift_id: e.target.value, client_id: shift?.clients?.id ?? '' }))
                }} className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none">
                  <option value="">Select shift…</option>
                  {shifts.map((s: any) => <option key={s.id} value={s.id}>{s.clients?.full_name ?? 'Shift'}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4}
                placeholder="Provide detailed information about the incident…"
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm focus:outline-none resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 rounded-xl bg-error text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving ? <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Submitting…</> : 'Submit Report'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Past incidents */}
      {myIncidents.length > 0 && (
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-on-surface-variant font-label mb-3">My Reports</p>
          <div className="space-y-3">
            {myIncidents.map(inc => (
              <div key={inc.id} className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm font-headline text-on-surface">{inc.title}</p>
                  <p className="text-xs text-on-surface-variant">
                    {inc.clients?.full_name ?? '—'} • {new Date(inc.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={inc.severity} />
                  <Badge variant={inc.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
