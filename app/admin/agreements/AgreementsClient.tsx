'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'

// Agreements are always issued to NDIS clients now — staff agreement flow
// was retired (see refactor: NDIS-only documents). target_type column is
// retained in the DB for migration safety but every new row writes 'client'.
type TemplateRow = {
  id: string
  name: string
  body: string
  active: boolean
}

type AgreementRow = {
  id: string
  template_id: string | null
  target_id: string
  title: string
  status: 'draft' | 'pending_signature' | 'signed' | 'expired'
  expires_on: string | null
  signed_at: string | null
  signature_data_url: string | null
  pdf_url: string | null
  signing_token: string | null
  signer_name: string | null
  advocate_name: string | null
  supports_description: string | null
  funding_type: 'self' | 'nominee' | 'ndia' | 'plan_manager' | null
  payment_method: 'eft' | 'cheque' | 'cash' | null
}

type TargetRow = {
  id: string
  full_name: string | null
}

const EMPTY_TEMPLATE = {
  name: '',
  body: '',
}

export default function AgreementsClient({
  schemaReady,
  adminId,
  templates,
  agreements,
  clients,
}: {
  schemaReady: boolean
  adminId: string
  templates: TemplateRow[]
  agreements: AgreementRow[]
  clients: TargetRow[]
}) {
  const [createForm, setCreateForm] = useState({
    template_id: templates[0]?.id ?? '',
    target_id: clients[0]?.id ?? '',
    title: '',
    expires_on: '',
    advocate_name: '',
    supports_description: '',
    funding_type: 'ndia',
    payment_method: 'eft',
  })
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [templateForm, setTemplateForm] = useState(EMPTY_TEMPLATE)
  const [createOpen, setCreateOpen] = useState(false)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [saving, setSaving] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  // Realtime: refresh the list when any agreement changes (e.g. a client
  // signs on their phone). Keeps the admin "Signed/Pending" badge fresh
  // without forcing a manual hard-refresh.
  useEffect(() => {
    const channel = supabase
      .channel('admin-agreements-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agreements' },
        () => router.refresh(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])

  const targetNameMap = useMemo(() => {
    const map = new Map<string, string>()
    clients.forEach(client => map.set(client.id, client.full_name ?? 'Client'))
    return map
  }, [clients])

  const templateMap = useMemo(() => {
    const map = new Map<string, TemplateRow>()
    templates.forEach(template => map.set(template.id, template))
    return map
  }, [templates])

  const pendingCount = agreements.filter(agreement => agreement.status === 'pending_signature').length
  const signedCount = agreements.filter(agreement => agreement.status === 'signed').length

  async function handleCreateAgreement() {
    if (!createForm.target_id) {
      setMessage('Please select an NDIS client.')
      return
    }
    // Reject anything other than PDFs and >10MB so we don't bloat storage.
    if (pdfFile) {
      if (pdfFile.type !== 'application/pdf' && !pdfFile.name.toLowerCase().endsWith('.pdf')) {
        setMessage('Attached file must be a PDF.')
        return
      }
      if (pdfFile.size > 10 * 1024 * 1024) {
        setMessage('Attached PDF must be 10MB or smaller.')
        return
      }
    }
    setSaving('agreement')
    setMessage(null)

    const template = templateMap.get(createForm.template_id)

    // 1. Insert the agreement row first so we get an id to namespace storage by.
    // target_type is always 'client' since the NDIS-only refactor.
    const { data: created, error: insertErr } = await supabase
      .from('agreements')
      .insert({
        template_id: createForm.template_id || null,
        target_type: 'client',
        target_id: createForm.target_id,
        title: createForm.title.trim() || template?.name || 'Service agreement',
        status: 'pending_signature',
        expires_on: createForm.expires_on || null,
        created_by: adminId,
        advocate_name: createForm.advocate_name.trim() || null,
        supports_description: createForm.supports_description.trim() || null,
        funding_type: createForm.funding_type,
        payment_method: createForm.payment_method,
      })
      .select('id')
      .single()

    if (insertErr || !created) {
      setSaving(null)
      setMessage(insertErr?.message ?? 'Failed to create agreement.')
      return
    }

    // 2. If admin attached a PDF, upload it and patch pdf_url to the storage
    //    path (mobile + signing pages call createSignedUrl on demand).
    if (pdfFile) {
      const safeName = pdfFile.name.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80)
      const path = `client/${createForm.target_id}/${created.id}-${safeName}`
      const { error: uploadErr } = await supabase.storage
        .from('agreements')
        .upload(path, pdfFile, {
          contentType: pdfFile.type || 'application/pdf',
          upsert: true,
        })
      if (uploadErr) {
        setSaving(null)
        setMessage(
          `Agreement saved but PDF upload failed: ${uploadErr.message}. You can retry by editing the agreement.`,
        )
        return
      }
      const { error: patchErr } = await supabase
        .from('agreements')
        .update({ pdf_url: path })
        .eq('id', created.id)
      if (patchErr) {
        setSaving(null)
        setMessage(
          `PDF uploaded but agreement row update failed: ${patchErr.message}.`,
        )
        return
      }
    }

    setSaving(null)
    setCreateOpen(false)
    setPdfFile(null)
    setMessage(
      pdfFile
        ? 'Agreement created and PDF attached. Notification sent to the client.'
        : 'Agreement created. Notification sent to the client.',
    )
    router.refresh()
  }

  /**
   * Open a PDF in a new tab. pdf_url may be either:
   *  - A full https URL (legacy: signed URL written by the post-sign generator)
   *  - A storage path like `client/<client_id>/<agreement_id>-name.pdf`
   *    (new: admin-uploaded PDF)
   * Detect which and resolve a signed URL for the path case.
   */
  async function openPdf(pdfUrlOrPath: string) {
    if (pdfUrlOrPath.startsWith('http://') || pdfUrlOrPath.startsWith('https://')) {
      window.open(pdfUrlOrPath, '_blank', 'noopener')
      return
    }
    // All admin-uploaded and post-sign generated PDFs now live in the
    // `agreements` bucket. (Legacy rows that stored a full https URL
    // are handled by the early return above.)
    const { data, error } = await supabase.storage
      .from('agreements')
      .createSignedUrl(pdfUrlOrPath, 60 * 10) // 10 min for download
    if (error || !data?.signedUrl) {
      setMessage(`Could not open PDF: ${error?.message ?? 'unknown error'}`)
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  async function handleCreateTemplate() {
    if (!templateForm.name.trim() || !templateForm.body.trim()) return
    setSaving('template')
    setMessage(null)

    const { error } = await supabase.from('agreement_templates').insert({
      name: templateForm.name.trim(),
      target_type: 'client',
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

  return (
    <div className="space-y-6">
      {!schemaReady ? (
        <section className="rounded-[24px] border border-[#f3d7d7] bg-[#fff5f5] p-5 text-sm text-[#9b3434]">
          The agreements schema is not available yet. Apply the latest Supabase migrations, then refresh this page.
        </section>
      ) : null}

      {message ? (
        <section className="rounded-[24px] border border-[#E6D4F0] bg-[#F4ECF8] p-4 text-sm text-[#54206F]">
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
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] border border-[#E5E1E8] bg-white px-3 text-[12.5px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">add</span>
          New template
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
        >
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">draw</span>
          Generate agreement
        </button>
      </div>

      <section className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
          <p
            className="text-[11px] font-semibold uppercase text-[#6B6371]"
            style={{ letterSpacing: '0.08em' }}
          >
            Template library
          </p>
          <h3 className="mt-2 text-[16px] font-semibold text-[#1A1320]">Reusable agreement bodies</h3>
          <div className="mt-4 space-y-2.5">
            {templates.map(template => (
              <article key={template.id} className="rounded-[12px] border border-[#F1EEF4] bg-[#F8F6FA] p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#0f172a]">{template.name}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#64748b]">NDIS client</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${template.active ? 'bg-[#F4ECF8] text-[#54206F]' : 'bg-[#e5e7eb] text-[#4b5563]'}`}>
                    {template.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-3 text-[12px] leading-6 text-[#67635c]">{template.body.slice(0, 120)}...</p>
              </article>
            ))}
            {templates.length === 0 ? <p className="text-sm text-[#64748b]">No templates yet.</p> : null}
          </div>
        </aside>

        <section className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
          <p
            className="text-[11px] font-semibold uppercase text-[#6B6371]"
            style={{ letterSpacing: '0.08em' }}
          >
            Agreement register
          </p>
          <h3 className="mt-2 text-[16px] font-semibold text-[#1A1320]">Generated records</h3>

          <div className="mt-4 space-y-2.5">
            {agreements.map(agreement => (
              <article
                key={agreement.id}
                className="rounded-[12px] border border-[#F1EEF4] bg-white p-4 transition-shadow hover:shadow-[0_4px_14px_rgba(46,18,64,0.06)]"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1A1320]">{agreement.title}</p>
                      <span className={statusClass(agreement.status)}>{copyStatus(agreement.status)}</span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-[#6B6371]">
                      {targetNameMap.get(agreement.target_id) ?? 'Unknown client'} · NDIS client
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[#97909C]">
                      Template: {agreement.template_id ? (templateMap.get(agreement.template_id)?.name ?? 'Template') : 'Custom'}{agreement.expires_on ? ` · Expires ${formatDate(agreement.expires_on)}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {agreement.status === 'pending_signature' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => router.push(`/sign-inperson/${agreement.id}`)}
                          className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] bg-[#6B2C91] px-3 text-[12px] font-medium text-white hover:bg-[#54206F]"
                        >
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">edit</span>
                          Sign in person
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/sign/${agreement.signing_token}`
                            navigator.clipboard.writeText(url)
                            setMessage('Signing link copied to clipboard.')
                          }}
                          className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#E5E1E8] bg-white px-3 text-[12px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
                        >
                          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">link</span>
                          Copy link
                        </button>
                      </>
                    ) : null}
                    {agreement.pdf_url ? (
                      <button
                        type="button"
                        onClick={() => openPdf(agreement.pdf_url!)}
                        className="inline-flex h-[32px] items-center gap-1.5 rounded-[8px] border border-[#E5E1E8] bg-white px-3 text-[12px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
                      >
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">download</span>
                        PDF
                      </button>
                    ) : null}
                  </div>
                </div>

                {agreement.status === 'signed' && agreement.signature_data_url ? (
                  <div className="mt-3 rounded-[10px] border border-[#F1EEF4] bg-[#F8F6FA] p-3">
                    <p
                      className="text-[11px] font-semibold uppercase text-[#6B6371]"
                      style={{ letterSpacing: '0.08em' }}
                    >
                      Signature
                    </p>
                    <div className="mt-2 flex items-center justify-center rounded-[8px] border border-[#E5E1E8] bg-white p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={agreement.signature_data_url}
                        alt={`Signature by ${agreement.signer_name ?? 'signer'}`}
                        className="h-24 w-auto max-w-full object-contain"
                      />
                    </div>
                    <p className="mt-2 text-[12px] text-[#6B6371]">
                      Signed by <span className="font-semibold text-[#1A1320]">{agreement.signer_name ?? 'Unknown signer'}</span>
                      {agreement.signed_at ? ` · ${formatDate(agreement.signed_at)}` : ''}
                    </p>
                  </div>
                ) : null}
              </article>
            ))}
            {agreements.length === 0 ? (
              <div className="rounded-[12px] border border-dashed border-[#E5E1E8] bg-[#F8F6FA] py-10 text-center">
                <span className="material-symbols-outlined text-[24px] text-[#C7C2CB]" aria-hidden="true">draw</span>
                <p className="mt-2 text-[13px] font-semibold text-[#1A1320]">No agreements yet</p>
                <p className="mt-1 text-[11.5px] text-[#6B6371]">Click "Generate agreement" to send one to an NDIS client.</p>
              </div>
            ) : null}
          </div>
        </section>
      </section>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Generate agreement" wide>
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField label="Template" value={createForm.template_id} onChange={value => setCreateForm(current => ({ ...current, template_id: value }))} options={templates.map(template => [template.id, template.name])} />
          <div>
            <SelectField
              label="NDIS client"
              value={createForm.target_id}
              onChange={value => setCreateForm(current => ({ ...current, target_id: value }))}
              options={clients.map(option => [option.id, option.full_name ?? 'Unnamed client'])}
            />
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#64748b]">
              <span className="material-symbols-outlined text-[14px] text-[#6B2C91]">info</span>
              Documents are only sent to NDIS clients.
            </p>
          </div>
          <TextField label="Expires on" type="date" value={createForm.expires_on} onChange={value => setCreateForm(current => ({ ...current, expires_on: value }))} />
          <div className="md:col-span-2">
            <TextField label="Agreement title" value={createForm.title} onChange={value => setCreateForm(current => ({ ...current, title: value }))} />
          </div>
          <div className="md:col-span-2">
            <label
              className="block text-[11px] font-semibold uppercase text-[#3F3548]"
              style={{ letterSpacing: '0.08em' }}
            >
              Advocate / Representative name (optional)
            </label>
            <input
              type="text"
              value={createForm.advocate_name}
              onChange={e => setCreateForm(c => ({ ...c, advocate_name: e.target.value }))}
              placeholder="Leave blank if not applicable"
              className="mt-2 h-[44px] w-full rounded-[10px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 text-[13.5px] text-[#1A1320] outline-none placeholder:text-[#97909C] focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]"
            />
          </div>
          <div className="md:col-span-2">
            <label
              className="block text-[11px] font-semibold uppercase text-[#3F3548]"
              style={{ letterSpacing: '0.08em' }}
            >
              Description of supports (optional)
            </label>
            <textarea
              rows={3}
              value={createForm.supports_description}
              onChange={e => setCreateForm(c => ({ ...c, supports_description: e.target.value }))}
              placeholder="e.g. Daily living assistance, community access, and personal care supports. Leave blank if the attached PDF already covers this."
              className="mt-2 w-full rounded-[10px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 py-3 text-[13.5px] text-[#1A1320] outline-none placeholder:text-[#97909C] focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]"
            />
          </div>
          <SelectField
            label="Funding management *"
            value={createForm.funding_type}
            onChange={value => setCreateForm(c => ({ ...c, funding_type: value }))}
            options={[
              ['ndia', 'NDIA managed'],
              ['plan_manager', 'Plan manager'],
              ['nominee', "Participant's nominee"],
              ['self', 'Self managed'],
            ]}
          />
          <SelectField
            label="Payment method *"
            value={createForm.payment_method}
            onChange={value => setCreateForm(c => ({ ...c, payment_method: value }))}
            options={[
              ['eft', 'EFT (bank transfer)'],
              ['cheque', 'Cheque'],
              ['cash', 'Cash'],
            ]}
          />
          <div className="md:col-span-2">
            <label
              className="block text-[11px] font-semibold uppercase text-[#3F3548]"
              style={{ letterSpacing: '0.08em' }}
            >
              Attach signed PDF (optional)
            </label>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-[10px] border-[1.5px] border-dashed border-[#C9A6DE] bg-[#F8F6FA] px-3.5 py-3 text-[12.5px] text-[#6B6371] outline-none file:mr-3 file:rounded-[8px] file:border-0 file:bg-[#6B2C91] file:px-3 file:py-1.5 file:text-[11.5px] file:font-semibold file:text-white hover:bg-white"
            />
            <p className="mt-2 flex items-center gap-1 text-[11.5px] text-[#6B6371]">
              <span className="material-symbols-outlined text-[14px] text-[#6B2C91]" aria-hidden="true">info</span>
              Upload the service agreement PDF. Max 10 MB. The client will see this on their phone along with a signature pad.
            </p>
            {pdfFile && (
              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-[#F4ECF8] px-2.5 py-[3px] text-[11.5px] font-semibold text-[#54206F]">
                <span className="material-symbols-outlined text-[12px]" aria-hidden="true">attach_file</span>
                {pdfFile.name} · {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setCreateOpen(false)}
            className="flex-1 rounded-[10px] border border-[#E5E1E8] bg-white px-4 py-3 text-[13px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateAgreement}
            disabled={saving === 'agreement'}
            className="flex-1 rounded-[10px] bg-[#6B2C91] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(107,44,145,0.25)] hover:bg-[#54206F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === 'agreement' ? 'Creating…' : 'Create agreement'}
          </button>
        </div>
      </Modal>

      <Modal open={templateOpen} onClose={() => setTemplateOpen(false)} title="Create template" wide>
        <div className="grid gap-4">
          <TextField label="Template name" value={templateForm.name} onChange={value => setTemplateForm(current => ({ ...current, name: value }))} />
          <p className="text-[11px] text-[#64748b]">
            All templates are used to generate agreements for NDIS clients.
          </p>
          <div>
            <label
              className="block text-[11px] font-semibold uppercase text-[#3F3548]"
              style={{ letterSpacing: '0.08em' }}
            >
              Body
            </label>
            <textarea
              rows={8}
              value={templateForm.body}
              onChange={event => setTemplateForm(current => ({ ...current, body: event.target.value }))}
              className="mt-2 w-full rounded-[10px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 py-3 text-[13.5px] text-[#1A1320] outline-none focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]"
            />
          </div>
        </div>
        <div className="mt-5 flex gap-2.5">
          <button
            type="button"
            onClick={() => setTemplateOpen(false)}
            className="flex-1 rounded-[10px] border border-[#E5E1E8] bg-white px-4 py-3 text-[13px] font-medium text-[#3F3548] hover:bg-[#F8F6FA]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreateTemplate}
            disabled={saving === 'template'}
            className="flex-1 rounded-[10px] bg-[#6B2C91] px-4 py-3 text-[13px] font-semibold text-white shadow-[0_4px_12px_rgba(107,44,145,0.25)] hover:bg-[#54206F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving === 'template' ? 'Saving…' : 'Save template'}
          </button>
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
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${accent ? 'bg-[#6B2C91]' : 'border border-[#e6e8ec] bg-white'}`}>
      <p className={`text-[12px] ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#0f172a]">{value}</p>
      <p className={`mt-2 text-xs ${accent ? 'text-[#54206F]' : 'text-[#64748b]'}`}>{sub}</p>
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
      <label
        className="block text-[11px] font-semibold uppercase text-[#3F3548]"
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-[44px] w-full rounded-[10px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 text-[13.5px] text-[#1A1320] outline-none transition-all focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]"
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
      <label
        className="block text-[11px] font-semibold uppercase text-[#3F3548]"
        style={{ letterSpacing: '0.08em' }}
      >
        {label}
      </label>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="mt-2 h-[44px] w-full rounded-[10px] border-[1.5px] border-[#E5E1E8] bg-white px-3.5 text-[13.5px] text-[#1A1320] outline-none transition-all focus:border-[#6B2C91] focus:shadow-[0_0_0_3px_#F4ECF8]"
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
  if (status === 'signed') return 'rounded-full bg-[#F4ECF8] px-2.5 py-1 text-[10px] font-semibold text-[#54206F]'
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
