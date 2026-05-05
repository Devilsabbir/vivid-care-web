// staff-app.jsx — Staff mobile screens (Home, Roster, Clock, Docs, Alerts)

function StaffShell({ tab, setTab, children, alerts }) {
  const I = window.Icons;
  return (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--vc-bg)',
      display: 'flex', flexDirection: 'column',
      fontSize: 14, color: 'var(--vc-text)',
      position: 'relative',
    }}>
      {/* Top bar */}
      <header style={{
        padding: '10px 18px 10px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--vc-surface)',
        borderBottom: '1px solid var(--vc-border)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: 'var(--vc-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14,
        }}>v</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>VividCare</div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="vc-btn vc-btn-ghost vc-btn-icon" style={{ position: 'relative' }}>
            <I.bell size={16}/>
            {alerts && <span className="vc-pulse" style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: '50%', background: 'var(--vc-red)' }}/>}
          </button>
          <Avatar initials="AN" color="#0d9488" size={28}/>
        </div>
      </header>

      <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Bottom nav */}
      <nav style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
        background: 'var(--vc-surface)',
        borderTop: '1px solid var(--vc-border)',
        padding: '6px 4px 22px',
      }}>
        {[
          { id: 'home', label: 'Home', icon: I.home },
          { id: 'roster', label: 'Roster', icon: I.calendar },
          { id: 'clock', label: 'Clock', icon: I.clock, primary: true },
          { id: 'docs', label: 'Docs', icon: I.shield },
          { id: 'alerts', label: 'Alerts', icon: I.bell, badge: alerts },
        ].map(item => (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            border: 0, background: 'transparent',
            padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 3, cursor: 'pointer', position: 'relative',
            color: tab === item.id ? 'var(--vc-primary-700)' : 'var(--vc-text-4)',
          }}>
            <item.icon size={20} stroke={tab === item.id ? 2.2 : 1.75}/>
            <span style={{ fontSize: 10.5, fontWeight: tab === item.id ? 600 : 500 }}>{item.label}</span>
            {item.badge && <span style={{ position: 'absolute', top: 4, right: '50%', transform: 'translateX(13px)', width: 7, height: 7, borderRadius: '50%', background: 'var(--vc-red)' }}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}

// HOME
function StaffHome({ alerts, onClock, clockState }) {
  const I = window.Icons;
  // Aroha (s1) — has shift in progress today
  const myShifts = window.VC_SHIFTS.filter(s => s.staffId === 's1');
  const today = window.VC_TODAY_INDEX;
  const todayShifts = myShifts.filter(s => s.day === today);
  const upcomingToday = todayShifts.find(s => s.status === 'in_progress') || todayShifts.find(s => s.status === 'scheduled');
  const tomorrow = myShifts.find(s => s.day === today + 1);

  const activeShift = clockState === 'in' ? todayShifts.find(s => s.status === 'in_progress') : upcomingToday;
  const client = activeShift && window.VC_CLIENTS.find(c => c.id === activeShift.clientId);
  const support = activeShift && window.VC_SUPPORT_TYPES.find(t => t.id === activeShift.support);

  return (
    <div style={{ padding: '16px 18px 24px' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Thursday, 30 April</div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>Morning, Aroha</h1>
      </div>

      {/* Active / next shift card */}
      {activeShift && (
        <div className="vc-card" style={{
          padding: 16, marginBottom: 14,
          background: clockState === 'in' ? 'linear-gradient(180deg, var(--vc-primary-50), #fff)' : 'var(--vc-surface)',
          borderColor: clockState === 'in' ? '#5eead4' : 'var(--vc-border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Badge tone={clockState === 'in' ? 'teal' : 'blue'} dot>
              {clockState === 'in' ? 'In progress' : 'Up next'}
            </Badge>
            {clockState === 'in' && <span style={{ fontSize: 11, color: 'var(--vc-text-3)' }}>Clocked in 7:04 am</span>}
          </div>
          <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--vc-text)', letterSpacing: '-0.01em' }}>{client?.name}</div>
          <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 4 }}>{support?.label}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
            <div style={{ padding: 10, border: '1px solid var(--vc-border)', borderRadius: 10, background: 'var(--vc-surface)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--vc-text-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Time</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vc-text)', marginTop: 3 }}>
                {window.fmtTime(activeShift.start)} – {window.fmtTime(activeShift.end)}
              </div>
            </div>
            <div style={{ padding: 10, border: '1px solid var(--vc-border)', borderRadius: 10, background: 'var(--vc-surface)' }}>
              <div style={{ fontSize: 10.5, color: 'var(--vc-text-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--vc-text)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <I.pin size={12}/> {activeShift.location.replace(' NSW', '')}
              </div>
            </div>
          </div>

          <button onClick={onClock} className="vc-btn vc-btn-primary" style={{
            width: '100%', height: 48, marginTop: 14, fontSize: 15, fontWeight: 600,
          }}>
            {clockState === 'in' ? 'Continue shift' : 'Go to clock'}
            <I.arrow size={16}/>
          </button>
        </div>
      )}

      {/* Alerts */}
      {alerts && (
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--vc-text-2)', margin: '0 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Alerts</h2>
          <div className="vc-card" style={{
            padding: 12, display: 'flex', alignItems: 'flex-start', gap: 10,
            borderColor: '#fde68a', background: 'var(--vc-amber-50)',
          }}>
            <I.shield size={16} style={{ color: 'var(--vc-amber)', flexShrink: 0, marginTop: 2 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#78350f' }}>Document expiring in 24 days</div>
              <div style={{ fontSize: 12, color: '#92400e', marginTop: 2 }}>NDIS Worker Screening expires May 28. Upload renewal soon.</div>
            </div>
          </div>
        </div>
      )}

      {/* Today's schedule */}
      <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--vc-text-2)', margin: '0 4px 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Today's schedule</h2>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        {todayShifts.map((s, i) => {
          const c = window.VC_CLIENTS.find(x => x.id === s.clientId);
          const sup = window.VC_SUPPORT_TYPES.find(t => t.id === s.support);
          return (
            <div key={s.id} style={{
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              borderTop: i > 0 ? '1px solid var(--vc-border)' : 0,
            }}>
              <div className="vc-tnum" style={{ minWidth: 56, fontSize: 12, color: 'var(--vc-text-3)' }}>{window.fmtTime(s.start)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>{c?.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)' }}>{sup?.label} · {s.location.replace(' NSW', '')}</div>
              </div>
              <StatusBadge status={s.status}/>
            </div>
          );
        })}
        {tomorrow && (
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--vc-border)', fontSize: 12, color: 'var(--vc-text-4)', display: 'flex', justifyContent: 'space-between' }}>
            <span>Tomorrow · {window.VC_CLIENTS.find(c => c.id === tomorrow.clientId)?.name}</span>
            <span>{window.fmtTime(tomorrow.start)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// CLOCK
function StaffClock({ alerts, clockState, setClockState, geofenceState }) {
  const I = window.Icons;
  const myShifts = window.VC_SHIFTS.filter(s => s.staffId === 's1');
  const today = window.VC_TODAY_INDEX;
  const activeShift = myShifts.find(s => s.day === today && (s.status === 'in_progress' || s.status === 'scheduled'));
  const client = window.VC_CLIENTS.find(c => c.id === activeShift?.clientId);
  const support = window.VC_SUPPORT_TYPES.find(t => t.id === activeShift?.support);

  const isClocked = clockState === 'in';
  const isReady = geofenceState === 'inside';
  const isOutside = geofenceState === 'outside';
  const isEarly = geofenceState === 'early';

  const handleClock = () => {
    if (isClocked) setClockState('done');
    else if (isReady) setClockState('in');
  };

  if (clockState === 'done') {
    return (
      <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', minHeight: 480, justifyContent: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          <I.check size={36} stroke={2.5}/>
        </div>
        <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Shift completed</div>
        <div style={{ fontSize: 14, color: 'var(--vc-text-3)', marginTop: 8, maxWidth: 260 }}>
          Clocked out at 11:08 am. Logged 4h 4m with {client?.name}. Have a good rest of your day.
        </div>
        <button className="vc-btn vc-btn-secondary" style={{ marginTop: 22 }} onClick={() => setClockState('out')}>Done</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px 18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isClocked ? 'Active shift' : 'Next shift'}
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '4px 0 0', letterSpacing: '-0.01em' }}>{client?.name}</h1>
        <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 2 }}>
          {support?.label} · {window.fmtTime(activeShift.start)} – {window.fmtTime(activeShift.end)}
        </div>
      </div>

      {/* Map placeholder */}
      <div style={{
        height: 180, borderRadius: 14,
        background: `repeating-linear-gradient(135deg, #e8f0ee, #e8f0ee 8px, #f1f5f4 8px, #f1f5f4 16px)`,
        border: '1px solid var(--vc-border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Geofence circle */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          width: 130, height: 130, borderRadius: '50%',
          background: isReady ? 'rgba(13,148,136,0.12)' : 'rgba(217,119,6,0.12)',
          border: `2px dashed ${isReady ? 'var(--vc-primary)' : 'var(--vc-amber)'}`,
        }}/>
        {/* User dot */}
        <div style={{
          position: 'absolute',
          left: isOutside ? '78%' : '52%',
          top: isOutside ? '28%' : '54%',
          transform: 'translate(-50%, -50%)',
        }}>
          <div className="vc-pulse" style={{ position: 'absolute', inset: -6, background: 'rgba(37,99,235,0.25)', borderRadius: '50%' }}/>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#2563eb', border: '2.5px solid #fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', position: 'relative' }}/>
        </div>
        {/* Address pin */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -100%)',
          background: '#fff', padding: '4px 8px', borderRadius: 6,
          fontSize: 11, fontWeight: 600, boxShadow: 'var(--vc-shadow)',
          whiteSpace: 'nowrap',
        }}>
          <I.pin size={11} style={{ display: 'inline', verticalAlign: '-1px', marginRight: 3 }}/>
          {activeShift.location.replace(' NSW', '')}
        </div>
      </div>

      {/* Status row */}
      <div className="vc-card" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><I.check size={13} stroke={2.5}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Location available</div>
            <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>GPS accuracy: 8m</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: isReady ? 'var(--vc-emerald-50)' : 'var(--vc-amber-50)',
            color: isReady ? 'var(--vc-emerald)' : 'var(--vc-amber)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isReady ? <I.check size={13} stroke={2.5}/> : <I.warn size={13} stroke={2.5}/>}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isReady ? 'Inside approved area' : isOutside ? 'Outside approved area' : 'Geofence configured'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>
              {isReady ? '12m from address · 150m radius' : isOutside ? "You're 340m away — move closer to clock in" : '150m radius'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: isEarly ? 'var(--vc-amber-50)' : 'var(--vc-emerald-50)',
            color: isEarly ? 'var(--vc-amber)' : 'var(--vc-emerald)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <I.clock size={13} stroke={2.5}/>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>
              {isEarly ? 'Clock-in opens in 28 min' : isClocked ? 'Clocked in 7:04 am' : 'Within clock-in window'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>
              {isEarly ? 'Window opens 30 min before shift' : isClocked ? 'Running 1h 21m · ends 11:00 am' : '20 min before shift start'}
            </div>
          </div>
        </div>
      </div>

      {/* Big button */}
      <button onClick={handleClock} disabled={!isClocked && !isReady}
        className="vc-btn"
        style={{
          height: 64, fontSize: 17, fontWeight: 600,
          background: isClocked ? 'var(--vc-red)' : isReady ? 'var(--vc-primary)' : 'var(--vc-surface-2)',
          color: isClocked || isReady ? '#fff' : 'var(--vc-text-4)',
          border: 'none', borderRadius: 14,
          boxShadow: isClocked || isReady ? '0 6px 20px rgba(13,148,136,0.3)' : 'none',
          gap: 8, cursor: isClocked || isReady ? 'pointer' : 'not-allowed',
        }}>
        <I.power size={18} stroke={2.5}/>
        {isClocked ? 'Clock out' : isReady ? 'Clock in' : isOutside ? 'Move closer to clock in' : 'Not available yet'}
      </button>

      {alerts && !isClocked && (
        <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', textAlign: 'center', padding: '0 12px' }}>
          By clocking in you confirm you have read the client's care notes and any handover updates.
        </div>
      )}
    </div>
  );
}

// ROSTER (mobile)
function StaffRoster({ alerts }) {
  const myShifts = window.VC_SHIFTS.filter(s => s.staffId === 's1');
  const grouped = {};
  myShifts.forEach(s => { (grouped[s.day] = grouped[s.day] || []).push(s); });

  return (
    <div style={{ padding: '16px 18px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 4px', letterSpacing: '-0.01em' }}>My roster</h1>
      <div style={{ fontSize: 12.5, color: 'var(--vc-text-3)', marginBottom: 16 }}>Apr 27 – May 3, 2026 · Week 18</div>

      {window.VC_DAYS.map((d, i) => {
        const dayShifts = grouped[i] || [];
        const isToday = i === window.VC_TODAY_INDEX;
        if (!dayShifts.length) return null;
        return (
          <div key={d} style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, padding: '0 4px 8px' }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isToday ? 'var(--vc-primary-700)' : 'var(--vc-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d}</span>
              <span style={{ fontSize: 12, color: 'var(--vc-text-4)' }}>· {window.VC_DATES[i]}</span>
              {isToday && <Badge tone="teal">Today</Badge>}
            </div>
            <div className="vc-card" style={{ overflow: 'hidden' }}>
              {dayShifts.map((s, idx) => {
                const c = window.VC_CLIENTS.find(x => x.id === s.clientId);
                const sup = window.VC_SUPPORT_TYPES.find(t => t.id === s.support);
                return (
                  <div key={s.id} style={{
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    borderTop: idx > 0 ? '1px solid var(--vc-border)' : 0,
                    borderLeft: `3px solid ${sup?.color || '#94a3b8'}`,
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{c?.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', marginTop: 1 }}>
                        {window.fmtTime(s.start)} – {window.fmtTime(s.end)} · {sup?.label}
                      </div>
                    </div>
                    <StatusBadge status={s.status}/>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StaffDocs({ alerts }) {
  const I = window.Icons;
  const docs = [
    { type: 'NDIS Worker Screening', status: 'verified', expiry: 'Mar 4, 2027', days: 304 },
    { type: 'First Aid Certificate', status: 'verified', expiry: 'Sep 18, 2026', days: 137 },
    { type: 'Working with Children Check', status: 'verified', expiry: 'Jan 22, 2027', days: 263 },
    { type: 'Police Check', status: alerts ? 'expiring' : 'verified', expiry: 'May 28, 2026', days: 24 },
  ];
  return (
    <div style={{ padding: '16px 18px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em' }}>My documents</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Verified', count: alerts ? 3 : 4, tone: 'emerald' },
          { label: 'Expiring soon', count: alerts ? 1 : 0, tone: 'amber' },
        ].map(s => (
          <div key={s.label} className="vc-card" style={{ padding: 12 }}>
            <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 600, color: `var(--vc-${s.tone === 'emerald' ? 'emerald' : 'amber'})`, marginTop: 2 }}>{s.count}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {docs.map(d => (
          <div key={d.type} className="vc-card" style={{
            padding: 12, display: 'flex', alignItems: 'center', gap: 10,
            borderColor: d.status === 'expiring' ? '#fde68a' : 'var(--vc-border)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: d.status === 'verified' ? 'var(--vc-emerald-50)' : 'var(--vc-amber-50)',
              color: d.status === 'verified' ? 'var(--vc-emerald)' : 'var(--vc-amber)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {d.status === 'verified' ? <I.check size={16} stroke={2.5}/> : <I.warn size={16} stroke={2}/>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{d.type}</div>
              <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)' }}>
                Expires {d.expiry} · {d.days > 0 ? `${d.days} days` : 'expired'}
              </div>
            </div>
            <StatusBadge status={d.status}/>
          </div>
        ))}
      </div>
    </div>
  );
}

function StaffAlerts({ alerts }) {
  const I = window.Icons;
  if (!alerts) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, margin: '0 auto 14px', borderRadius: '50%', background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <I.check size={26} stroke={2.5}/>
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>You're all caught up</div>
        <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6 }}>No new alerts. We'll notify you about roster changes and document expiries.</div>
      </div>
    );
  }
  const items = window.VC_NOTIFICATIONS;
  return (
    <div style={{ padding: '16px 18px 24px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 16px', letterSpacing: '-0.01em' }}>Alerts</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(n => (
          <div key={n.id} className="vc-card" style={{
            padding: 14, display: 'flex', gap: 10, position: 'relative',
            background: n.unread ? 'var(--vc-primary-50)' : 'var(--vc-surface)',
            borderColor: n.unread ? 'var(--vc-primary-100)' : 'var(--vc-border)',
          }}>
            {n.unread && <div style={{ position: 'absolute', left: -1, top: 14, bottom: 14, width: 3, background: 'var(--vc-primary)', borderRadius: 2 }}/>}
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: n.type === 'compliance' ? 'var(--vc-amber-50)' : 'var(--vc-blue-50)',
              color: n.type === 'compliance' ? 'var(--vc-amber)' : 'var(--vc-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {n.type === 'compliance' ? <I.shield size={16}/> : <I.calendar size={16}/>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600 }}>{n.title}</div>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vc-text-4)' }}>{n.time}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)', marginTop: 2 }}>{n.body}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { StaffShell, StaffHome, StaffClock, StaffRoster, StaffDocs, StaffAlerts });
