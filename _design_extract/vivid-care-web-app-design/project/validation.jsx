// validation.jsx — shift validation rules

const VC_INACTIVE_CLIENTS = ['c4']; // Henry Saville is inactive but has future shifts
const VC_STAFF_UNAVAILABLE = { 's6': [3, 4] }; // Daniel Park unavailable Thu, Fri

function validateShift(shift, allShifts) {
  const warnings = [];
  if (!shift) return warnings;

  const staff = window.VC_STAFF.find(p => p.id === shift.staffId);
  const client = window.VC_CLIENTS.find(c => c.id === shift.clientId);

  // 1. Unassigned (intentional ok, but flag)
  if (!shift.staffId) {
    warnings.push({ severity: 'amber', code: 'unassigned', label: 'Unassigned shift', detail: 'No staff member is assigned. Confirm this is intentional or assign before the shift starts.' });
  }

  // 2. Blocked staff
  if (staff && staff.readiness === 'blocked') {
    warnings.push({ severity: 'red', code: 'blocked', label: 'Staff member is blocked', detail: staff.blocker || 'Compliance issue prevents rostering.' });
  }

  // 3. Expiring documents
  if (staff && staff.readiness === 'expiring') {
    warnings.push({ severity: 'amber', code: 'expiring', label: 'Document expiring', detail: 'NDIS Worker Screening expires in 24 days. Allowed to roster but flag for review.' });
  }

  // 4. Pending compliance
  if (staff && staff.readiness === 'pending') {
    warnings.push({ severity: 'amber', code: 'pending', label: 'Compliance pending', detail: 'Required documents awaiting upload or verification.' });
  }

  // 5. Inactive client
  if (client && VC_INACTIVE_CLIENTS.includes(client.id)) {
    warnings.push({ severity: 'amber', code: 'inactive_client', label: 'Client is inactive', detail: 'This client has paused services. Confirm before delivering this shift.' });
  }

  // 6. Missing geofence/location
  if (!shift.location || shift.location.trim() === '') {
    warnings.push({ severity: 'red', code: 'no_location', label: 'No location set', detail: 'Shift has no address or geofence configured. Staff cannot clock in via geofence.' });
  }

  // 7. Staff unavailable
  if (staff && VC_STAFF_UNAVAILABLE[staff.id]?.includes(shift.day)) {
    warnings.push({ severity: 'amber', code: 'unavailable', label: 'Staff unavailable', detail: 'Staff member has marked this day as unavailable.' });
  }

  // 8. End time before start
  if (shift.end <= shift.start && !(shift.end < 6 && shift.start > 12)) {
    // Likely overnight if end < 6 and start > 12 — that's allowed
    if (shift.end <= shift.start) {
      warnings.push({ severity: 'red', code: 'time_invalid', label: 'End time before start', detail: 'Shift end time must be after start time.' });
    }
  }

  // 9. Overnight shift (informational)
  if (shift.support === 'sil' && shift.end - shift.start >= 8) {
    warnings.push({ severity: 'info', code: 'overnight', label: 'Overnight shift', detail: 'This is an overnight SIL shift. Sleep-over rates apply.' });
  }

  // 10. Double-booking — find overlaps with same staff
  if (shift.staffId) {
    const overlaps = allShifts.filter(s =>
      s.id !== shift.id && s.staffId === shift.staffId && s.day === shift.day &&
      !(s.end <= shift.start || s.start >= shift.end)
    );
    if (overlaps.length > 0) {
      warnings.push({ severity: 'red', code: 'double_booked', label: 'Double-booked', detail: `${staff?.name} is already scheduled ${overlaps.map(o => `${window.fmtTime(o.start)}–${window.fmtTime(o.end)}`).join(', ')} on this day.` });
    }
  }

  return warnings;
}

function ValidationList({ warnings }) {
  const I = window.Icons;
  if (!warnings || warnings.length === 0) {
    return (
      <div style={{ padding: 12, background: 'var(--vc-emerald-50)', border: '1px solid #a7f3d0', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <I.check size={16} style={{ color: 'var(--vc-emerald)' }}/>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: '#065f46' }}>No validation issues</div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {warnings.map((w, i) => {
        const isRed = w.severity === 'red';
        const isInfo = w.severity === 'info';
        const bg = isRed ? 'var(--vc-red-50)' : isInfo ? 'var(--vc-blue-50)' : 'var(--vc-amber-50)';
        const fg = isRed ? '#7f1d1d' : isInfo ? '#1e3a8a' : '#78350f';
        const accent = isRed ? 'var(--vc-red)' : isInfo ? 'var(--vc-blue)' : 'var(--vc-amber)';
        const border = isRed ? '#fecaca' : isInfo ? '#bfdbfe' : '#fde68a';
        return (
          <div key={i} role="alert" style={{ padding: 10, background: bg, border: `1px solid ${border}`, borderRadius: 8, display: 'flex', gap: 10 }}>
            <I.warn size={14} style={{ color: accent, flexShrink: 0, marginTop: 2 }}/>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: fg }}>{w.label}</div>
              <div style={{ fontSize: 11.5, color: fg, opacity: 0.85, marginTop: 2 }}>{w.detail}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { validateShift, ValidationList, VC_INACTIVE_CLIENTS, VC_STAFF_UNAVAILABLE });
