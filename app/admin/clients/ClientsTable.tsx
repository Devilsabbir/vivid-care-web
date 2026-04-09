'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ClientsTable({ clients }: { clients: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.ndis_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.address?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
      {/* Search bar */}
      <div className="px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center bg-surface-container-highest rounded-lg px-4 py-2.5 max-w-sm">
          <span className="material-symbols-outlined text-outline text-xl mr-2">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none flex-1"
          />
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label">
        <div className="col-span-4">Client</div>
        <div className="col-span-2">NDIS Number</div>
        <div className="col-span-3">Address</div>
        <div className="col-span-2">Phone</div>
        <div className="col-span-1"></div>
      </div>

      {/* Rows */}
      {filtered.length > 0 ? (
        <div>
          {filtered.map((client, i) => (
            <div
              key={client.id}
              className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/50 transition-colors ${i % 2 === 1 ? 'bg-surface-container-low/20' : ''}`}
            >
              <div className="col-span-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-primary-fixed rounded-xl flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                  {client.full_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-bold text-sm font-headline text-on-surface">{client.full_name}</p>
                  {client.date_of_birth && (
                    <p className="text-xs text-on-surface-variant">
                      Age {new Date().getFullYear() - new Date(client.date_of_birth).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
              <div className="col-span-2 text-sm text-on-surface-variant font-label">
                {client.ndis_number ?? '—'}
              </div>
              <div className="col-span-3 text-sm text-on-surface-variant truncate pr-4">
                {client.address ?? '—'}
              </div>
              <div className="col-span-2 text-sm text-on-surface-variant">
                {client.phone ?? '—'}
              </div>
              <div className="col-span-1 flex justify-end">
                <Link
                  href={`/admin/clients/${client.id}`}
                  className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">group</span>
          <p className="text-sm font-semibold">
            {search ? 'No clients match your search' : 'No clients yet'}
          </p>
          {!search && (
            <Link href="/admin/clients/new" className="inline-block mt-3 text-primary text-sm font-bold hover:underline">
              Add your first client →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
