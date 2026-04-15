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
  ['Incident reporting policy', 'Starter policy card', 'lime'],
  ['Staff handbook', 'Starter policy card', 'neutral'],
  ['Privacy and consent', 'Starter policy card', 'neutral'],
  ['Manual handling', 'Starter policy card', 'neutral'],
  ['Add policy document', 'Reserved for the policy module', 'dashed'],
] as const

export default async function CompliancePage() {
  const supabase = await createClient()
  const { data } = await supabase.from('documents').select('id, owner_id, owner_type, doc_type, file_url, file_name, expiry_date').not('expiry_date', 'is', null).order('expiry_date', { ascending: true })
  const docs = (data ?? []) as Doc[]

  const staffIds = Array.from(new Set(docs.filter(doc => doc.owner_type === 'staff').map(doc => doc.owner_id)))
  const clientIds = Array.from(new Set(docs.filter(doc => doc.owner_type === 'client').map(doc => doc.owner_id)))
  const [{ data: staffOwners }, { data: clientOwners }] = await Promise.all([
    staffIds.length ? supabase.from('profiles').select('id, full_name').in('id', staffIds) : Promise.resolve({ data: [] as Owner[], error: null }),
    clientIds.length ? supabase.from('clients').select('id, full_name').in('id', clientIds) : Promise.resolve({ data: [] as Owner[], error: null }),
  ])

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
      <header className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]">
            <span className="font-headline">Document</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#c852ff] px-4 py-1 text-sm font-semibold tracking-normal text-[#1a1a18]"><span className="material-symbols-outlined text-[18px]">description</span>hub</span>
          </div>
          <div className="text-[2rem] font-medium tracking-[-0.05em] text-[#1a1a18] md:text-[2.35rem]"><span className="font-headline">and compliance</span></div>
          <p className="text-sm text-[#6c6b66]">Live document health across staff, client, and compliance records</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/notifications" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]"><span className="material-symbols-outlined text-[20px]">notifications</span></Link>
          <Link href="/admin/staff" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#ddd9d1] bg-white text-[#5e5b54]"><span className="material-symbols-outlined text-[20px]">badge</span></Link>
          <Link href="/admin/staff" className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-5 py-2.5 text-sm font-semibold text-white"><span className="material-symbols-outlined text-[18px]">upload_file</span>Review uploads</Link>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2 rounded-full bg-[#dfddd7] p-1.5 text-xs font-medium">
        <span className="rounded-full bg-[#1a1a18] px-4 py-2 text-white">All documents</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">My documents</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Compliance</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Agreements</span>
        <span className="rounded-full px-4 py-2 text-[#6d6b64]">Policy hub</span>
      </nav>

      <section className="grid gap-4 xl:grid-cols-4">
        <Tile tone="white" icon="folder" label="Total documents" value={rows.length} sub={`Across staff and client records`} />
        <Tile tone="lime" icon="verified" label="Valid and current" value={valid.length} sub={`${percent(valid.length, rows.length)}% compliance rate`} />
        <Tile tone="white" icon="warning" label="Expiring soon" value={soon.length} sub="Within the 45-day window" badge="Review needed" danger="amber" />
        <Tile tone="white" icon="cancel" label="Expired" value={expired.length} sub={`${blockedStaff} staff currently blocked`} badge="Action required" danger="red" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-[28px] border border-[#e8e4dc] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex flex-col gap-4 border-b border-[#f0ece5] px-5 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <div><h3 className="text-sm font-semibold text-[#1a1a18]">Compliance documents</h3><p className="text-xs text-[#8a877f]">Renewals, qualifications, screening, and client-facing records</p></div>
              <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded-xl bg-[#f7f5f0] px-3 py-1.5 text-[11px] text-[#66635b]"><span className="material-symbols-outlined text-[16px]">filter_alt</span>Sorted by expiry</span><Link href="/admin/staff" className="inline-flex items-center gap-1 rounded-xl bg-[#1a1a18] px-3 py-1.5 text-[11px] font-medium text-white"><span className="material-symbols-outlined text-[16px]">upload</span>Upload entry</Link></div>
            </div>
            {rows.length > 0 ? <div className="overflow-x-auto"><table className="min-w-full border-collapse"><thead><tr className="text-left text-[10px] uppercase tracking-[0.14em] text-[#adaba4]"><th className="px-6 py-3 font-medium">Document</th><th className="px-6 py-3 font-medium">Owner</th><th className="px-6 py-3 font-medium">Expires</th><th className="px-6 py-3 font-medium">Status</th><th className="px-6 py-3 font-medium text-right">Action</th></tr></thead><tbody>{rows.slice(0, 10).map(doc => <tr key={doc.id} className="border-t border-[#f5f1ea] text-sm text-[#1a1a18]"><td className="px-6 py-4"><div className="flex items-center gap-3"><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${doc.status === 'expired' ? 'bg-[#fee2e2] text-[#dc2626]' : doc.status === 'near_expiry' ? 'bg-[#fef9c3] text-[#ca8a04]' : 'bg-[#dcfce7] text-[#16a34a]'}`}><span className="material-symbols-outlined text-[18px]">description</span></div><div><p className="font-medium text-[#1a1a18]">{doc.doc_type}</p><p className="text-[11px] text-[#a19e95]">{labelFile(doc.file_name)}</p></div></div></td><td className="px-6 py-4"><Link href={doc.href} className="inline-flex items-center gap-2 rounded-full bg-[#f4f2ed] px-3 py-1.5 text-[12px] text-[#4f4c45]"><span className={`flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] text-white ${doc.owner_type === 'staff' ? 'bg-[#2f5fda]' : 'bg-[#2b8a3e]'}`}>{short(doc.name)}</span>{doc.name}</Link></td><td className={`px-6 py-4 text-[12px] font-medium ${doc.status === 'expired' ? 'text-[#dc2626]' : doc.status === 'near_expiry' ? 'text-[#ca8a04]' : 'text-[#6f6b63]'}`}>{formatDate(doc.expiry_date)}</td><td className="px-6 py-4"><span className={chip(doc.status)}>{copyStatus(doc.status, doc.days)}</span></td><td className="px-6 py-4 text-right">{doc.file_url ? <a href={doc.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-[#e5e1d9] px-3 py-1.5 text-[11px] text-[#555149]">Open<span className="material-symbols-outlined text-[14px]">north_east</span></a> : <span className="text-[11px] text-[#aaa79f]">No file</span>}</td></tr>)}</tbody></table></div> : <div className="px-6 py-14 text-center"><span className="material-symbols-outlined text-[40px] text-[#b2aea4]">description</span><p className="mt-3 text-sm font-medium text-[#1a1a18]">No compliance documents with expiry dates yet</p><p className="mt-1 text-xs text-[#8a877f]">Upload documents from staff and client profiles to activate this workspace.</p></div>}
          </section>

          <section className="overflow-hidden rounded-[28px] border border-[#e8e4dc] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
            <div className="flex items-center justify-between gap-3 border-b border-[#f0ece5] px-5 py-4 md:px-6"><div><h3 className="text-sm font-semibold text-[#1a1a18]">Policy and handbook hub</h3><p className="text-xs text-[#8a877f]">Starter structure for the policy-library module in the next implementation slice</p></div><span className="rounded-xl bg-[#1a1a18] px-3 py-1.5 text-[11px] font-medium text-white">Phase 2 ready</span></div>
            <div className="grid gap-3 p-5 md:grid-cols-3 md:p-6">
              {policyCards.map(([title, meta, tone]) => <div key={title} className={`rounded-[18px] p-4 ${tone === 'dashed' ? 'border border-dashed border-[#dad5cb] bg-[#faf9f6] text-center' : 'border border-[#ece8e1] bg-white'}`}><div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'indigo' ? 'bg-[#eef2ff] text-[#3b5bdb]' : tone === 'lime' ? 'bg-[#c852ff] text-[#1a1a18]' : 'bg-[#f0ede7] text-[#88847d]'}`}><span className="material-symbols-outlined text-[18px]">description</span></div><p className="mt-4 text-sm font-medium text-[#1a1a18]">{title}</p><p className="mt-1 text-[11px] text-[#9c998f]">{meta}</p></div>)}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3"><h3 className="text-sm font-semibold text-[#1a1a18]">Expiring within 45 days</h3></div>
            <div className="space-y-1 p-2">
              {soon.concat(expired).slice(0, 5).map(doc => <Link key={doc.id} href={doc.href} className="flex items-center gap-3 rounded-[18px] px-3 py-3 hover:bg-[#faf9f6]"><span className={`flex h-8 w-8 items-center justify-center rounded-full text-[9px] font-semibold uppercase tracking-[0.14em] text-white ${doc.owner_type === 'staff' ? 'bg-[#2f5fda]' : 'bg-[#2b8a3e]'}`}>{short(doc.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium text-[#1a1a18]">{doc.name}</p><p className="truncate text-[10px] text-[#a19e95]">{doc.doc_type}</p></div><span className={`text-[10px] font-medium ${doc.status === 'expired' ? 'text-[#dc2626]' : 'text-[#ca8a04]'}`}>{doc.days !== null && doc.days < 0 ? `${Math.abs(doc.days)}d` : `${doc.days ?? 0}d`}</span></Link>)}
              {soon.length + expired.length === 0 ? <div className="px-4 py-6 text-center text-xs text-[#7c7a72]">Nothing is approaching expiry right now.</div> : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3"><h3 className="text-sm font-semibold text-[#1a1a18]">Agreement signatures</h3></div>
            <div className="space-y-3 px-4 py-4"><div className="rounded-[18px] bg-[#faf9f6] p-4"><p className="text-[12px] font-medium text-[#1a1a18]">Reserved for the agreement module</p><p className="mt-1 text-[11px] leading-5 text-[#8a877f]">The current schema does not have agreement or signature tables yet, so this panel stays honest while keeping the UI structure ready.</p></div><div className="rounded-[18px] border border-dashed border-[#dad5cb] px-4 py-3 text-[11px] text-[#8a877f]">Next step: wire agreement templates, signature capture, and renewal statuses into this rail.</div></div>
          </section>

          <section className="overflow-hidden rounded-[24px] border border-[#e8e4dc] bg-white shadow-[0_12px_32px_rgba(26,26,24,0.04)]">
            <div className="border-b border-[#f0ece5] px-4 py-3"><h3 className="text-sm font-semibold text-[#1a1a18]">Upload a document</h3></div>
            <div className="p-4"><Link href="/admin/staff" className="flex flex-col items-center gap-3 rounded-[18px] border border-dashed border-[#d6d2c9] bg-[#faf9f6] px-5 py-6 text-center"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0ede7] text-[#8a877f]"><span className="material-symbols-outlined text-[18px]">upload_file</span></div><div><p className="text-sm font-medium text-[#1a1a18]">Open upload workflow</p><p className="mt-1 text-[11px] leading-5 text-[#8a877f]">Staff and client profile pages already hold the current upload entry point.</p></div><span className="rounded-xl bg-[#1a1a18] px-3 py-1.5 text-[11px] font-medium text-white">Go to profiles</span></Link></div>
          </section>
        </aside>
      </div>
    </div>
  )
}

function Tile({
  tone, icon, label, value, sub, badge, danger,
}: {
  tone: 'white' | 'lime'
  icon: string
  label: string
  value: number
  sub: string
  badge?: string
  danger?: 'amber' | 'red'
}) {
  return (
    <div className={`rounded-[24px] p-5 shadow-[0_14px_32px_rgba(26,26,24,0.04)] ${tone === 'lime' ? 'bg-[#c852ff]' : 'border border-[#e8e4dc] bg-white'}`}>
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone === 'lime' ? 'bg-black/10 text-[#1a1a18]' : 'bg-[#f3f1eb] text-[#6c6962]'}`}><span className="material-symbols-outlined text-[18px]">{icon}</span></div>
      <p className={`mt-4 text-[12px] ${tone === 'lime' ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{label}</p>
      <p className="mt-2 font-headline text-[2.35rem] leading-none tracking-[-0.07em] text-[#1a1a18]">{value}</p>
      <p className={`mt-2 text-xs ${tone === 'lime' ? 'text-[#5e0087]' : 'text-[#8a877f]'}`}>{sub}</p>
      {badge ? <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${danger === 'red' ? 'bg-[#fee2e2] text-[#991b1b]' : 'bg-[#fef9c3] text-[#92400e]'}`}>{badge}</span> : null}
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
  return 'inline-flex rounded-full bg-[#dcfce7] px-2.5 py-1 text-[10px] font-semibold text-[#166534]'
}

function copyStatus(status: 'expired' | 'near_expiry' | 'active' | 'none', days: number | null) {
  if (status === 'expired') return days !== null ? `Expired ${Math.abs(days)}d ago` : 'Expired'
  if (status === 'near_expiry') return days === 0 ? 'Expires today' : `Expires in ${days ?? 0}d`
  return 'Valid'
}
