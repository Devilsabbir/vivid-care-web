// roster.jsx — VividCare Admin Roster (week grid + day timeline + staff rows)

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am..9pm
const fmtHour = (h) => {
  const ap = h < 12 ? 'am' : 'pm';
  const hh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hh}${ap}`;
};
const fmtTime = (h) => {
  const ap = h < 12 ? 'am' : 'pm';
  const m = (h % 1) * 60;
  const hh = Math.floor(h) === 0 ? 12 : Math.floor(h) > 12 ? Math.floor(h) - 12 : Math.floor(h);
  return m ? `${hh}:${String(m).padStart(2,'0')}${ap}` : `${hh}${ap}`;
};

function ShiftPill({ shift, onClick, compact = false, showWarn = true }) {
  const I = window.Icons;
  const staff = window.VC_STAFF.find(s => s.id === shift.staffId);
  const client = window.VC_CLIENTS.find(c => c.id === shift.clientId);
  const support = window.VC_SUPPORT_TYPES.find(s => s.id === shift.support);

  const isUnassigned = shift.status === 'unassigned';
  const isMissed = shift.status === 'missed';
  const isInProgress = shift.status === 'in_progress';
  const isCompleted = shift.status === 'completed';
  const isCancelled = shift.status === 'cancelled';
  const hasConflict = shift.conflicts?.length > 0;

  let bg, border, fg, accent;
  if (isUnassigned)       { bg = '#fffbeb'; border = '#fcd34d'; fg = '#78350f'; accent = '#d97706'; }
  else if (isMissed)      { bg = '#fef2f2'; border = '#fca5a5'; fg = '#7f1d1d'; accent = '#dc2626'; }
  else if (isInProgress)  { bg = '#f0fdfa'; border = '#5eead4'; fg = '#134e4a'; accent = '#0d9488'; }
  else if (isCompleted)   { bg = '#fafbfc'; border = '#e6e8ec'; fg = '#475569'; accent = '#94a3b8'; }
  else if (isCancelled)   { bg = '#fafbfc'; border = '#e6e8ec'; fg = '#94a3b8'; accent = '#cbd5e1'; }
  else                    { bg = '#ffffff'; border = '#e6e8ec'; fg = '#0f172a'; accent = support?.color || '#2563eb'; }

  if (hasConflict) { border = '#fca5a5'; }

  return (
    <div className="vc-shift-card" onClick={onClick} style={{
      background: bg, borderColor: border, color: fg,
      paddingLeft: 10,
      borderLeft: `3px solid ${accent}`,
      textDecoration: isCancelled ? 'line-through' : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600, fontSize: 11.5 }}>
        <span className="vc-tnum">{fmtTime(shift.start)}–{fmtTime(shift.end)}</span>
        {isInProgress && <span style={{
          marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 10, fontWeight: 600, color: '#0d9488',
        }}><span className="vc-pulse" style={{ width: 5, height: 5, borderRadius: '50%', background: '#0d9488' }}/>LIVE</span>}
        {showWarn && (hasConflict || isMissed || isUnassigned) && (
          <I.warn size={12} stroke={2.2} style={{ marginLeft: 'auto', color: accent }}/>
        )}
      </div>
      {!compact && (
        <>
          <div style={{ fontWeight: 500, fontSize: 11.5, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client?.name}
          </div>
          <div style={{ fontSize: 10.5, color: fg, opacity: 0.7, marginTop: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent }}/>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {support?.label}
            </span>
          </div>
          {staff && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
              <Avatar initials={staff.initials} color={staff.color} size={16}/>
              <span style={{ fontSize: 10.5, color: fg, opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {staff.name.split(' ')[0]} {staff.name.split(' ')[1]?.[0]}.
              </span>
            </div>
          )}
          {isUnassigned && (
            <div style={{ marginTop: 4, fontSize: 10.5, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', gap: 4 }}>
              <I.warn size={11} stroke={2.2}/> Unassigned
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RosterFilterBar({ view, setView, showCompliance, setShowCompliance }) {
  const I = window.Icons;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
      borderBottom: '1px solid var(--vc-border)', background: 'var(--vc-surface)',
    }}>
      <button className="vc-btn vc-btn-ghost vc-btn-icon"><I.chevronLeft size={15}/></button>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--vc-text)', minWidth: 180 }}>
        Apr 27 – May 3, 2026 <span style={{ color: 'var(--vc-text-4)', fontWeight: 400, marginLeft: 6 }}>· Week 18</span>
      </div>
      <button className="vc-btn vc-btn-ghost vc-btn-icon"><I.chevronRight size={15}/></button>
      <button className="vc-btn vc-btn-ghost" style={{ height: 30, fontSize: 12 }}>Today</button>

      <div style={{ width: 1, height: 22, background: 'var(--vc-border)', margin: '0 4px' }}/>

      <div style={{
        display: 'flex', padding: 2, background: 'var(--vc-surface-2)',
        border: '1px solid var(--vc-border)', borderRadius: 7,
      }}>
        {[
          { id: 'week', label: 'Week' },
          { id: 'day', label: 'Day' },
          { id: 'staff', label: 'Staff' },
        ].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            height: 24, padding: '0 10px', border: 0, fontSize: 12, fontWeight: 500,
            borderRadius: 5, cursor: 'pointer',
            background: view === v.id ? 'var(--vc-surface)' : 'transparent',
            color: view === v.id ? 'var(--vc-text)' : 'var(--vc-text-3)',
            boxShadow: view === v.id ? 'var(--vc-shadow-sm)' : 'none',
          }}>{v.label}</button>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: 'var(--vc-border)', margin: '0 4px' }}/>

      <button className="vc-btn vc-btn-secondary vc-btn-sm">
        <I.filter size={12}/> All staff
      </button>
      <button className="vc-btn vc-btn-secondary vc-btn-sm">
        <I.filter size={12}/> All clients
      </button>
      <button className="vc-btn vc-btn-secondary vc-btn-sm">
        <I.filter size={12}/> All supports
      </button>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
        {showCompliance && (
          <Badge tone="amber" dot>3 conflicts</Badge>
        )}
      </div>
    </div>
  );
}

// Week view: rows = staff, cols = days
function RosterWeekView({ shifts, onShiftClick, alerts }) {
  const staff = window.VC_STAFF;
  const days = window.VC_DAYS;
  const dates = window.VC_DATES;
  const today = window.VC_TODAY_INDEX;

  const cellShifts = (staffId, day) => shifts.filter(s => s.staffId === staffId && s.day === day);
  const unassigned = shifts.filter(s => s.staffId === null);

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <div style={{ minWidth: 1100 }}>
        {/* Day header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
          position: 'sticky', top: 0, background: 'var(--vc-surface)', zIndex: 2,
          borderBottom: '1px solid var(--vc-border)',
        }}>
          <div style={{ padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--vc-text-4)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Staff</div>
          {days.map((d, i) => (
            <div key={d} style={{
              padding: '10px 12px',
              borderLeft: '1px solid var(--vc-border)',
              background: i === today ? 'var(--vc-primary-50)' : 'transparent',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: i === today ? 'var(--vc-primary-700)' : 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: i === today ? 'var(--vc-primary-700)' : 'var(--vc-text)', marginTop: 2 }}>
                {dates[i]}{i === today && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 600 }}>TODAY</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Unassigned row */}
        {alerts && unassigned.length > 0 && (
          <div style={{
            display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
            background: '#fffdf5', borderBottom: '1px solid var(--vc-border)',
          }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <window.Icons.warn size={13} stroke={2.2} style={{ color: '#d97706' }}/>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#78350f' }}>Unassigned</div>
                <div style={{ fontSize: 10.5, color: '#92400e' }}>{unassigned.length} shifts</div>
              </div>
            </div>
            {Array.from({ length: 7 }).map((_, day) => {
              const items = unassigned.filter(s => s.day === day);
              return (
                <div key={day} style={{ borderLeft: '1px solid var(--vc-border)', padding: 6, display: 'flex', flexDirection: 'column', gap: 4, minHeight: 64 }}>
                  {items.map(s => <ShiftPill key={s.id} shift={s} onClick={() => onShiftClick(s)} compact/>)}
                </div>
              );
            })}
          </div>
        )}

        {/* Staff rows */}
        {staff.map((person, idx) => (
          <div key={person.id} style={{
            display: 'grid', gridTemplateColumns: '180px repeat(7, 1fr)',
            borderBottom: '1px solid var(--vc-border)',
            background: 'var(--vc-surface)',
          }}>
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 9, position: 'sticky', left: 0, background: 'var(--vc-surface)', zIndex: 1 }}>
              <Avatar initials={person.initials} color={person.color} size={26}/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--vc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</div>
                <div style={{ fontSize: 10.5, color: 'var(--vc-text-4)' }}>
                  {person.readiness === 'ready' && <span style={{ color: 'var(--vc-emerald)' }}>● Ready</span>}
                  {person.readiness === 'expiring' && alerts && <span style={{ color: 'var(--vc-amber)' }}>● Expiring</span>}
                  {person.readiness === 'blocked' && alerts && <span style={{ color: 'var(--vc-red)' }}>● Blocked</span>}
                  {person.readiness === 'pending' && alerts && <span style={{ color: 'var(--vc-amber)' }}>● Pending</span>}
                  {(!alerts || person.readiness === 'ready') && person.readiness !== 'ready' && <span style={{ color: 'var(--vc-emerald)' }}>● Ready</span>}
                </div>
              </div>
            </div>
            {Array.from({ length: 7 }).map((_, day) => {
              const items = cellShifts(person.id, day);
              const isToday = day === today;
              return (
                <div key={day} style={{
                  borderLeft: '1px solid var(--vc-border)',
                  padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
                  minHeight: 78, background: isToday ? 'rgba(13,148,136,0.025)' : 'transparent',
                }}>
                  {items.map(s => <ShiftPill key={s.id} shift={s} onClick={() => onShiftClick(s)} showWarn={alerts}/>)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Day view: timeline columns = staff
function RosterDayView({ shifts, onShiftClick, alerts }) {
  const staff = window.VC_STAFF;
  const today = window.VC_TODAY_INDEX;
  const dayShifts = shifts.filter(s => s.day === today && s.staffId);
  const unassigned = shifts.filter(s => s.day === today && s.staffId === null);

  const ROW_H = 40; // px per hour

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <div style={{ minWidth: 1200, position: 'relative' }}>
        {/* Top bar */}
        <div style={{
          display: 'grid', gridTemplateColumns: `60px repeat(${staff.length}, 1fr)`,
          position: 'sticky', top: 0, background: 'var(--vc-surface)', zIndex: 3,
          borderBottom: '1px solid var(--vc-border)',
        }}>
          <div style={{ padding: '10px 8px', fontSize: 10, fontWeight: 600, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
          {staff.map(p => (
            <div key={p.id} style={{ borderLeft: '1px solid var(--vc-border)', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar initials={p.initials} color={p.color} size={22}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--vc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name.split(' ')[0]}</div>
                {alerts && p.readiness === 'blocked' && <div style={{ fontSize: 10, color: 'var(--vc-red)', fontWeight: 500 }}>● Blocked</div>}
                {alerts && p.readiness === 'expiring' && <div style={{ fontSize: 10, color: 'var(--vc-amber)', fontWeight: 500 }}>● Expiring</div>}
              </div>
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ display: 'grid', gridTemplateColumns: `60px repeat(${staff.length}, 1fr)`, position: 'relative' }}>
          {/* Hour gutter */}
          <div style={{ position: 'relative', borderRight: '1px solid var(--vc-border)' }}>
            {HOURS.map(h => (
              <div key={h} style={{
                height: ROW_H, padding: '4px 8px', fontSize: 10.5, color: 'var(--vc-text-4)',
                fontFamily: 'IBM Plex Mono, monospace', borderTop: '1px solid var(--vc-border)',
              }}>{fmtHour(h)}</div>
            ))}
          </div>

          {staff.map(p => (
            <div key={p.id} style={{ position: 'relative', borderLeft: '1px solid var(--vc-border)', background: 'var(--vc-surface)' }}>
              {HOURS.map((h, i) => (
                <div key={h} style={{ height: ROW_H, borderTop: '1px solid var(--vc-border)' }}/>
              ))}
              {dayShifts.filter(s => s.staffId === p.id).map(s => {
                const top = (s.start - HOURS[0]) * ROW_H;
                const height = (s.end - s.start) * ROW_H - 2;
                return (
                  <div key={s.id} style={{
                    position: 'absolute', top: top + 1, left: 4, right: 4, height,
                  }}>
                    <ShiftPill shift={s} onClick={() => onShiftClick(s)} showWarn={alerts}/>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Now line */}
          <div style={{
            position: 'absolute', left: 60, right: 0,
            top: ((9 + 24/60) - HOURS[0]) * ROW_H,
            height: 0, borderTop: '2px solid var(--vc-primary)', zIndex: 2, pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', left: -4, top: -5, width: 9, height: 9,
              borderRadius: '50%', background: 'var(--vc-primary)',
            }}/>
            <div style={{
              position: 'absolute', left: 6, top: -18, fontSize: 10, fontWeight: 600,
              color: 'var(--vc-primary-700)', background: 'var(--vc-surface)',
              padding: '1px 5px', borderRadius: 3, border: '1px solid var(--vc-primary-100)',
            }}>9:24 AM</div>
          </div>
        </div>

        {alerts && unassigned.length > 0 && (
          <div style={{ position: 'sticky', bottom: 0, background: '#fffdf5', borderTop: '1px solid var(--vc-border)', padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', zIndex: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#92400e' }}>{unassigned.length} unassigned today:</span>
            {unassigned.map(s => (
              <div key={s.id} style={{ minWidth: 180 }}>
                <ShiftPill shift={s} onClick={() => onShiftClick(s)} showWarn/>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Staff list view (rows = staff, single horizontal day timeline)
function RosterStaffView({ shifts, onShiftClick, alerts }) {
  const staff = window.VC_STAFF;
  const today = window.VC_TODAY_INDEX;
  const todayShifts = shifts.filter(s => s.day === today);

  const HOUR_PX = 50;
  const startHour = 6, endHour = 22;
  const totalW = (endHour - startHour) * HOUR_PX;

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <div style={{ minWidth: 220 + totalW + 40 }}>
        <div style={{
          display: 'flex', position: 'sticky', top: 0, zIndex: 2,
          background: 'var(--vc-surface)', borderBottom: '1px solid var(--vc-border)',
        }}>
          <div style={{ width: 220, padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Staff · Thu Apr 30
          </div>
          <div style={{ position: 'relative', width: totalW }}>
            {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
              <div key={i} style={{
                position: 'absolute', left: i * HOUR_PX, top: 8,
                fontSize: 10.5, color: 'var(--vc-text-4)', fontFamily: 'IBM Plex Mono, monospace',
                transform: 'translateX(-50%)',
              }}>{fmtHour(startHour + i)}</div>
            ))}
          </div>
        </div>

        {staff.map(p => {
          const rowShifts = todayShifts.filter(s => s.staffId === p.id);
          return (
            <div key={p.id} style={{
              display: 'flex', borderBottom: '1px solid var(--vc-border)',
              background: 'var(--vc-surface)',
            }}>
              <div style={{ width: 220, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <Avatar initials={p.initials} color={p.color} size={28}/>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vc-text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>{p.position}</div>
                </div>
              </div>
              <div style={{ position: 'relative', width: totalW, height: 64 }}>
                {Array.from({ length: endHour - startHour + 1 }).map((_, i) => (
                  <div key={i} style={{ position: 'absolute', left: i * HOUR_PX, top: 0, bottom: 0, width: 1, background: 'var(--vc-border)' }}/>
                ))}
                {rowShifts.map(s => {
                  const left = (s.start - startHour) * HOUR_PX;
                  const width = (s.end - s.start) * HOUR_PX - 2;
                  return (
                    <div key={s.id} style={{ position: 'absolute', left: left + 1, top: 8, width, height: 48 }}>
                      <ShiftPill shift={s} onClick={() => onShiftClick(s)} showWarn={alerts}/>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { ShiftPill, RosterFilterBar, RosterWeekView, RosterDayView, RosterStaffView, fmtTime, fmtHour });
