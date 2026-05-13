'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClientForm = {
  full_name: string
  client_type: 'ndis' | 'standard'
  date_of_birth: string
  address: string
  ndis_number: string
  phone: string
  email: string
  emergency_contact: string
  notes: string
}

const INITIAL_FORM: ClientForm = {
  full_name: '',
  client_type: 'ndis',
  date_of_birth: '',
  address: '',
  ndis_number: '',
  phone: '',
  email: '',
  emergency_contact: '',
  notes: '',
}

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [form, setForm] = useState<ClientForm>(INITIAL_FORM)

  function setField(field: keyof ClientForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  /**
   * Ask the server to geocode an address via /api/admin/geocode (Nominatim).
   * Returns null on any failure so the caller can still save the client
   * with empty coords.
   */
  async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const res = await fetch('/api/admin/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      })
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        console.warn('[new client] geocode failed:', payload)
        return null
      }
      const data = await res.json()
      return { lat: data.lat, lng: data.lng }
    } catch (err) {
      console.warn('[new client] geocode error:', err)
      return null
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setInfo('')

    // 1. Geocode the address up-front (if provided). If it fails the client
    //    still saves; admin can re-try from the detail page later.
    let coords: { lat: number; lng: number } | null = null
    if (form.address.trim()) {
      setInfo('Looking up location…')
      coords = await geocode(form.address.trim())
    }

    setInfo(coords
      ? 'Saving client…'
      : (form.address.trim()
        ? 'Saving client (address could not be geocoded — you can retry later from the client page)…'
        : 'Saving client…'))

    const { error: insertError } = await supabase.from('clients').insert({
      full_name: form.full_name,
      client_type: form.client_type,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      ndis_number: form.client_type === 'ndis' ? (form.ndis_number || null) : null,
      phone: form.phone || null,
      email: form.email || null,
      emergency_contact: form.emergency_contact || null,
      notes: form.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setInfo('')
      setSaving(false)
      return
    }

    router.push('/admin/clients')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full bg-[#f7f8f9] px-4 py-2 text-xs font-medium text-[#64748b]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to clients
          </button>
          <div>
            <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
              <span className="font-headline">Create client record</span>
            </h1>
            <p className="text-sm text-[#64748b]">Set up support recipient details, location data, and NDIS context for rostering and compliance</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Client type selector */}
            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Client type *</label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {(['ndis', 'standard'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setField('client_type', type)}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                      form.client_type === type
                        ? 'border-[#6B2C91] bg-[#F4ECF8] text-[#0f172a]'
                        : 'border-[#e6e8ec] bg-[#fafbfc] text-[#64748b] hover:bg-[#f7f8f9]'
                    }`}
                  >
                    <span className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      form.client_type === type ? 'border-[#6B2C91] bg-[#6B2C91]' : 'border-[#cbd5e1]'
                    }`}>
                      {form.client_type === type && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{type === 'ndis' ? 'NDIS Client' : 'Client'}</p>
                      <p className="text-[11px] leading-4 opacity-70">
                        {type === 'ndis' ? 'NDIS participant — requires service agreement and signature' : 'Standard client — no signature collection required'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={form.full_name} onChange={value => setField('full_name', value)} placeholder="Mary Smith" required />
              {form.client_type === 'ndis' && (
                <Field label="NDIS number" value={form.ndis_number} onChange={value => setField('ndis_number', value)} placeholder="430123456" />
              )}
              <Field label="Date of birth" value={form.date_of_birth} onChange={value => setField('date_of_birth', value)} type="date" placeholder="" />
              <Field label="Phone" value={form.phone} onChange={value => setField('phone', value)} placeholder="0412 345 678" />
              <Field label="Email" value={form.email} onChange={value => setField('email', value)} type="email" placeholder="mary@email.com" />
            </div>

            <Field label="Address" value={form.address} onChange={value => setField('address', value)} placeholder="Full street address" />
            <Field label="Emergency contact" value={form.emergency_contact} onChange={value => setField('emergency_contact', value)} placeholder="Name and phone number" />

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">Notes</label>
              <textarea
                value={form.notes}
                onChange={event => setField('notes', event.target.value)}
                rows={4}
                placeholder="Any care notes, service considerations, or setup detail..."
                className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
              />
            </div>

            {error ? (
              <div className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
                {error}
              </div>
            ) : null}

            {info && !error ? (
              <div className="flex items-center gap-2 rounded-2xl bg-[#F4ECF8] px-4 py-3 text-sm text-[#54206F]">
                <span className="material-symbols-outlined animate-spin text-[16px]">progress_activity</span>
                {info}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[#efeae2] pt-4 md:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-2xl bg-[#f7f8f9] px-4 py-3 text-sm font-semibold text-[#64748b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving client...' : 'Create client'}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <InfoRail
            title="Client types"
            items={[
              'NDIS Client — a funded NDIS participant. A service agreement and participant signature are required before support begins.',
              'Client — a standard (non-NDIS) client. No signature collection is needed; agreements and signing flows are disabled for this type.',
            ]}
          />

          <InfoRail
            title="Recommended setup order"
            items={[
              'Select client type (NDIS or standard)',
              'Create the client record',
              'For NDIS clients: generate a service agreement in the Agreements hub',
              'Configure shifts in the roster planner',
            ]}
          />
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type,
  required,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#64748b]">
        {label}{required ? ' *' : ''}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-3 text-sm text-[#0f172a] outline-none"
      />
    </div>
  )
}

function InfoRail({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0f1f3] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#0f172a]">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#64748b]">
        {items.map(item => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  )
}
