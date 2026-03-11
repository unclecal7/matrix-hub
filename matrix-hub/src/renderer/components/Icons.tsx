export const CheckIcon = () => (
  <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M2 5.5L4 7.5L8 3" />
  </svg>
);

export const SearchIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="6.5" cy="6.5" r="5" />
    <path d="M10 10L14 14" strokeLinecap="round" />
  </svg>
);

export const LockIcon = ({ color = '#f43f5e' }: { color?: string }) => (
  <svg viewBox="0 0 14 14" fill="none" className="mh-row-lock">
    <rect x="2" y="6" width="10" height="7" rx="1.5" fill={color} fillOpacity="0.2" stroke={color} strokeWidth="1" />
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke={color} strokeWidth="1" strokeLinecap="round" />
  </svg>
);

export const ChevronIcon = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    className={`mh-group-chevron ${collapsed ? 'collapsed' : ''}`}
  >
    <path d="M3 4.5L6 7.5L9 4.5" />
  </svg>
);

export const GridIcon = () => (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="1" y="1" width="6" height="6" rx="1" />
    <rect x="1" y="11" width="6" height="6" rx="1" />
    <rect x="11" y="1" width="6" height="6" rx="1" />
    <rect x="11" y="11" width="6" height="6" rx="1" />
  </svg>
);

export const SaveIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M3 1h6.5L12 3.5V11a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" />
    <path d="M5 1v3h4V1" />
    <rect x="4" y="8" width="6" height="4" rx="0.5" />
  </svg>
);

export const LockToggleIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <rect x="2" y="6" width="10" height="7" rx="1.5" />
    <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" strokeLinecap="round" />
  </svg>
);

export const ExpandIcon = () => (
  <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
    <path d="M1 5V1h4M9 1h4v4M1 9v4h4M9 13h4V9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const GearIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ width: 13, height: 13 }}>
    <circle cx="8" cy="8" r="2.5" />
    <path
      d="M8 1v2M8 13v2M1 8h2M13 8h2M2.9 2.9l1.4 1.4M11.7 11.7l1.4 1.4M13.1 2.9l-1.4 1.4M4.3 11.7l-1.4 1.4"
      strokeLinecap="round"
    />
  </svg>
);
