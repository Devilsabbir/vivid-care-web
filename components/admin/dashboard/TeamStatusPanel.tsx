export interface TeamMember {
  id: string
  name: string
  detail: string
  status: 'on_shift' | 'en_route' | 'on_break' | 'available' | 'off'
}

interface TeamStatusPanelProps {
  members: TeamMember[]
}

const STATUS_LABELS: Record<TeamMember['status'], string> = {
  on_shift: 'On shift',
  en_route: 'En route',
  on_break: 'On break',
  available: 'Available',
  off: 'Off',
}

const STATUS_STYLES: Record<TeamMember['status'], { bg: string; text: string; dot?: string }> = {
  on_shift:  { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
  en_route:  { bg: '#FEF3D6', text: '#78350F' },
  on_break:  { bg: '#F1EEF4', text: '#475569' },
  available: { bg: '#E6F5FC', text: '#1380AB' },
  off:       { bg: '#F1EEF4', text: '#94a3b8' },
}

export default function TeamStatusPanel({ members }: TeamStatusPanelProps) {
  return (
    <section className="rounded-[16px] border border-[#e6e8ec] bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold text-[#0f172a]">Team status now</h3>
        <p className="text-[11.5px] text-[#64748b]">{members.length} workers</p>
      </div>
      {members.length === 0 ? (
        <p className="mt-4 text-[12px] text-[#94a3b8]">No staff records yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {members.slice(0, 6).map(m => {
            const s = STATUS_STYLES[m.status]
            return (
              <li key={m.id} className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f0f1f3] text-[10px] font-semibold uppercase text-[#475569]">
                  {m.name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[12.5px] font-medium text-[#0f172a]">{m.name}</div>
                  <div className="truncate text-[10.5px] text-[#94a3b8]">{m.detail}</div>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-semibold"
                  style={{ backgroundColor: s.bg, color: s.text }}
                >
                  {s.dot && <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.dot }} />}
                  {STATUS_LABELS[m.status]}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
