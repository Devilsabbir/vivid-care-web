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
    <section className="overflow-hidden rounded-[16px] bg-white shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="border-b border-[#F1EEF4] px-5 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-[16px] font-semibold leading-none text-[#1A1320]">Client registry</h3>
            <p className="mt-1.5 text-[12.5px] text-[#6B6371]">
              Browse funded clients, addresses, and weekly service allocation at a glance
            </p>
          </div>
          <div className="flex h-9 items-center gap-2.5 rounded-[10px] border border-[#F1EEF4] bg-[#F8F6FA] px-3 md:w-[340px]">
            <span className="material-symbols-outlined text-[16px] text-[#97909C]">search</span>
            <input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder="Search clients, NDIS numbers, addresses…"
              className="w-full bg-transparent text-[13.5px] text-[#1A1320] outline-none placeholder:text-[#97909C]"
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
              className="group rounded-[16px] border border-[#F1EEF4] bg-white p-5 transition-all hover:border-[#E6D4F0] hover:bg-[#F8F6FA] hover:shadow-[0_4px_14px_rgba(46,18,64,0.05)]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold uppercase tracking-[0.1em] text-white"
                  style={{
                    background:
                      client.client_type === 'ndis'
                        ? 'linear-gradient(135deg, #6B2C91 0%, #2BAEE0 100%)'
                        : 'linear-gradient(135deg, #6B2C91 0%, #54206F 100%)',
                  }}
                >
                  {initials(client.full_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-[14px] font-semibold leading-tight text-[#1A1320] group-hover:text-[#54206F]">
                    {client.full_name}
                  </h4>
                  <p className="mt-1 truncate text-[12px] text-[#6B6371]">
                    {client.address ?? client.phone ?? 'Client profile'}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <StatBox label="Shifts this week" value={String(client.shiftsThisWeek)} />
                <StatBox label="Assigned staff" value={String(client.assignedStaff)} />
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {client.client_type === 'ndis' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F5FC] px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#1380AB]">
                    NDIS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F1EEF4] px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#3F3548]">
                    Standard
                  </span>
                )}
                <span
                  className={
                    client.hasMappedAddress
                      ? 'inline-flex items-center gap-1 rounded-full bg-[#F4ECF8] px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#54206F]'
                      : 'inline-flex items-center gap-1 rounded-full bg-[#FEF3D6] px-2 py-[3px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#92400E]'
                  }
                >
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
    <div className="rounded-[10px] bg-[#F8F6FA] px-3 py-2.5">
      <p
        className="text-[10px] font-medium uppercase text-[#97909C]"
        style={{ letterSpacing: '0.06em' }}
      >
        {label}
      </p>
      <p className="mt-1 text-[15px] font-bold text-[#1A1320]" style={{ letterSpacing: '-0.01em' }}>
        {value}
      </p>
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
