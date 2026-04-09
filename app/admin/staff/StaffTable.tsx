'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function StaffTable({ staff }: { staff: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = staff.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm">
      <div className="px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center bg-surface-container-highest rounded-lg px-4 py-2.5 max-w-sm">
          <span className="material-symbols-outlined text-outline text-xl mr-2">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="bg-transparent text-sm text-on-surface placeholder:text-outline focus:outline-none flex-1"
          />
        </div>
      </div>

      <div className="grid grid-cols-12 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-on-surface-variant font-label">
        <div className="col-span-5">Staff Member</div>
        <div className="col-span-3">Phone</div>
        <div className="col-span-3">Status</div>
        <div className="col-span-1"></div>
      </div>

      {filtered.length > 0 ? (
        <div>
          {filtered.map((s, i) => (
            <div
              key={s.id}
              className={`grid grid-cols-12 px-6 py-4 items-center hover:bg-surface-container-low/50 transition-colors ${i % 2 === 1 ? 'bg-surface-container-low/20' : ''}`}
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-9 h-9 bg-secondary-fixed rounded-xl flex items-center justify-center text-secondary font-bold text-sm flex-shrink-0">
                  {s.full_name?.charAt(0) ?? '?'}
                </div>
                <div>
                  <p className="font-bold text-sm font-headline text-on-surface">{s.full_name}</p>
                  <p className="text-xs text-on-surface-variant">{s.id.slice(0, 8)}…</p>
                </div>
              </div>
              <div className="col-span-3 text-sm text-on-surface-variant">{s.phone ?? '—'}</div>
              <div className="col-span-3">
                <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary font-label">
                  Active
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <Link href={`/admin/staff/${s.id}`} className="p-1.5 rounded-lg hover:bg-surface-container transition-colors text-outline">
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">badge</span>
          <p className="text-sm font-semibold">{search ? 'No staff match your search' : 'No staff yet'}</p>
          {!search && (
            <Link href="/admin/staff/new" className="inline-block mt-3 text-primary text-sm font-bold hover:underline">
              Add your first staff member →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
