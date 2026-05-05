// drawers.jsx — Shift detail, Create shift, Incident review

function Drawer({ open, onClose, width = 480, children }) {
  if (!open) return null;
  return (
    <>
      <div className="vc-overlay-enter" onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.35)', zIndex: 50,
      }}/>
      <div className="vc-drawer-enter" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width,
        background: 'var(--vc-surface)', zIndex: 51,
        boxShadow: '-12px 0 40px rgba(15,23,42,0.12)',
        display: 'flex', flexDirection: 'column',
      }}>{children}</div>
    </>
  );
}

function DrawerHeader({ title, onClose, badge }) {
  const I = window.Icons;
  return (
    <div style={{
      padding: '14px 18px', borderBottom: '1px solid var(--vc-border)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <h2 className="vc-h2">{title}</h2>
        {badge}
      </div>
      <button className="vc-btn vc-btn-ghost vc-btn-icon" onClick={onClose} aria-label="Close"><I.x size={15}/></button>
    </div>
  );
}

function ShiftDetailDrawer({ shift, onClose, onResolveIncident, alerts }) {
  if (!shift) return null;
  const I = window.Icons;
  const client = window.VC_CLIENTS.find(c => c.id === shift.clientId);
  const staff = window.VC_STAFF.find(p => p.id === shift.staffId);
  const support = window.VC_SUPPORT_TYPES.find(t => t.id === shift.support);
  const isMissed = shift.status === 'missed';
  const isInProgress = shift.status === 'in_progress';
  const isUnassigned = shift.status === 'unassigned';
  const hasConflict = shift.conflicts?.length > 0;

  return (
    <Drawer open={!!shift} onClose={onClose} width={520}>
      <DrawerHeader title="Shift" onClose={onClose} badge={<StatusBadge status={shift.status}/>}/>

      <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        {/* Warning banner */}
        {alerts && (isMissed || isUnassigned || hasConflict) && (
          <div style={{
            padding: 12, borderRadius: 10, marginBottom: 16,
            background: isMissed ? 'var(--vc-red-50)' : 'var(--vc-amber-50)',
            border: `1px solid ${isMissed ? '#fecaca' : '#fde68a'}`,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <I.warn size={16} stroke={2} style={{ color: isMissed ? 'var(--vc-red)' : 'var(--vc-amber)', marginTop: 1, flexShrink: 0 }}/>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: isMissed ? '#7f1d1d' : '#78350f' }}>
                {isMissed ? 'Missed clock-in at 8:00 am' : isUnassigned ? 'No staff assigned' : 'Compliance blocker'}
              </div>
              <div style={{ fontSize: 12, color: isMissed ? '#991b1b' : '#92400e', marginTop: 2 }}>
                {isMissed && 'Marcus has not clocked in. Confirm welfare and reassign or mark as no-show.'}
                {isUnassigned && 'Find a roster-ready staff member with availability for this slot.'}
                {hasConflict && shift.conflicts.includes('blocked') && 'Joel has an expired Working with Children Check. Cannot proceed.'}
                {hasConflict && shift.conflicts.includes('double') && 'Priya is already assigned to another shift at this time.'}
              </div>
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                {isMissed && <button className="vc-btn vc-btn-secondary vc-btn-sm">Call staff</button>}
                {isMissed && <button className="vc-btn vc-btn-primary vc-btn-sm">Reassign</button>}
                {isUnassigned && <button className="vc-btn vc-btn-primary vc-btn-sm">Assign staff</button>}
                {hasConflict && <button className="vc-btn vc-btn-secondary vc-btn-sm">Choose different staff</button>}
              </div>
            </div>
          </div>
        )}

        {/* Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Scheduled</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vc-text)', marginTop: 4 }}>
              {window.fmtTime(shift.start)} – {window.fmtTime(shift.end)}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>Thu, 30 Apr 2026</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Actual</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--vc-text)', marginTop: 4 }}>
              {shift.clockedInAt ? `${shift.clockedInAt} – …` : isMissed ? '—' : 'Not started'}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>
              {isInProgress ? <span style={{ color: 'var(--vc-primary-700)', fontWeight: 600 }}>● Active</span> : isMissed ? <span style={{ color: 'var(--vc-red)' }}>● No clock-in</span> : '—'}
            </div>
          </div>
        </div>

        {/* Client */}
        <div style={{ padding: 12, border: '1px solid var(--vc-border)', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>Client</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }}>
              {client?.name.split(' ').map(n => n[0]).join('').slice(0,2)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--vc-text)' }}>{client?.name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>NDIS {client?.ndis} · {client?.suburb}</div>
            </div>
            <button className="vc-btn vc-btn-ghost vc-btn-sm">View profile</button>
          </div>
        </div>

        {/* Staff */}
        <div style={{ padding: 12, border: '1px solid var(--vc-border)', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>Staff</div>
          {staff ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials={staff.initials} color={staff.color} size={36}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--vc-text)' }}>{staff.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--vc-text-3)' }}>{staff.position} · {staff.phone}</div>
              </div>
              {alerts && staff.readiness === 'blocked' ? <Badge tone="red" dot>Blocked</Badge> : <Badge tone="emerald" dot>Ready</Badge>}
            </div>
          ) : (
            <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px dashed var(--vc-border-strong)' }}/>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--vc-text-3)' }}>No staff assigned</div>
              <button className="vc-btn vc-btn-primary vc-btn-sm"><I.plus size={12}/>Assign</button>
            </div>
          )}
        </div>

        {/* Detail rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Support type', value: support?.label, dot: support?.color },
            { label: 'Location', value: shift.location, icon: I.pin },
            { label: 'Geofence', value: '150m radius · configured', icon: I.shield },
            { label: 'Notes', value: 'Door code 3724. Client prefers afternoon shower.' },
          ].map(row => (
            <div key={row.label} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12.5 }}>
              <div style={{ color: 'var(--vc-text-4)' }}>{row.label}</div>
              <div style={{ color: 'var(--vc-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                {row.dot && <span style={{ width: 7, height: 7, borderRadius: '50%', background: row.dot }}/>}
                {row.icon && <row.icon size={13} stroke={1.75} style={{ color: 'var(--vc-text-3)' }}/>}
                {row.value}
              </div>
            </div>
          ))}
        </div>

        {/* Activity */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 10 }}>Activity</div>
          <div style={{ position: 'relative', paddingLeft: 16 }}>
            <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 1, background: 'var(--vc-border)' }}/>
            {[
              isInProgress && { dot: 'var(--vc-primary)', text: `Staff clocked in at ${shift.clockedInAt}`, sub: 'Inside geofence · 12m from address', time: '5 min ago' },
              { dot: 'var(--vc-text-4)', text: 'Shift assigned to ' + (staff?.name || '—'), sub: 'By Eliza Marsden', time: 'Mon 10:14 am' },
              { dot: 'var(--vc-text-4)', text: 'Shift created', sub: 'By Eliza Marsden', time: 'Mon 10:12 am' },
            ].filter(Boolean).map((row, i) => (
              <div key={i} style={{ position: 'relative', paddingBottom: 12 }}>
                <div style={{ position: 'absolute', left: -16, top: 5, width: 9, height: 9, borderRadius: '50%', background: row.dot, border: '2px solid var(--vc-surface)' }}/>
                <div style={{ fontSize: 12.5, color: 'var(--vc-text)', fontWeight: 500 }}>{row.text}</div>
                <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>{row.sub} · {row.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--vc-border)', padding: 14, display: 'flex', gap: 8 }}>
        <button className="vc-btn vc-btn-secondary" style={{ flex: 1 }}>Edit shift</button>
        {!isUnassigned && <button className="vc-btn vc-btn-ghost">Cancel shift</button>}
        {isUnassigned && <button className="vc-btn vc-btn-primary" style={{ flex: 1 }}><I.plus size={13}/>Assign staff</button>}
      </div>
    </Drawer>
  );
}

function CreateShiftDrawer({ open, onClose, onCreate }) {
  const I = window.Icons;
  const [client, setClient] = React.useState('');
  const [staff, setStaff] = React.useState('');
  const [support, setSupport] = React.useState('pc');
  const [date, setDate] = React.useState('2026-04-30');
  const [start, setStart] = React.useState('14:00');
  const [end, setEnd] = React.useState('18:00');
  const [step, setStep] = React.useState('form'); // form | success

  const staffObj = window.VC_STAFF.find(p => p.id === staff);
  const isBlocked = staffObj?.readiness === 'blocked';

  React.useEffect(() => { if (open) { setStep('form'); setClient(''); setStaff(''); } }, [open]);

  const handleCreate = () => {
    setStep('success');
    setTimeout(() => { onCreate?.(); onClose(); }, 1200);
  };

  return (
    <Drawer open={open} onClose={onClose} width={460}>
      <DrawerHeader title={step === 'success' ? 'Shift created' : 'New shift'} onClose={onClose}/>

      {step === 'success' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <I.check size={28} stroke={2.5}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--vc-text)' }}>Shift created</div>
          <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6, maxWidth: 280 }}>
            Notification sent to {staffObj?.name || 'assigned staff'}. The shift now appears on the roster.
          </div>
        </div>
      ) : (
        <>
          <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="vc-label">Client</label>
              <select className="vc-input" value={client} onChange={e => setClient(e.target.value)}>
                <option value="">Select client…</option>
                {window.VC_CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name} · {c.suburb}</option>)}
              </select>
            </div>
            <div>
              <label className="vc-label">Support type</label>
              <select className="vc-input" value={support} onChange={e => setSupport(e.target.value)}>
                {window.VC_SUPPORT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">Date</label>
                <input className="vc-input" type="date" value={date} onChange={e => setDate(e.target.value)}/>
              </div>
              <div>
                <label className="vc-label">Start</label>
                <input className="vc-input" type="time" value={start} onChange={e => setStart(e.target.value)}/>
              </div>
              <div>
                <label className="vc-label">End</label>
                <input className="vc-input" type="time" value={end} onChange={e => setEnd(e.target.value)}/>
              </div>
            </div>
            <div>
              <label className="vc-label">Staff</label>
              <select className="vc-input" value={staff} onChange={e => setStaff(e.target.value)}>
                <option value="">Leave unassigned</option>
                {window.VC_STAFF.map(p => <option key={p.id} value={p.id}>{p.name} · {p.readiness === 'ready' ? 'Ready' : p.readiness === 'blocked' ? 'Blocked' : 'Expiring'}</option>)}
              </select>
              {isBlocked && (
                <div style={{ marginTop: 8, padding: 10, background: 'var(--vc-red-50)', borderRadius: 8, fontSize: 12, color: '#7f1d1d', display: 'flex', gap: 8 }}>
                  <I.warn size={14} style={{ color: 'var(--vc-red)', flexShrink: 0, marginTop: 1 }}/>
                  <div>
                    <div style={{ fontWeight: 600 }}>This staff member is blocked</div>
                    <div style={{ marginTop: 2 }}>{staffObj.blocker}. Resolve compliance before assigning.</div>
                  </div>
                </div>
              )}
              {staffObj?.readiness === 'expiring' && (
                <div style={{ marginTop: 8, padding: 10, background: 'var(--vc-amber-50)', borderRadius: 8, fontSize: 12, color: '#78350f', display: 'flex', gap: 8 }}>
                  <I.warn size={14} style={{ color: 'var(--vc-amber)', flexShrink: 0, marginTop: 1 }}/>
                  <div>NDIS Worker Screening expires in 24 days. Assigning is allowed but flag for review.</div>
                </div>
              )}
            </div>
            <div>
              <label className="vc-label">Location</label>
              <input className="vc-input" defaultValue="14 Marsden St, Parramatta NSW 2150"/>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--vc-text-4)' }}>Geofence radius: 150m (default)</div>
            </div>
            <div>
              <label className="vc-label">Notes (visible to staff)</label>
              <textarea className="vc-input" style={{ height: 64, padding: 10, resize: 'none' }} placeholder="Door code, parking, key handover…"/>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--vc-border)', padding: 14, display: 'flex', gap: 8 }}>
            <button className="vc-btn vc-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="vc-btn vc-btn-primary" style={{ flex: 1 }} disabled={isBlocked} onClick={handleCreate}>
              {isBlocked ? 'Resolve compliance first' : 'Create shift'}
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}

function IncidentDrawer({ open, onClose, onResolve }) {
  if (!open) return null;
  const I = window.Icons;
  const [status, setStatus] = React.useState('open');
  const [resolution, setResolution] = React.useState('');

  return (
    <Drawer open={open} onClose={onClose} width={520}>
      <DrawerHeader title="Incident #INC-0421" onClose={onClose}
        badge={<Badge tone="red" dot>Critical</Badge>}/>
      <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
        <div style={{ padding: 12, border: '1px solid #fecaca', borderRadius: 10, background: 'var(--vc-red-50)', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#7f1d1d' }}>Suspected medication error — escalated</div>
          <div style={{ fontSize: 12, color: '#991b1b', marginTop: 4 }}>Wed, 30 Apr · 9:11 pm · Liverpool</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12.5 }}>
            <div style={{ color: 'var(--vc-text-4)' }}>Client</div>
            <div style={{ color: 'var(--vc-text)' }}>Reuben Castellanos · NDIS 430 661 088</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12.5 }}>
            <div style={{ color: 'var(--vc-text-4)' }}>Staff</div>
            <div style={{ color: 'var(--vc-text)' }}>Sina Levu</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, fontSize: 12.5 }}>
            <div style={{ color: 'var(--vc-text-4)' }}>Related shift</div>
            <div style={{ color: 'var(--vc-text)' }}>Wed 30 Apr · 2:00 pm – 8:00 pm · SIL overnight</div>
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: 6 }}>Description</div>
          <div style={{ fontSize: 13, color: 'var(--vc-text)', lineHeight: 1.5 }}>
            Wrong dose dispensed during evening medication round. Client noted change, did not consume.
            No injury. Family notified. Awaiting GP follow-up.
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div className="vc-label">Status</div>
          <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--vc-surface-2)', borderRadius: 8, border: '1px solid var(--vc-border)' }}>
            {['open', 'under_review', 'resolved', 'closed'].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{
                flex: 1, height: 28, border: 0, borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                background: status === s ? 'var(--vc-surface)' : 'transparent',
                color: status === s ? 'var(--vc-text)' : 'var(--vc-text-3)',
                boxShadow: status === s ? 'var(--vc-shadow-sm)' : 'none',
              }}>{window.STATUS_LABEL[s]}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label className="vc-label">Resolution notes</label>
          <textarea className="vc-input" style={{ height: 90, padding: 10, resize: 'none' }}
            placeholder="What happened, who was contacted, follow-up required…"
            value={resolution} onChange={e => setResolution(e.target.value)}/>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--vc-border)', padding: 14, display: 'flex', gap: 8 }}>
        <button className="vc-btn vc-btn-ghost" onClick={onClose}>Cancel</button>
        <button className="vc-btn vc-btn-primary" style={{ flex: 1 }} onClick={() => { onResolve?.(); onClose(); }}>
          <I.check size={13}/>Save & notify
        </button>
      </div>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Add Staff
// ─────────────────────────────────────────────────────────────────────────
const STAFF_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#ea580c', '#db2777', '#0891b2', '#65a30d', '#be123c'];
const POSITIONS = ['Support Worker', 'Senior Support Worker', 'Coordinator', 'Registered Nurse'];
const REQUIRED_DOCS = [
  { id: 'wwc', label: 'Working with Children Check' },
  { id: 'ndis', label: 'NDIS Worker Screening' },
  { id: 'fa', label: 'First Aid Certificate' },
  { id: 'pol', label: 'Police Check' },
  { id: 'lic', label: "Driver's licence" },
];

function AddStaffDrawer({ open, onClose, onCreate }) {
  const I = window.Icons;
  const [step, setStep] = React.useState('form');
  const [first, setFirst] = React.useState('');
  const [last, setLast] = React.useState('');
  const [position, setPosition] = React.useState('Support Worker');
  const [phone, setPhone] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [startDate, setStartDate] = React.useState('2026-05-05');
  const [docs, setDocs] = React.useState({ wwc: true, ndis: true, fa: true, pol: true, lic: false });
  const [invite, setInvite] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      setStep('form'); setFirst(''); setLast(''); setPosition('Support Worker');
      setPhone(''); setEmail(''); setInvite(true);
    }
  }, [open]);

  const fullName = `${first} ${last}`.trim();
  const initials = ((first[0] || '') + (last[0] || '')).toUpperCase() || '–';
  const valid = first.trim() && last.trim() && phone.trim() && email.trim();
  const requiredDocsList = REQUIRED_DOCS.filter(d => docs[d.id]);

  const handleCreate = () => {
    const newStaff = {
      id: 's' + Date.now(),
      name: fullName,
      initials,
      position,
      color: STAFF_COLORS[Math.floor(Math.random() * STAFF_COLORS.length)],
      readiness: requiredDocsList.length > 0 ? 'pending' : 'ready',
      expiringDocs: 0,
      phone,
      email,
      isNew: true,
    };
    setStep('success');
    setTimeout(() => { onCreate?.(newStaff); onClose(); }, 1300);
  };

  return (
    <Drawer open={open} onClose={onClose} width={500}>
      <DrawerHeader title={step === 'success' ? 'Staff member added' : 'Add staff member'} onClose={onClose}/>

      {step === 'success' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <I.check size={28} stroke={2.5}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--vc-text)' }}>{fullName} added</div>
          <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6, maxWidth: 320 }}>
            {invite ? `Invitation sent to ${email}. ` : ''}
            {requiredDocsList.length > 0
              ? `Awaiting ${requiredDocsList.length} compliance ${requiredDocsList.length === 1 ? 'document' : 'documents'} before they can be rostered.`
              : 'Ready to be rostered.'}
          </div>
        </div>
      ) : (
        <>
          <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Identity preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: 'var(--vc-surface-2)', borderRadius: 10, border: '1px solid var(--vc-border)' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: STAFF_COLORS[0] + '22',
                color: STAFF_COLORS[0],
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 600, fontSize: 14,
              }}>{initials}</div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--vc-text)' }}>{fullName || 'New staff member'}</div>
                <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', marginTop: 2 }}>{position}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">First name</label>
                <input className="vc-input" value={first} onChange={e => setFirst(e.target.value)} placeholder="Jordan"/>
              </div>
              <div>
                <label className="vc-label">Last name</label>
                <input className="vc-input" value={last} onChange={e => setLast(e.target.value)} placeholder="Holloway"/>
              </div>
            </div>

            <div>
              <label className="vc-label">Position</label>
              <select className="vc-input" value={position} onChange={e => setPosition(e.target.value)}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">Mobile</label>
                <input className="vc-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0412 345 678"/>
              </div>
              <div>
                <label className="vc-label">Start date</label>
                <input className="vc-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}/>
              </div>
            </div>

            <div>
              <label className="vc-label">Email</label>
              <input className="vc-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="jordan.h@vividcare.au"/>
            </div>

            <div>
              <label className="vc-label">Required documents</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 10, background: 'var(--vc-surface-2)', border: '1px solid var(--vc-border)', borderRadius: 10 }}>
                {REQUIRED_DOCS.map(d => (
                  <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--vc-text-2)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={docs[d.id]} onChange={e => setDocs({ ...docs, [d.id]: e.target.checked })}/>
                    {d.label}
                  </label>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--vc-text-4)' }}>
                Marked documents must be uploaded and verified before this staff member can be rostered.
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 12, border: '1px solid var(--vc-border)', borderRadius: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={invite} onChange={e => setInvite(e.target.checked)} style={{ marginTop: 2 }}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--vc-text)' }}>Send mobile app invitation</div>
                <div style={{ fontSize: 11.5, color: 'var(--vc-text-4)', marginTop: 2 }}>
                  An email + SMS will be sent so they can complete onboarding and upload documents.
                </div>
              </div>
            </label>
          </div>

          <div style={{ borderTop: '1px solid var(--vc-border)', padding: 14, display: 'flex', gap: 8 }}>
            <button className="vc-btn vc-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="vc-btn vc-btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={handleCreate}>
              <I.plus size={13}/>Add staff member
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Add Client
// ─────────────────────────────────────────────────────────────────────────
function AddClientDrawer({ open, onClose, onCreate }) {
  const I = window.Icons;
  const [step, setStep] = React.useState('form');
  const [first, setFirst] = React.useState('');
  const [last, setLast] = React.useState('');
  const [ndis, setNdis] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [suburb, setSuburb] = React.useState('');
  const [address, setAddress] = React.useState('');
  const [supports, setSupports] = React.useState({ pc: true, dl: false, ca: false, sil: false, tr: false });
  const [agreement, setAgreement] = React.useState('draft');
  const [emergencyName, setEmergencyName] = React.useState('');
  const [emergencyPhone, setEmergencyPhone] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setStep('form'); setFirst(''); setLast(''); setNdis(''); setPhone('');
      setSuburb(''); setAddress(''); setEmergencyName(''); setEmergencyPhone('');
    }
  }, [open]);

  const fullName = `${first} ${last}`.trim();
  const supportsList = window.VC_SUPPORT_TYPES.filter(t => supports[t.id]);
  const valid = first.trim() && last.trim() && ndis.trim() && suburb.trim() && supportsList.length > 0;

  const handleCreate = () => {
    const newClient = {
      id: 'c' + Date.now(),
      name: fullName,
      ndis,
      suburb,
      supports: supportsList.map(s => s.label),
      address,
      phone,
      isNew: true,
    };
    setStep('success');
    setTimeout(() => { onCreate?.(newClient); onClose(); }, 1300);
  };

  return (
    <Drawer open={open} onClose={onClose} width={520}>
      <DrawerHeader title={step === 'success' ? 'Client added' : 'Add client'} onClose={onClose}/>

      {step === 'success' ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--vc-emerald-50)', color: 'var(--vc-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <I.check size={28} stroke={2.5}/>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--vc-text)' }}>{fullName} added</div>
          <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6, maxWidth: 320 }}>
            {agreement === 'draft' ? 'Service agreement saved as draft. Send for signature to activate.' : 'Service agreement sent for signature.'}
          </div>
        </div>
      ) : (
        <>
          <div className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">First name</label>
                <input className="vc-input" value={first} onChange={e => setFirst(e.target.value)} placeholder="Eleanor"/>
              </div>
              <div>
                <label className="vc-label">Last name</label>
                <input className="vc-input" value={last} onChange={e => setLast(e.target.value)} placeholder="Whitfield"/>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">NDIS participant number</label>
                <input className="vc-input vc-mono" value={ndis} onChange={e => setNdis(e.target.value)} placeholder="430 000 000"/>
              </div>
              <div>
                <label className="vc-label">Phone</label>
                <input className="vc-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0412 345 678"/>
              </div>
            </div>

            <div>
              <label className="vc-label">Address</label>
              <input className="vc-input" value={address} onChange={e => setAddress(e.target.value)} placeholder="14 Marsden St"/>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8 }}>
              <div>
                <label className="vc-label">Suburb</label>
                <input className="vc-input" value={suburb} onChange={e => setSuburb(e.target.value)} placeholder="Parramatta"/>
              </div>
              <div>
                <label className="vc-label">Postcode</label>
                <input className="vc-input vc-mono" placeholder="2150"/>
              </div>
            </div>

            <div>
              <label className="vc-label">Support types funded</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {window.VC_SUPPORT_TYPES.map(t => {
                  const active = supports[t.id];
                  return (
                    <button key={t.id}
                      onClick={() => setSupports({ ...supports, [t.id]: !active })}
                      style={{
                        height: 28, padding: '0 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                        border: `1px solid ${active ? t.color : 'var(--vc-border)'}`,
                        background: active ? t.color + '14' : 'var(--vc-surface)',
                        color: active ? t.color : 'var(--vc-text-2)',
                        cursor: 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}>
                      <span style={{ width: 6, height: 6, borderRadius: 3, background: t.color, opacity: active ? 1 : 0.5 }}/>
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--vc-border)', paddingTop: 14 }}>
              <div className="vc-label" style={{ marginBottom: 8 }}>Emergency contact</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input className="vc-input" value={emergencyName} onChange={e => setEmergencyName(e.target.value)} placeholder="Name"/>
                <input className="vc-input" value={emergencyPhone} onChange={e => setEmergencyPhone(e.target.value)} placeholder="Phone"/>
              </div>
            </div>

            <div>
              <label className="vc-label">Service agreement</label>
              <div style={{ display: 'flex', gap: 6, padding: 4, background: 'var(--vc-surface-2)', borderRadius: 8, border: '1px solid var(--vc-border)' }}>
                {[{ v: 'draft', l: 'Save as draft' }, { v: 'send', l: 'Send for signature' }].map(o => (
                  <button key={o.v} onClick={() => setAgreement(o.v)} style={{
                    flex: 1, height: 30, border: 0, borderRadius: 5, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                    background: agreement === o.v ? 'var(--vc-surface)' : 'transparent',
                    color: agreement === o.v ? 'var(--vc-text)' : 'var(--vc-text-3)',
                    boxShadow: agreement === o.v ? 'var(--vc-shadow-sm)' : 'none',
                  }}>{o.l}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--vc-border)', padding: 14, display: 'flex', gap: 8 }}>
            <button className="vc-btn vc-btn-ghost" onClick={onClose}>Cancel</button>
            <button className="vc-btn vc-btn-primary" style={{ flex: 1 }} disabled={!valid} onClick={handleCreate}>
              <I.plus size={13}/>Add client
            </button>
          </div>
        </>
      )}
    </Drawer>
  );
}

Object.assign(window, { Drawer, DrawerHeader, ShiftDetailDrawer, CreateShiftDrawer, IncidentDrawer, AddStaffDrawer, AddClientDrawer });
