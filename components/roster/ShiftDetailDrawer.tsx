'use client'

import Link from 'next/link'
import Drawer from '@/components/ui/Drawer'
import StatusBadge from '@/components/ui/StatusBadge'
import Field from '@/components/ui/Field'

interface ShiftDetail {
  id: string
  start_time: string
  end_time: string
  status: string
  staff_id?: string | null
  staff_name?: string | null
  client_id?: string | null
  client_name?: string | null
  support_type?: string | null
  location?: string | null
  notes?: string | null
  clock_in_time?: string | null
  clock_out_time?: string | null
}

export default function ShiftDetailDrawer({
  shift,
  open,
  onClose,
}: {
  shift: ShiftDetail | null
  open: boolean
  onClose: () => void
}) {
  if (!shift) return null

  const startDate = new Date(shift.start_time)
  const endDate = new Date(shift.end_time)

  return (
    <Drawer open={open} onClose={onClose} title="Shift detail">
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <StatusBadge status={shift.status as any} />
        </div>

        <div className="grid gap-3">
          <Field
            label="Date"
            value={startDate.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Start"
              value={startDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
            />
            <Field
              label="End"
              value={endDate.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}
            />
          </div>
          {shift.client_name && <Field label="Client" value={shift.client_name} />}
          {shift.staff_name && <Field label="Staff" value={shift.staff_name} />}
          {shift.support_type && <Field label="Support type" value={shift.support_type} />}
          {shift.location && <Field label="Location" value={shift.location} />}
          {shift.notes && <Field label="Notes" value={shift.notes} />}
        </div>

        {(shift.clock_in_time || shift.clock_out_time) && (
          <div className="rounded-[18px] border border-[#e8e4dc] p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[#9b988f]">Clock events</p>
            <div className="mt-2 space-y-1 text-sm text-[#4f4c45]">
              {shift.clock_in_time && (
                <p>Clocked in: {new Date(shift.clock_in_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</p>
              )}
              {shift.clock_out_time && (
                <p>Clocked out: {new Date(shift.clock_out_time).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()}</p>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-[#f0ece5] pt-4">
          {shift.client_id && (
            <Link
              href={`/admin/clients/${shift.client_id}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f4f2ed] px-4 py-2.5 text-sm font-medium text-[#4f4c45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">person</span>
              View client
            </Link>
          )}
          {shift.staff_id && (
            <Link
              href={`/admin/staff/${shift.staff_id}`}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#f4f2ed] px-4 py-2.5 text-sm font-medium text-[#4f4c45] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6]"
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">badge</span>
              View staff
            </Link>
          )}
          <Link
            href={`/admin/shifts/${shift.id}`}
            className="inline-flex items-center gap-2 rounded-2xl bg-[#1a1a18] px-4 py-2.5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B45A6] focus-visible:ring-offset-2"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">open_in_new</span>
            Full shift detail
          </Link>
        </div>
      </div>
    </Drawer>
  )
}
