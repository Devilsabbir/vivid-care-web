'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type SettingsRow = {
  id: number
  org_name: string
  business_email: string | null
  business_phone: string | null
  address: string | null
  timezone: string
  geofence_radius_meters: number
  clock_in_window_minutes: number
  doc_warning_days: number[]
  pay_period: string
  compliance_email: string | null
  ndis_provider_number: string | null
  abn: string | null
  contact_name: string | null
  website: string | null
}

type DocumentTypeRow = {
  id: string
  name: string
  owner_type: 'staff' | 'client'
  category: string
  requires_expiry: boolean
  warning_days: number[]
  active: boolean
}

type SupportTypeRow = {
  key: string
  title: string
  item_number: string | null
  description: string | null
  active: boolean
}

type RequirementRow = {
  id: string
  support_type_key: string
  form_key: string
  label: string
  required: boolean
}

const EMPTY_DOC_CONFIG = {
  name: '',
  owner_type: 'staff',
  category: 'compliance',
  requires_expiry: true,
}

const EMPTY_SUPPORT_TYPE = {
  key: '',
  title: '',
  item_number: '',
  description: '',
}

const EMPTY_REQUIREMENT = {
  support_type_key: 'general_support',
  form_key: 'support_log',
  label: '',
  required: true,
}

export default function SettingsClient({
  schemaReady,
  initialSettings,
  documentTypes,
  supportTypes,
  requirements,
}: {
  schemaReady: boolean
  initialSettings: SettingsRow
  documentTypes: DocumentTypeRow[]
  supportTypes: SupportTypeRow[]
  requirements: RequirementRow[]
}) {
  const [settingsForm, setSettingsForm] = useState({
    ...initialSettings,
    doc_warning_days: (initialSettings.doc_warning_days ?? [45, 30, 14, 7]).join(', '),
  })
  const [docConfig, setDocConfig] = useState(EMPTY_DOC_CONFIG)
  const [supportTypeForm, setSupportTypeForm] = useState(EMPTY_SUPPORT_TYPE)
  const [requirementForm, setRequirementForm] = useState(EMPTY_REQUIREMENT)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  async function handleSaveSettings() {
    setSaving('settings')
    setMessage(null)

    const warningDays = settingsForm.doc_warning_days
      .split(',')
      .map(value => Number(value.trim()))
      .filter(value => Number.isFinite(value))

    const { error } = await supabase.from('organization_settings').upsert({
      id: 1,
      org_name: settingsForm.org_name,
      business_email: settingsForm.business_email || null,
      business_phone: settingsForm.business_phone || null,
      address: settingsForm.address || null,
      timezone: settingsForm.timezone,
      geofence_radius_meters: Number(settingsForm.geofence_radius_meters) || 300,
      clock_in_window_minutes: Number(settingsForm.clock_in_window_minutes) || 15,
      doc_warning_days: warningDays.length ? warningDays : [45, 30, 14, 7],
      pay_period: settingsForm.pay_period,
      compliance_email: settingsForm.compliance_email || null,
      ndis_provider_number: settingsForm.ndis_provider_number || null,
      abn: settingsForm.abn || null,
      contact_name: settingsForm.contact_name || null,
      website: settingsForm.website || null,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Settings saved.')
    router.refresh()
  }

  async function handleAddDocumentType() {
    if (!docConfig.name.trim()) return
    setSaving('document-type')
    setMessage(null)

    const { error } = await supabase.from('document_type_configs').insert({
      name: docConfig.name.trim(),
      owner_type: docConfig.owner_type,
      category: docConfig.category.trim() || 'compliance',
      requires_expiry: docConfig.requires_expiry,
      warning_days: [45, 30, 14, 7],
      active: true,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setDocConfig(EMPTY_DOC_CONFIG)
    setMessage('Document type added.')
    router.refresh()
  }

  async function handleAddSupportType() {
    if (!supportTypeForm.key.trim() || !supportTypeForm.title.trim()) return
    setSaving('support-type')
    setMessage(null)

    const key = supportTypeForm.key.trim()

    const { error } = await supabase.from('ndis_support_types').insert({
      key,
      title: supportTypeForm.title.trim(),
      item_number: supportTypeForm.item_number.trim() || null,
      description: supportTypeForm.description.trim() || null,
      active: true,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setSupportTypeForm(EMPTY_SUPPORT_TYPE)
    setRequirementForm(current => ({ ...current, support_type_key: key }))
    setMessage('Support type added.')
    router.refresh()
  }

  async function handleAddRequirement() {
    if (!requirementForm.support_type_key || !requirementForm.form_key.trim() || !requirementForm.label.trim()) return
    setSaving('requirement')
    setMessage(null)

    const { error } = await supabase.from('ndis_doc_requirements').insert({
      support_type_key: requirementForm.support_type_key,
      form_key: requirementForm.form_key.trim(),
      label: requirementForm.label.trim(),
      required: requirementForm.required,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setRequirementForm(EMPTY_REQUIREMENT)
    setMessage('Requirement added.')
    router.refresh()
  }

  const requirementCounts = supportTypes.map(type => ({
    key: type.key,
    count: requirements.filter(requirement => requirement.support_type_key === type.key).length,
  }))

  return (
    <div className="space-y-6">
      {!schemaReady ? (
        <section className="rounded-[24px] border border-[#f3d7d7] bg-[#fff5f5] p-5 text-sm text-[#9b3434]">
          The new platform tables are not available yet. Apply the latest Supabase migrations, then refresh this page.
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[24px] border border-[#e4c1f5] bg-[#f9f0ff] p-4 text-sm text-[#4a006f]">
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Document types" value={documentTypes.length} sub="Configured upload rules" />
        <MetricCard label="Support types" value={supportTypes.length} sub="NDIS-funded support definitions" accent />
        <MetricCard label="Requirements" value={requirements.length} sub="Required post-shift forms" />
        <MetricCard label="Warning cadence" value={countWarningDays(settingsForm.doc_warning_days)} sub="Expiry warning checkpoints" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Organization</p>
                <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Platform defaults</h3>
              </div>
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={saving === 'settings'}
                className="rounded-2xl bg-[#1a1a18] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving === 'settings' ? 'Saving...' : 'Save settings'}
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Input label="Organization name" value={settingsForm.org_name} onChange={value => setSettingsForm(current => ({ ...current, org_name: value }))} />
              <Input label="Business email" value={settingsForm.business_email ?? ''} onChange={value => setSettingsForm(current => ({ ...current, business_email: value }))} />
              <Input label="Business phone" value={settingsForm.business_phone ?? ''} onChange={value => setSettingsForm(current => ({ ...current, business_phone: value }))} />
              <Input label="Compliance email" value={settingsForm.compliance_email ?? ''} onChange={value => setSettingsForm(current => ({ ...current, compliance_email: value }))} />
              <Input label="NDIS provider number" value={settingsForm.ndis_provider_number ?? ''} onChange={value => setSettingsForm(current => ({ ...current, ndis_provider_number: value }))} />
              <Input label="ABN" value={settingsForm.abn ?? ''} onChange={value => setSettingsForm(current => ({ ...current, abn: value }))} />
              <Input label="Contact name (authorised signatory)" value={settingsForm.contact_name ?? ''} onChange={value => setSettingsForm(current => ({ ...current, contact_name: value }))} />
              <Input label="Website" value={settingsForm.website ?? ''} onChange={value => setSettingsForm(current => ({ ...current, website: value }))} />
              <Input label="Timezone" value={settingsForm.timezone} onChange={value => setSettingsForm(current => ({ ...current, timezone: value }))} />
              <Input label="Geofence radius (m)" type="number" value={String(settingsForm.geofence_radius_meters)} onChange={value => setSettingsForm(current => ({ ...current, geofence_radius_meters: Number(value) }))} />
              <Input label="Clock-in window (min)" type="number" value={String(settingsForm.clock_in_window_minutes)} onChange={value => setSettingsForm(current => ({ ...current, clock_in_window_minutes: Number(value) }))} />
              <Input label="Pay period" value={settingsForm.pay_period} onChange={value => setSettingsForm(current => ({ ...current, pay_period: value }))} />
              <Input label="Warning days" value={settingsForm.doc_warning_days} onChange={value => setSettingsForm(current => ({ ...current, doc_warning_days: value }))} />
              <div className="md:col-span-2">
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Address</label>
                <textarea
                  value={settingsForm.address ?? ''}
                  onChange={event => setSettingsForm(current => ({ ...current, address: event.target.value }))}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Documents</p>
                <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Upload rules</h3>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <SmallInput label="Name" value={docConfig.name} onChange={value => setDocConfig(current => ({ ...current, name: value }))} />
                <SelectInput
                  label="Owner"
                  value={docConfig.owner_type}
                  onChange={value => setDocConfig(current => ({ ...current, owner_type: value as 'staff' | 'client' }))}
                  options={[
                    ['staff', 'Staff'],
                    ['client', 'Client'],
                  ]}
                />
                <SmallInput label="Category" value={docConfig.category} onChange={value => setDocConfig(current => ({ ...current, category: value }))} />
                <label className="flex items-end gap-2 text-sm text-[#4f4c45]">
                  <input
                    type="checkbox"
                    checked={docConfig.requires_expiry}
                    onChange={event => setDocConfig(current => ({ ...current, requires_expiry: event.target.checked }))}
                  />
                  Requires expiry
                </label>
                <button
                  type="button"
                  onClick={handleAddDocumentType}
                  disabled={saving === 'document-type'}
                  className="rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 md:col-span-4"
                >
                  {saving === 'document-type' ? 'Adding...' : 'Add document type'}
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {documentTypes.map(documentType => (
                <article key={documentType.id} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a18]">{documentType.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8a877f]">
                        {documentType.owner_type} / {documentType.category}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${documentType.requires_expiry ? 'bg-[#fef9c3] text-[#92400e]' : 'bg-[#e5e7eb] text-[#4b5563]'}`}>
                      {documentType.requires_expiry ? 'Expiry tracked' : 'No expiry'}
                    </span>
                  </div>
                  <p className="mt-3 text-[11px] text-[#7b786f]">Warning days: {documentType.warning_days?.join(', ') || '45, 30, 14, 7'}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Support types</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">NDIS configuration</h3>

            <div className="mt-5 grid gap-3">
              <SmallInput label="Key" value={supportTypeForm.key} onChange={value => setSupportTypeForm(current => ({ ...current, key: slugify(value) }))} />
              <SmallInput label="Title" value={supportTypeForm.title} onChange={value => setSupportTypeForm(current => ({ ...current, title: value }))} />
              <SmallInput label="Item number" value={supportTypeForm.item_number} onChange={value => setSupportTypeForm(current => ({ ...current, item_number: value }))} />
              <div>
                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Description</label>
                <textarea
                  rows={3}
                  value={supportTypeForm.description}
                  onChange={event => setSupportTypeForm(current => ({ ...current, description: event.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleAddSupportType}
                disabled={saving === 'support-type'}
                className="rounded-2xl bg-[#c852ff] px-4 py-3 text-sm font-semibold text-[#1a1a18] disabled:opacity-60"
              >
                {saving === 'support-type' ? 'Adding...' : 'Add support type'}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {supportTypes.map(type => {
                const requirementCount = requirementCounts.find(entry => entry.key === type.key)?.count ?? 0
                return (
                  <article key={type.key} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1a1a18]">{type.title}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8a877f]">{type.key}</p>
                      </div>
                      <span className="rounded-full bg-[#1a1a18] px-2.5 py-1 text-[10px] font-semibold text-white">
                        {requirementCount} forms
                      </span>
                    </div>
                    {type.item_number ? <p className="mt-3 text-[11px] text-[#7b786f]">NDIS item: {type.item_number}</p> : null}
                  </article>
                )
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Documentation rules</p>
            <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Required forms per support type</h3>

            <div className="mt-5 grid gap-3">
              <SelectInput
                label="Support type"
                value={requirementForm.support_type_key}
                onChange={value => setRequirementForm(current => ({ ...current, support_type_key: value }))}
                options={supportTypes.map(type => [type.key, type.title])}
              />
              <SmallInput label="Form key" value={requirementForm.form_key} onChange={value => setRequirementForm(current => ({ ...current, form_key: slugify(value) }))} />
              <SmallInput label="Label" value={requirementForm.label} onChange={value => setRequirementForm(current => ({ ...current, label: value }))} />
              <label className="flex items-end gap-2 text-sm text-[#4f4c45]">
                <input
                  type="checkbox"
                  checked={requirementForm.required}
                  onChange={event => setRequirementForm(current => ({ ...current, required: event.target.checked }))}
                />
                Required
              </label>
              <button
                type="button"
                onClick={handleAddRequirement}
                disabled={saving === 'requirement'}
                className="rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving === 'requirement' ? 'Adding...' : 'Add requirement'}
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {supportTypes.map(type => (
                <div key={type.key} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                  <p className="text-sm font-semibold text-[#1a1a18]">{type.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {requirements.filter(requirement => requirement.support_type_key === type.key).map(requirement => (
                      <span key={requirement.id} className="rounded-full bg-white px-3 py-1.5 text-[11px] text-[#4f4c45]">
                        {requirement.label}
                      </span>
                    ))}
                    {!requirements.some(requirement => requirement.support_type_key === type.key) ? (
                      <span className="text-[11px] text-[#8a877f]">No requirements yet.</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number
  sub: string
  accent?: boolean
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#c852ff]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      />
    </div>
  )
}

function SmallInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">{label}</label>
      <input
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      />
    </div>
  )
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string | null]>
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      >
        {options.map(([optionValue, labelValue]) => (
          <option key={optionValue} value={optionValue}>
            {labelValue ?? optionValue}
          </option>
        ))}
      </select>
    </div>
  )
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function countWarningDays(value: string) {
  return value
    .split(',')
    .map(item => Number(item.trim()))
    .filter(item => Number.isFinite(item)).length
}
