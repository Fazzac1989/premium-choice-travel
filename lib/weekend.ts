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
