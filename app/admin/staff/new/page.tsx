'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type StaffForm = {
  full_name: string
  email: string
  password: string
  phone: string
}

const INITIAL_FORM: StaffForm = {
  full_name: '',
  email: '',
  password: '',
  phone: '',
}

export default function NewStaffPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<StaffForm>(INITIAL_FORM)

  function setField(field: keyof StaffForm, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError('')

    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        password: form.password,
        full_name: form.full_name,
        phone: form.phone,
      }),
    })

    const payload = await response.json()
    if (!response.ok) {
      setError(payload.error ?? 'Unable to create the staff account.')
      setSaving(false)
      return
    }

    router.push('/admin/staff')
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-full bg-[#f7f8f9] px-4 py-2 text-xs font-medium text-[#64748b]">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to staff
          </button>
          <div>
            <h1 className="text-[2rem] font-medium tracking-[-0.05em] text-[#0f172a] md:text-[2.35rem]">
              <span className="font-headline">Create staff account</span>
            </h1>
            <p className="text-sm text-[#64748b]">Create a support worker profile and generate their initial login credentials</p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section className="rounded-[28px] border border-[#e6e8ec] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Full name"
                value={form.full_name}
                onChange={value => setField('full_name', value)}
                placeholder="Jane Doe"
                required
              />
              <Field
                label="Phone"
                value={form.phone}
                onChange={value => setField('phone', value)}
                placeholder="0412 345 678"
              />
              <Field
                label="Email address"
                value={form.email}
                onChange={value => setField('email', value)}
                placeholder="jane@vividcare.com"
                type="email"
                required
              />
              <Field
                label="Temporary password"
                value={form.password}
                onChange={value => setField('password', value)}
                placeholder="Minimum 6 characters"
                type="password"
                required
              />
            </div>

            <div className="rounded-[18px] bg-[#fafbfc] p-4 text-[12px] leading-6 text-[#64748b]">
              Staff created from this flow will be able to sign in immediately and can change their password after their first login.
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
                className="flex-1 rounded-2xl bg-[#f7f8f9] px-4 py-3 text-sm font-semibold text-[#64748b]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Creating account...' : 'Create staff account'}
              </button>
            </div>
          </form>
        </section>

        <aside className="space-y-4">
          <InfoRail
            title="What happens next"
            items={[
              'The auth account is created through the admin API route.',
              'The worker appears in the staff directory after creation.',
              'You can upload compliance documents from the profile page immediately after.',
            ]}
          />

          <InfoRail
            title="Setup checklist"
            items={[
              'Create login credentials',
              'Upload screening and certifications',
              'Confirm they are roster-ready before assigning shifts',
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
