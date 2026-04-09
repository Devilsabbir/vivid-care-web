'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewClientPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    full_name: '', age: '', date_of_birth: '', address: '', lat: '', lng: '',
    ndis_number: '', phone: '', email: '', emergency_contact: '', notes: ''
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('clients').insert({
      full_name: form.full_name,
      age: form.age ? parseInt(form.age) : null,
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

    if (err) { setError(err.message); setSaving(false); return }
    router.push('/admin/clients')
  }

  const fields = [
    { label: 'Full Name', field: 'full_name', required: true, placeholder: 'e.g. Mary Smith' },
    { label: 'Date of Birth', field: 'date_of_birth', type: 'date' },
    { label: 'Age', field: 'age', type: 'number', placeholder: 'e.g. 72' },
    { label: 'NDIS Number', field: 'ndis_number', placeholder: 'e.g. 430123456' },
    { label: 'Address', field: 'address', placeholder: 'Full street address' },
    { label: 'Latitude', field: 'lat', type: 'number', placeholder: 'e.g. -33.8688 (for GPS)' },
    { label: 'Longitude', field: 'lng', type: 'number', placeholder: 'e.g. 151.2093 (for GPS)' },
    { label: 'Phone', field: 'phone', type: 'tel', placeholder: 'e.g. 0412 345 678' },
    { label: 'Email', field: 'email', type: 'email', placeholder: 'e.g. mary@email.com' },
    { label: 'Emergency Contact', field: 'emergency_contact', placeholder: 'Name + phone number' },
  ]

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-surface-container transition-colors text-outline">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h2 className="text-3xl font-extrabold font-headline text-on-surface tracking-tight">New Client</h2>
          <p className="text-on-surface-variant text-sm mt-0.5">Add a new client record</p>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {fields.map(({ label, field, type, required, placeholder }) => (
              <div key={field} className={field === 'address' || field === 'emergency_contact' ? 'md:col-span-2' : ''}>
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
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              placeholder="Any relevant care notes..."
              className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-sm text-on-surface placeholder:text-outline focus:outline-none resize-none"
            />
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
                <><span className="material-symbols-outlined text-base animate-spin">progress_activity</span>Saving…</>
              ) : (
                <><span className="material-symbols-outlined text-base">save</span>Save Client</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
