'use server';

import Anthropic from '@anthropic-ai/sdk';
import { redirect } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';

export type ImportState = { ok: false; error: string } | null;

type ParsedPackage = {
  title: string;
  tagline: string;
  brand: 'holidays' | 'golf' | 'cruises' | 'staycations' | 'corporate';
  category: string;
  destination: string;
  nights: number;
  days: number;
  price_from: number;
  currency: string;
  hotel_name: string;
  board_basis: string;
  overview: string[];
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: { label: string; title: string; description: string }[];
};

const PACKAGE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Package title, e.g. "Hard Rock Hotel Maldives"' },
    tagline: { type: 'string', description: 'One enticing sentence for the package card. Compose from the document if none exists.' },
    brand: {
      type: 'string',
      enum: ['holidays', 'golf', 'cruises', 'staycations', 'corporate'],
      description:
        'Which Premium Choice brand this belongs to: golf trips → golf; cruise sailings → cruises; UAE hotel stays → staycations; business/corporate travel → corporate; everything else → holidays.',
    },
    category: {
      type: 'string',
      description: 'One of: Beach & Islands, City Breaks, Culture & Heritage, Adventure, Honeymoon, Cruises, Staycations, Family. Empty string if unclear.',
    },
    destination: { type: 'string', description: 'Destination country or region, e.g. "Maldives"; empty string if not stated' },
    nights: { type: 'integer', description: 'Number of nights; 0 if not stated' },
    days: { type: 'integer', description: 'Number of days; 0 if not stated' },
    price_from: { type: 'number', description: 'Lead-in price per person, numbers only; 0 if not stated' },
    currency: { type: 'string', description: 'Three-letter currency of the price, e.g. AED. Default AED if prices exist without a currency.' },
    hotel_name: { type: 'string', description: 'Hotel or ship name; empty string if not stated' },
    board_basis: { type: 'string', description: 'e.g. "All Inclusive", "Bed & Breakfast"; empty string if not stated' },
    overview: { type: 'array', items: { type: 'string' }, description: 'Two or three clean prose paragraphs introducing the trip.' },
    highlights: { type: 'array', items: { type: 'string' }, description: 'Short selling-point lines. Empty array if none.' },
    includes: { type: 'array', items: { type: 'string' }, description: 'One short line per inclusion. Strip bullet characters.' },
    excludes: { type: 'array', items: { type: 'string' }, description: 'One short line per exclusion. Empty array if none.' },
    itinerary: {
      type: 'array',
      description: 'One entry per day or day-range, in order. Empty array if the document has no day-by-day plan.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string', description: 'e.g. "Day 1" or "Days 2-4"' },
          title: { type: 'string', description: 'Short heading for the day' },
          description: { type: 'string', description: 'What happens that day' },
        },
        required: ['label', 'title', 'description'],
        additionalProperties: false,
      },
    },
  },
  required: [
    'title', 'tagline', 'brand', 'category', 'destination', 'nights', 'days',
    'price_from', 'currency', 'hotel_name', 'board_basis', 'overview',
    'highlights', 'includes', 'excludes', 'itinerary',
  ],
  additionalProperties: false,
} as const;

const SYSTEM = `You turn a travel package description into structured data for Premium Choice Travel, a Dubai travel company.

Extract only what the document actually says. Never invent destinations, prices, dates, hotels or activities that are not in the source. When a field is not stated, return an empty string, 0, or an empty array as the schema allows — do not guess facts.

Guidance:
- tagline: one warm, specific sentence a traveller would want to click — grounded in the document's content.
- overview: rewrite the introductory material into two or three clean paragraphs of flowing prose aimed at travellers. Keep the document's facts; drop internal notes and sales boilerplate.
- includes/excludes: one short line each ("Return speedboat transfers", "International flights"). Strip bullet characters.
- itinerary: one entry per day in order. Merge per-day bullet lists into readable prose.
- Use British English with a warm, knowledgeable tone — an experienced travel professional talking to a customer. Avoid clichés like "unforgettable", "embark on a journey" or "memories that last a lifetime".`;

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

/** Fetch a web page and reduce it to readable text. */
async function fetchUrlText(rawUrl: string): Promise<string> {
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
async function readSource(formData: FormData): Promise<{ text: string } | { error: string }> {
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
    if (file.size > 8 * 1024 * 1024) {
      return { error: 'That file is over 8MB — try removing embedded images first.' };
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

async function extractText(file: File): Promise<string> {
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
  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.rtf')) {
    return buffer.toString('utf8');
  }
  throw new Error(`Unsupported file type ".${name.split('.').pop()}" — upload a .docx, .txt or .md.`);
}

/**
 * Parse an uploaded document with Claude and create a draft package,
 * then open it in the editor for review.
 */
export async function importPackage(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The Claude API key is not configured — add ANTHROPIC_API_KEY to the environment.' };
  }

  const read = await readSource(formData);
  if ('error' in read) return { ok: false, error: read.error };
  const source = read.text;

  const db = createAdminClient();
  const { data: destinations } = await db.from('destinations').select('id, name, slug').order('name');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let draft: ParsedPackage;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: PACKAGE_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `The site's existing destinations are: ${(destinations ?? []).map((d) => d.name).join(', ') || '(none yet)'}.

Here is the package document:

---
${source.slice(0, 120_000)}
---

Extract the package.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined to process this document.' };
    if (response.stop_reason === 'max_tokens') {
      return { ok: false, error: 'The document is too long — split it and import each package separately.' };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'Claude returned no content — try again.' };
    draft = JSON.parse(text.text) as ParsedPackage;
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Claude is rate limited right now — wait a moment and retry.' };
    }
    return { ok: false, error: `Could not read that document: ${e.message}` };
  }

  // A brand workspace can pin the brand, overriding Claude's classification.
  const forcedBrand = String(formData.get('brand') ?? '');
  if (['holidays', 'golf', 'cruises', 'staycations', 'corporate'].includes(forcedBrand)) {
    draft.brand = forcedBrand as ParsedPackage['brand'];
  }

  // Match destination by name, loosely
  const needle = draft.destination.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const destRow =
    (destinations ?? []).find((d) => d.name.toLowerCase() === draft.destination.trim().toLowerCase()) ??
    (destinations ?? []).find((d) => d.name.toLowerCase().replace(/[^a-z0-9]/g, '') === needle) ??
    null;

  // Unique slug
  let slug = slugify(draft.title) || `imported-package`;
  const { data: existing } = await db.from('packages').select('slug').like('slug', `${slug}%`);
  if ((existing ?? []).some((r) => r.slug === slug)) {
    slug = `${slug}-${(existing ?? []).length + 1}`;
  }

  const { data: created, error } = await db
    .from('packages')
    .insert({
      slug,
      title: draft.title || 'Imported package',
      tagline: draft.tagline || null,
      brand: draft.brand,
      category: draft.category || null,
      destination_id: destRow?.id ?? null,
      nights: draft.nights || 0,
      days: draft.days || 0,
      price_from: draft.price_from > 0 ? draft.price_from : null,
      currency: draft.currency || 'AED',
      overview: draft.overview,
      highlights: draft.highlights,
      includes: draft.includes,
      excludes: draft.excludes,
      itinerary: draft.itinerary,
      hotel_name: draft.hotel_name || null,
      board_basis: draft.board_basis || null,
      featured: false,
      status: 'draft',
    })
    .select('id')
    .single();

  if (error || !created) return { ok: false, error: error?.message ?? 'Could not save the draft.' };

  redirect(`/admin/packages/${created.id}?imported=1`);
}

/* ------------------------------------------------------------------ */
/* Quote importer                                                      */
/* ------------------------------------------------------------------ */

type ParsedQuote = {
  title: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  travel_dates: string;
  adults: number;
  children: number;
  currency: string;
  notes: string;
  itinerary: { label: string; title: string; description: string }[];
  lines: { description: string; qty: number; unit_cost: number }[];
  terms: string[];
};

const QUOTE_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Trip title for the quote, e.g. "Maldives Escape — Hard Rock Hotel"' },
    client_name: { type: 'string', description: 'Client name; empty string if not stated' },
    client_email: { type: 'string', description: 'Client email; empty string if not stated' },
    client_phone: { type: 'string', description: 'Client phone; empty string if not stated' },
    travel_dates: { type: 'string', description: 'e.g. "14–18 October 2026"; empty string if not stated' },
    adults: { type: 'integer', description: 'Number of adults; 0 if not stated' },
    children: { type: 'integer', description: 'Number of children; 0 if not stated' },
    currency: { type: 'string', description: 'Three-letter code of the costs in the document, e.g. AED, USD, EUR.' },
    notes: { type: 'string', description: 'Any caveats worth surfacing to the client. Empty if none.' },
    itinerary: {
      type: 'array',
      description: 'Day-by-day plan if the document has one, else an empty array.',
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['label', 'title', 'description'],
        additionalProperties: false,
      },
    },
    lines: {
      type: 'array',
      description: 'One entry per chargeable item, in the order the document lists them.',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What the charge is for' },
          qty: { type: 'integer', description: 'Quantity; 1 when the figure is a single total' },
          unit_cost: { type: 'number', description: 'Supplier cost per unit, before any markup. Numbers only.' },
        },
        required: ['description', 'qty', 'unit_cost'],
        additionalProperties: false,
      },
    },
    terms: { type: 'array', items: { type: 'string' }, description: 'Payment/cancellation terms, one per line. Empty array if none.' },
  },
  required: [
    'title', 'client_name', 'client_email', 'client_phone', 'travel_dates',
    'adults', 'children', 'currency', 'notes', 'itinerary', 'lines', 'terms',
  ],
  additionalProperties: false,
} as const;

const QUOTE_SYSTEM = `You turn a supplier costing sheet or draft quotation into structured data for a travel company's quote builder.

Extract only what the document states. Never invent prices, dates or inclusions.

The costings matter most, so read them carefully:
- Record the SUPPLIER or NET cost per unit — the company's own cost, before any markup or commission. If the document shows both a cost and a selling price, take the cost. If it shows only one figure, take that and rely on the reviewer to confirm.
- Strip currency symbols and thousands separators: "AED 1,250.00" becomes 1250.
- When a figure is a per-person price, set qty to the number of people it applies to and unit_cost to the per-person figure. When it is a single lump sum, set qty to 1 and unit_cost to the total.
- Do not include totals, subtotals or grand totals as line items — those are calculated. Include a tax or fee only when it is a genuine separate chargeable item.

Use British English. Keep line descriptions short and specific ("Return flights Dubai–Malé", not "Flights as per above").`;

/** Parse a costing document/URL with Claude and open a draft quote for review. */
export async function importQuote(_prev: ImportState, formData: FormData): Promise<ImportState> {
  await requireAdmin();

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The Claude API key is not configured — add ANTHROPIC_API_KEY to the environment.' };
  }

  const read = await readSource(formData);
  if ('error' in read) return { ok: false, error: read.error };

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let draft: ParsedQuote;
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: QUOTE_SCHEMA } },
      system: QUOTE_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Here is the costing document:\n\n---\n${read.text.slice(0, 120_000)}\n---\n\nExtract the quotation.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') return { ok: false, error: 'Claude declined to process this document.' };
    if (response.stop_reason === 'max_tokens') {
      return { ok: false, error: 'The document is too long — split it and import each quote separately.' };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'Claude returned no content — try again.' };
    draft = JSON.parse(text.text) as ParsedQuote;
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    if (e instanceof Anthropic.RateLimitError) {
      return { ok: false, error: 'Claude is rate limited right now — wait a moment and retry.' };
    }
    return { ok: false, error: `Could not read that document: ${e.message}` };
  }

  const db = createAdminClient();
  const { DEFAULT_TERMS, nextQuoteRef } = await import('@/lib/quotes');
  const ref = await nextQuoteRef();

  const { data: created, error } = await db
    .from('quotes')
    .insert({
      ref,
      status: 'draft',
      title: draft.title || 'Imported quote',
      client_name: draft.client_name || null,
      client_email: draft.client_email || null,
      client_phone: draft.client_phone || null,
      travel_dates: draft.travel_dates || null,
      adults: draft.adults || null,
      children: draft.children || null,
      notes: draft.notes || null,
      currency: draft.currency || 'AED',
      itinerary: draft.itinerary,
      terms: draft.terms.length > 0 ? draft.terms : DEFAULT_TERMS,
    })
    .select('id')
    .single();
  if (error || !created) return { ok: false, error: error?.message ?? 'Could not save the draft quote.' };

  const lines = draft.lines.filter((l) => l.description?.trim());
  if (lines.length > 0) {
    await db.from('quote_lines').insert(
      lines.map((l, i) => ({
        quote_id: created.id,
        sort_order: i,
        description: l.description.trim(),
        qty: Number(l.qty) || 1,
        unit_cost: Number(l.unit_cost) || 0,
        markup_pct: 0,
      }))
    );
  }

  redirect(`/admin/quotes/${created.id}`);
}
