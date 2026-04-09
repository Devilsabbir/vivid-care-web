'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewStaffPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, password: form.password, full_name: form.full_name, phone: form.phone }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error); setSaving(false); return }

    router.push('/admin/staff')
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-container transition-colors text-outline">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">New Staff Member</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">Create login credentials for a staff member</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {[
            { label: 'Full Name', field: 'full_name', required: true, placeholder: 'e.g. Jane Doe' },
            { label: 'Email Address', field: 'email', type: 'email', required: true, placeholder: 'jane@vividcare.com' },
            { label: 'Temporary Password', field: 'password', type: 'password', required: true, placeholder: 'Min. 6 characters' },
            { label: 'Phone', field: 'phone', type: 'tel', placeholder: '0412 345 678' },
          ].map(({ label, field, type, required, placeholder }) => (
            <div key={field}>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                {label}{required && <span className="text-error ml-1">*</span>}
              </label>
              <input
                type={type ?? 'text'}
                value={(form as any)[field]}
                onChange={e => set(field, e.target.value)}
                required={required}
                placeholder={placeholder}
                className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-b-2 focus:border-primary transition-all"
              />
            </div>
          ))}

          <div className="text-xs text-on-surface-variant bg-primary-fixed/40 rounded-lg p-3">
            <span className="material-symbols-outlined text-base align-middle mr-1 text-primary">info</span>
            Staff will use these credentials to log in. They can change their password after first login.
          </div>

          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-base">error</span>
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="flex-1 py-3 rounded-xl bg-surface-container text-on-surface font-semibold text-sm hover:bg-surface-container-high transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 rounded-xl primary-gradient text-white font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? (
                <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Creating…</>
              ) : (
                <><span className="material-symbols-outlined text-base">person_add</span>Create Staff</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
