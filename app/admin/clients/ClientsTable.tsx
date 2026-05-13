'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

type ClientCard = {
  id: string
  full_name: string
  client_type: 'ndis' | 'standard'
  ndis_number: string | null
  address: string | null
  phone: string | null
  shiftsThisWeek: number
  assignedStaff: number
  hasMappedAddress: boolean
}

export default function ClientsTable({ clients }: { clients: ClientCard[] }) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return clients.filter(client =>
      client.full_name.toLowerCase().includes(query) ||
      client.ndis_number?.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query) ||
      (client.client_type === 'ndis' ? 'ndis client' : 'client').includes(query)
    )
  }, [search, clients])

  return (
    <section className="overflow-hidden rounded-[28px] border border-[#e6e8ec] bg-white shadow-[0_16px_40px_rgba(26,26,24,0.04)]">
      <div className="border-b border-[#f0f1f3] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#0f172a]">Client registry</h3>
            <p className="text-xs text-[#64748b]">Browse funded clients, addresses, and weekly service allocation at a glance</p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-[#e6e8ec] bg-[#fafbfc] px-4 py-2.5 md:w-[340px]">
            <span className="material-symbols-outlined text-[18px] text-[#918d85]">search</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search clients..."
              className="w-full bg-transparent text-sm text-[#0f172a] placeholder:text-[#9d998f] outline-none"
            />
          </div>
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3 md:p-6">
          {filtered.map(client => (
            <Link
              key={client.id}
              href={`/admin/clients/${client.id}`}
              className="rounded-[22px] border border-[#e6e8ec] bg-[#fafbfc] p-5 transition-colors hover:bg-[#f7f8f9]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4338ca] text-sm font-semibold uppercase tracking-[0.14em] text-white">
                  {initials(client.full_name)}
                </div>
                <div className="min-w-0">
                  <h4 className="truncate text-sm font-semibold text-[#0f172a]">{client.full_name}</h4>
                  <p className="truncate text-xs text-[#64748b]">{client.address ?? client.phone ?? 'Client profile'}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatBox label="Shifts this week" value={String(client.shiftsThisWeek)} />
                <StatBox label="Assigned staff" value={String(client.assignedStaff)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {client.client_type === 'ndis' ? (
                  <span className="rounded-full bg-[#E6F5FC] px-2.5 py-1 text-[10px] font-semibold text-[#1380AB]">NDIS Client</span>
                ) : (
                  <span className="rounded-full bg-[#f7f8f9] px-2.5 py-1 text-[10px] font-semibold text-[#64748b]">Client</span>
                )}
                <span className={client.hasMappedAddress ? 'rounded-full bg-[#F4ECF8] px-2.5 py-1 text-[10px] font-semibold text-[#54206F]' : 'rounded-full bg-[#fef9c3] px-2.5 py-1 text-[10px] font-semibold text-[#92400e]'}>
                  {client.hasMappedAddress ? 'Address mapped' : 'Address review'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="px-6 py-16 text-center">
          <span className="material-symbols-outlined text-[44px] text-[#94a3b8]">group</span>
          <p className="mt-3 text-sm font-medium text-[#0f172a]">
            {search ? 'No clients match your search' : 'No client records yet'}
          </p>
          <p className="mt-1 text-xs text-[#64748b]">
            {search ? 'Try a different name, address, or NDIS number.' : 'Add your first client to start scheduling support.'}
          </p>
        </div>
      )}
    </section>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] bg-white px-3 py-3">
      <p className="text-[10px] text-[#94a3b8]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#0f172a]">{value}</p>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase())
    .join('')
}
