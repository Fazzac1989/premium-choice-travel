import 'server-only';

/**
 * Reading a document the user supplied: an upload, a link, or a paste.
 *
 * Kept out of the actions files deliberately. Those carry 'use server', where
 * every export becomes an endpoint any client can call — and an exported
 * URL fetcher is a request-forgery hole. Here it is a plain module, callable
 * only by code that has already checked who is asking.
 */

/** Fetch a web page and reduce it to readable text. */
export async function fetchUrlText(rawUrl: string): Promise<string> {
  let url: URL;
  try {
    url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
  } catch {
    throw new Error('That doesn’t look like a valid web address.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http(s) links are supported.');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PCT-Importer/1.0)' },
    signal: AbortSignal.timeout(20_000),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`That page couldn’t be fetched (HTTP ${res.status}).`);
  const html = await res.text();

  // Strip to readable text: drop scripts/styles/nav junk, collapse tags.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|header|footer|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#?\w+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*/g, '\n\n')
    .trim();

  if (text.length < 200) {
    throw new Error('That page has too little readable text — it may need JavaScript. Copy and paste the content instead.');
  }
  return text;
}

/** Read the source text from an upload, a URL, or a paste. */
export async function readSource(formData: FormData): Promise<{ text: string } | { error: string }> {
  let source = String(formData.get('text') ?? '').trim();

  const url = String(formData.get('url') ?? '').trim();
  if (!source && url) {
    try {
      source = await fetchUrlText(url);
    } catch (e: any) {
      return { error: e.message };
    }
  }

  const file = formData.get('file');
  if (!source && file instanceof File && file.size > 0) {
    // A serverless request body is capped at about 4.5MB, and the platform
    // rejects it before this code runs — so the real limit is lower than
    // anything we could enforce here. This is the message for a file that got
    // through but is still too big to be worth reading.
    if (file.size > 4 * 1024 * 1024) {
      return {
        error:
          'That file is over 4MB, which is more than an upload can carry. Save it as .docx — those are read in your browser at any size — or paste the text instead.',
      };
    }
    try {
      source = (await extractText(file)).trim();
    } catch (e: any) {
      return { error: e.message };
    }
  }
  if (!source) return { error: 'Upload a document, paste a link, or paste the text.' };
  if (source.length < 80) return { error: 'That source looks empty — is the text in an image or a scan?' };
  return { text: source };
}

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith('.docx')) {
    const mammoth = (await import('mammoth')).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }
  if (name.endsWith('.doc')) {
    throw new Error('Old .doc files are not supported — open it in Word and use File → Save As → .docx.');
  }
  if (name.endsWith('.pdf')) {
    // Proposals arrive as PDFs at least as often as Word files.
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const { text } = await parser.getText();
      if (!text.trim()) {
        throw new Error(
          'That PDF has no selectable text — it is probably a scan. Send the Word version, or paste the text.',
        );
      }
      return text;
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf')) {
    return buffer.toString('utf8');
  }
  if (name.endsWith('.pages')) {
    throw new Error('Apple Pages files are not supported — export it as .docx or .pdf first.');
  }
  throw new Error(
    `Cannot read a ".${name.split('.').pop()}" file — upload a .docx, .pdf, .txt or .md, or paste the text instead.`,
  );
}
