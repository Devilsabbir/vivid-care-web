// list-screens.jsx — Lightweight admin list pages used as nav targets

function PlaceholderPage({ title, subtitle, icon: Ic, children }) {
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div className="vc-card" style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, margin: '0 auto 14px', borderRadius: 11, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {Ic && <Ic size={22} stroke={1.75}/>}
        </div>
        <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6, maxWidth: 380, margin: '6px auto 0' }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

function NewPill() {
  return (
    <span style={{
      marginLeft: 8, padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 600,
      background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)',
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>New</span>
  );
}

function ListToolbar({ count, label, search, setSearch, onAdd, addLabel }) {
  const I = window.Icons;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
    }}>
      <div style={{ position: 'relative', flex: '0 0 280px', maxWidth: 280 }}>
        <I.search size={13} stroke={2} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--vc-text-4)' }}/>
        <input
          className="vc-input"
          style={{ paddingLeft: 30, height: 32 }}
          placeholder={`Search ${label.toLowerCase()}…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--vc-text-4)' }}>{count} {label}</div>
      <div style={{ flex: 1 }}/>
      <button className="vc-btn vc-btn-secondary vc-btn-sm"><I.filter size={13}/>Filter</button>
      <button className="vc-btn vc-btn-primary vc-btn-sm" onClick={onAdd}><I.plus size={13}/>{addLabel}</button>
    </div>
  );
}

function EmptyState({ icon: Ic, title, subtitle, ctaLabel, onCta }) {
  const I = window.Icons;
  return (
    <div style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 13, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {Ic && <Ic size={24} stroke={1.75}/>}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--vc-text-3)', marginTop: 6, maxWidth: 380, margin: '6px auto 16px' }}>{subtitle}</div>
      {ctaLabel && (
        <button className="vc-btn vc-btn-primary" onClick={onCta}>
          <I.plus size={13}/>{ctaLabel}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────────────────
function ClientsPage({ clients, onAdd }) {
  const I = window.Icons;
  const [search, setSearch] = React.useState('');
  const filtered = clients.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.suburb.toLowerCase().includes(search.toLowerCase()) ||
    (c.ndis || '').includes(search)
  );

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <ListToolbar count={clients.length} label="clients" search={search} setSearch={setSearch} onAdd={onAdd} addLabel="Add client"/>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        {clients.length === 0 ? (
          <EmptyState icon={I.users} title="No clients yet"
            subtitle="Add your first NDIS participant to start scheduling supports."
            ctaLabel="Add client" onCta={onAdd}/>
        ) : filtered.length === 0 ? (
          <EmptyState icon={I.search} title="No clients match" subtitle={`Nothing matched "${search}". Try a different search.`}/>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Client</th><th>NDIS</th><th>Suburb</th><th>Supports</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--vc-primary-50)', color: 'var(--vc-primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 11 }}>{c.name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
                    <span style={{ fontWeight: 500 }}>{c.name}</span>
                    {c.isNew && <NewPill/>}
                  </div></td>
                  <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{c.ndis}</td>
                  <td>{c.suburb}</td>
                  <td style={{ color: 'var(--vc-text-3)' }}>{c.supports.join(', ')}</td>
                  <td><Badge tone="emerald" dot>Active</Badge></td>
                  <td><button className="vc-btn vc-btn-ghost vc-btn-sm">View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Staff
// ─────────────────────────────────────────────────────────────────────────
function StaffPage({ staff, alerts, onAdd }) {
  const I = window.Icons;
  const [search, setSearch] = React.useState('');
  const filtered = staff.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.position.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <ListToolbar count={staff.length} label="staff" search={search} setSearch={setSearch} onAdd={onAdd} addLabel="Add staff"/>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        {staff.length === 0 ? (
          <EmptyState icon={I.users} title="No staff yet"
            subtitle="Invite your first support worker. They'll receive a mobile invitation to upload documents and get rostered."
            ctaLabel="Add staff member" onCta={onAdd}/>
        ) : filtered.length === 0 ? (
          <EmptyState icon={I.search} title="No staff match" subtitle={`Nothing matched "${search}". Try a different search.`}/>
        ) : (
          <table className="vc-table">
            <thead><tr><th>Staff</th><th>Position</th><th>Phone</th><th>Readiness</th><th>Documents</th><th></th></tr></thead>
            <tbody>
              {filtered.map(p => {
                let r = 'ready';
                if (alerts) r = p.readiness;
                return (
                  <tr key={p.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar initials={p.initials} color={p.color} size={28}/>
                      <span style={{ fontWeight: 500 }}>{p.name}</span>
                      {p.isNew && <NewPill/>}
                    </div></td>
                    <td style={{ color: 'var(--vc-text-3)' }}>{p.position}</td>
                    <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{p.phone}</td>
                    <td><StatusBadge status={r}/></td>
                    <td style={{ color: 'var(--vc-text-3)' }}>
                      {p.readiness === 'pending' ? 'Awaiting upload' : alerts && p.expiringDocs > 0 ? `${p.expiringDocs} expiring` : 'All current'}
                    </td>
                    <td><button className="vc-btn vc-btn-ghost vc-btn-sm">View</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Incidents
// ─────────────────────────────────────────────────────────────────────────
function IncidentsPage({ alerts, onResolve }) {
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        <table className="vc-table">
          <thead><tr><th>Incident</th><th>Client</th><th>Staff</th><th>Severity</th><th>Status</th><th>Occurred</th><th></th></tr></thead>
          <tbody>
            {window.VC_INCIDENTS.map(i => {
              const c = window.VC_CLIENTS.find(x => x.id === i.clientId);
              const s = window.VC_STAFF.find(x => x.id === i.staffId);
              return (
                <tr key={i.id} style={{ cursor: i.severity === 'critical' ? 'pointer' : 'default' }} onClick={() => i.severity === 'critical' && onResolve()}>
                  <td><span style={{ fontWeight: 500 }}>{i.title}</span></td>
                  <td>{c?.name}</td>
                  <td>{s?.name}</td>
                  <td><Badge tone={i.severity === 'critical' ? 'red' : i.severity === 'high' ? 'orange' : i.severity === 'medium' ? 'amber' : 'emerald'} dot>{i.severity[0].toUpperCase() + i.severity.slice(1)}</Badge></td>
                  <td><StatusBadge status={i.status}/></td>
                  <td style={{ color: 'var(--vc-text-3)', fontSize: 12 }}>{i.occurredAt}</td>
                  <td><button className="vc-btn vc-btn-ghost vc-btn-sm">Review</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsPage({ alerts }) {
  return (
    <div className="vc-scroll" style={{ flex: 1, overflow: 'auto', padding: 24, background: 'var(--vc-bg)' }}>
      <div className="vc-card" style={{ overflow: 'hidden' }}>
        <table className="vc-table">
          <thead><tr><th>Document</th><th>Owner</th><th>Status</th><th>Expiry</th><th>Days</th><th></th></tr></thead>
          <tbody>
            {window.VC_DOCUMENTS.map(d => (
              <tr key={d.id}>
                <td><span style={{ fontWeight: 500 }}>{d.type}</span></td>
                <td>{d.owner}</td>
                <td><StatusBadge status={d.status}/></td>
                <td className="vc-mono" style={{ color: 'var(--vc-text-3)' }}>{d.expiry}</td>
                <td className="vc-mono" style={{ color: d.daysRemaining < 0 ? 'var(--vc-red)' : d.daysRemaining < 45 ? 'var(--vc-amber)' : 'var(--vc-text-3)' }}>
                  {d.daysRemaining == null ? '—' : d.daysRemaining < 0 ? `${Math.abs(d.daysRemaining)}d ago` : `${d.daysRemaining}d`}
                </td>
                <td><button className="vc-btn vc-btn-ghost vc-btn-sm">Open</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

Object.assign(window, { PlaceholderPage, ClientsPage, StaffPage, IncidentsPage, DocumentsPage });
