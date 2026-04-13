'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignatureCanvas from 'react-signature-canvas'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

type TemplateRow = {
  id: string
  name: string
  target_type: 'staff' | 'client'
  body: string
  active: boolean
}

type AgreementRow = {
  id: string
  template_id: string | null
  target_type: 'staff' | 'client'
  target_id: string
  title: string
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
  expires_on: string | null
  signed_at: string | null
  signature_data_url: string | null
}

type TargetRow = {
  id: string
  full_name: string | null
  role?: string | null
}

const EMPTY_TEMPLATE = {
  name: '',
  target_type: 'client',
  body: '',
}

export default function AgreementsClient({
  schemaReady,
  adminId,
  templates,
  agreements,
  staff,
  clients,
}: {
  schemaReady: boolean
  adminId: string
  templates: TemplateRow[]
  agreements: AgreementRow[]
  staff: TargetRow[]
  clients: TargetRow[]
}) {
  const [createForm, setCreateForm] = useState({
    template_id: templates[0]?.id ?? '',
    target_type: 'client',
    target_id: clients[0]?.id ?? '',
    title: '',
    expires_on: '',
  })
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE)
  const [createOpen, setCreateOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [signatureAgreementId, setSignatureAgreementId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const signatureRef = useRef<SignatureCanvas | null>(null)

  const targetNameMap = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach(client => map.set(`client:${client.id}`, client.full_name ?? 'Client'))
    staff.forEach(member => map.set(`staff:${member.id}`, member.full_name ?? 'Staff member'))
    return map
  }, [clients, staff])

  const templateMap = useMemo(() => {
    const map = new Map<string, TemplateRow>()
    templates.forEach(template => map.set(template.id, template))
    return map
  }, [templates])

  const targetOptions = createForm.target_type === 'client'
    ? clients
    : staff.filter(member => member.role === 'staff')
  const pendingCount = agreements.filter(agreement => agreement.status === 'pending_signature').length
  const signedCount = agreements.filter(agreement => agreement.status === 'signed').length

  async function handleCreateAgreement() {
    if (!createForm.target_id) return
    setSaving('agreement')
    setMessage(null)

    const template = templateMap.get(createForm.template_id)

    const { error } = await supabase.from('agreements').insert({
      template_id: createForm.template_id || null,
      target_type: createForm.target_type,
      target_id: createForm.target_id,
      title: createForm.title.trim() || template?.name || 'Agreement',
      status: 'pending_signature',
      expires_on: createForm.expires_on || null,
      created_by: adminId,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setCreateOpen(false)
    setMessage('Agreement created.')
    router.refresh()
  }

  async function handleCreateTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return
    setSaving('template')
    setMessage(null)

    const { error } = await supabase.from('agreement_templates').insert({
      name: templateForm.name.trim(),
      target_type: templateForm.target_type,
      body: templateForm.body.trim(),
      active: true,
      created_by: adminId,
    })

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setTemplateForm(EMPTY_TEMPLATE)
    setTemplateOpen(false)
    setMessage('Agreement template added.')
    router.refresh()
  }

  async function handleSaveSignature() {
    if (!signatureAgreementId || !signatureRef.current || signatureRef.current.isEmpty()) return
    setSaving('signature')
    setMessage(null)

    const { error } = await supabase
      .from('agreements')
      .update({
        status: 'signed',
        signed_at: new Date().toISOString(),
        signature_data_url: signatureRef.current.toDataURL('image/png'),
      })
      .eq('id', signatureAgreementId)

    setSaving(null)

    if (error) {
      setMessage(error.message)
      return
    }

    setSignatureAgreementId(null)
    signatureRef.current.clear()
    setMessage('Signature captured.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {!schemaReady ? (
        <section className="rounded-[24px] border border-[#f3d7d7] bg-[#fff5f5] p-5 text-sm text-[#9b3434]">
          The agreements schema is not available yet. Apply the latest Supabase migrations, then refresh this page.
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[24px] border border-[#dfe9c1] bg-[#f8ffea] p-4 text-sm text-[#4f6200]">
          {message}
        </section>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Templates" value={templates.length} sub="Reusable agreement starters" />
        <MetricCard label="Pending" value={pendingCount} sub="Awaiting signature" accent />
        <MetricCard label="Signed" value={signedCount} sub="Completed agreements" />
        <MetricCard label="Renewals" value={agreements.filter(agreement => !!agreement.expires_on).length} sub="Expiry tracked records" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setTemplateOpen(true)}
          className="rounded-2xl border border-[#dcd7cf] bg-white px-4 py-2.5 text-sm font-semibold text-[#1a1a18]"
        >
          New template
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-2xl bg-[#1a1a18] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Generate agreement
        </button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Template library</p>
          <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Reusable agreement bodies</h3>
          <div className="mt-5 space-y-3">
            {templates.map(template => (
              <article key={template.id} className="rounded-[20px] border border-[#efebe4] bg-[#faf9f6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#1a1a18]">{template.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#8a877f]">{template.target_type}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${template.active ? 'bg-[#dcfce7] text-[#166534]' : 'bg-[#e5e7eb] text-[#4b5563]'}`}>
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-3 text-[12px] leading-6 text-[#67635c]">{template.body.slice(0, 120)}...</p>
              </article>
            ))}
            {templates.length === 0 ? <p className="text-sm text-[#8a877f]">No templates yet.</p> : null}
          </div>
        </aside>

        <section className="rounded-[28px] border border-[#e8e4dc] bg-white p-6 shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#9b988f]">Agreement register</p>
          <h3 className="mt-2 text-lg font-semibold text-[#1a1a18]">Generated records</h3>

          <div className="mt-5 space-y-4">
            {agreements.map(agreement => (
              <article key={agreement.id} className="rounded-[22px] border border-[#ede8df] bg-[#faf9f6] p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#1a1a18]">{agreement.title}</p>
                      <span className={statusClass(agreement.status)}>{copyStatus(agreement.status)}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-[#67635c]">
                      {targetNameMap.get(`${agreement.target_type}:${agreement.target_id}`) ?? 'Unknown target'} / {agreement.target_type}
                    </p>
                    <p className="mt-1 text-[12px] text-[#8a877f]">
                      Template: {agreement.template_id ? (templateMap.get(agreement.template_id)?.name ?? 'Template') : 'Custom'}{agreement.expires_on ? ` / Expires ${formatDate(agreement.expires_on)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {agreement.status !== 'signed' ? (
                      <button
                        type="button"
                        onClick={() => setSignatureAgreementId(agreement.id)}
                        className="rounded-2xl bg-[#cdff52] px-4 py-2 text-sm font-semibold text-[#1a1a18]"
                      >
                        Capture signature
                      </button>
                    ) : null}
                    {agreement.signature_data_url ? (
                      <a href={agreement.signature_data_url} target="_blank" rel="noreferrer" className="rounded-2xl border border-[#dcd7cf] px-4 py-2 text-sm font-semibold text-[#1a1a18]">
                        View signature
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
            {agreements.length === 0 ? <p className="text-sm text-[#8a877f]">No agreements created yet.</p> : null}
          </div>
        </section>
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Generate agreement" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Template" value={createForm.template_id} onChange={value => setCreateForm(current => ({ ...current, template_id: value }))} options={templates.map(template => [template.id, template.name])} />
          <SelectField
            label="Target type"
            value={createForm.target_type}
            onChange={value => setCreateForm(current => ({
              ...current,
              target_type: value as 'staff' | 'client',
              target_id: value === 'client' ? clients[0]?.id ?? '' : staff.filter(member => member.role === 'staff')[0]?.id ?? '',
            }))}
            options={[
              ['client', 'Client'],
              ['staff', 'Staff'],
            ]}
          />
          <SelectField label="Target" value={createForm.target_id} onChange={value => setCreateForm(current => ({ ...current, target_id: value }))} options={targetOptions.map(option => [option.id, option.full_name ?? 'Unnamed record'])} />
          <TextField label="Expires on" type="date" value={createForm.expires_on} onChange={value => setCreateForm(current => ({ ...current, expires_on: value }))} />
          <div className="md:col-span-2">
            <TextField label="Agreement title" value={createForm.title} onChange={value => setCreateForm(current => ({ ...current, title: value }))} />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => setCreateOpen(false)} className="flex-1 rounded-2xl bg-[#f4f2ed] px-4 py-3 text-sm font-semibold text-[#4f4c45]">Cancel</button>
          <button type="button" onClick={handleCreateAgreement} disabled={saving === 'agreement'} className="flex-1 rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving === 'agreement' ? 'Creating...' : 'Create agreement'}
          </button>
        </div>
      </Modal>

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="Create template" wide>
        <div className="grid gap-4">
          <TextField label="Template name" value={templateForm.name} onChange={value => setTemplateForm(current => ({ ...current, name: value }))} />
          <SelectField
            label="Target type"
            value={templateForm.target_type}
            onChange={value => setTemplateForm(current => ({ ...current, target_type: value as 'staff' | 'client' }))}
            options={[
              ['client', 'Client'],
              ['staff', 'Staff'],
            ]}
          />
          <div>
            <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">Body</label>
            <textarea
              rows={8}
              value={templateForm.body}
              onChange={event => setTemplateForm(current => ({ ...current, body: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button type="button" onClick={() => setTemplateOpen(false)} className="flex-1 rounded-2xl bg-[#f4f2ed] px-4 py-3 text-sm font-semibold text-[#4f4c45]">Cancel</button>
          <button type="button" onClick={handleCreateTemplate} disabled={saving === 'template'} className="flex-1 rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
            {saving === 'template' ? 'Saving...' : 'Save template'}
          </button>
        </div>
      </Modal>

      <Modal open={!!signatureAgreementId} onClose={() => setSignatureAgreementId(null)} title="Capture signature" wide>
        <div className="space-y-4">
          <div className="rounded-[20px] border border-[#ece8de] bg-[#faf9f6] p-4 text-sm text-[#67635c]">
            Sign on the canvas below, then save to mark the agreement as signed.
          </div>

          <div className="overflow-hidden rounded-[24px] border border-[#dfd9cf] bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="#1a1a18"
              canvasProps={{
                className: 'h-[260px] w-full',
              }}
            />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => signatureRef.current?.clear()} className="flex-1 rounded-2xl bg-[#f4f2ed] px-4 py-3 text-sm font-semibold text-[#4f4c45]">
              Clear
            </button>
            <button type="button" onClick={handleSaveSignature} disabled={saving === 'signature'} className="flex-1 rounded-2xl bg-[#1a1a18] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {saving === 'signature' ? 'Saving...' : 'Save signature'}
            </button>
          </div>
        </div>
      </Modal>
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
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#cdff52]' : 'border border-[#e8e4dc] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#627100]' : 'text-[#8a877f]'}`}>{sub}</p>
    </div>
  )
}

function TextField({
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: Array<[string, string]>
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.14em] text-[#8a877f]">{label}</label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-[#dfd9cf] bg-[#faf9f6] px-4 py-3 text-sm text-[#1a1a18] outline-none"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

function statusClass(status: AgreementRow['status']) {
  if (status === 'signed') return 'rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]'
  if (status === 'expired') return 'rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
  if (status === 'draft') return 'rounded-full bg-[#e5e7eb] px-2.5 py-1 text-[10px] font-semibold text-[#4b5563]'
  return 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
}

function copyStatus(status: AgreementRow['status']) {
  if (status === 'pending_signature') return 'Awaiting signature'
  if (status === 'signed') return 'Signed'
  if (status === 'expired') return 'Expired'
  return 'Draft'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}
