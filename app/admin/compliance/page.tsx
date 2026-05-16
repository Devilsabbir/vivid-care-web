import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { daysUntilExpiry, getExpiryStatus } from '@/lib/utils/expiry'

type Doc = {
  id: string
  owner_id: string
  owner_type: 'staff' | 'client'
  doc_type: string
  file_url: string | null
  file_name: string | null
  expiry_date: string | null
}

type Owner = { id: string; full_name: string | null }

const policyCards = [
  ['NDIS code of conduct', 'Starter policy card', 'indigo'],
  ['Incident reporting policy', 'Starter policy card', 'accent'],
  ['Staff handbook', 'Starter policy card', 'neutral'],
  ['Privacy and consent', 'Starter policy card', 'neutral'],
  ['Manual handling', 'Starter policy card', 'neutral'],
  ['Add policy document', 'Reserved for the policy module', 'dashed'],
] as const

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data, error: documentsError } = await supabase.from('documents').select('id, owner_id, owner_type, doc_type, file_url, file_name, expiry_date').not('expiry_date', 'is', null).order('expiry_date', { ascending: true })
  if (documentsError) console.error('[compliance page] documents fetch failed:', documentsError)
  const docs = (data ?? []) as Doc[]

  const staffIds = Array.from(new Set(docs.filter(doc => doc.owner_type === 'staff').map(doc => doc.owner_id)))
  const clientIds = Array.from(new Set(docs.filter(doc => doc.owner_type === 'client').map(doc => doc.owner_id)))
  const [{ data: staffOwners, error: staffOwnersError }, { data: clientOwners, error: clientOwnersError }] = await Promise.all([
    staffIds.length ? supabase.from('profiles').select('id, full_name').in('id', staffIds) : Promise.resolve({ data: [] as Owner[], error: null }),
    clientIds.length ? supabase.from('clients').select('id, full_name').in('id', clientIds) : Promise.resolve({ data: [] as Owner[], error: null }),
  ])
  if (staffOwnersError) console.error('[compliance page] profiles (staff owners) fetch failed:', staffOwnersError)
  if (clientOwnersError) console.error('[compliance page] clients (client owners) fetch failed:', clientOwnersError)

  const names = new Map<string, string>()
  ;(staffOwners ?? []).forEach(owner => names.set(owner.id, owner.full_name ?? 'Staff member'))
  ;(clientOwners ?? []).forEach(owner => names.set(owner.id, owner.full_name ?? 'Client record'))

  const rows = docs.map(doc => ({
    ...doc,
    name: names.get(doc.owner_id) ?? (doc.owner_type === 'staff' ? 'Staff member' : 'Client record'),
    href: doc.owner_type === 'staff' ? `/admin/staff/${doc.owner_id}` : `/admin/clients/${doc.owner_id}`,
    status: getExpiryStatus(doc.expiry_date),
    days: daysUntilExpiry(doc.expiry_date),
  }))
  const expired = rows.filter(doc => doc.status === 'expired')
  const soon = rows.filter(doc => doc.status === 'near_expiry')
  const valid = rows.filter(doc => doc.status === 'active')
  const blockedStaff = new Set(expired.filter(doc => doc.owner_type === 'staff').map(doc => doc.owner_id)).size

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1
            className="m-0 text-[28px] font-bold leading-[1.15] text-[#1A1320]"
            style={{ letterSpacing: '-0.02em' }}
          >
            Documents &amp; compliance
          </h1>
          <p className="mt-1.5 text-[14px] text-[#6B6371]">
            Live document health across staff and client records.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/staff"
            className="inline-flex h-[34px] items-center gap-1.5 rounded-[9px] bg-[#6B2C91] px-3 text-[12.5px] font-medium text-white hover:bg-[#54206F]"
          >
            <span className="material-symbols-outlined text-[14px]" aria-hidden="true">upload_file</span>
            Review uploads
          </Link>
        </div>
      </header>


      <section className="grid gap-4 xl:grid-cols-4">
        <Tile tone="white" icon="folder" label="Total documents" value={rows.length} sub={`Across staff and client records`} />
        <Tile tone="accent" icon="verified" label="Valid and current" value={valid.length} sub={`${percent(valid.length, rows.length)}% compliance rate`} />
        <Tile tone="white" icon="warning" label="Expiring soon" value={soon.length} sub="Within the 45-day window" badge="Review needed" danger="amber" />
        <Tile tone="white" icon="cancel" label="Expired" value={expired.length} sub={`${blockedStaff} staff currently blocked`} badge="Action required" danger="red" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[#e6e8ec] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex flex-col gap-4 border-b border-[#f0f1f3] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div><h3 className="text-sm font-semibold text-[#0f172a]">Compliance documents</h3><p className="text-xs text-[#64748b]">Renewals, qualifications, screening, and client-facing records</p></div>
              <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-xl bg-[#f7f8f9] px-3 py-1.5 text-[11px] text-[#64748b]"><span className="material-symbols-outlined text-[16px]">filter_alt</span>Sorted by expiry</span><Link href="/admin/staff" className="inline-flex items-center gap-1 rounded-xl bg-[#0f172a] px-3 py-1.5 text-[11px] font-medium text-white"><span className="material-symbols-outlined text-[16px]">upload</span>Upload entry</Link></div>
            </div>
            {rows.length > 0 ? <div className="overflow-x-auto"><table className="min-w-full border-collapse"><thead><tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#94a3b8]"><th className="px-6 py-3 font-medium">Document</th><th className="px-6 py-3 font-medium">Owner</th><th className="px-6 py-3 font-medium">Expires</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Action</th></tr></thead><tbody>{rows.slice(0, 10).map(doc => <tr key={doc.id} className="border-t border-[#f0f1f3] text-sm text-[#0f172a]"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${doc.status === 'expired' ? 'bg-[#fee2e2] text-[#dc2626]' : doc.status === 'near_expiry' ? 'bg-[#fef9c3] text-[#ca8a04]' : 'bg-[#F4ECF8] text-[#6B2C91]'}`}><span className="material-symbols-outlined text-[18px]">description</span></div><div><p className="font-medium text-[#0f172a]">{doc.doc_type}</p><p className="text-[11px] text-[#94a3b8]">{labelFile(doc.file_name)}</p></div></div></td><td className="px-6 py-4"><Link href={doc.href} className="inline-flex items-center gap-2 rounded-full bg-[#f7f8f9] px-3 py-1.5 text-[12px] text-[#64748b]"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] text-white ${doc.owner_type === 'staff' ? 'bg-[#2f5fda]' : 'bg-[#54206F]'}`}>{short(doc.name)}</span>{doc.name}</Link></td><td className={`px-6 py-4 text-[12px] font-medium ${doc.status === 'expired' ? 'text-[#dc2626]' : doc.status === 'near_expiry' ? 'text-[#ca8a04]' : 'text-[#64748b]'}`}>{formatDate(doc.expiry_date)}</td><td className="px-6 py-4"><span className={chip(doc.status)}>{copyStatus(doc.status, doc.days)}</span></td><td className="px-6 py-4 text-right">{doc.file_url ? <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-[#e6e8ec] px-3 py-1.5 text-[11px] text-[#64748b]">Open<span className="material-symbols-outlined text-[14px]">north_east</span></a> : <span className="text-[11px] text-[#94a3b8]">No file</span>}</td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><span className="material-symbols-outlined text-[40px] text-[#94a3b8]">description</span><p className="mt-3 text-sm font-medium text-[#0f172a]">No compliance documents with expiry dates yet</p><p className="mt-1 text-xs text-[#64748b]">Upload documents from staff and client profiles to activate this workspace.</p></div>}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#e6e8ec] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#f0f1f3] px-5 py-4 md:px-6"><div><h3 className="text-sm font-semibold text-[#0f172a]">Policy and handbook hub</h3><p className="text-xs text-[#64748b]">Starter structure for the policy-library module in the next implementation slice</p></div><span className="rounded-xl bg-[#0f172a] px-3 py-1.5 text-[11px] font-medium text-white">Phase 2 ready</span></div>
            <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
              {policyCards.map(([title, meta, tone]) => <div key={title} className={`rounded-[18px] p-4 ${tone === 'dashed' ? 'border border-dashed border-[#dad5cb] bg-[#fafbfc] text-center' : 'border border-[#ece8e1] bg-white'}`}><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'indigo' ? 'bg-[#E6F5FC] text-[#1380AB]' : tone === 'accent' ? 'bg-[#6B2C91] text-[#0f172a]' : 'bg-[#f0ede7] text-[#88847d]'}`}><span className="material-symbols-outlined text-[18px]">description</span></div><p className="mt-4 text-sm font-medium text-[#0f172a]">{title}</p><p className="mt-1 text-[11px] text-[#94a3b8]">{meta}</p></div>)}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0f1f3] px-4 py-3"><h3 className="text-sm font-semibold text-[#0f172a]">Expiring within 45 days</h3></div>
            <div className="space-y-1 p-2">
              {soon.concat(expired).slice(0, 5).map(doc => <Link key={doc.id} href={doc.href} className="flex items-center gap-3 rounded-[18px] px-3 py-3 hover:bg-[#fafbfc]"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] text-white ${doc.owner_type === 'staff' ? 'bg-[#2f5fda]' : 'bg-[#54206F]'}`}>{short(doc.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-[#0f172a]">{doc.name}</p><p className="truncate text-[10px] text-[#94a3b8]">{doc.doc_type}</p></div><span className={`text-[10px] font-medium ${doc.status === 'expired' ? 'text-[#dc2626]' : 'text-[#ca8a04]'}`}>{doc.days !== null && doc.days < 0 ? `${Math.abs(doc.days)}d` : `${doc.days ?? 0}d`}</span></Link>)}
              {soon.length + expired.length === 0 ? <div className="px-4 py-6 text-center text-xs text-[#7c7a72]">Nothing is approaching expiry right now.</div> : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0f1f3] px-4 py-3"><h3 className="text-sm font-semibold text-[#0f172a]">Agreement signatures</h3></div>
            <div className="space-y-3 px-4 py-4"><div className="rounded-[18px] bg-[#fafbfc] p-4"><p className="text-[12px] font-medium text-[#0f172a]">Reserved for the agreement module</p><p className="mt-1 text-[11px] leading-5 text-[#64748b]">The current schema does not have agreement or signature tables yet, so this panel stays honest while keeping the UI structure ready.</p></div><div className="rounded-[18px] border border-dashed border-[#dad5cb] px-4 py-3 text-[11px] text-[#64748b]">Next step: wire agreement templates, signature capture, and renewal statuses into this rail.</div></div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e6e8ec] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0f1f3] px-4 py-3"><h3 className="text-sm font-semibold text-[#0f172a]">Upload a document</h3></div>
            <div className="p-4"><Link href="/admin/staff" className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#e6e8ec] bg-[#fafbfc] px-5 py-6 text-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ede7] text-[#64748b]"><span className="material-symbols-outlined text-[18px]">upload_file</span></div><div><p className="text-sm font-medium text-[#0f172a]">Open upload workflow</p><p className="mt-1 text-[11px] leading-5 text-[#64748b]">Staff and client profile pages already hold the current upload entry point.</p></div><span className="rounded-xl bg-[#0f172a] px-3 py-1.5 text-[11px] font-medium text-white">Go to profiles</span></Link></div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Tile({
  tone, icon, label, value, sub, badge, danger,
}: {
  tone: 'white' | 'accent'
  icon: string
  label: string
  value: number
  sub: string
  badge?: string
  danger?: 'amber' | 'red'
}) {
  const isAccent = tone === 'accent'
  const labelColor = isAccent ? 'rgba(255,255,255,0.7)' : '#6B6371'
  const valueColor = isAccent ? '#FFFFFF' : danger === 'red' ? '#DC2626' : danger === 'amber' ? '#D97706' : '#1A1320'
  const subColor = isAccent ? 'rgba(255,255,255,0.7)' : '#97909C'
  const iconBg = isAccent ? 'rgba(255,255,255,0.18)' : '#F4ECF8'
  const iconFg = isAccent ? '#FFFFFF' : '#54206F'
  return (
    <div
      className="relative overflow-hidden rounded-[16px] shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]"
      style={{ padding: '18px 60px 18px 18px', background: isAccent ? '#6B2C91' : '#FFFFFF' }}
    >
      <div
        className="absolute right-3.5 top-3.5 flex h-8 w-8 items-center justify-center rounded-[9px]"
        style={{ background: iconBg, color: iconFg }}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{icon}</span>
      </div>
      <p
        className="text-[12px] font-medium uppercase"
        style={{ letterSpacing: '0.06em', color: labelColor }}
      >
        {label}
      </p>
      <p
        className="mt-3 text-[32px] font-bold leading-none"
        style={{ letterSpacing: '-0.02em', color: valueColor }}
      >
        {value}
      </p>
      <p className="mt-2 text-[11.5px] font-medium" style={{ color: subColor }}>{sub}</p>
      {badge ? (
        <span
          className="mt-2.5 inline-flex rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase"
          style={{
            letterSpacing: '0.04em',
            background: danger === 'red' ? '#FCE7E7' : '#FEF3D6',
            color: danger === 'red' ? '#DC2626' : '#5C3A06',
          }}
        >
          {badge}
        </span>
      ) : null}
    </div>
  )
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function short(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('')
}

function labelFile(fileName: string | null) {
  const ext = fileName?.split('.').pop()?.toUpperCase()
  return ext ? `${ext} file` : 'Document file'
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry'
}

function chip(status: 'expired' | 'near_expiry' | 'active' | 'none') {
  if (status === 'expired') return 'inline-flex rounded-full bg-[#fee2e2] px-2.5 py-1 text-[10px] font-semibold text-[#991b1b]'
  if (status === 'near_expiry') return 'inline-flex rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'
  return 'inline-flex rounded-full bg-[#F4ECF8] px-2.5 py-1 text-[10px] font-semibold text-[#54206F]'
}

function copyStatus(status: 'expired' | 'near_expiry' | 'active' | 'none', days: number | null) {
  if (status === 'expired') return days !== null ? `Expired ${Math.abs(days)}d ago` : 'Expired'
  if (status === 'near_expiry') return days === 0 ? 'Expires today' : `Expires in ${days ?? 0}d`
  return 'Valid'
}
