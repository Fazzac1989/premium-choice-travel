/**
 * Propose a rough price band for every UAE hotel in the directory.
 *
 * A band is not a rate. It answers "is this place even in my range?" and
 * nothing more, so it is researched from published rate ranges rather than
 * invented, and every hotel keeps its sources and a confidence flag for
 * review in the admin.
 *
 * Research is cached to lib/generated/hotel-price-bands.json before anything
 * is written to the database, so a failed write never costs the research.
 *
 * Usage:
 *   npx tsx scripts/hotel-price-bands.ts          # research, then write
 *   npx tsx scripts/hotel-price-bands.ts --apply  # write the cached research
 *   npx tsx scripts/hotel-price-bands.ts --only atlantis
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { PRICE_BANDS } from '../lib/price-bands';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MANIFEST = 'lib/generated/hotel-price-bands.json';
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const applyOnly = args.includes('--apply');
const only = args.includes('--only') ? String(args[args.indexOf('--only') + 1] ?? '').toLowerCase() : '';

type Research = {
  typicalLow: number;
  typicalHigh: number;
  confidence: 'high' | 'medium' | 'low';
  basis: string;
  sources: string[];
  band?: number;
};

const SYSTEM = [
  'You research published hotel rate ranges in the UAE for a Dubai travel company.',
  '',
  'You are NOT quoting a price. You are placing a hotel in a broad band so a visitor knows whether it is in their range at all. Broadly right beats precisely wrong.',
  '',
  'RULES:',
  '- Search first. Use published rate ranges from the hotel site, major booking sites or reputable press.',
  '- Give the range a UAE resident would expect on an ORDINARY weekend — a shoulder-season Friday or Saturday night, entry-level double or standard room, two adults, bed & breakfast.',
  '- Exclude peak spikes: New Year, Eid, F1 weekend, school half-terms. Exclude suites and villas unless the hotel only sells those.',
  '- Figures are AED per room per night, inclusive of tourism fees where the published rate includes them.',
  '- If the sources disagree wildly or you find little, widen the range and set confidence to "low". That is a correct answer.',
  '',
  'OUTPUT: a single JSON object, no prose around it, no citation markup, no bracketed reference numbers.',
].join('\n');

function userPrompt(h: any) {
  return [
    `Research the typical nightly rate range for this hotel.`,
    '',
    `HOTEL: ${h.name}`,
    `Emirate: ${h.emirate}${h.area ? ` · ${h.area}` : ''}${h.stars ? ` · ${h.stars} star` : ''}`,
    `Style: ${h.style || '(none)'}`,
    '',
    'Return this JSON:',
    '{',
    '  "typicalLow": number (AED, the low end of an ordinary weekend night),',
    '  "typicalHigh": number (AED, the high end of an ordinary weekend night),',
    '  "confidence": "high | medium | low",',
    '  "basis": "one sentence on what the figures are based on and what they exclude"',
    '}',
  ].join('\n');
}

function extractJson(text: string) {
  const clean = text.replace(/<\/?cite[^>]*>/gi, '');
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Band from the middle of the range, not the low end — a "from" price is the
 * one night a year nobody gets, and banding on it would put half the
 * directory a tier below where people actually pay.
 */
function bandFor(low: number, high: number) {
  const mid = (low + high) / 2;
  if (mid < 700) return 1;
  if (mid < 1500) return 2;
  if (mid < 3000) return 3;
  return 4;
}

function saveManifest(data: any) {
  mkdirSync('lib/generated', { recursive: true });
  const tmp = `${MANIFEST}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2));
  for (let i = 0; i < 5; i++) {
    try {
      renameSync(tmp, MANIFEST);
      return;
    } catch {
      /* OneDrive lock — retry */
    }
  }
}

async function research(h: any): Promise<Research> {
  const res = await claude.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 3000,
    system: SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 } as any],
    messages: [{ role: 'user', content: userPrompt(h) }],
  });
  const text = res.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('\n');
  const sources = Array.from(
    new Set(
      res.content
        .filter((b: any) => b.type === 'web_search_tool_result')
        .flatMap((b: any) => (Array.isArray(b.content) ? b.content : []))
        .map((r: any) => r?.url)
        .filter(Boolean),
    ),
  ) as string[];

  const parsed = extractJson(text);
  const low = Number(parsed?.typicalLow);
  const high = Number(parsed?.typicalHigh);
  if (!parsed || !Number.isFinite(low) || !Number.isFinite(high) || low <= 0 || high < low) {
    throw new Error('no usable range came back');
  }
  return {
    typicalLow: Math.round(low),
    typicalHigh: Math.round(high),
    confidence: ['high', 'medium', 'low'].includes(parsed.confidence) ? parsed.confidence : 'low',
    basis: String(parsed.basis ?? '').replace(/<[^>]+>/g, '').trim(),
    sources,
    band: bandFor(low, high),
  };
}

async function write(manifest: Record<string, Research & { id: number }>) {
  let written = 0;
  for (const [name, r] of Object.entries(manifest)) {
    if (!r.band) continue;
    const { error } = await db.from('hotels').update({ price_band: r.band }).eq('id', r.id);
    if (error) {
      if (/column|schema cache/i.test(error.message)) {
        throw new Error(
          `price_band column is missing — paste supabase/RUN-ME.sql (migration 012) into the Supabase SQL editor, then re-run with --apply.\n(${error.message})`,
        );
      }
      throw new Error(`${name}: ${error.message}`);
    }
    written++;
  }
  return written;
}

async function main() {
  const { data: rows, error } = await db.from('hotels').select('*').not('emirate', 'is', null);
  if (error) throw new Error(error.message);

  const manifest: Record<string, any> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};

  if (!applyOnly) {
    let queue = (rows ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
    if (only) queue = queue.filter((h: any) => h.name.toLowerCase().includes(only));
    console.log(`${queue.length} hotel${queue.length === 1 ? '' : 's'} to price-band`);

    const failures: string[] = [];
    const worker = async () => {
      for (;;) {
        const h = queue.shift();
        if (!h) return;
        try {
          const r = await research(h);
          manifest[h.name] = { ...r, id: h.id, emirate: h.emirate };
          saveManifest(manifest);
          const label = PRICE_BANDS.find((b) => b.band === r.band)?.label;
          const flag = r.confidence === 'high' ? '✓' : r.confidence === 'medium' ? '~' : '!';
          console.log(`${flag} ${h.name} — AED ${r.typicalLow}–${r.typicalHigh} → ${label}`);
        } catch (e: any) {
          failures.push(`${h.name}: ${e.message}`);
          console.error(`✗ ${h.name}: ${e.message}`);
        }
      }
    };
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));
    if (failures.length) console.log(`\nFailures:\n${failures.join('\n')}`);
  }

  const written = await write(manifest);

  console.log('\n────────── PRICE BAND REPORT ──────────');
  const counts: Record<string, number> = {};
  for (const r of Object.values(manifest) as any[]) {
    const label = PRICE_BANDS.find((b) => b.band === r.band)?.label ?? 'unbanded';
    counts[label] = (counts[label] ?? 0) + 1;
  }
  for (const b of PRICE_BANDS) console.log(`${b.label.padEnd(18)} ${counts[b.label] ?? 0}`);
  console.log(`\nWritten to the database: ${written}`);
  const low = (Object.entries(manifest) as any[]).filter(([, r]) => r.confidence === 'low');
  if (low.length) console.log(`Low confidence — worth a look in the admin: ${low.map(([k]) => k).join(', ')}`);
  console.log(`\nRanges and sources: ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
