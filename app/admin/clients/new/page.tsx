'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ClientForm = {
  full_name: string
  age: string
  date_of_birth: string
  address: string
  lat: string
  lng: string
  ndis_number: string
  phone: string
  email: string
  emergency_contact: string
  notes: string
}

const INITIAL_FORM: ClientForm = {
  full_name: '',
  age: '',
  date_of_birth: '',
  address: '',
  lat: '',
  lng: '',
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
  const [form, setForm] = useState<ClientForm>(INITIAL_FORM)

  function setField(field: keyof ClientForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const { error: insertError } = await supabase.from('clients').insert({
      full_name: form.full_name,
      age: form.age ? parseInt(form.age, 10) : null,
      date_of_birth: form.date_of_birth || null,
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      ndis_number: form.ndis_number || null,
      phone: form.phone || null,
      email: form.email || null,
      emergency_contact: form.emergency_contact || null,
      notes: form.notes || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push('/admin/clients')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-4 py-2 text-xs font-medium text-[#5f5c55]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to clients
          </button>
          <div>
            <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
              <span className="font-headline">Create client record</span>
            </h1>
            <p className="text-sm text-[#6c6b66]">Set up support recipient details, location data, and NDIS context for rostering and compliance</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" value={form.full_name} onChange={value => setField('full_name', value)} placeholder="Mary Smith" required />
              <Field label="NDIS number" value={form.ndis_number} onChange={value => setField('ndis_number', value)} placeholder="430123456" />
              <Field label="Date of birth" value={form.date_of_birth} onChange={value => setField('date_of_birth', value)} type="date" placeholder="" />
              <Field label="Age" value={form.age} onChange={value => setField('age', value)} type="number" placeholder="72" />
              <Field label="Phone" value={form.phone} onChange={value => setField('phone', value)} placeholder="0412 345 678" />
              <Field label="Email" value={form.email} onChange={value => setField('email', value)} type="email" placeholder="mary@email.com" />
              <Field label="Latitude" value={form.lat} onChange={value => setField('lat', value)} type="number" placeholder="-31.95" />
              <Field label="Longitude" value={form.lng} onChange={value => setField('lng', value)} type="number" placeholder="115.86" />
            </div>

            <Field label="Address" value={form.address} onChange={value => setField('address', value)} placeholder="Full street address" />
            <Field label="Emergency contact" value={form.emergency_contact} onChange={value => setField('emergency_contact', value)} placeholder="Name and phone number" />

            <div>
              <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Notes</label>
              <textarea
                value={form.notes}
                onChange={event => setField('notes', event.target.value)}
                rows={4}
                placeholder="Any care notes, service considerations, or setup detail..."
                className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
              />
            </div>

            {error ? (
              <div className="rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm text-[#991b1b]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[#efeae2] pt-4 md:flex-row">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-2xl bg-[#f4f2ed] px-4 py-3 text-sm font-semibold text-[#4f4c45]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving client...' : 'Create client'}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <InfoRail
            title="Why coordinates matter"
            items={[
              'Latitude and longitude enable geofenced clock-in and clock-out for support workers.',
              'If you do not have coordinates yet, the client can still be created and updated later.',
            ]}
          />

          <InfoRail
            title="Recommended setup order"
            items={[
              'Create the client record',
              'Upload agreements or support documents',
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
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">
        {label}{required ? ' *' : ''}
      </label>
      <input
        type={type ?? 'text'}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      />
    </div>
  )
}

function InfoRail({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0ece5] px-4 py-3">
        <h3 className="text-sm font-semibold text-[#1a1a18]">{title}</h3>
      </div>
      <div className="space-y-3 px-4 py-4 text-[12px] leading-6 text-[#66635b]">
        {items.map(item => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </section>
  )
}
