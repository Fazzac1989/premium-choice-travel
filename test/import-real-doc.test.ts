import { readFileSync, existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractText } from '@/lib/admin/import-source';

/**
 * A real proposal, as one actually arrived: 9MB of Word file wrapping about ten
 * thousand characters of text. It is not committed — it names a school and a
 * teacher — so this skips when it is not on the machine.
 *
 * What it pins down is the thing that broke: the document reads perfectly, and
 * the failure was entirely about getting 9MB to a server that will not take
 * more than about 4.5.
 */
const REAL = 'C:/Users/chris/Downloads/iceland_trip_shaquelle_ris.docx';
const describeIfPresent = existsSync(REAL) ? describe : describe.skip;

describeIfPresent('a real 9MB proposal', () => {
  it('reads, and is mostly pictures', async () => {
    const bytes = readFileSync(REAL);
    const file = new File([new Uint8Array(bytes)], 'iceland.docx');
    const text = await extractText(file);

    expect(text).toContain('Iceland');
    expect(text.length).toBeGreaterThan(5000);
    // The point: the text is a rounding error next to the file.
    expect(text.length).toBeLessThan(bytes.length / 100);
  });

  it('carries the facts the importer needs', async () => {
    const text = await extractText(
      new File([new Uint8Array(readFileSync(REAL))], 'iceland.docx'),
    );
    expect(text).toContain('Regent International School');
    expect(text).toMatch(/31 Jan 2027/);
    expect(text).toContain('Dubai');
    // Flight numbers, which the importer is told never to invent.
    expect(text).toMatch(/LH\d{3,4}/);
  });
});
