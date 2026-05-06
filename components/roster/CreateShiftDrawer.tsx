'use client'

import { useState, useEffect } from 'react'
import Drawer from '@/components/ui/Drawer'
import { FormField, SelectField, TextareaField } from '@/components/ui/FormField'
import RosterValidationPanel from './RosterValidationPanel'
import { validateShift, type ShiftInput, type ExistingShift, type StaffDocument, type ClientRecord } from '@/lib/utils/roster-validation'

interface StaffOption {
  id: string
  full_name: string
}

interface ClientOption {
  id: string
  full_name: string
  status?: string | null
  lat?: number | null
  lng?: number | null
}

interface SupportTypeOption {
  id: string
  title: string
}

interface CreateShiftDrawerProps {
  open: boolean
  onClose: () => void
  staff: StaffOption[]
  clients: ClientOption[]
  supportTypes: SupportTypeOption[]
  existingShifts: ExistingShift[]
  staffDocuments: Record<string, StaffDocument[]>
  onSave: (data: ShiftFormData) => Promise<void>
  initialValues?: Partial<ShiftFormData>
  editingShiftId?: string
}

export interface ShiftFormData {
  staff_id: string
  client_id: string
  support_type: string
  start_time: string
  end_time: string
  notes: string
  overnight: boolean
}

export default function CreateShiftDrawer({
  open,
  onClose,
  staff,
  clients,
  supportTypes,
  existingShifts,
  staffDocuments,
  onSave,
  initialValues,
  editingShiftId,
}: CreateShiftDrawerProps) {
  const [form, setForm] = useState<ShiftFormData>({
    staff_id: '',
    client_id: '',
    support_type: '',
    start_time: '',
    end_time: '',
    notes: '',
    overnight: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && initialValues) {
      setForm(prev => ({ ...prev, ...initialValues }))
    } else if (open) {
      setForm({ staff_id: '', client_id: '', support_type: '', start_time: '', end_time: '', notes: '', overnight: false })
    }
  }, [open, initialValues])

  const selectedClient: ClientRecord | null = form.client_id
    ? clients.find(c => c.id === form.client_id) ?? null
    : null

  const selectedStaffDocs = form.staff_id ? (staffDocuments[form.staff_id] ?? []) : []

  const shiftInput: ShiftInput = {
    staff_id: form.staff_id || null,
    client_id: form.client_id || null,
    start_time: form.start_time,
    end_time: form.end_time,
    overnight: form.overnight,
  }

  const validationResults = validateShift(
    shiftInput,
    existingShifts,
    selectedStaffDocs,
    selectedClient,
    editingShiftId
  )

  const hasErrors = validationResults.some(r => r.type === 'error')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) return
    setSaving(true)
    try {
      await onSave(form)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} title={editingShiftId ? 'Edit shift' : 'Create shift'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Staff member"
          value={form.staff_id}
          onChange={v => setForm(f => ({ ...f, staff_id: v }))}
        >
          <option value="">Unassigned</option>
          {staff.map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </SelectField>

        <SelectField
          label="Client"
          value={form.client_id}
          onChange={v => setForm(f => ({ ...f, client_id: v }))}
          required
        >
          <option value="">Select client...</option>
          {clients.map(c => (
            <option key={c.id} value={c.id}>{c.full_name}</option>
          ))}
        </SelectField>

        <SelectField
          label="Support type"
          value={form.support_type}
          onChange={v => setForm(f => ({ ...f, support_type: v }))}
        >
          <option value="">Select type...</option>
          {supportTypes.map(t => (
            <option key={t.id} value={t.title}>{t.title}</option>
          ))}
        </SelectField>

        <FormField
          label="Start time"
          type="datetime-local"
          value={form.start_time}
          onChange={v => setForm(f => ({ ...f, start_time: v }))}
          required
        />

        <FormField
          label="End time"
          type="datetime-local"
          value={form.end_time}
          onChange={v => setForm(f => ({ ...f, end_time: v }))}
          required
        />

        <label className="flex items-center gap-2 text-sm text-[#4f4c45]">
          <input
            type="checkbox"
            checked={form.overnight}
            onChange={e => setForm(f => ({ ...f, overnight: e.target.checked }))}
            className="h-4 w-4 rounded border-[#dfd9cf]"
          />
          Overnight shift
        </label>

        <TextareaField
          label="Notes"
          value={form.notes}
          onChange={v => setForm(f => ({ ...f, notes: v }))}
          placeholder="Optional notes for this shift..."
        />

        {validationResults.length > 0 && (
          <RosterValidationPanel results={validationResults} />
        )}

        <div className="flex justify-end gap-3 border-t border-[#f0ece5] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#ddd9d1] px-5 py-2.5 text-sm font-medium text-[#5e5b54] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || hasErrors}
            className="rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] focus-visible:ring-offset-2"
          >
            {saving ? 'Saving...' : editingShiftId ? 'Update shift' : 'Create shift'}
          </button>
        </div>
      </form>
    </Drawer>
  )
}
