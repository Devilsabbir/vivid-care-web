// extras.jsx — Profile pages, additional admin screens, accessibility primitives

// ─── Accessibility helpers ───────────────────────────────────────────────
function useEscapeClose(open, onClose) {
  React.useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);
}

function useFocusTrap(open, ref) {
  React.useEffect(() => {
    if (!open || !ref.current) return;
    const node = ref.current;
    const focusable = () => node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable()[0];
    first?.focus();
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      const items = Array.from(focusable()).filter(el => !el.disabled);
      if (!items.length) return;
      const f = items[0], l = items[items.length - 1];
      if (e.shiftKey && document.activeElement === f) { e.preventDefault(); l.focus(); }
      else if (!e.shiftKey && document.activeElement === l) { e.preventDefault(); f.focus(); }
    };
    node.addEventListener('keydown', handler);
    return () => node.removeEventListener('keydown', handler);
  }, [open]);
}

// ─── Tabs primitive ──────────────────────────────────────────────────────
function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" style={{
      display: 'flex', gap: 2, padding: '0 24px',
      borderBottom: '1px solid var(--vc-border)', background: 'var(--vc-surface)',
    }}>
      {tabs.map(t => {
        const active = value === t.id;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)} style={{
            background: 'transparent', border: 0, padding: '12px 14px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            color: active ? 'var(--vc-primary-700)' : 'var(--vc-text-3)',
            borderBottom: `2px solid ${active ? 'var(--vc-primary)' : 'transparent'}`,
            marginBottom: -1,
          }}>
            {t.label}{t.count != null && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--vc-text-4)' }}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

function ProfileHeader({ avatar, title, subtitle, badges, actions }) {
  return (
    <div style={{ padding: '20px 24px 14px', background: 'var(--vc-surface)', borderBottom: '1px solid var(--vc-border)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {avatar}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>{title}</h1>
          <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 4 }}>{subtitle}</div>
          {badges && <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>{badges}</div>}
        </div>
        {actions && <div style={{ display: 'flex', gap: 6 }}>{actions}</div>}
      </div>
    </div>
  );
}

function InfoGrid({ rows }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 24px' }}>
      {rows.map((r, i) => (
        <div key={i}>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{r.label}</div>
          <div style={{ fontSize: 13.5, color: 'var(--vc-text)', marginTop: 4, fontWeight: r.bold ? 600 : 400 }}>{r.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Client Profile ──────────────────────────────────────────────────────
function ClientProfile({ clientId, onBack, onShiftClick, onIncidentClick, onNav }) {
  const I = window.Icons;
  const c = window.VC_CLIENTS.find(x => x.id === clientId);
  const [tab, setTab] = React.useState('overview');
  if (!c) return null;
  const shifts = window.VC_SHIFTS.filter(s => s.clientId === clientId);
  const incidents = window.VC_INCIDENTS.filter(i => i.clientId === clientId);
  const agreements = window.VC_AGREEMENTS.filter(a => a.clientId === clientId);
  const isInactive = window.VC_INACTIVE_CLIENTS.includes(clientId);
  const initials = c.name.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <ProfileHeader
        avatar={<div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 18 }}>{initials}</div>}
        title={c.name}
        subtitle={<>NDIS <span className="vc-mono">{c.ndis}</span> · {c.suburb}</>}
        badges={<>
          <Badge tone={isInactive ? 'slate' : 'emerald'} dot>{isInactive ? 'Inactive' : 'Active'}</Badge>
          {c.supports.map(s => <Badge key={s} tone="blue">{s}</Badge>)}
        </>}
        actions={<>
          <button className="vc-btn vc-btn-ghost vc-btn-sm" onClick={onBack} aria-label="Back to clients"><I.chevronLeft size={13}/>Back</button>
          <button className="vc-btn vc-btn-secondary vc-btn-sm"><I.send size={13}/>Message</button>
          <button className="vc-btn vc-btn-primary vc-btn-sm">Edit</button>
        </>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'shifts', label: 'Shifts', count: shifts.length },
        { id: 'documents', label: 'Documents' },
        { id: 'incidents', label: 'Incidents', count: incidents.length },
        { id: 'agreements', label: 'Agreements', count: agreements.length },
        { id: 'notes', label: 'Notes' },
      ]}/>
      <div style={{ padding: 24 }}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div className="vc-card" style={{ padding: 18 }}>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Participant details</h2>
              <InfoGrid rows={[
                { label: 'Full name', value: c.name, bold: true },
                { label: 'NDIS number', value: <span className="vc-mono">{c.ndis}</span> },
                { label: 'Address', value: '14 Marsden St, ' + c.suburb + ' NSW' },
                { label: 'Phone', value: '0412 884 219' },
                { label: 'Date of birth', value: '14 June 1962' },
                { label: 'Plan manager', value: 'Plan Partners' },
                { label: 'Funded supports', value: c.supports.join(', ') },
                { label: 'Status', value: isInactive ? 'Inactive' : 'Active' },
              ]}/>
            </div>
            <div className="vc-card" style={{ padding: 18 }}>
              <h2 className="vc-h2" style={{ marginBottom: 12 }}>Emergency contact</h2>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>Sandra Whitfield</div>
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)', marginTop: 2 }}>Daughter</div>
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)', marginTop: 6 }} className="vc-mono">0438 224 119</div>
              <div style={{ height: 1, background: 'var(--vc-border)', margin: '14px 0' }}/>
              <h2 className="vc-h2" style={{ marginBottom: 8 }}>Care preferences</h2>
              <div style={{ fontSize: 12.5, color: 'var(--vc-text-2)', lineHeight: 1.55 }}>
                Tea with one sugar. Prefers female support workers. Hearing aid in left ear.
              </div>
            </div>
          </div>
        )}
        {tab === 'shifts' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            <table className="vc-table">
              <thead><tr><th>Day</th><th>Time</th><th>Staff</th><th>Support</th><th>Status</th></tr></thead>
              <tbody>{shifts.map(s => {
                const staff = window.VC_STAFF.find(p => p.id === s.staffId);
                const sup = window.VC_SUPPORT_TYPES.find(t => t.id === s.support);
                return (
                  <tr key={s.id} onClick={() => onShiftClick(s)} style={{ cursor: 'pointer' }}>
                    <td>{window.VC_DAYS[s.day]} {window.VC_DATES[s.day]}</td>
                    <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{window.fmtTime(s.start)}–{window.fmtTime(s.end)}</td>
                    <td>{staff ? staff.name : <span style={{ color: 'var(--vc-amber)', fontWeight: 500 }}>Unassigned</span>}</td>
                    <td>{sup?.label}</td>
                    <td><StatusBadge status={s.status}/></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
        {tab === 'documents' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            <table className="vc-table">
              <thead><tr><th>Document</th><th>Status</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                <tr><td>NDIS Service Agreement</td><td><StatusBadge status="verified"/></td><td>Mar 4, 2027</td><td><button className="vc-btn vc-btn-ghost vc-btn-sm">Open</button></td></tr>
                <tr><td>Care plan</td><td><StatusBadge status="verified"/></td><td>—</td><td><button className="vc-btn vc-btn-ghost vc-btn-sm">Open</button></td></tr>
                <tr><td>Behaviour support plan</td><td><StatusBadge status="pending"/></td><td>—</td><td><button className="vc-btn vc-btn-ghost vc-btn-sm">Open</button></td></tr>
              </tbody>
            </table>
          </div>
        )}
        {tab === 'incidents' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            {incidents.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--vc-text-3)', fontSize: 13 }}>No incidents recorded for this client.</div>
            ) : (
              <table className="vc-table">
                <thead><tr><th>Incident</th><th>Severity</th><th>Status</th><th>Occurred</th></tr></thead>
                <tbody>{incidents.map(i => (
                  <tr key={i.id} onClick={() => onIncidentClick(i.id)} style={{ cursor: 'pointer' }}>
                    <td>{i.title}</td>
                    <td><Badge tone={i.severity === 'critical' ? 'red' : i.severity === 'high' ? 'orange' : i.severity === 'medium' ? 'amber' : 'emerald'} dot>{i.severity[0].toUpperCase() + i.severity.slice(1)}</Badge></td>
                    <td><StatusBadge status={i.status}/></td>
                    <td style={{ color: 'var(--vc-text-3)', fontSize: 12 }}>{i.occurredAt}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        )}
        {tab === 'agreements' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            <table className="vc-table">
              <thead><tr><th>Agreement</th><th>Status</th><th>Signed</th><th>Expires</th><th>Value</th></tr></thead>
              <tbody>{agreements.map(a => (
                <tr key={a.id}>
                  <td><span style={{ fontWeight: 500 }}>{a.title}</span></td>
                  <td><StatusBadge status={a.status === 'signed' ? 'verified' : a.status === 'pending_signature' ? 'pending' : a.status === 'expired' ? 'expired' : 'pending'}/></td>
                  <td style={{ color: 'var(--vc-text-3)' }}>{a.signed || '—'}</td>
                  <td style={{ color: 'var(--vc-text-3)' }}>{a.expires}</td>
                  <td className="vc-mono">${a.value.toLocaleString()}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tab === 'notes' && (
          <div className="vc-card" style={{ padding: 18 }}>
            <textarea className="vc-input" placeholder="Add a note about this client…" style={{ height: 100, padding: 10, resize: 'none' }}/>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 12, border: '1px solid var(--vc-border)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>Eliza Marsden · Apr 22, 2026</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Family requested male support worker for Wednesday shifts going forward.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Staff Profile ───────────────────────────────────────────────────────
function StaffProfile({ staffId, onBack, onShiftClick }) {
  const I = window.Icons;
  const s = window.VC_STAFF.find(p => p.id === staffId);
  const [tab, setTab] = React.useState('overview');
  if (!s) return null;
  const shifts = window.VC_SHIFTS.filter(x => x.staffId === staffId);
  const docs = window.VC_DOCUMENTS.filter(d => d.ownerId === staffId);

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <ProfileHeader
        avatar={<Avatar initials={s.initials} color={s.color} size={56}/>}
        title={s.name}
        subtitle={<>{s.position} · <span className="vc-mono">{s.phone}</span> · {s.email}</>}
        badges={<>
          <StatusBadge status={s.readiness}/>
          {s.expiringDocs > 0 && <Badge tone="amber" dot>{s.expiringDocs} expiring</Badge>}
        </>}
        actions={<>
          <button className="vc-btn vc-btn-ghost vc-btn-sm" onClick={onBack}><I.chevronLeft size={13}/>Back</button>
          <button className="vc-btn vc-btn-secondary vc-btn-sm"><I.send size={13}/>Message</button>
          <button className="vc-btn vc-btn-primary vc-btn-sm">Edit</button>
        </>}
      />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'roster', label: 'Roster', count: shifts.length },
        { id: 'documents', label: 'Documents', count: docs.length },
        { id: 'availability', label: 'Availability' },
        { id: 'activity', label: 'Activity' },
      ]}/>
      <div style={{ padding: 24 }}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div className="vc-card" style={{ padding: 18 }}>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Personal details</h2>
              <InfoGrid rows={[
                { label: 'Full name', value: s.name, bold: true },
                { label: 'Position', value: s.position },
                { label: 'Mobile', value: <span className="vc-mono">{s.phone}</span> },
                { label: 'Email', value: s.email },
                { label: 'Started', value: 'Mar 14, 2024' },
                { label: 'Employee ID', value: <span className="vc-mono">VC-{s.id.replace('s','').padStart(4,'0')}</span> },
              ]}/>
            </div>
            <div className="vc-card" style={{ padding: 18 }}>
              <h2 className="vc-h2" style={{ marginBottom: 12 }}>Compliance</h2>
              {s.readiness === 'blocked' && (
                <div style={{ padding: 10, background: 'var(--vc-red-50)', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#7f1d1d' }}>Blocked from rostering</div>
                  <div style={{ fontSize: 11.5, color: '#991b1b', marginTop: 2 }}>{s.blocker}</div>
                  <button className="vc-btn vc-btn-secondary vc-btn-sm" style={{ marginTop: 8 }}>Resolve</button>
                </div>
              )}
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)' }}>4 documents tracked. {s.expiringDocs > 0 ? `${s.expiringDocs} expiring within 30 days.` : 'All current.'}</div>
            </div>
          </div>
        )}
        {tab === 'roster' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            <table className="vc-table">
              <thead><tr><th>Day</th><th>Time</th><th>Client</th><th>Support</th><th>Status</th></tr></thead>
              <tbody>{shifts.map(x => {
                const c = window.VC_CLIENTS.find(cl => cl.id === x.clientId);
                const sup = window.VC_SUPPORT_TYPES.find(t => t.id === x.support);
                return (
                  <tr key={x.id} onClick={() => onShiftClick(x)} style={{ cursor: 'pointer' }}>
                    <td>{window.VC_DAYS[x.day]} {window.VC_DATES[x.day]}</td>
                    <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{window.fmtTime(x.start)}–{window.fmtTime(x.end)}</td>
                    <td>{c?.name}</td>
                    <td>{sup?.label}</td>
                    <td><StatusBadge status={x.status}/></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
        {tab === 'documents' && (
          <div className="vc-card" style={{ overflow: 'hidden' }}>
            <table className="vc-table">
              <thead><tr><th>Document</th><th>Status</th><th>Expiry</th><th>Days</th><th></th></tr></thead>
              <tbody>{docs.map(d => (
                <tr key={d.id}>
                  <td><span style={{ fontWeight: 500 }}>{d.type}</span></td>
                  <td><StatusBadge status={d.status}/></td>
                  <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{d.expiry}</td>
                  <td className="vc-mono" style={{ color: d.daysRemaining < 0 ? 'var(--vc-red)' : d.daysRemaining < 45 ? 'var(--vc-amber)' : 'var(--vc-text-3)' }}>
                    {d.daysRemaining == null ? '—' : d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d ago` : `${d.daysRemaining}d`}
                  </td>
                  <td><button className="vc-btn vc-btn-ghost vc-btn-sm">{d.status === 'expired' ? 'Renew' : 'Open'}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tab === 'availability' && (
          <div className="vc-card" style={{ padding: 18 }}>
            <h2 className="vc-h2" style={{ marginBottom: 14 }}>Weekly availability</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
              {window.VC_DAYS.map((d, i) => {
                const unavail = window.VC_STAFF_UNAVAILABLE[staffId]?.includes(i);
                return (
                  <div key={d} style={{
                    padding: 10, border: '1px solid var(--vc-border)', borderRadius: 8,
                    background: unavail ? 'var(--vc-amber-50)' : 'var(--vc-surface)',
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--vc-text-4)', textTransform: 'uppercase' }}>{d}</div>
                    <div style={{ fontSize: 11.5, marginTop: 6, color: unavail ? '#92400e' : 'var(--vc-text-2)', fontWeight: 500 }}>
                      {unavail ? 'Unavailable' : '7am – 8pm'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {tab === 'activity' && (
          <div className="vc-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { time: 'Today, 9:01 am', text: 'Clocked in to shift with Thomas Marchetti' },
                { time: 'Yesterday, 5:48 pm', text: 'Completed shift · 4h 8m logged' },
                { time: 'Apr 28, 11:14 am', text: 'Uploaded renewed First Aid Certificate' },
                { time: 'Apr 22, 9:30 am', text: 'Roster reminder acknowledged' },
              ].map((e, i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vc-primary)', marginTop: 6, flexShrink: 0 }}/>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>{e.time}</div>
                    <div style={{ fontSize: 13, marginTop: 2 }}>{e.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Shift Detail Page (full screen, not drawer) ─────────────────────────
function ShiftDetailPage({ shift, onBack, alerts }) {
  const I = window.Icons;
  if (!shift) return null;
  const client = window.VC_CLIENTS.find(c => c.id === shift.clientId);
  const staff = window.VC_STAFF.find(p => p.id === shift.staffId);
  const support = window.VC_SUPPORT_TYPES.find(t => t.id === shift.support);
  const warnings = alerts ? window.validateShift(shift, window.VC_SHIFTS) : [];

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <ProfileHeader
        avatar={<div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.calendar size={26}/></div>}
        title={`${client?.name} · ${support?.label}`}
        subtitle={<>{window.VC_DAYS[shift.day]} {window.VC_DATES[shift.day]} · {window.fmtTime(shift.start)} – {window.fmtTime(shift.end)} · {shift.location}</>}
        badges={<StatusBadge status={shift.status}/>}
        actions={<>
          <button className="vc-btn vc-btn-ghost vc-btn-sm" onClick={onBack}><I.chevronLeft size={13}/>Back</button>
          <button className="vc-btn vc-btn-secondary vc-btn-sm">Edit shift</button>
        </>}
      />
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="vc-card" style={{ padding: 18 }}>
            <h2 className="vc-h2" style={{ marginBottom: 14 }}>Shift details</h2>
            <InfoGrid rows={[
              { label: 'Client', value: client?.name, bold: true },
              { label: 'Staff', value: staff?.name || 'Unassigned' },
              { label: 'Support type', value: support?.label },
              { label: 'Date', value: `${window.VC_DAYS[shift.day]}, ${window.VC_DATES[shift.day]}` },
              { label: 'Time', value: `${window.fmtTime(shift.start)} – ${window.fmtTime(shift.end)}` },
              { label: 'Duration', value: `${shift.end - shift.start}h` },
              { label: 'Location', value: shift.location },
              { label: 'Geofence', value: '150m radius' },
            ]}/>
          </div>
          <div className="vc-card" style={{ padding: 18 }}>
            <h2 className="vc-h2" style={{ marginBottom: 12 }}>Validation</h2>
            <window.ValidationList warnings={warnings}/>
          </div>
        </div>
        <div className="vc-card" style={{ padding: 18 }}>
          <h2 className="vc-h2" style={{ marginBottom: 12 }}>Clock activity</h2>
          {shift.status === 'completed' || shift.status === 'in_progress' ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)' }}>Clocked in</div>
              <div style={{ fontSize: 14, fontWeight: 600 }} className="vc-mono">{shift.clockedInAt || '7:04 am'}</div>
              <div style={{ fontSize: 11, color: 'var(--vc-text-4)', marginTop: 2 }}>Inside geofence · 12m from address</div>
              <div style={{ height: 1, background: 'var(--vc-border)', margin: '14px 0' }}/>
              <div style={{ fontSize: 12, color: 'var(--vc-text-3)' }}>Clocked out</div>
              <div style={{ fontSize: 14, fontWeight: 600 }} className="vc-mono">{shift.status === 'completed' ? '11:08 am' : '—'}</div>
            </>
          ) : shift.status === 'missed' ? (
            <div style={{ padding: 10, background: 'var(--vc-red-50)', borderRadius: 8 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#7f1d1d' }}>No clock-in</div>
              <div style={{ fontSize: 11.5, color: '#991b1b', marginTop: 2 }}>{shift.warning}</div>
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--vc-text-4)' }}>Not yet started</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Incident Detail Page ────────────────────────────────────────────────
function IncidentDetailPage({ incidentId, onBack, onShiftClick }) {
  const I = window.Icons;
  const inc = window.VC_INCIDENTS.find(x => x.id === incidentId);
  if (!inc) return null;
  const client = window.VC_CLIENTS.find(c => c.id === inc.clientId);
  const staff = window.VC_STAFF.find(p => p.id === inc.staffId);
  const shift = window.VC_SHIFTS.find(s => s.id === inc.shiftId);
  const sevTone = inc.severity === 'critical' ? 'red' : inc.severity === 'high' ? 'orange' : inc.severity === 'medium' ? 'amber' : 'emerald';
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', background: 'var(--vc-bg)' }}>
      <ProfileHeader
        avatar={<div style={{ width: 56, height: 56, borderRadius: 14, background: `var(--vc-${sevTone === 'red' ? 'red' : 'amber'}-50)`, color: `var(--vc-${sevTone === 'red' ? 'red' : 'amber'})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><I.alert size={26}/></div>}
        title={inc.title}
        subtitle={<>Incident #INC-{inc.id.slice(1).padStart(4, '0')} · {inc.occurredAt}</>}
        badges={<><Badge tone={sevTone} dot>{inc.severity[0].toUpperCase() + inc.severity.slice(1)}</Badge><StatusBadge status={inc.status}/></>}
        actions={<>
          <button className="vc-btn vc-btn-ghost vc-btn-sm" onClick={onBack}><I.chevronLeft size={13}/>Back</button>
          <button className="vc-btn vc-btn-primary vc-btn-sm">Update status</button>
        </>}
      />
      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="vc-card" style={{ padding: 18 }}>
          <h2 className="vc-h2" style={{ marginBottom: 14 }}>Incident details</h2>
          <InfoGrid rows={[
            { label: 'Client', value: client?.name },
            { label: 'Staff', value: staff?.name },
            { label: 'Severity', value: inc.severity[0].toUpperCase() + inc.severity.slice(1) },
            { label: 'Occurred', value: inc.occurredAt },
            { label: 'Reported', value: inc.occurredAt },
            { label: 'Status', value: window.STATUS_LABEL[inc.status] },
          ]}/>
          <div style={{ height: 1, background: 'var(--vc-border)', margin: '18px 0' }}/>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 13, lineHeight: 1.55 }}>
            {inc.severity === 'critical' ? 'Wrong dose dispensed during evening medication round. Client noted change, did not consume. No injury. Family notified. Awaiting GP follow-up.' :
             inc.severity === 'high' ? 'Client refused medication and became agitated. De-escalation applied per behaviour support plan. No injury, family notified.' :
             inc.severity === 'medium' ? 'Minor fall during transfer from chair to bed. No injury. Manual handling reviewed.' :
             'Property damage at SIL house. Item replaced.'}
          </div>
          {shift && (
            <>
              <div style={{ height: 1, background: 'var(--vc-border)', margin: '18px 0' }}/>
              <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 8 }}>Related shift</div>
              <button className="vc-btn vc-btn-secondary vc-btn-sm" onClick={() => onShiftClick(shift)}>
                {window.VC_DAYS[shift.day]} · {window.fmtTime(shift.start)}–{window.fmtTime(shift.end)} · {window.STATUS_LABEL[shift.status]}
              </button>
            </>
          )}
        </div>
        <div className="vc-card" style={{ padding: 18 }}>
          <h2 className="vc-h2" style={{ marginBottom: 12 }}>Timeline</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { t: inc.occurredAt, e: 'Incident occurred' },
              { t: inc.occurredAt, e: `Reported by ${staff?.name}` },
              { t: '30 min later', e: 'Family notified' },
              ...(inc.status !== 'open' ? [{ t: 'Today, 8:14 am', e: 'Status updated to ' + window.STATUS_LABEL[inc.status] }] : []),
            ].map((x, i) => (
              <div key={i} style={{ display: 'flex', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--vc-primary)', marginTop: 5, flexShrink: 0 }}/>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>{x.t}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{x.e}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Agreements list ─────────────────────────────────────────────────────
function AgreementsPage({ onClientClick }) {
  const STATUS_MAP = { signed: 'verified', pending_signature: 'pending', expired: 'expired', draft: 'pending' };
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        <table className="vc-table">
          <thead><tr><th>Agreement</th><th>Client</th><th>Status</th><th>Signed</th><th>Expires</th><th>Value</th><th></th></tr></thead>
          <tbody>{window.VC_AGREEMENTS.map(a => {
            const c = window.VC_CLIENTS.find(x => x.id === a.clientId);
            return (
              <tr key={a.id}>
                <td><span style={{ fontWeight: 500 }}>{a.title}</span></td>
                <td><button className="vc-link" onClick={() => onClientClick(a.clientId)}>{c?.name}</button></td>
                <td><StatusBadge status={STATUS_MAP[a.status]}/></td>
                <td style={{ color: 'var(--vc-text-3)' }}>{a.signed || '—'}</td>
                <td style={{ color: 'var(--vc-text-3)' }}>{a.expires}</td>
                <td className="vc-mono">${a.value.toLocaleString()}</td>
                <td><button className="vc-btn vc-btn-ghost vc-btn-sm">{a.status === 'pending_signature' ? 'Resend' : a.status === 'draft' ? 'Send' : 'Open'}</button></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Payments ────────────────────────────────────────────────────────────
function PaymentsPage() {
  const totals = {
    paid: window.VC_PAYMENTS.filter(p => p.status === 'paid').reduce((a, p) => a + p.amount, 0),
    submitted: window.VC_PAYMENTS.filter(p => p.status === 'submitted').reduce((a, p) => a + p.amount, 0),
    overdue: window.VC_PAYMENTS.filter(p => p.status === 'overdue').reduce((a, p) => a + p.amount, 0),
  };
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Paid this month', value: totals.paid, tone: 'emerald' },
          { label: 'Submitted, awaiting payment', value: totals.submitted, tone: 'blue' },
          { label: 'Overdue', value: totals.overdue, tone: 'red' },
        ].map(s => (
          <div key={s.label} className="vc-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>{s.label}</div>
            <div className="vc-mono" style={{ fontSize: 24, fontWeight: 600, marginTop: 6, color: s.tone === 'red' ? 'var(--vc-red)' : 'var(--vc-text)' }}>
              ${s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        <table className="vc-table">
          <thead><tr><th>Invoice</th><th>Client</th><th>Period</th><th>Amount</th><th>Status</th><th>Paid</th></tr></thead>
          <tbody>{window.VC_PAYMENTS.map(p => {
            const c = window.VC_CLIENTS.find(x => x.id === p.clientId);
            return (
              <tr key={p.id}>
                <td className="vc-mono" style={{ fontWeight: 500 }}>{p.invoice}</td>
                <td>{c?.name}</td>
                <td style={{ color: 'var(--vc-text-3)' }}>{p.period}</td>
                <td className="vc-mono">${p.amount.toLocaleString()}</td>
                <td><StatusBadge status={p.status === 'paid' ? 'verified' : p.status === 'submitted' ? 'pending' : 'expired'}/></td>
                <td style={{ color: 'var(--vc-text-3)' }}>{p.paidOn || '—'}</td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Notifications composer/history ──────────────────────────────────────
function NotificationsPage() {
  const I = window.Icons;
  const [audience, setAudience] = React.useState('all_staff');
  const [message, setMessage] = React.useState('');
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 3fr', gap: 16 }}>
        <div className="vc-card" style={{ padding: 18 }}>
          <h2 className="vc-h2" style={{ marginBottom: 14 }}>Send notification</h2>
          <label className="vc-label">Audience</label>
          <select className="vc-input" value={audience} onChange={e => setAudience(e.target.value)}>
            <option value="all_staff">All staff (8)</option>
            <option value="rostered_today">Staff rostered today</option>
            <option value="specific">Specific staff…</option>
            <option value="all_clients">All clients (6)</option>
          </select>
          <label className="vc-label" style={{ marginTop: 12 }}>Channel</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{ id: 'push', l: 'Push' }, { id: 'sms', l: 'SMS' }, { id: 'email', l: 'Email' }].map(o => (
              <label key={o.id} style={{ flex: 1, padding: 8, border: '1px solid var(--vc-border)', borderRadius: 8, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked={o.id === 'push'}/>{o.l}
              </label>
            ))}
          </div>
          <label className="vc-label" style={{ marginTop: 12 }}>Message</label>
          <textarea className="vc-input" value={message} onChange={e => setMessage(e.target.value)} style={{ height: 100, padding: 10, resize: 'none' }} placeholder="Heads up: Friday's roster has been updated. Please check the app."/>
          <button className="vc-btn vc-btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={!message.trim()}><I.send size={13}/>Send notification</button>
        </div>
        <div className="vc-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--vc-border)' }}>
            <h2 className="vc-h2">Sent history</h2>
          </div>
          {[
            { t: '12 min ago', a: 'All staff', m: 'Friday morning shifts now start 30 min earlier.', d: 8 },
            { t: '2 hours ago', a: 'Marcus Bellweather', m: 'Document expiring soon — please upload renewal.', d: 1 },
            { t: 'Yesterday', a: 'All staff', m: 'New roster published for week of May 4.', d: 8 },
            { t: 'Apr 26', a: 'Aroha Nguyen', m: 'Schedule change requested — please review.', d: 1 },
          ].map((n, i) => (
            <div key={i} style={{ padding: '14px 16px', borderTop: i > 0 ? '1px solid var(--vc-border)' : 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--vc-text-4)' }}>
                <span>{n.t}</span><span>·</span><span>{n.a}</span><span>·</span><span>{n.d} delivered</span>
              </div>
              <div style={{ fontSize: 13, marginTop: 4 }}>{n.m}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings ────────────────────────────────────────────────────────────
function SettingsPage() {
  const [section, setSection] = React.useState('org');
  const sections = [
    { id: 'org', label: 'Organisation' },
    { id: 'roster', label: 'Roster rules' },
    { id: 'compliance', label: 'Compliance' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'billing', label: 'Billing' },
    { id: 'team', label: 'Team & roles' },
  ];
  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', background: 'var(--vc-bg)' }}>
      <nav style={{ width: 220, borderRight: '1px solid var(--vc-border)', padding: 16, background: 'var(--vc-surface)' }}>
        {sections.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)} style={{
            display: 'block', width: '100%', textAlign: 'left',
            padding: '8px 10px', borderRadius: 6, border: 0, cursor: 'pointer',
            background: section === s.id ? 'var(--vc-primary-50)' : 'transparent',
            color: section === s.id ? 'var(--vc-primary-700)' : 'var(--vc-text-2)',
            fontWeight: section === s.id ? 600 : 500, fontSize: 13, marginBottom: 2,
          }}>{s.label}</button>
        ))}
      </nav>
      <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24 }}>
        <div className="vc-card" style={{ padding: 20, maxWidth: 640 }}>
          {section === 'org' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Organisation details</h2>
              <label className="vc-label">Organisation name</label>
              <input className="vc-input" defaultValue="VividCare Pty Ltd"/>
              <label className="vc-label" style={{ marginTop: 12 }}>NDIS provider number</label>
              <input className="vc-input vc-mono" defaultValue="4-22B-118"/>
              <label className="vc-label" style={{ marginTop: 12 }}>Time zone</label>
              <input className="vc-input" defaultValue="Australia/Sydney"/>
            </>
          )}
          {section === 'roster' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Roster rules</h2>
              <SettingRow label="Clock-in window opens" value="30 min before shift"/>
              <SettingRow label="Default geofence radius" value="150 m"/>
              <SettingRow label="Auto-mark missed after" value="15 min past shift start"/>
              <SettingRow label="Allow unassigned shifts" value="Yes — flag in roster"/>
              <SettingRow label="Block double-booking" value="Yes — error"/>
              <SettingRow label="Block overlapping unavailability" value="Yes — warn"/>
            </>
          )}
          {section === 'compliance' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Compliance</h2>
              <SettingRow label="Required documents" value="WWC, NDIS Worker Screening, First Aid, Police Check"/>
              <SettingRow label="Expiry warning window" value="45 days"/>
              <SettingRow label="Block expired staff from rostering" value="Yes"/>
            </>
          )}
          {section === 'notifications' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Notification defaults</h2>
              <SettingRow label="Roster published" value="Push + Email"/>
              <SettingRow label="Document expiring" value="Push + SMS"/>
              <SettingRow label="Missed clock-in (admin)" value="Push + Email"/>
              <SettingRow label="Critical incident (admin)" value="Push + SMS + Email"/>
            </>
          )}
          {section === 'billing' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Billing</h2>
              <SettingRow label="Plan" value="Operator · 25 staff"/>
              <SettingRow label="Renews" value="Aug 14, 2026"/>
              <SettingRow label="Payment method" value="Card ending 4421"/>
            </>
          )}
          {section === 'team' && (
            <>
              <h2 className="vc-h2" style={{ marginBottom: 14 }}>Team & roles</h2>
              <SettingRow label="Eliza Marsden" value="Operations admin · Owner"/>
              <SettingRow label="Roman Acharya" value="Operations admin"/>
              <SettingRow label="Tess Whitcombe" value="Roster coordinator"/>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({ label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--vc-border)' }}>
      <div style={{ flex: 1, fontSize: 13, color: 'var(--vc-text)' }}>{label}</div>
      <div style={{ fontSize: 12.5, color: 'var(--vc-text-3)' }}>{value}</div>
      <button className="vc-btn vc-btn-ghost vc-btn-sm" style={{ marginLeft: 12 }}>Edit</button>
    </div>
  );
}

// ─── Shifts list (admin) ─────────────────────────────────────────────────
function ShiftsListPage({ onShiftClick }) {
  const I = window.Icons;
  const [filter, setFilter] = React.useState('all');
  const filters = [
    { id: 'all', label: 'All', count: window.VC_SHIFTS.length },
    { id: 'scheduled', label: 'Scheduled', count: window.VC_SHIFTS.filter(s => s.status === 'scheduled').length },
    { id: 'in_progress', label: 'In progress', count: window.VC_SHIFTS.filter(s => s.status === 'in_progress').length },
    { id: 'completed', label: 'Completed', count: window.VC_SHIFTS.filter(s => s.status === 'completed').length },
    { id: 'missed', label: 'Missed', count: window.VC_SHIFTS.filter(s => s.status === 'missed').length },
    { id: 'unassigned', label: 'Unassigned', count: window.VC_SHIFTS.filter(s => s.status === 'unassigned').length },
  ];
  const list = filter === 'all' ? window.VC_SHIFTS : window.VC_SHIFTS.filter(s => s.status === filter);
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            height: 30, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer',
            border: `1px solid ${filter === f.id ? 'var(--vc-primary)' : 'var(--vc-border)'}`,
            background: filter === f.id ? 'var(--vc-primary-50)' : 'var(--vc-surface)',
            color: filter === f.id ? 'var(--vc-primary-700)' : 'var(--vc-text-2)',
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{f.label} <span style={{ opacity: 0.7 }}>{f.count}</span></button>
        ))}
      </div>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        <table className="vc-table">
          <thead><tr><th>When</th><th>Client</th><th>Staff</th><th>Support</th><th>Location</th><th>Status</th></tr></thead>
          <tbody>{list.map(s => {
            const c = window.VC_CLIENTS.find(x => x.id === s.clientId);
            const st = window.VC_STAFF.find(x => x.id === s.staffId);
            const sup = window.VC_SUPPORT_TYPES.find(t => t.id === s.support);
            return (
              <tr key={s.id} onClick={() => onShiftClick(s)} style={{ cursor: 'pointer' }}>
                <td><div style={{ fontWeight: 500 }}>{window.VC_DAYS[s.day]} {window.VC_DATES[s.day]}</div><div className="vc-mono" style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>{window.fmtTime(s.start)}–{window.fmtTime(s.end)}</div></td>
                <td>{c?.name}</td>
                <td>{st ? st.name : <span style={{ color: 'var(--vc-amber)', fontWeight: 500 }}>Unassigned</span>}</td>
                <td>{sup?.label}</td>
                <td style={{ color: 'var(--vc-text-3)' }}>{s.location}</td>
                <td><StatusBadge status={s.status}/></td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Staff Shift Detail (mobile) ─────────────────────────────────────────
function StaffShiftDetail({ shift, onBack, onGoToClock }) {
  const I = window.Icons;
  if (!shift) return null;
  const client = window.VC_CLIENTS.find(c => c.id === shift.clientId);
  const support = window.VC_SUPPORT_TYPES.find(t => t.id === shift.support);
  const isToday = shift.day === window.VC_TODAY_INDEX;
  const isInProgress = shift.status === 'in_progress';

  return (
    <div style={{ padding: '14px 18px 24px' }}>
      <button onClick={onBack} className="vc-btn vc-btn-ghost vc-btn-sm" style={{ marginBottom: 12, padding: '0 6px' }} aria-label="Back">
        <I.chevronLeft size={14}/>Back
      </button>
      <div style={{ marginBottom: 14 }}>
        <Badge tone={isInProgress ? 'teal' : isToday ? 'blue' : 'slate'} dot>{window.STATUS_LABEL[shift.status]}</Badge>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: '8px 0 2px', letterSpacing: '-0.01em' }}>{client?.name}</h1>
        <div style={{ fontSize: 13, color: 'var(--vc-text-3)' }}>{support?.label}</div>
      </div>

      {/* Map */}
      <div style={{
        height: 130, borderRadius: 12, marginBottom: 12,
        background: `repeating-linear-gradient(135deg, #e8f0ee, #e8f0ee 8px, #f1f5f4 8px, #f1f5f4 16px)`,
        border: '1px solid var(--vc-border)', position: 'relative', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ background: '#fff', padding: '5px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 600, boxShadow: 'var(--vc-shadow)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <I.pin size={12}/>{shift.location.replace(' NSW', '')}
        </div>
      </div>

      {/* Quick info */}
      <div className="vc-card" style={{ padding: 0, marginBottom: 12, overflow: 'hidden' }}>
        {[
          { i: <I.clock size={15}/>, l: 'Time', v: `${window.fmtTime(shift.start)} – ${window.fmtTime(shift.end)} · ${window.VC_DAYS[shift.day]} ${window.VC_DATES[shift.day]}` },
          { i: <I.pin size={15}/>, l: 'Address', v: shift.location },
          { i: <I.shield size={15}/>, l: 'Support type', v: support?.label },
          { i: <I.user size={15}/>, l: 'Client', v: client?.name },
        ].map((row, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderTop: i > 0 ? '1px solid var(--vc-border)' : 0, alignItems: 'center' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{row.i}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: 'var(--vc-text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{row.l}</div>
              <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>{row.v}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div className="vc-card" style={{ padding: 14, marginBottom: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--vc-text-4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>Care notes</div>
        <div style={{ fontSize: 13, color: 'var(--vc-text-2)', lineHeight: 1.5 }}>
          Tea with one sugar. Hearing aid in left ear. Door code 4421. Park in driveway. Family prefers female staff.
        </div>
      </div>

      {/* Directions placeholder */}
      <button className="vc-btn vc-btn-secondary" style={{ width: '100%', height: 44, marginBottom: 8 }}>
        <I.pin size={14}/>Get directions
      </button>

      {/* Clock CTA */}
      {isToday && (
        <button onClick={onGoToClock} className="vc-btn vc-btn-primary" style={{ width: '100%', height: 52, fontSize: 15, fontWeight: 600 }}>
          <I.power size={16} stroke={2.5}/>{isInProgress ? 'Continue to clock' : 'Go to clock'}
        </button>
      )}
    </div>
  );
}

Object.assign(window, {
  useEscapeClose, useFocusTrap, Tabs, ProfileHeader, InfoGrid,
  ClientProfile, StaffProfile, ShiftDetailPage, IncidentDetailPage,
  AgreementsPage, PaymentsPage, NotificationsPage, SettingsPage, ShiftsListPage,
  StaffShiftDetail,
});
