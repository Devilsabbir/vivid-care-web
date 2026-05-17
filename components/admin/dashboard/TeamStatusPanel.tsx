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
  on_shift:  { bg: '#F1F9E1', text: '#5E8D1F', dot: '#8DC63F' },
  en_route:  { bg: '#FEF3D6', text: '#5C3A06' },
  on_break:  { bg: '#F1EEF4', text: '#3F3548' },
  available: { bg: '#E6F5FC', text: '#1380AB' },
  off:       { bg: '#F1EEF4', text: '#97909C' },
}

// Brand-tone avatar variants — same palette used on the Clients list.
const AVATAR_TONES: Array<{ bg: string; fg: string }> = [
  { bg: '#FCE4D6', fg: '#B85A1C' },
  { bg: '#E6F5FC', fg: '#1380AB' },
  { bg: '#F1F9E1', fg: '#5E8D1F' },
  { bg: '#FFE4E1', fg: '#B0364E' },
  { bg: '#F4ECF8', fg: '#54206F' },
]

function toneFor(id: string): { bg: string; fg: string } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return AVATAR_TONES[h % AVATAR_TONES.length]
}

/**
 * Team status rail card. Tinted-avatar list of the next ~6 workers with
 * status pills coloured by their current state. Matches the design's
 * .vc-avatar tone variants + the warm 6-tone status palette.
 */
export default function TeamStatusPanel({ members }: TeamStatusPanelProps) {
  return (
    <section className="rounded-[16px] bg-white p-5 shadow-[0_4px_14px_rgba(46,18,64,0.05),0_1px_3px_rgba(46,18,64,0.04)]">
      <div className="flex items-end justify-between">
        <h3 className="text-[14px] font-semibold leading-none text-[#1A1320]">Team status now</h3>
        <p className="text-[11.5px] font-medium text-[#6B6371]">
          {members.length} {members.length === 1 ? 'worker' : 'workers'}
        </p>
      </div>
      {members.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-[10px] bg-[#F8F6FA] py-6 text-center">
          <span className="material-symbols-outlined text-[20px] text-[#C7C2CB]" aria-hidden="true">groups</span>
          <p className="mt-1.5 text-[12px] font-medium text-[#6B6371]">No staff records yet.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {members.slice(0, 6).map((m) => {
            const s = STATUS_STYLES[m.status]
            const tone = toneFor(m.id)
            return (
              <li key={m.id} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold uppercase"
                  style={{ background: tone.bg, color: tone.fg, letterSpacing: '0.04em' }}
                >
                  {m.name
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium leading-tight text-[#1A1320]">
                    {m.name}
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-[#97909C]">{m.detail}</div>
                </div>
                <span
                  className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-semibold uppercase"
                  style={{ backgroundColor: s.bg, color: s.text, letterSpacing: '0.04em' }}
                >
                  {s.dot && (
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: s.dot }}
                      aria-hidden="true"
                    />
                  )}
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
