// shell.jsx — App shell, sidebar, top bar, badge, avatar

const cn = (...xs) => xs.filter(Boolean).join(' ');

function Avatar({ name, initials, color = '#0d9488', size = 28 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 600, letterSpacing: '0.02em',
      flexShrink: 0,
    }} title={name}>{initials}</div>
  );
}

function Badge({ tone = 'slate', dot = false, children, style }) {
  return (
    <span className={`vc-badge vc-badge-${tone}`} style={style}>
      {dot && <span className="dot"/>}
      {children}
    </span>
  );
}

const STATUS_TONE = {
  scheduled: 'blue', in_progress: 'teal', completed: 'emerald',
  cancelled: 'slate', missed: 'red', unassigned: 'amber',
  open: 'red', under_review: 'amber', resolved: 'emerald', closed: 'slate',
  pending: 'amber', verified: 'emerald', rejected: 'red', expired: 'red', expiring: 'amber',
  ready: 'emerald', blocked: 'red',
};
const STATUS_LABEL = {
  scheduled: 'Scheduled', in_progress: 'In progress', completed: 'Completed',
  cancelled: 'Cancelled', missed: 'Missed', unassigned: 'Unassigned',
  open: 'Open', under_review: 'Under review', resolved: 'Resolved', closed: 'Closed',
  pending: 'Pending', verified: 'Verified', rejected: 'Rejected', expired: 'Expired', expiring: 'Expiring soon',
  ready: 'Roster ready', blocked: 'Blocked',
};

function StatusBadge({ status, dot = true }) {
  return <Badge tone={STATUS_TONE[status] || 'slate'} dot={dot}>{STATUS_LABEL[status] || status}</Badge>;
}

// Sidebar
function Sidebar({ active, onNav, alerts }) {
  const I = window.Icons;
  const items = [
    { group: 'Operations', children: [
      { id: 'dashboard', label: 'Dashboard', icon: I.dashboard },
      { id: 'roster', label: 'Roster', icon: I.calendar, badge: alerts ? 3 : null },
      { id: 'shifts', label: 'Shifts', icon: I.clock, badge: alerts ? 1 : null },
    ]},
    { group: 'People', children: [
      { id: 'clients', label: 'Clients', icon: I.users },
      { id: 'staff', label: 'Staff', icon: I.user, badge: alerts ? 2 : null },
    ]},
    { group: 'Compliance', children: [
      { id: 'incidents', label: 'Incidents', icon: I.alert, badge: alerts ? 4 : null },
      { id: 'documents', label: 'Documents', icon: I.shield, badge: alerts ? 2 : null },
      { id: 'agreements', label: 'Agreements', icon: I.sign },
    ]},
    { group: 'Admin', children: [
      { id: 'payments', label: 'Payments', icon: I.cash },
      { id: 'notifications', label: 'Notifications', icon: I.bell },
      { id: 'settings', label: 'Settings', icon: I.cog },
    ]},
  ];
  return (
    <aside style={{
      width: 232, height: '100%', background: 'var(--vc-surface)',
      borderRight: '1px solid var(--vc-border)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7, background: 'var(--vc-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '-0.02em',
        }}>v</div>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--vc-text)', letterSpacing: '-0.01em' }}>VividCare</div>
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--vc-text-4)', fontWeight: 500 }}>Admin</span>
      </div>

      <div style={{ padding: '4px 12px 12px', borderBottom: '1px solid var(--vc-border)' }}>
        <button className="vc-btn vc-btn-secondary" style={{
          width: '100%', height: 30, fontSize: 12, justifyContent: 'flex-start',
          color: 'var(--vc-text-3)', gap: 8,
        }}>
          <I.search size={13}/>
          <span>Search…</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
            <span className="vc-kbd">⌘</span><span className="vc-kbd">K</span>
          </span>
        </button>
      </div>

      <nav className="vc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 10px 12px' }}>
        {items.map(group => (
          <div key={group.group}>
            <div className="vc-sidebar-group">{group.group}</div>
            {group.children.map(item => {
              const Ic = item.icon;
              return (
                <div key={item.id} className={cn('vc-sidebar-item', active === item.id && 'active')}
                     onClick={() => onNav(item.id)}>
                  <Ic size={15} stroke={1.75}/>
                  <span>{item.label}</span>
                  {item.badge != null && (
                    <span className="count" style={{
                      background: 'var(--vc-red-50)', color: 'var(--vc-red)',
                      minWidth: 18, height: 16, padding: '0 5px', borderRadius: 4,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10.5, fontWeight: 600,
                    }}>{item.badge}</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div style={{ borderTop: '1px solid var(--vc-border)', padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name="You" initials="EM" color="#475569" size={28}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--vc-text)' }}>Eliza Marsden</div>
          <div style={{ fontSize: 11, color: 'var(--vc-text-4)' }}>Operations admin</div>
        </div>
        <button className="vc-btn vc-btn-ghost vc-btn-icon" aria-label="Sign out" title="Sign out">
          <I.power size={14}/>
        </button>
      </div>
    </aside>
  );
}

// Top bar
function TopBar({ title, subtitle, actions, alerts }) {
  const I = window.Icons;
  return (
    <header style={{
      height: 60, padding: '0 24px',
      display: 'flex', alignItems: 'center', gap: 12,
      borderBottom: '1px solid var(--vc-border)',
      background: 'var(--vc-surface)',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="vc-h1" style={{ fontSize: 17, lineHeight: 1.2 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12.5, color: 'var(--vc-text-3)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      <button className="vc-btn vc-btn-ghost vc-btn-icon" aria-label="Notifications" style={{ position: 'relative' }}>
        <I.bell size={15}/>
        {alerts && (
          <span style={{
            position: 'absolute', top: 6, right: 6,
            width: 7, height: 7, borderRadius: '50%', background: 'var(--vc-red)',
          }} className="vc-pulse"/>
        )}
      </button>
      {actions}
    </header>
  );
}

Object.assign(window, { cn, Avatar, Badge, StatusBadge, Sidebar, TopBar, STATUS_TONE, STATUS_LABEL });
