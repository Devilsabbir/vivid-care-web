'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'

export default function IncidentReportClient({ shifts, staffId, adminIds, myIncidents }: {
  shifts: any[]
  staffId: string
  adminIds: string[]
  myIncidents: any[]
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supabase] = useState(() => createClient())
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    shift_id: '',
    client_id: '',
  })
  const router = useRouter()

  function set(field: string, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

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

    if (error) {
      alert(error.message)
      setSaving(false)
      return
    }

    await Promise.all(adminIds.map(adminId =>
      supabase.from('notifications').insert({
        user_id: adminId,
        type: 'incident',
        title: `Incident Reported: ${form.severity.toUpperCase()}`,
        message: form.title,
        related_id: staffId,
      }),
    ))

    setSaving(false)
    setShowForm(false)
    setForm({ title: '', description: '', severity: 'medium', shift_id: '', client_id: '' })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <section className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#171717] text-[#c852ff]">
            <span className="material-symbols-outlined text-[20px]">shield</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#171716]">Safety first</p>
            <p className="mt-1 text-sm leading-6 text-[#666258]">
              Use emergency procedures first for immediate danger. This report is for documentation and coordinator follow-up.
            </p>
          </div>
        </div>
      </section>

      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-3 rounded-[24px] bg-[#171717] px-4 py-4 font-headline text-base font-semibold text-white shadow-[0_16px_28px_rgba(23,23,22,0.14)]"
        >
          <span className="material-symbols-outlined text-[22px]">report_problem</span>
          Report an incident
        </button>
      ) : (
        <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
          <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">New report</p>
            <h2 className="mt-2 font-headline text-xl font-semibold text-[#171716]">Capture the details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8b867b]">Title *</label>
              <input
                required
                value={form.title}
                onChange={e => set('title', e.target.value)}
                placeholder="Brief summary of what happened"
                className="w-full rounded-xl border border-[#e7e1d7] bg-[#fbfaf7] px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8b867b]">Severity *</label>
              <div className="grid grid-cols-4 gap-2">
                {['low', 'medium', 'high', 'emergency'].map(value => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => set('severity', value)}
                    className={`rounded-xl py-2.5 text-xs font-semibold capitalize transition ${
                      form.severity === value
                        ? value === 'emergency'
                          ? 'bg-[#a33131] text-white'
                          : 'bg-[#171717] text-white'
                        : 'bg-[#f4f1ea] text-[#171716]'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>

            {shifts.length > 0 ? (
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8b867b]">Related shift</label>
                <select
                  value={form.shift_id}
                  onChange={e => {
                    const shift = shifts.find(value => value.id === e.target.value)
                    setForm(current => ({
                      ...current,
                      shift_id: e.target.value,
                      client_id: shift?.clients?.id ?? '',
                    }))
                  }}
                  className="w-full rounded-xl border border-[#e7e1d7] bg-[#fbfaf7] px-4 py-3 text-sm focus:outline-none"
                >
                  <option value="">Select shift...</option>
                  {shifts.map((shift: any) => <option key={shift.id} value={shift.id}>{shift.clients?.full_name ?? 'Shift'}</option>)}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-[#8b867b]">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={5}
                placeholder="Explain what happened, who was involved, and any immediate action taken."
                className="w-full resize-none rounded-xl border border-[#e7e1d7] bg-[#fbfaf7] px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl bg-[#f4f1ea] py-3 text-sm font-semibold text-[#171716]">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#171717] py-3 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    Submitting...
                  </>
                ) : 'Submit report'}
              </button>
            </div>
          </form>
        </section>
      )}

      {myIncidents.length > 0 ? (
        <section className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#8b867b]">My reports</p>
            <h2 className="mt-1 text-lg font-semibold text-[#171716]">Recent incident history</h2>
          </div>

          <div className="space-y-3">
            {myIncidents.map(incident => (
              <article key={incident.id} className="rounded-[24px] border border-[#e6e0d7] bg-white p-4 shadow-[0_12px_26px_rgba(23,23,22,0.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#171716]">{incident.title}</p>
                    <p className="mt-1 text-xs text-[#8b867b]">
                      {incident.clients?.full_name ?? 'Unlinked client'} - {new Date(incident.reported_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={incident.severity} />
                    <Badge variant={incident.status} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-dashed border-[#d7d1c6] bg-white px-6 py-12 text-center">
          <span className="material-symbols-outlined text-[40px] text-[#b5afa5]">assignment</span>
          <p className="mt-3 text-sm font-semibold text-[#171716]">No incidents reported yet</p>
          <p className="mt-1 text-xs text-[#8b867b]">If something happens during a shift, create a report here so admins are alerted immediately.</p>
        </section>
      )}
    </div>
  )
}
