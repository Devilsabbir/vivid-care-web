// icons.jsx — minimal lucide-style line icons
const Icon = ({ d, size = 16, stroke = 2, fill, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill || 'none'} stroke="currentColor"
    strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" {...rest}>{d}</svg>
);

const Icons = {
  dashboard: (p) => <Icon {...p} d={<><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></>}/>,
  users: (p) => <Icon {...p} d={<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}/>,
  user: (p) => <Icon {...p} d={<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>}/>,
  calendar: (p) => <Icon {...p} d={<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></>}/>,
  clock: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>}/>,
  alert: (p) => <Icon {...p} d={<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/></>}/>,
  doc: (p) => <Icon {...p} d={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></>}/>,
  shield: (p) => <Icon {...p} d={<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></>}/>,
  bell: (p) => <Icon {...p} d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></>}/>,
  cog: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></>}/>,
  cash: (p) => <Icon {...p} d={<><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/></>}/>,
  sign: (p) => <Icon {...p} d={<><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></>}/>,
  plus: (p) => <Icon {...p} d={<><path d="M12 5v14M5 12h14"/></>}/>,
  search: (p) => <Icon {...p} d={<><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>}/>,
  chevronRight: (p) => <Icon {...p} d={<path d="M9 18l6-6-6-6"/>}/>,
  chevronLeft: (p) => <Icon {...p} d={<path d="M15 18l-6-6 6-6"/>}/>,
  chevronDown: (p) => <Icon {...p} d={<path d="M6 9l6 6 6-6"/>}/>,
  x: (p) => <Icon {...p} d={<><path d="M18 6 6 18M6 6l12 12"/></>}/>,
  check: (p) => <Icon {...p} d={<path d="M20 6 9 17l-5-5"/>}/>,
  pin: (p) => <Icon {...p} d={<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></>}/>,
  arrow: (p) => <Icon {...p} d={<><path d="M5 12h14M13 5l7 7-7 7"/></>}/>,
  more: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></>}/>,
  filter: (p) => <Icon {...p} d={<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>}/>,
  signal: (p) => <Icon {...p} d={<><path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8M22 4v16"/></>}/>,
  home: (p) => <Icon {...p} d={<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></>}/>,
  list: (p) => <Icon {...p} d={<><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></>}/>,
  power: (p) => <Icon {...p} d={<><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><path d="M12 2v10"/></>}/>,
  warn: (p) => <Icon {...p} d={<><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></>}/>,
  refresh: (p) => <Icon {...p} d={<><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></>}/>,
  download: (p) => <Icon {...p} d={<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/></>}/>,
  send: (p) => <Icon {...p} d={<><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/></>}/>,
};

window.Icons = Icons;
