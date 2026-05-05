// data.jsx — VividCare seed data (Australian context)

const VC_STAFF = [
  { id: 's1', name: 'Aroha Nguyen', initials: 'AN', position: 'Senior Support Worker', color: '#0d9488', readiness: 'ready', expiringDocs: 0, phone: '0412 884 219', email: 'aroha.n@vividcare.au' },
  { id: 's2', name: 'Marcus Bellweather', initials: 'MB', position: 'Support Worker', color: '#2563eb', readiness: 'expiring', expiringDocs: 1, phone: '0438 112 990', email: 'marcus.b@vividcare.au' },
  { id: 's3', name: 'Priya Raman', initials: 'PR', position: 'Support Worker', color: '#7c3aed', readiness: 'ready', expiringDocs: 0, phone: '0455 327 184', email: 'priya.r@vividcare.au' },
  { id: 's4', name: 'Joel Tafale', initials: 'JT', position: 'Support Worker', color: '#ea580c', readiness: 'blocked', expiringDocs: 0, blocker: 'Working with Children Check expired', phone: '0421 559 008', email: 'joel.t@vividcare.au' },
  { id: 's5', name: 'Hannah O\u2019Dwyer', initials: 'HO', position: 'Support Worker', color: '#db2777', readiness: 'ready', expiringDocs: 0, phone: '0466 271 845', email: 'hannah.o@vividcare.au' },
  { id: 's6', name: 'Daniel Park', initials: 'DP', position: 'Support Worker', color: '#0891b2', readiness: 'pending', expiringDocs: 0, phone: '0449 188 204', email: 'daniel.p@vividcare.au' },
  { id: 's7', name: 'Sina Levu', initials: 'SL', position: 'Senior Support Worker', color: '#65a30d', readiness: 'ready', expiringDocs: 0, phone: '0414 003 552', email: 'sina.l@vividcare.au' },
  { id: 's8', name: 'Yusra Mahdi', initials: 'YM', position: 'Support Worker', color: '#be123c', readiness: 'ready', expiringDocs: 0, phone: '0473 880 117', email: 'yusra.m@vividcare.au' },
];

const VC_CLIENTS = [
  { id: 'c1', name: 'Eleanor Whitfield', ndis: '430 117 884', suburb: 'Parramatta', supports: ['Personal care', 'Community access'] },
  { id: 'c2', name: 'Thomas Marchetti', ndis: '430 884 029', suburb: 'Newtown', supports: ['Daily living', 'Transport'] },
  { id: 'c3', name: 'Aaliyah Brennan', ndis: '430 552 119', suburb: 'Hornsby', supports: ['SIL overnight', 'Personal care'] },
  { id: 'c4', name: 'Henry Saville', ndis: '430 008 776', suburb: 'Bondi Junction', supports: ['Community access'] },
  { id: 'c5', name: 'Mei-Lin Choi', ndis: '430 224 901', suburb: 'Chatswood', supports: ['Daily living'] },
  { id: 'c6', name: 'Reuben Castellanos', ndis: '430 661 088', suburb: 'Liverpool', supports: ['Personal care', 'SIL overnight'] },
];

const VC_SUPPORT_TYPES = [
  { id: 'pc', label: 'Personal care', color: '#0d9488' },
  { id: 'ca', label: 'Community access', color: '#2563eb' },
  { id: 'sil', label: 'SIL overnight', color: '#7c3aed' },
  { id: 'tr', label: 'Transport', color: '#0891b2' },
  { id: 'dl', label: 'Daily living', color: '#65a30d' },
];

// Generate week of shifts. Day 0..6 (Mon..Sun), index against current day.
const VC_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const VC_DATES = ['Apr 27', 'Apr 28', 'Apr 29', 'Apr 30', 'May 1', 'May 2', 'May 3'];
const VC_TODAY_INDEX = 3; // Thursday Apr 30

// Each shift: { id, staffId, clientId, day, start, end, support, status, conflicts: [], geofence, location }
const VC_SHIFTS = [
  // Monday
  { id: 'sh1', staffId: 's1', clientId: 'c1', day: 0, start: 7, end: 11, support: 'pc', status: 'completed', location: 'Parramatta NSW' },
  { id: 'sh2', staffId: 's3', clientId: 'c2', day: 0, start: 9, end: 14, support: 'dl', status: 'completed', location: 'Newtown NSW' },
  { id: 'sh3', staffId: 's5', clientId: 'c3', day: 0, start: 14, end: 22, support: 'sil', status: 'completed', location: 'Hornsby NSW' },
  { id: 'sh4', staffId: 's7', clientId: 'c6', day: 0, start: 8, end: 12, support: 'pc', status: 'completed', location: 'Liverpool NSW' },

  // Tuesday
  { id: 'sh5', staffId: 's1', clientId: 'c1', day: 1, start: 7, end: 11, support: 'pc', status: 'completed', location: 'Parramatta NSW' },
  { id: 'sh6', staffId: 's2', clientId: 'c4', day: 1, start: 10, end: 15, support: 'ca', status: 'completed', location: 'Bondi Junction NSW' },
  { id: 'sh7', staffId: 's8', clientId: 'c5', day: 1, start: 9, end: 13, support: 'dl', status: 'completed', location: 'Chatswood NSW' },
  { id: 'sh8', staffId: 's5', clientId: 'c3', day: 1, start: 14, end: 22, support: 'sil', status: 'completed', location: 'Hornsby NSW' },

  // Wednesday
  { id: 'sh9', staffId: 's3', clientId: 'c2', day: 2, start: 9, end: 14, support: 'tr', status: 'completed', location: 'Newtown NSW' },
  { id: 'sh10', staffId: 's1', clientId: 'c1', day: 2, start: 7, end: 11, support: 'pc', status: 'completed', location: 'Parramatta NSW' },
  { id: 'sh11', staffId: 's7', clientId: 'c6', day: 2, start: 14, end: 20, support: 'sil', status: 'completed', location: 'Liverpool NSW' },
  { id: 'sh12', staffId: 's6', clientId: 'c4', day: 2, start: 10, end: 14, support: 'ca', status: 'completed', location: 'Bondi Junction NSW' },

  // Thursday — TODAY
  { id: 'sh13', staffId: 's1', clientId: 'c1', day: 3, start: 7, end: 11, support: 'pc', status: 'in_progress', location: 'Parramatta NSW', clockedInAt: '7:04 am' },
  { id: 'sh14', staffId: 's2', clientId: 'c4', day: 3, start: 8, end: 12, support: 'ca', status: 'missed', location: 'Bondi Junction NSW', warning: 'No clock-in at 8:00 am' },
  { id: 'sh15', staffId: 's3', clientId: 'c2', day: 3, start: 9, end: 14, support: 'dl', status: 'in_progress', location: 'Newtown NSW', clockedInAt: '9:01 am' },
  { id: 'sh16', staffId: 's5', clientId: 'c3', day: 3, start: 14, end: 22, support: 'sil', status: 'scheduled', location: 'Hornsby NSW' },
  { id: 'sh17', staffId: 's7', clientId: 'c6', day: 3, start: 12, end: 16, support: 'pc', status: 'scheduled', location: 'Liverpool NSW' },
  { id: 'sh18', staffId: null, clientId: 'c5', day: 3, start: 15, end: 19, support: 'dl', status: 'unassigned', location: 'Chatswood NSW' },
  { id: 'sh19', staffId: 's8', clientId: 'c4', day: 3, start: 17, end: 21, support: 'ca', status: 'scheduled', location: 'Bondi Junction NSW' },
  { id: 'sh20', staffId: 's4', clientId: 'c1', day: 3, start: 16, end: 20, support: 'pc', status: 'scheduled', location: 'Parramatta NSW', conflicts: ['blocked'] },

  // Friday
  { id: 'sh21', staffId: 's1', clientId: 'c1', day: 4, start: 7, end: 11, support: 'pc', status: 'scheduled', location: 'Parramatta NSW' },
  { id: 'sh22', staffId: 's3', clientId: 'c2', day: 4, start: 9, end: 14, support: 'dl', status: 'scheduled', location: 'Newtown NSW' },
  { id: 'sh23', staffId: 's3', clientId: 'c5', day: 4, start: 13, end: 17, support: 'dl', status: 'scheduled', location: 'Chatswood NSW', conflicts: ['double'] },
  { id: 'sh24', staffId: 's5', clientId: 'c3', day: 4, start: 14, end: 22, support: 'sil', status: 'scheduled', location: 'Hornsby NSW' },
  { id: 'sh25', staffId: null, clientId: 'c6', day: 4, start: 8, end: 12, support: 'pc', status: 'unassigned', location: 'Liverpool NSW' },
  { id: 'sh26', staffId: 's7', clientId: 'c4', day: 4, start: 10, end: 14, support: 'ca', status: 'scheduled', location: 'Bondi Junction NSW' },
  { id: 'sh27', staffId: 's8', clientId: 'c5', day: 4, start: 15, end: 19, support: 'dl', status: 'scheduled', location: 'Chatswood NSW' },

  // Saturday
  { id: 'sh28', staffId: 's5', clientId: 'c3', day: 5, start: 14, end: 22, support: 'sil', status: 'scheduled', location: 'Hornsby NSW' },
  { id: 'sh29', staffId: 's7', clientId: 'c6', day: 5, start: 9, end: 13, support: 'pc', status: 'scheduled', location: 'Liverpool NSW' },
  { id: 'sh30', staffId: null, clientId: 'c2', day: 5, start: 10, end: 14, support: 'tr', status: 'unassigned', location: 'Newtown NSW' },

  // Sunday
  { id: 'sh31', staffId: 's5', clientId: 'c3', day: 6, start: 14, end: 22, support: 'sil', status: 'scheduled', location: 'Hornsby NSW' },
  { id: 'sh32', staffId: 's1', clientId: 'c1', day: 6, start: 8, end: 12, support: 'pc', status: 'scheduled', location: 'Parramatta NSW' },
];

const VC_INCIDENTS = [
  { id: 'i1', title: 'Client refused medication, became distressed', clientId: 'c3', staffId: 's5', shiftId: 'sh3', severity: 'high', status: 'under_review', occurredAt: 'Mon, 28 Apr · 6:42 pm' },
  { id: 'i2', title: 'Minor fall during transfer, no injury', clientId: 'c1', staffId: 's1', shiftId: 'sh10', severity: 'medium', status: 'open', occurredAt: 'Wed, 30 Apr · 8:18 am' },
  { id: 'i3', title: 'Property damage at SIL house', clientId: 'c3', staffId: 's5', severity: 'low', status: 'resolved', occurredAt: 'Sun, 26 Apr · 11:00 pm' },
  { id: 'i4', title: 'Suspected medication error \u2014 escalated', clientId: 'c6', staffId: 's7', severity: 'critical', status: 'open', occurredAt: 'Wed, 30 Apr · 9:11 pm' },
];

const VC_DOCUMENTS = [
  { id: 'd1', type: 'Working with Children Check', owner: 'Joel Tafale', ownerId: 's4', status: 'expired', expiry: 'Apr 12, 2026', daysRemaining: -22 },
  { id: 'd2', type: 'NDIS Worker Screening', owner: 'Marcus Bellweather', ownerId: 's2', status: 'expiring', expiry: 'May 28, 2026', daysRemaining: 24 },
  { id: 'd3', type: 'First Aid Certificate', owner: 'Daniel Park', ownerId: 's6', status: 'pending', expiry: '\u2014', daysRemaining: null },
  { id: 'd4', type: 'NDIS Worker Screening', owner: 'Aroha Nguyen', ownerId: 's1', status: 'verified', expiry: 'Mar 4, 2027', daysRemaining: 304 },
  { id: 'd5', type: 'Police Check', owner: 'Sina Levu', ownerId: 's7', status: 'verified', expiry: 'Aug 22, 2026', daysRemaining: 110 },
];

const VC_NOTIFICATIONS = [
  { id: 'n1', title: 'Roster updated', body: 'Your Friday shift now starts at 8:00 am.', time: '12 min ago', type: 'shift', urgent: false, unread: true },
  { id: 'n2', title: 'Document expiring soon', body: 'Your NDIS Worker Screening expires in 24 days.', time: '2 hours ago', type: 'compliance', urgent: false, unread: true },
  { id: 'n3', title: 'Reminder: Clock in window opens 30 min before shift', body: 'Your next shift is at 7:00 am tomorrow.', time: 'Yesterday', type: 'general', urgent: false, unread: false },
];

// Agreements
const VC_AGREEMENTS = [
  { id: 'a1', clientId: 'c1', title: 'Service Agreement 2026', status: 'signed', signed: 'Mar 4, 2026', expires: 'Mar 4, 2027', value: 142800 },
  { id: 'a2', clientId: 'c2', title: 'Service Agreement 2026', status: 'signed', signed: 'Feb 11, 2026', expires: 'Feb 11, 2027', value: 88600 },
  { id: 'a3', clientId: 'c3', title: 'SIL Service Agreement 2026', status: 'pending_signature', signed: null, expires: '—', value: 218400 },
  { id: 'a4', clientId: 'c4', title: 'Service Agreement 2026', status: 'expired', signed: 'Jan 2, 2025', expires: 'Jan 2, 2026', value: 64200 },
  { id: 'a5', clientId: 'c5', title: 'Service Agreement 2026', status: 'draft', signed: null, expires: '—', value: 51900 },
  { id: 'a6', clientId: 'c6', title: 'Service Agreement 2026', status: 'signed', signed: 'Apr 22, 2026', expires: 'Apr 22, 2027', value: 196300 },
];

// Payments
const VC_PAYMENTS = [
  { id: 'p1', invoice: 'INV-2026-0418', clientId: 'c1', period: 'Apr 14 – Apr 27', amount: 4280, status: 'paid', paidOn: 'Apr 28, 2026' },
  { id: 'p2', invoice: 'INV-2026-0419', clientId: 'c3', period: 'Apr 14 – Apr 27', amount: 8420, status: 'paid', paidOn: 'Apr 28, 2026' },
  { id: 'p3', invoice: 'INV-2026-0420', clientId: 'c2', period: 'Apr 14 – Apr 27', amount: 2940, status: 'submitted', paidOn: null },
  { id: 'p4', invoice: 'INV-2026-0421', clientId: 'c6', period: 'Apr 14 – Apr 27', amount: 6180, status: 'submitted', paidOn: null },
  { id: 'p5', invoice: 'INV-2026-0413', clientId: 'c4', period: 'Mar 31 – Apr 13', amount: 1820, status: 'overdue', paidOn: null },
  { id: 'p6', invoice: 'INV-2026-0414', clientId: 'c5', period: 'Mar 31 – Apr 13', amount: 1240, status: 'paid', paidOn: 'Apr 19, 2026' },
];

Object.assign(window, {
  VC_STAFF, VC_CLIENTS, VC_SUPPORT_TYPES, VC_DAYS, VC_DATES, VC_TODAY_INDEX,
  VC_SHIFTS, VC_INCIDENTS, VC_DOCUMENTS, VC_NOTIFICATIONS,
  VC_AGREEMENTS, VC_PAYMENTS,
});
