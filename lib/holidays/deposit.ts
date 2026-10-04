/**
 * What a customer pays today (founder, 2026-10-04).
 *
 *   6 months or more before check-in ....  5%
 *   3 months or more, under 6 .......... 10%
 *   under 3 months ..................... in full
 *
 * This is a function of the departure date, which the search already knows, so
 * the site can tell someone what they would pay today rather than printing a
 * vague "low deposits" claim. The boundaries are inclusive at the top of each
 * band: exactly six months out is 5%, exactly three months is 10%.
 *
 * Months are counted by calendar, not by 30-day blocks, and the day is clamped
 * to the end of a short month — so a 31 August booking counts six months to 28
 * February, not to 3 March. Otherwise two customers booking the same day for
 * the same trip could be quoted different deposits depending on the month.
 */
import { isCalendarDate, todayInDubai } from './search-criteria';

export type DepositBand = {
  /** Percentage of the holiday payable today. 100 means the full amount. */
  percent: number;
  /** For a badge: "5% deposit". For the full band, says so in words. */
  label: string;
  /** The condition that produced it, for the terms line under a price. */
  because: string;
};

/** Add whole calendar months, clamping the day into the target month. */
function addMonths(d: Date, months: number): Date {
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const day = d.getUTCDate();
  // Day 0 of the following month is the last day of the target month.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month, Math.min(day, lastDay)));
}

export const DEPOSIT_BANDS = [
  { months: 6, percent: 5 },
  { months: 3, percent: 10 },
] as const;

/**
 * The deposit for a departure date, as an ISO day. `from` is the day the
 * booking is being made, defaulting to today in the UAE.
 */
export function depositFor(departDate: string, from: Date = todayInDubai()): DepositBand {
  // Shares the search's own validator, so 31 February is rejected here too
  // rather than rolling to 3 March and quoting the band for the wrong week.
  if (!isCalendarDate(departDate)) return fullBand();
  const depart = new Date(`${departDate}T00:00:00Z`);

  for (const band of DEPOSIT_BANDS) {
    if (depart.getTime() >= addMonths(from, band.months).getTime()) {
      return {
        percent: band.percent,
        label: `${band.percent}% deposit`,
        because: `Because you are booking ${band.months} months or more before you travel.`,
      };
    }
  }
  return fullBand();
}

function fullBand(): DepositBand {
  return {
    percent: 100,
    label: 'Pay in full',
    because: 'Holidays departing within three months are paid in full at the time of booking.',
  };
}

/** What that band actually costs on a given total, rounded to the dirham. */
export function depositAmount(total: number, band: DepositBand): number {
  return Math.round((total * band.percent) / 100);
}

/** The schedule in full, for a terms panel. */
export const DEPOSIT_SCHEDULE: { when: string; pay: string }[] = [
  { when: '6 months or more before you travel', pay: '5% today' },
  { when: '3 to 6 months before you travel', pay: '10% today' },
  { when: 'Less than 3 months before you travel', pay: 'Paid in full' },
];
