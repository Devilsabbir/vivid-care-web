// dashboard.jsx — Admin operations dashboard

function StatCard({ label, value, sub, icon: Ic, tone, urgent, onClick }) {
  return (
    <div className="vc-card" onClick={onClick} style={{
      padding: 16, cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.12s, border-color 0.12s',
      borderColor: urgent ? 'var(--vc-red-50)' : 'var(--vc-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: urgent ? 'var(--vc-red-50)' : tone === 'teal' ? 'var(--vc-primary-50)' : 'var(--vc-surface-2)',
          color: urgent ? 'var(--vc-red)' : tone === 'teal' ? 'var(--vc-primary-700)' : 'var(--vc-text-3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {Ic && <Ic size={15} stroke={1.75}/>}
        </div>
        {urgent && <Badge tone="red" dot>Urgent</Badge>}
      </div>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--vc-text-3)', marginTop: 14, letterSpacing: '0.005em' }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, color: 'var(--vc-text)', marginTop: 2, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function NeedsAttentionItem({ icon: Ic, tone, title, meta, action, onClick }) {
  const I = window.Icons;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid var(--vc-border)',
      cursor: 'pointer',
    }}
    onMouseEnter={e => e.currentTarget.style.background = 'var(--vc-surface-2)'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: tone === 'red' ? 'var(--vc-red-50)' : tone === 'amber' ? 'var(--vc-amber-50)' : 'var(--vc-blue-50)',
        color: tone === 'red' ? 'var(--vc-red)' : tone === 'amber' ? 'var(--vc-amber)' : 'var(--vc-blue)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><Ic size={14} stroke={2}/></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--vc-text)' }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', marginTop: 1 }}>{meta}</div>
      </div>
      <span style={{ fontSize: 12, color: 'var(--vc-primary-700)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 2 }}>
        {action} <I.chevronRight size={13}/>
      </span>
    </div>
  );
}

function Dashboard({ alerts, onNav, onShiftClick, layoutVariant }) {
  const I = window.Icons;
  const todayShifts = window.VC_SHIFTS.filter(s => s.day === window.VC_TODAY_INDEX);
  const inProgress = todayShifts.filter(s => s.status === 'in_progress');
  const scheduled = todayShifts.filter(s => s.status === 'scheduled');
  const missed = todayShifts.filter(s => s.status === 'missed');
  const unassignedToday = todayShifts.filter(s => s.status === 'unassigned');

  const wide = layoutVariant === 'wide';

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      {/* Stat row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <StatCard label="Active clients" value="48" sub="2 onboarding" icon={I.users} tone="default"/>
        <StatCard label="Today's shifts" value={`${todayShifts.length - unassignedToday.length}/${todayShifts.length}`} sub={`${inProgress.length} in progress · ${scheduled.length} scheduled`} icon={I.calendar} tone="teal"/>
        <StatCard label="Missed clock-ins" value={alerts ? missed.length : 0} sub={alerts && missed.length ? 'Needs immediate review' : 'All clear'} icon={I.clock} urgent={alerts && missed.length > 0}/>
        <StatCard label="Open incidents" value={alerts ? 2 : 0} sub={alerts ? '1 critical · 1 high' : 'No open incidents'} icon={I.alert} urgent={alerts}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: wide ? '2fr 1fr' : '1.4fr 1fr', gap: 16 }}>
        {/* Needs attention */}
        <div className="vc-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--vc-border)', display: 'flex', alignItems: 'center' }}>
            <h2 className="vc-h2">Needs attention</h2>
            {alerts && (
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--vc-red)', fontWeight: 600,
                background: 'var(--vc-red-50)', padding: '2px 7px', borderRadius: 999 }}>
                {missed.length + unassignedToday.length + 3} items
              </span>
            )}
            <button className="vc-btn vc-btn-ghost vc-btn-sm" style={{ marginLeft: 'auto' }}>View all</button>
          </div>
          {alerts ? (
            <>
              <NeedsAttentionItem icon={I.alert} tone="red"
                title="Critical incident — Suspected medication error"
                meta="Reuben Castellanos · Sina Levu · 9:11 pm last night"
                action="Review" onClick={() => onNav('incidents')}/>
              <NeedsAttentionItem icon={I.clock} tone="red"
                title="Missed clock-in — Marcus Bellweather"
                meta="Henry Saville · Community access · scheduled 8:00 am"
                action="Open shift"
                onClick={() => onShiftClick(missed[0])}/>
              <NeedsAttentionItem icon={I.warn} tone="amber"
                title="1 unassigned shift this afternoon"
                meta="Mei-Lin Choi · Daily living · 3:00 pm – 7:00 pm · Chatswood"
                action="Assign"
                onClick={() => onShiftClick(unassignedToday[0])}/>
              <NeedsAttentionItem icon={I.shield} tone="red"
                title="Expired document — Joel Tafale"
                meta="Working with Children Check expired Apr 12 · blocking 1 shift"
                action="Resolve"
                onClick={() => onNav('documents')}/>
              <NeedsAttentionItem icon={I.shield} tone="amber"
                title="Document expiring in 24 days — Marcus Bellweather"
                meta="NDIS Worker Screening expires May 28"
                action="Review"
                onClick={() => onNav('documents')}/>
              <NeedsAttentionItem icon={I.warn} tone="amber"
                title="Double-booked — Priya Raman, Friday"
                meta="Two overlapping shifts at 1:00 pm and 9:00 am"
                action="Open roster"
                onClick={() => onNav('roster')}/>
            </>
          ) : (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 40, height: 40, margin: '0 auto 10px', borderRadius: '50%',
                background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)',
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <I.check size={18} stroke={2.5}/>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vc-text)' }}>All clear</div>
              <div style={{ fontSize: 12.5, color: 'var(--vc-text-3)', marginTop: 4 }}>
                No urgent items. Today's care delivery is on track.
              </div>
            </div>
          )}
        </div>

        {/* Today's operations */}
        <div className="vc-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--vc-border)', display: 'flex', alignItems: 'center' }}>
            <h2 className="vc-h2">Today's operations</h2>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--vc-text-4)' }}>Thu, Apr 30</span>
          </div>
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {todayShifts.slice(0, 6).map(s => {
              const client = window.VC_CLIENTS.find(c => c.id === s.clientId);
              const staff = window.VC_STAFF.find(p => p.id === s.staffId);
              return (
                <div key={s.id} onClick={() => onShiftClick(s)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  border: '1px solid var(--vc-border)',
                  cursor: 'pointer', background: 'var(--vc-surface)',
                }}>
                  <div className="vc-tnum" style={{
                    fontSize: 11, color: 'var(--vc-text-3)', minWidth: 64,
                    fontFamily: 'IBM Plex Mono, monospace',
                  }}>{window.fmtTime(s.start)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--vc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {client?.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>
                      {staff ? staff.name.split(' ')[0] : 'Unassigned'} · {window.VC_SUPPORT_TYPES.find(t => t.id === s.support)?.label}
                    </div>
                  </div>
                  <StatusBadge status={s.status}/>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 16 }}>
        {/* Compliance snapshot */}
        <div className="vc-card" style={{ padding: 16 }}>
          <h2 className="vc-h2" style={{ marginBottom: 12 }}>Compliance</h2>
          {[
            { label: 'Verified', count: 42, tone: 'emerald', pct: 80 },
            { label: 'Pending review', count: alerts ? 4 : 1, tone: 'amber', pct: alerts ? 8 : 2 },
            { label: 'Expiring soon', count: alerts ? 3 : 0, tone: 'amber', pct: alerts ? 6 : 0 },
            { label: 'Expired', count: alerts ? 2 : 0, tone: 'red', pct: alerts ? 4 : 0 },
          ].map(row => (
            <div key={row.label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--vc-text-2)' }}>{row.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: 'var(--vc-text)', fontVariantNumeric: 'tabular-nums' }}>{row.count}</span>
              </div>
              <div style={{ height: 4, background: 'var(--vc-surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${row.pct}%`, height: '100%',
                  background: row.tone === 'emerald' ? 'var(--vc-emerald)' :
                              row.tone === 'amber' ? 'var(--vc-amber)' : 'var(--vc-red)' }}/>
              </div>
            </div>
          ))}
        </div>

        {/* Coverage */}
        <div className="vc-card" style={{ padding: 16 }}>
          <h2 className="vc-h2" style={{ marginBottom: 6 }}>Coverage this week</h2>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', marginBottom: 12 }}>Apr 27 – May 3 · 32 shifts</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
            {window.VC_DAYS.map((d, i) => {
              const dayShifts = window.VC_SHIFTS.filter(s => s.day === i);
              const unassigned = dayShifts.filter(s => s.status === 'unassigned').length;
              const h = (dayShifts.length / 8) * 70;
              return (
                <div key={d} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: h, position: 'relative', background: i === window.VC_TODAY_INDEX ? 'var(--vc-primary)' : 'var(--vc-primary-100)', borderRadius: 3 }}>
                    {alerts && unassigned > 0 && <div style={{ width: '100%', height: (unassigned / dayShifts.length) * h, background: 'var(--vc-amber)', position: 'absolute', bottom: 0, borderRadius: 3 }}/>}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--vc-text-4)', fontWeight: i === window.VC_TODAY_INDEX ? 600 : 400 }}>{d[0]}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 12, fontSize: 11, color: 'var(--vc-text-3)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--vc-primary)', borderRadius: 2 }}/>Assigned</span>
            {alerts && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, background: 'var(--vc-amber)', borderRadius: 2 }}/>Unassigned</span>}
          </div>
        </div>

        {/* Roster readiness */}
        <div className="vc-card" style={{ padding: 16 }}>
          <h2 className="vc-h2" style={{ marginBottom: 12 }}>Roster readiness</h2>
          {window.VC_STAFF.slice(0, 5).map(p => {
            let tone = 'emerald', label = 'Ready';
            if (alerts) {
              if (p.readiness === 'blocked') { tone = 'red'; label = 'Blocked'; }
              else if (p.readiness === 'expiring') { tone = 'amber'; label = 'Expiring'; }
              else if (p.readiness === 'pending') { tone = 'amber'; label = 'Pending'; }
            }
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--vc-border)' }}>
                <Avatar initials={p.initials} color={p.color} size={22}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--vc-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                </div>
                <Badge tone={tone} dot>{label}</Badge>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard, StatCard });
