/**
 * One line-icon family for the whole Staycations app.
 *
 * Single stroke weight, 24px grid, round caps — drawn rather than pulled from
 * a font so they scale and recolour with the text beside them. Decorative by
 * default; pass a `title` when an icon is the only label a control has.
 */
export type IconName =
  | 'city'
  | 'golf'
  | 'ship'
  | 'briefcase'
  | 'plane'
  | 'explore'
  | 'heart'
  | 'heart-filled'
  | 'trips'
  | 'concierge'
  | 'user'
  | 'calendar'
  | 'pin'
  | 'guests'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'share'
  | 'map'
  | 'filters'
  | 'sort'
  | 'search'
  | 'phone'
  | 'chat'
  | 'clock'
  | 'check'
  | 'info'
  | 'plus'
  | 'minus'
  | 'close'
  | 'moon'
  | 'breakfast'
  | 'umbrella'
  | 'wave'
  | 'dune'
  | 'spa'
  | 'family'
  | 'bed'
  | 'note'
  | 'document';

const PATHS: Record<IconName, JSX.Element> = {
  city: (
    <>
      <path d="M3 21h18M5 21V9l5-3v15M14 21V11l5-2.5V21" />
      <path d="M8 12h0M8 15.5h0M17 14h0M17 17.5h0" />
    </>
  ),
  golf: (
    <>
      <path d="M11 21V4l7 3.5-7 3.5" />
      <path d="M6.5 20.5c1.3-.9 2.9-1.4 4.5-1.4s3.2.5 4.5 1.4" />
    </>
  ),
  ship: (
    <>
      <path d="M4 18l1.6-5.2a1 1 0 0 1 .96-.8h10.88a1 1 0 0 1 .96.8L20 18" />
      <path d="M8 12V7h8v5M12 4v3" />
      <path d="M3 18c1.5 0 1.5 1.6 3 1.6S7.5 18 9 18s1.5 1.6 3 1.6S13.5 18 15 18s1.5 1.6 3 1.6S19.5 18 21 18" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7.5" width="18" height="12" rx="2" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18" />
    </>
  ),
  plane: <path d="M10.5 20.5l1.5-5 7.5-2.2a1.6 1.6 0 0 0 0-3.1L12 8 10.5 3l-1.7.5.6 4.9-4.4-1.2-.6-2.2-1.4.4.6 3.6 3.4 2.1-3.4 2.1-.6 3.6 1.4.4.6-2.2 4.4-1.2-.6 4.9z" />,
  explore: (
    <>
      <path d="M3 21V9.5L12 3l9 6.5V21" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  heart: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  'heart-filled': <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="currentColor" />,
  trips: (
    <>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M9 7.5V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2" />
    </>
  ),
  concierge: (
    <>
      <path d="M4 17.5h16" />
      <path d="M5.5 17.5a6.5 6.5 0 0 1 13 0" />
      <path d="M12 8V6" />
      <circle cx="12" cy="5" r="1" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8.5 3v4M15.5 3v4" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6.5-6.1 6.5-10.5a6.5 6.5 0 1 0-13 0C5.5 14.9 12 21 12 21z" />
      <circle cx="12" cy="10.5" r="2.4" />
    </>
  ),
  guests: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3.2 19.5a5.8 5.8 0 0 1 11.6 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 6.1" />
      <path d="M17.6 15.4a5.8 5.8 0 0 1 3.2 4.1" />
    </>
  ),
  'chevron-right': <path d="M9.5 5.5 16 12l-6.5 6.5" />,
  'chevron-left': <path d="M14.5 5.5 8 12l6.5 6.5" />,
  'chevron-down': <path d="M5.5 9.5 12 16l6.5-6.5" />,
  share: (
    <>
      <path d="M12 15V4" />
      <path d="M8 7.5 12 3.5l4 4" />
      <path d="M5 13v6.5h14V13" />
    </>
  ),
  map: (
    <>
      <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
      <path d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  filters: (
    <>
      <path d="M4 7h16M7 12h10M10 17h4" />
    </>
  ),
  sort: (
    <>
      <path d="M7 4v16M7 20l-3-3M7 20l3-3" />
      <path d="M17 20V4M17 4l-3 3M17 4l3 3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.2-4.2" />
    </>
  ),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  chat: <path d="M4.5 5h15v11h-9l-6 4z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  plus: <path d="M12 5.5v13M5.5 12h13" />,
  minus: <path d="M5.5 12h13" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  breakfast: (
    <>
      <path d="M4 6v4a2.5 2.5 0 0 0 5 0V6" />
      <path d="M6.5 12.5V20" />
      <path d="M15 20V4c2.5 0 4 2.2 4 5.5S16.5 15 15 15" />
    </>
  ),
  umbrella: (
    <>
      <path d="M3.5 12a8.5 8.5 0 0 1 17 0z" />
      <path d="M12 12v7a2 2 0 0 0 4 0" />
    </>
  ),
  wave: (
    <>
      <path d="M3 9.5c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" />
      <path d="M3 15c2.2-2 4.3-2 6.5 0s4.3 2 6.5 0 4.3-2 6.5 0" />
    </>
  ),
  dune: (
    <>
      <path d="M2.5 17c3-5 5.5-7.5 8-7.5s3.5 2 5 2 3-1.5 6-4.5" />
      <path d="M2.5 20.5h19" />
    </>
  ),
  spa: (
    <>
      <path d="M12 20c0-4 2.5-7 6.5-8-1 4.5-3.5 7-6.5 8z" />
      <path d="M12 20c0-4-2.5-7-6.5-8 1 4.5 3.5 7 6.5 8z" />
      <path d="M12 20c-1.5-3.5-1.5-7 0-10.5 1.5 3.5 1.5 7 0 10.5z" />
    </>
  ),
  family: (
    <>
      <circle cx="8" cy="7.5" r="2.6" />
      <circle cx="16.5" cy="9" r="2" />
      <path d="M3.5 19.5a4.5 4.5 0 0 1 9 0" />
      <path d="M14 19.5a3.5 3.5 0 0 1 7 0" />
    </>
  ),
  bed: (
    <>
      <path d="M3.5 18v-9" />
      <path d="M3.5 12.5h17V18" />
      <path d="M7.5 12.5V10h9v2.5" />
    </>
  ),
  note: (
    <>
      <path d="M5 4.5h14v15H5z" />
      <path d="M8.5 9h7M8.5 13h7M8.5 17h4" />
    </>
  ),
  document: (
    <>
      <path d="M6 3.5h7l5 5v12H6z" />
      <path d="M13 3.5v5h5" />
    </>
  ),
};

export default function Icon({
  name,
  size = 22,
  title,
  className = '',
  strokeWidth = 1.6,
}: {
  name: IconName;
  size?: number;
  /** Give a title only when the icon carries meaning on its own. */
  title?: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {PATHS[name]}
    </svg>
  );
}
