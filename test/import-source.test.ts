import { readFileSync } from 'node:fs';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractText, readSource } from '@/lib/admin/import-source';

/**
 * A Word document is the format proposals actually arrive in, and the importer
 * failed to register one. These build a real .docx rather than a stand-in, so
 * the test exercises the same path an upload takes.
 */
async function docx(paragraphs: string[]): Promise<File> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.folder('_rels')!.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  const body = paragraphs.map((p) => `<w:p><w:r><w:t xml:space="preserve">${p}</w:t></w:r></w:p>`).join('');
  zip.folder('word')!.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}</w:body></w:document>`,
  );
  const buf = await zip.generateAsync({ type: 'nodebuffer' });
  return new File([new Uint8Array(buf)], 'proposal.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const LONG = [
  'Finland Winter Activity Adventure, prepared for Dubai College.',
  'Six days from Helsinki to the frozen lakes of Kuusamo, with huskies, reindeer and a real Finnish winter.',
  'Day 1: arrive in Helsinki, guided introduction to the city and dinner at Kappeli.',
];

describe('extractText', () => {
  it('reads a Word document', async () => {
    const text = await extractText(await docx(LONG));
    expect(text).toContain('Finland Winter Activity Adventure');
    expect(text).toContain('Kuusamo');
  });

  it('says plainly that an old .doc will not do', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'old.doc');
    await expect(extractText(f)).rejects.toThrow(/Save As/);
  });

  it('names the type it cannot read', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'nope.xyz');
    await expect(extractText(f)).rejects.toThrow(/\.pdf/);
  });
});

describe('readSource with an uploaded file', () => {
  it('accepts a Word document', async () => {
    const fd = new FormData();
    fd.set('file', await docx(LONG));
    const res = await readSource(fd);
    expect('error' in res ? res.error : '').toBe('');
    expect('text' in res && res.text).toContain('Finland Winter');
  });

  it('accepts one even when the empty text and url fields are also submitted', async () => {
    // The form posts all three; empty strings must not shadow the upload.
    const fd = new FormData();
    fd.set('text', '');
    fd.set('url', '');
    fd.set('file', await docx(LONG));
    const res = await readSource(fd);
    expect('text' in res && res.text).toContain('Finland Winter');
  });

  it('prefers pasted text when both are given', async () => {
    const fd = new FormData();
    fd.set('text', LONG.join('\n\n'));
    fd.set('file', await docx(['Something else entirely, at length, to pass the minimum.']));
    const res = await readSource(fd);
    expect('text' in res && res.text).toContain('Finland Winter');
  });

  it('refuses an empty submission with something a person can act on', async () => {
    const res = await readSource(new FormData());
    expect('error' in res && res.error).toMatch(/Upload a document/);
  });
});

describe('extractText on a PDF', () => {
  it('reads a text PDF, which is the other format proposals arrive in', async () => {
    // A real PDF, generated once from HTML by Chromium and committed, so the
    // test does not need a browser to run.
    const bytes = new Uint8Array(readFileSync('test/fixtures/proposal.pdf'));
    const file = new File([bytes], 'proposal.pdf', { type: 'application/pdf' });
    const text = await extractText(file);
    expect(text).toContain('Iceland Volcanoes and Glaciers');
    expect(text).toContain('Dubai College');
  });

  it('says plainly that an Apple Pages file will not do', async () => {
    const f = new File([new Uint8Array([1, 2, 3])], 'proposal.pages');
    await expect(extractText(f)).rejects.toThrow(/export it as/i);
  });
});
