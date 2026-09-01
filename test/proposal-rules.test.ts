import { describe, expect, it } from 'vitest';
import {
  safeDate,
  sanitiseItemText,
  slugify,
  stripCombiningMarks,
  validateTravelDates,
} from '@/lib/brochure/proposal-rules';

describe('slugify', () => {
  it('folds accents rather than dropping the letters', () => {
    // The bug this guards against: "le-mridien", a misspelt public URL that
    // reached a sitemap once already on the holidays side of the estate.
    expect(slugify('Le Méridien Finland')).toBe('le-meridien-finland');
    expect(slugify('Zürich')).toBe('zurich');
    expect(slugify('Åre Ski Trip')).toBe('are-ski-trip');
    expect(slugify('Curaçao')).toBe('curacao');
    expect(slugify('Tromsø')).toBe('tromso');
  });

  it('transliterates letters that NFD cannot decompose', () => {
    // These are single characters with no combining mark to strip, so folding
    // alone would delete them. All are ordinary school-trip destinations.
    expect(slugify('Łódź')).toBe('lodz');
    expect(slugify('Ålesund and Tromsø')).toBe('alesund-and-tromso');
    expect(slugify('Ærøskøbing')).toBe('aeroskobing');
    expect(slugify('Straßburg')).toBe('strassburg');
    expect(slugify('Reyðarfjörður')).toBe('reydarfjordur');
  });

  it('spells out an ampersand instead of losing it', () => {
    expect(slugify('Health & Safety')).toBe('health-and-safety');
  });

  it('collapses runs of punctuation and whitespace to single hyphens', () => {
    expect(slugify('  Finland   Winter  ')).toBe('finland-winter');
    expect(slugify('Day 1 — Helsinki, Finland!')).toBe('day-1-helsinki-finland');
  });

  it('leaves no leading or trailing hyphen', () => {
    expect(slugify('!!! Finland !!!')).toBe('finland');
  });

  it('returns an empty string when there is nothing usable, so the caller can fall back', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('')).toBe('');
  });

  it('is stable: slugifying a slug changes nothing', () => {
    const once = slugify('Le Méridien & Spa — Dubai');
    expect(slugify(once)).toBe(once);
  });
});

describe('stripCombiningMarks', () => {
  it('removes marks left by NFD without touching plain text', () => {
    expect(stripCombiningMarks('Méridien')).toBe('Meridien');
    expect(stripCombiningMarks('Meridien')).toBe('Meridien');
  });

  it('leaves characters outside the combining range alone', () => {
    // An em dash and a box-drawing character sit well above the mark range.
    expect(stripCombiningMarks('a—b─c')).toBe('a—b─c');
  });
});

describe('validateTravelDates', () => {
  it('accepts dates that run forwards', () => {
    expect(validateTravelDates('2026-01-18', '2026-01-23')).toBeNull();
  });

  it('accepts a single-day trip', () => {
    expect(validateTravelDates('2026-01-18', '2026-01-18')).toBeNull();
  });

  it('rejects a return before the departure', () => {
    expect(validateTravelDates('2026-01-23', '2026-01-18')).toBe(
      'The return date is before the departure date.',
    );
  });

  it('accepts a missing date — a proposal is priced before it is scheduled', () => {
    expect(validateTravelDates(null, '2026-01-23')).toBeNull();
    expect(validateTravelDates('2026-01-18', null)).toBeNull();
    expect(validateTravelDates(null, null)).toBeNull();
    expect(validateTravelDates('', '')).toBeNull();
  });

  it('compares correctly across a year boundary', () => {
    expect(validateTravelDates('2026-12-28', '2027-01-04')).toBeNull();
    expect(validateTravelDates('2027-01-04', '2026-12-28')).not.toBeNull();
  });
});

describe('safeDate', () => {
  it('accepts a plain ISO date', () => {
    expect(safeDate('2026-01-18')).toBe('2026-01-18');
  });

  it('refuses anything that is not plainly YYYY-MM-DD', () => {
    // An imported document might say any of these. A guessed travel date is
    // one a school would be held to, so none of them is accepted.
    for (const v of [
      '18/01/2026',
      'January 18, 2026',
      '2026-1-8',
      '18 Jan 2026',
      'next January',
      'TBC',
      '2026-01-18T00:00:00Z',
    ]) {
      expect(safeDate(v), v).toBeNull();
    }
  });

  it('refuses a well-shaped date that is not a real day', () => {
    // Date rolls 30 February forward to 2 March rather than rejecting it. A
    // travel date that silently moved is worse than one that came back empty.
    expect(safeDate('2026-02-30')).toBeNull();
    expect(safeDate('2026-13-01')).toBeNull();
    expect(safeDate('2026-04-31')).toBeNull();
    expect(safeDate('2026-02-29')).toBeNull(); // 2026 is not a leap year
    expect(safeDate('2028-02-29')).toBe('2028-02-29'); // 2028 is
  });

  it('refuses nothing at all', () => {
    expect(safeDate(null)).toBeNull();
    expect(safeDate(undefined)).toBeNull();
    expect(safeDate('')).toBeNull();
  });
});

describe('sanitiseItemText', () => {
  it('keeps the one tag the design uses', () => {
    expect(sanitiseItemText('Dinner at <b>Kappeli</b>')).toBe('Dinner at <b>Kappeli</b>');
  });

  it('strips a script tag, which is the point of it', () => {
    // Timetable text is rendered with dangerouslySetInnerHTML.
    expect(sanitiseItemText('Lunch <script>alert(1)</script>')).toBe('Lunch alert(1)');
    expect(sanitiseItemText('<img src=x onerror=alert(1)>Ski')).toBe('Ski');
  });

  it('strips other formatting rather than trusting a stranger\u2019s document', () => {
    expect(sanitiseItemText('<p>Board the <i>coach</i></p>')).toBe('Board the coach');
    expect(sanitiseItemText('<a href="http://x">Museum</a>')).toBe('Museum');
  });

  it('collapses the whitespace a document conversion leaves behind', () => {
    expect(sanitiseItemText('  Ski   school\n\n  at   Oivanki  ')).toBe('Ski school at Oivanki');
  });

  it('leaves plain text alone', () => {
    expect(sanitiseItemText('Husky safari')).toBe('Husky safari');
  });
});
