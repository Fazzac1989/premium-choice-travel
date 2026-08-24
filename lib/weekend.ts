/**
 * Weekend dates, worked out the way a UAE resident thinks about them.
 *
 * The UAE weekend has been Saturday–Sunday since January 2022, so a weekend
 * break runs Friday evening to Sunday. Everything is computed in Asia/Dubai —
 * the servers run in UTC, and near midnight that is a day out.
 */

export type WeekendOption = {
  /** URL value: 'this' | 'next' | 'after' | 'onenight'. */
  key: string;
  label: string;
  /** Check-in date, YYYY-MM-DD. */
  checkIn: string;
  nights: number;
  /** "Fri 28 – Sun 30 Aug" */
  dates: string;
};

/** Today in Dubai, as a UTC-midnight date so day maths stays whole. */
function todayInDubai() {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return new Date(`${ymd}T00:00:00Z`);
}

function addDays(d: Date, n: number) {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function short(d: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(d);
}

/** The Friday that starts the coming weekend, plus however many after it. */
function fridayAfter(weeks: number) {
  const today = todayInDubai();
  // 0 = Sunday … 5 = Friday. On a Friday, that Friday is still "this weekend".
  const daysToFriday = (5 - today.getUTCDay() + 7) % 7;
  return addDays(today, daysToFriday + weeks * 7);
}

function option(key: string, label: string, weeks: number, nights: number): WeekendOption {
  const checkIn = fridayAfter(weeks);
  const checkOut = addDays(checkIn, nights);
  return {
    key,
    label,
    checkIn: ymd(checkIn),
    nights,
    dates: `${short(checkIn)} – ${short(checkOut)}`,
  };
}

/** The four doors into the directory, in the order people think of them. */
export function weekendOptions(): WeekendOption[] {
  return [
    option('this', 'This weekend', 0, 2),
    option('next', 'Next weekend', 1, 2),
    option('after', 'The one after', 2, 2),
    option('onenight', 'Just one night', 0, 1),
  ];
}

export function findWeekend(key: string | undefined) {
  if (!key) return null;
  return weekendOptions().find((o) => o.key === key) ?? null;
}

/** "1 hr 20 min", "1h30", "90 min", "1.5 hours", "45-50 min" → upper minutes. */
function minutesIn(clause: string): number | null {
  const t = clause.toLowerCase().replace(/[–—]/g, '-');

  // "1 hr 45", "1h30", "1 hour 20 min" — hours and minutes together.
  const hm = t.match(/(\d+)\s*(?:h|hr|hour)s?\.?\s*(\d{1,2})\s*(?:m|min|minute)?/);
  if (hm) return Number(hm[1]) * 60 + Number(hm[2]);

  // "1-1.5 hr", "90 min-2 hr" — a range; take the top of it.
  const range = t.match(/(\d+(?:\.\d+)?)\s*(?:min|minutes?)?\s*-\s*(\d+(?:\.\d+)?)\s*(h|hr|hour|hours|min|minute|minutes)/);
  if (range) return Math.round(Number(range[2]) * (range[3].startsWith('h') ? 60 : 1));

  const hours = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hour)s?\b/);
  if (hours) return Math.round(Number(hours[1]) * 60);

  const mins = t.match(/(\d+)\s*(?:min|minute)s?\b/);
  if (mins) return Number(mins[1]);

  return null;
}

/**
 * Read the drive from Dubai out of the written directions.
 *
 * Airport clauses are the fallback, not the first choice — DXB and Dubai
 * Marina can be twenty minutes apart, and the city figure is the one a
 * resident is picturing. Text that never mentions Dubai returns null rather
 * than a guess.
 */
export function driveMinutesFromText(text: string): number | null {
  if (!text) return null;
  const clauses = text.split(/[;·,]| and /i).filter((c) => /dubai/i.test(c));
  if (!clauses.length) return null;

  const airportish = /airport|dxb|dwc/i;
  return minutesIn(clauses.find((c) => !airportish.test(c)) ?? clauses[0]);
}

/** "35 min" / "1 hr 45" — how a resident says a drive time. */
export function driveLabel(minutes: number | null | undefined) {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m}` : `${h} hr`;
}

/** Drive-time bands, as people actually decide: is it worth the car journey? */
export const DRIVE_BANDS = [
  { key: '30', label: 'Under 30 min', max: 30 },
  { key: '60', label: 'Under an hour', max: 60 },
  { key: '90', label: 'Under 90 min', max: 90 },
];
