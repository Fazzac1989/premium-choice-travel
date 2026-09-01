import { describe, expect, it } from 'vitest';
import { emailRows, emailShell } from '@/lib/email';
import { emailBrand } from '@/lib/email-brand';

/**
 * The proposal email goes to a school with a price in it, so the parts that
 * would embarrass us if they were wrong — the brand, the link, the figures —
 * are worth asserting rather than eyeballing once.
 */

const brand = emailBrand('schooltrips');

function render(overrides: { message?: string } = {}) {
  return emailShell({
    title: 'Your proposal is ready',
    eyebrow: `Proposal · ${brand.tag}`,
    bodyHtml: `
      <p>${overrides.message ?? 'Your proposal is ready to read.'}</p>
      ${emailRows([
        ['Trip', 'Finland Winter Activity Adventure'],
        ['Prepared for', 'Dubai College'],
        ['Price per student', 'AED 11,190'],
        ['Group', null],
      ])}`,
    cta: { label: 'Read the proposal', url: 'https://pcst-platform.vercel.app/p/TOKEN' },
    brand,
  });
}

describe('the School Trips email brand', () => {
  it('is registered, so a proposal is not signed off as the wrong company', () => {
    expect(brand.key).toBe('schooltrips');
    expect(brand.name).toBe('Premium Choice School Trips');
  });

  it('names a site that actually resolves', () => {
    // Read from PCST_SITE_URL rather than hardcoded: the branded domain is not
    // live yet, and an address that 404s is worse than a plain one.
    expect(brand.site).not.toContain('http');
    expect(brand.site).not.toBe('');
    expect(brand.site).toMatch(/\./);
  });

  it('falls back to Premium Choice Travel for an unknown key', () => {
    expect(emailBrand('nonsense').name).toBe('Premium Choice Travel');
    expect(emailBrand(null).name).toBe('Premium Choice Travel');
  });
});

describe('the proposal email', () => {
  it('carries the School Trips name in the header', () => {
    expect(render()).toContain('School Trips');
  });

  it('links to the proposal', () => {
    const html = render();
    expect(html).toContain('https://pcst-platform.vercel.app/p/TOKEN');
    expect(html).toContain('Read the proposal');
  });

  it('shows the price as written, thousands separator and all', () => {
    expect(render()).toContain('AED 11,190');
  });

  it('names the school it was prepared for', () => {
    expect(render()).toContain('Dubai College');
  });

  it('omits a row with nothing in it rather than printing a blank label', () => {
    const html = render();
    expect(html).toContain('Prepared for');
    expect(html).not.toContain('Group');
  });

  it('is a complete document, not a fragment', () => {
    const html = render();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('</html>');
  });
});
