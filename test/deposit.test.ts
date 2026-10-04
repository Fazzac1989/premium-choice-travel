import { describe, expect, it } from 'vitest';
import { depositAmount, depositFor } from '@/lib/holidays/deposit';

const on = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe('which deposit band a departure falls in', () => {
  const booking = on('2026-10-04');

  it('takes 5% when booking six months or more ahead', () => {
    expect(depositFor('2027-04-04', booking).percent).toBe(5);
    expect(depositFor('2027-06-01', booking).percent).toBe(5);
    expect(depositFor('2030-01-01', booking).percent).toBe(5);
  });

  it('treats exactly six months as the 5% band, not 10%', () => {
    expect(depositFor('2027-04-04', booking).percent).toBe(5);
    // One day inside six months falls to the next band down.
    expect(depositFor('2027-04-03', booking).percent).toBe(10);
  });

  it('takes 10% between three and six months', () => {
    expect(depositFor('2027-01-04', booking).percent).toBe(10);
    expect(depositFor('2027-03-15', booking).percent).toBe(10);
  });

  it('treats exactly three months as the 10% band, not payment in full', () => {
    expect(depositFor('2027-01-04', booking).percent).toBe(10);
    expect(depositFor('2027-01-03', booking).percent).toBe(100);
  });

  it('asks for the full amount inside three months', () => {
    expect(depositFor('2026-12-24', booking).percent).toBe(100);
    expect(depositFor('2026-10-05', booking).percent).toBe(100);
  });

  it('asks for the full amount for a date in the past', () => {
    expect(depositFor('2026-01-01', booking).percent).toBe(100);
  });
});

describe('counting months across awkward calendars', () => {
  it('counts 31 August to 28 February as six months, not to 3 March', () => {
    // Adding six months to 31 Aug 2026 lands on 28 Feb 2027 once the day is
    // clamped. A naive Date would roll over to 3 March and quote 10% instead.
    const booking = on('2026-08-31');
    expect(depositFor('2027-02-28', booking).percent).toBe(5);
    expect(depositFor('2027-02-27', booking).percent).toBe(10);
  });

  it('handles a leap year end of February', () => {
    const booking = on('2027-11-29');
    expect(depositFor('2028-02-29', booking).percent).toBe(10);
  });

  it('crosses a year boundary', () => {
    const booking = on('2026-12-15');
    expect(depositFor('2027-06-15', booking).percent).toBe(5);
    expect(depositFor('2027-03-15', booking).percent).toBe(10);
    expect(depositFor('2027-02-01', booking).percent).toBe(100);
  });
});

describe('what the customer is told', () => {
  const booking = on('2026-10-04');

  it('labels the band in words a customer can read', () => {
    expect(depositFor('2027-06-01', booking).label).toBe('5% deposit');
    expect(depositFor('2027-02-01', booking).label).toBe('10% deposit');
    expect(depositFor('2026-11-01', booking).label).toBe('Pay in full');
  });

  it('says why, so the number is never unexplained', () => {
    expect(depositFor('2027-06-01', booking).because).toMatch(/6 months or more/);
    expect(depositFor('2026-11-01', booking).because).toMatch(/within three months/);
  });

  it('refuses to guess from a date that is not one', () => {
    expect(depositFor('', booking).percent).toBe(100);
    expect(depositFor('next spring', booking).percent).toBe(100);
    expect(depositFor('2027-02-31', booking).percent).toBe(100);
  });
});

describe('what the deposit comes to', () => {
  const booking = on('2026-10-04');

  it('takes the percentage of the total, to the dirham', () => {
    expect(depositAmount(9270, depositFor('2027-06-01', booking))).toBe(464);
    expect(depositAmount(9270, depositFor('2027-02-01', booking))).toBe(927);
    expect(depositAmount(9270, depositFor('2026-11-01', booking))).toBe(9270);
  });

  it('rounds rather than truncating', () => {
    // 5% of 4,570 is 228.5
    expect(depositAmount(4570, depositFor('2027-06-01', booking))).toBe(229);
  });
});
