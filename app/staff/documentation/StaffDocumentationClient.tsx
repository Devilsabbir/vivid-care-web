'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type ShiftRow = {
  id: string
  title: string | null
  start_time: string
  end_time: string
  status: string
  documentation_status: string
  support_type_key: string | null
  clients: { full_name: string | null } | { full_name: string | null }[] | null
}

type DocRow = {
  id: string
  shift_id: string
  support_type_key: string
  form_key: string
  title: string
  payload: Record<string, unknown>
  status: string
  submitted_at: string
}

type RequirementRow = {
  id: string
  support_type_key: string
  form_key: string
  label: string
}

type FieldRow = {
  id: string
  support_type_key: string | null
  form_key: string
  field_key: string
  label: string
  field_type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number' | 'datetime'
  placeholder: string | null
  options: unknown[]
  required: boolean
  display_order: number
}

export default function StaffDocumentationClient({
  schemaReady,
  staffId,
  shifts,
  docs,
  requirements,
  fields,
}: {
  schemaReady: boolean
  staffId: string
  shifts: ShiftRow[]
  docs: DocRow[]
  requirements: RequirementRow[]
  fields: FieldRow[]
}) {
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(shifts[0]?.id ?? null)
  const [formValues, setFormValues] = useState<Record<string, string | boolean>>({})
  const [savingFormKey, setSavingFormKey] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const docMap = useMemo(() => {
    const map = new Map<string, DocRow[]>()
    docs.forEach(doc => {
      const current = map.get(doc.shift_id) ?? []
      current.push(doc)
      map.set(doc.shift_id, current)
    })
    return map
  }, [docs])

  const selectedShift = shifts.find(shift => shift.id === selectedShiftId) ?? null
  const selectedSupportType = selectedShift?.support_type_key ?? 'general_support'
  const requiredForms = requirements.filter(requirement => requirement.support_type_key === selectedSupportType)
  const submittedForms = new Set((docMap.get(selectedShiftId ?? '') ?? []).map(doc => doc.form_key))

  async function submitForm(form: RequirementRow) {
    if (!selectedShift) return
    setSavingFormKey(form.form_key)
    setMessage(null)

    const fieldsForForm = formFields(selectedSupportType, form.form_key, fields)
    const payload = fieldsForForm.reduce<Record<string, string | boolean>>((acc, field) => {
      const key = valueKey(selectedShift.id, form.form_key, field.field_key)
      const value = formValues[key]
      acc[field.field_key] = typeof value === 'undefined' ? defaultFieldValue(field.field_type) : value
      return acc
    }, {})

    if (!fieldsForForm.length) {
      payload.notes = (formValues[valueKey(selectedShift.id, form.form_key, 'notes')] as string) || ''
    }

    const { error } = await supabase.from('shift_documentation').insert({
      shift_id: selectedShift.id,
      support_type_key: selectedSupportType,
      form_key: form.form_key,
      title: form.label,
      payload,
      status: 'submitted',
      submitted_by: staffId,
      submitted_at: new Date().toISOString(),
    })

    setSavingFormKey(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage(`${form.label} submitted.`)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      {!schemaReady ? (
        <section className="rounded-[24px] border border-[#f3d7d7] bg-[#fff5f5] p-5 text-sm text-[#9b3434]">
          The service documentation tables are not available yet. Apply the latest Supabase migrations, then refresh this page.
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[24px] border border-[#e4c1f5] bg-[#f9f0ff] p-4 text-sm text-[#4a006f]">
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Recent shifts" value={shifts.length} sub="Active or completed in the last 30 days" />
        <MetricCard label="Submitted forms" value={docs.length} sub="Documentation records on file" accent />
        <MetricCard label="Ready to submit" value={requiredForms.filter(form => !submittedForms.has(form.form_key)).length} sub="Remaining forms for selected shift" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b867b]">Shifts</p>
          <h2 className="mt-2 text-lg font-semibold text-[#171716]">Choose a shift</h2>

          <div className="mt-5 space-y-3">
            {shifts.map(shift => (
              <button
                key={shift.id}
                type="button"
                onClick={() => setSelectedShiftId(shift.id)}
                className={`w-full rounded-[22px] border p-4 text-left ${
                  selectedShiftId === shift.id
                    ? 'border-[#1a1a18] bg-[#171717] text-white'
                    : 'border-[#ece6dc] bg-[#faf9f6] text-[#171716]'
                }`}
              >
                <p className="text-sm font-semibold">{relationName(shift.clients)}</p>
                <p className={`mt-1 text-[12px] ${selectedShiftId === shift.id ? 'text-white/65' : 'text-[#8b867b]'}`}>
                  {formatDateTime(shift.start_time)}
                </p>
                <p className={`mt-2 text-[11px] uppercase tracking-[0.14em] ${selectedShiftId === shift.id ? 'text-[#c852ff]' : 'text-[#8b867b]'}`}>
                  {copyDocumentationStatus(shift.documentation_status)}
                </p>
              </button>
            ))}
            {shifts.length === 0 ? <p className="text-sm text-[#8b867b]">No recent shifts found.</p> : null}
          </div>
        </aside>

        <div className="space-y-6">
          {selectedShift ? (
            <>
              <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b867b]">Selected shift</p>
                    <h2 className="mt-2 font-headline text-xl font-semibold text-[#171716]">
                      {relationName(selectedShift.clients)}
                    </h2>
                    <p className="mt-1 text-sm text-[#666258]">
                      {formatDateTime(selectedShift.start_time)} to {formatTime(selectedShift.end_time)}
                    </p>
                    <p className="mt-2 text-[12px] text-[#8b867b]">Support type: {selectedSupportType.replace(/_/g, ' ')}</p>
                  </div>
                  <span className={documentationStatusClass(selectedShift.documentation_status)}>{copyDocumentationStatus(selectedShift.documentation_status)}</span>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b867b]">Required forms</p>
                <h2 className="mt-2 text-lg font-semibold text-[#171716]">Complete and submit</h2>

                <div className="mt-5 space-y-4">
                  {requiredForms.map(form => {
                    const alreadySubmitted = submittedForms.has(form.form_key)
                    const fieldsForForm = formFields(selectedSupportType, form.form_key, fields)

                    return (
                      <article key={form.id} className="rounded-[22px] border border-[#ece6dc] bg-[#faf9f6] p-4">
                        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-[#171716]">{form.label}</p>
                            <p className="mt-1 text-[12px] text-[#8b867b]">{form.form_key.replace(/_/g, ' ')}</p>
                          </div>
                          <span className={alreadySubmitted ? 'rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[10px] font-semibold text-[#6b21a8]' : 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'}>
                            {alreadySubmitted ? 'Submitted' : 'Pending'}
                          </span>
                        </div>

                        {!alreadySubmitted ? (
                          <div className="mt-4 space-y-4">
                            {fieldsForForm.length > 0 ? (
                              fieldsForForm.map(field => (
                                <DynamicField
                                  key={field.id}
                                  field={field}
                                  value={formValues[valueKey(selectedShift.id, form.form_key, field.field_key)]}
                                  onChange={value => setFormValues(current => ({
                                    ...current,
                                    [valueKey(selectedShift.id, form.form_key, field.field_key)]: value,
                                  }))}
                                />
                              ))
                            ) : (
                              <div>
                                <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8b867b]">Notes</label>
                                <textarea
                                  rows={4}
                                  value={(formValues[valueKey(selectedShift.id, form.form_key, 'notes')] as string) ?? ''}
                                  onChange={event => setFormValues(current => ({
                                    ...current,
                                    [valueKey(selectedShift.id, form.form_key, 'notes')]: event.target.value,
                                  }))}
                                  className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-white px-4 py-3 text-sm text-[#171716] outline-none"
                                />
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => submitForm(form)}
                              disabled={savingFormKey === form.form_key}
                              className="rounded-2xl bg-[#171716] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                            >
                              {savingFormKey === form.form_key ? 'Submitting...' : `Submit ${form.label}`}
                            </button>
                          </div>
                        ) : (
                          <div className="mt-4 rounded-[18px] border border-[#d8ecd1] bg-[#f5fff1] p-4 text-sm text-[#4b6d43]">
                            This form has already been submitted for the selected shift.
                          </div>
                        )}
                      </article>
                    )
                  })}
                  {requiredForms.length === 0 ? (
                    <p className="text-sm text-[#8b867b]">No required forms are configured for this support type yet.</p>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[28px] border border-[#e6e0d7] bg-white p-5 shadow-[0_16px_32px_rgba(23,23,22,0.05)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[#8b867b]">History</p>
                <h2 className="mt-2 text-lg font-semibold text-[#171716]">Submitted records</h2>

                <div className="mt-5 space-y-3">
                  {(docMap.get(selectedShift.id) ?? []).map(doc => (
                    <article key={doc.id} className="rounded-[20px] border border-[#ece6dc] bg-[#faf9f6] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#171716]">{doc.title}</p>
                          <p className="mt-1 text-[12px] text-[#8b867b]">Submitted {formatDateTime(doc.submitted_at)}</p>
                        </div>
                        <span className="rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold text-[#1d4ed8]">
                          {doc.status}
                        </span>
                      </div>
                    </article>
                  ))}
                  {(docMap.get(selectedShift.id) ?? []).length === 0 ? <p className="text-sm text-[#8b867b]">No forms submitted for this shift yet.</p> : null}
                </div>
              </section>
            </>
          ) : null}
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

function DynamicField({
  field,
  value,
  onChange,
}: {
  field: FieldRow
  value: string | boolean | undefined
  onChange: (value: string | boolean) => void
}) {
  if (field.field_type === 'textarea') {
    return (
      <div>
        <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8b867b]">{field.label}</label>
        <textarea
          rows={4}
          value={(value as string) ?? ''}
          onChange={event => onChange(event.target.value)}
          placeholder={field.placeholder ?? ''}
          className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-white px-4 py-3 text-sm text-[#171716] outline-none"
        />
      </div>
    )
  }

  if (field.field_type === 'checkbox') {
    return (
      <label className="flex items-center gap-3 rounded-[18px] border border-[#dfd9cf] bg-white px-4 py-3 text-sm text-[#171716]">
        <input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} />
        {field.label}
      </label>
    )
  }

  if (field.field_type === 'select') {
    const options = Array.isArray(field.options) ? field.options : []
    return (
      <div>
        <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8b867b]">{field.label}</label>
        <select
          value={(value as string) ?? ''}
          onChange={event => onChange(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-white px-4 py-3 text-sm text-[#171716] outline-none"
        >
          <option value="">Select</option>
          {options.map(option => (
            <option key={String(option)} value={String(option)}>
              {String(option)}
            </option>
          ))}
        </select>
      </div>
    )
  }

  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8b867b]">{field.label}</label>
      <input
        type={field.field_type === 'number' ? 'number' : field.field_type === 'datetime' ? 'datetime-local' : 'text'}
        value={(value as string) ?? ''}
        onChange={event => onChange(event.target.value)}
        placeholder={field.placeholder ?? ''}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-white px-4 py-3 text-sm text-[#171716] outline-none"
      />
    </div>
  )
}

function formFields(supportTypeKey: string, formKey: string, fields: FieldRow[]) {
  const specific = fields.filter(field => field.form_key === formKey && field.support_type_key === supportTypeKey)
  const generic = fields.filter(field => field.form_key === formKey && field.support_type_key === null)
  return (specific.length ? specific : generic).sort((left, right) => left.display_order - right.display_order)
}

function valueKey(shiftId: string, formKey: string, fieldKey: string) {
  return `${shiftId}:${formKey}:${fieldKey}`
}

function defaultFieldValue(type: FieldRow['field_type']) {
  return type === 'checkbox' ? false : ''
}

function relationName(value: ShiftRow['clients']) {
  if (Array.isArray(value)) return value[0]?.full_name ?? 'Client'
  return value?.full_name ?? 'Client'
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-AU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function documentationStatusClass(status: string) {
  if (status === 'documented') return 'rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[10px] font-semibold text-[#6b21a8]'
  if (status === 'in_progress') return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  if (status === 'overdue') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
  if (status === 'not_required') return 'rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]'
  return 'rounded-full bg-[#dbeafe] px-2.5 py-1 text-[10px] font-semibold text-[#1d4ed8]'
}

function copyDocumentationStatus(status: string) {
  if (status === 'documented') return 'Documented'
  if (status === 'in_progress') return 'In progress'
  if (status === 'overdue') return 'Overdue'
  if (status === 'not_required') return 'Not required'
  return 'Pending'
}
