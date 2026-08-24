/**
 * Research and write a full profile for every UAE hotel in the Staycations
 * directory: our take, features, room types, restaurants & bars, meal plans
 * and how you actually get there from Dubai or Abu Dhabi.
 *
 * Grounded, not guessed: each hotel is researched live with Claude's web
 * search, and the model is told to name only rooms and restaurants it can
 * confirm from the hotel's own site or a reputable source. Sources are kept
 * in lib/generated/hotel-profiles.json so any claim can be traced back.
 *
 * Never writes prices, availability or star ratings it cannot evidence.
 *
 * Usage:
 *   npx tsx scripts/hotel-profiles.ts                 # fill the empty ones
 *   npx tsx scripts/hotel-profiles.ts --force         # redo everything
 *   npx tsx scripts/hotel-profiles.ts --only atlantis # one hotel
 *   npx tsx scripts/hotel-profiles.ts --limit 5       # a small test run
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Missing Supabase env (.env.local)');
if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MANIFEST = 'lib/generated/hotel-profiles.json';
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const force = args.includes('--force');
const only = args.includes('--only') ? String(args[args.indexOf('--only') + 1] ?? '').toLowerCase() : '';
const limit = args.includes('--limit') ? Number(args[args.indexOf('--limit') + 1]) : Infinity;

type Section = { heading: string; body: string };
type Profile = {
  intro: string[];
  features: string[];
  roomTypes: Section[];
  restaurants: Section[];
  mealPlans: string[];
  bestFor: string[];
  style: string;
  area: string;
  gettingThere: string;
  transferDuration: string;
  officialSite: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string;
};

const SYSTEM = [
  'You are a UAE hotel specialist writing directory content for Premium Choice Staycations, a Dubai family travel company whose customers are UAE residents booking weekends away.',
  '',
  'TRUTH RULES — these override everything else:',
  '- Use web search first. Prefer the hotel own website, then major booking sites, then reputable press.',
  '- Name a room category or a restaurant ONLY if your search results confirm it currently exists at THIS property. Half a dozen confirmed venues beats a dozen invented ones.',
  '- Never state a price, a rate, a nightly figure, availability, an offer or a discount.',
  '- Never invent a star rating, an award, a chef name or an opening date you have not seen.',
  '- If a restaurant has closed or rebranded, use the current name.',
  '- If you cannot confirm much about a property, return fewer items and set confidence to "low". That is a correct answer, not a failure.',
  '',
  'VOICE:',
  '- British English. Warm, plain, specific. Written by someone who has actually stayed there.',
  '- Talk to a UAE resident: the drive from Dubai, the Thursday-night check-in, whether the children will be occupied, whether the beach is real sand, summer versus winter.',
  '- No marketing froth. No "nestled", "boasts", "oasis of tranquillity", "unparalleled". Concrete details instead of adjectives.',
  '',
  'OUTPUT: a single JSON object only, no prose around it, matching the shape you are given. Write plain prose inside the JSON strings — no HTML, no citation markup, no bracketed reference numbers.',
].join('\n');

function userPrompt(h: any) {
  return [
    'Research this UAE hotel and write its directory profile.',
    '',
    `HOTEL: ${h.name}`,
    `Emirate: ${h.emirate}${h.area ? ` · Area on file: ${h.area}` : ''}${h.stars ? ` · ${h.stars} star on file` : ''}`,
    `Style on file: ${h.style || '(none)'}`,
    `One-liner on file: ${h.description || '(none)'}`,
    '',
    'Search for the hotel official website, its rooms/suites page, and its restaurants & bars page. Then return this JSON:',
    '',
    '{',
    '  "intro": [3 paragraphs, 45-70 words each. Para 1: what this place actually is and who it suits. Para 2: the experience on the ground — beach, pools, children, spa, service, noise, what a weekend there feels like. Para 3: the honest caveat or the seasonal note — who should NOT book it, summer vs winter, what to know before booking],',
    '  "features": [8-10 short factual points, 2-6 words each, lower case, e.g. "private beach", "two children clubs", "27 restaurants and bars", "waterpark access included"],',
    '  "roomTypes": [4-7 real room categories. heading = the exact category name the hotel uses. body = 25-40 words: size if you know it, bed setup, view, who it suits, whether it takes a family],',
    '  "restaurants": [4-10 real, currently-open venues at this property. heading = venue name. body = 25-40 words: cuisine, the feel of it, whether children work there, breakfast/dinner],',
    '  "mealPlans": [board bases the hotel genuinely offers, from: "Room only", "Bed & breakfast", "Half board", "Full board", "All-inclusive"],',
    '  "bestFor": [2-4 tags from exactly this list: "families", "couples", "luxury", "beach", "desert", "city", "value", "adults only", "spa", "golf", "kids club", "waterpark", "long weekend", "one night"],',
    '  "style": "3-6 words, lower case, e.g. beachfront family resort, or desert conservation retreat",',
    '  "area": "the neighbourhood or district, as a resident would say it",',
    '  "gettingThere": "2-3 sentences: driving from Dubai (and from Abu Dhabi if relevant), the nearest airport, parking or valet, whether a transfer is worth it",',
    '  "transferDuration": "a drive time a resident recognises, e.g. 45 min drive from Dubai Marina — no traffic promises",',
    '  "officialSite": "the hotel own website URL, or empty string if you could not confirm it",',
    '  "confidence": "high | medium | low",',
    '  "notes": "anything the specialist should know that did not fit, or what you could not confirm"',
    '}',
  ].join('\n');
}

function extractJson(text: string): Profile | null {
  // Web search wraps sourced phrases in <cite index="14-2"> tags. Those inner
  // double quotes land inside JSON strings and break the parse, so they have
  // to come out before JSON.parse ever sees the text.
  const clean = text.replace(/<\/?cite[^>]*>/gi, '');
  const fenced = clean.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : clean.slice(clean.indexOf('{'), clean.lastIndexOf('}') + 1);
  try {
    return JSON.parse(raw) as Profile;
  } catch {
    return null;
  }
}

const BOARDS = ['Room only', 'Bed & breakfast', 'Half board', 'Full board', 'All-inclusive'];

/**
 * Web search hands back inline <cite> markup around every sourced phrase.
 * Useful for the audit trail, unreadable on a hotel page — strip it out.
 */
function strip(s: string) {
  return s
    .replace(/<\/?cite[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\[\d+(?:[-,]\d+)*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim();
}

/**
 * The area is a neighbourhood label — "Palm Jumeirah", "Umm Suqeim" — not a
 * sentence. Models like to keep going ("…, on West Beach side of the trunk"),
 * which then gets chopped mid-word by the length cap, so cut at the first
 * clause and drop any dangling preposition.
 */
function tidyArea(s: string) {
  let t = strip(s).split(/[,—(]/)[0].trim();
  for (let i = 0; i < 4; i++) {
    t = t.replace(/\s+(the|of|on|in|at|near|next|to|and|an?|off|just|past|side|towards?)$/i, '').trim();
  }
  return t.slice(0, 60);
}

/** Trim to sane shapes and drop anything that smells like a price. */
function clean(p: Profile) {
  const noPrice = (s: string) => !/(aed|usd|\$|£|€)\s?\d|\d+\s?(aed|usd|dirham)|per night/i.test(s);
  const sections = (arr: any[], max: number): Section[] =>
    (Array.isArray(arr) ? arr : [])
      .filter((s) => s && typeof s.heading === 'string' && typeof s.body === 'string' && s.heading.trim() && noPrice(s.body))
      .slice(0, max)
      .map((s) => ({ heading: strip(s.heading), body: strip(s.body) }))
      .filter((s) => s.heading && s.body);
  const strings = (arr: any[], max: number): string[] =>
    (Array.isArray(arr) ? arr : [])
      .filter((s) => typeof s === 'string' && s.trim() && noPrice(s))
      .slice(0, max)
      .map(strip)
      .filter(Boolean);

  return {
    intro: strings(p.intro, 3),
    features: strings(p.features, 10),
    roomTypes: sections(p.roomTypes, 7),
    restaurants: sections(p.restaurants, 10),
    mealPlans: strings(p.mealPlans, 5).filter((m) => BOARDS.includes(m)),
    bestFor: strings(p.bestFor, 4),
    style: typeof p.style === 'string' ? strip(p.style).slice(0, 60) : '',
    area: typeof p.area === 'string' ? tidyArea(p.area) : '',
    gettingThere: typeof p.gettingThere === 'string' && noPrice(p.gettingThere) ? strip(p.gettingThere) : '',
    transferDuration: typeof p.transferDuration === 'string' ? strip(p.transferDuration).slice(0, 80) : '',
    officialSite: typeof p.officialSite === 'string' ? p.officialSite.trim() : '',
    confidence: (['high', 'medium', 'low'] as const).includes(p.confidence) ? p.confidence : 'low',
    notes: typeof p.notes === 'string' ? strip(p.notes) : '',
  };
}

async function research(h: any) {
  const res = await claude.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 12000,
    system: SYSTEM,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 6 } as any],
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
  );
  const parsed = extractJson(text);
  if (!parsed) throw new Error('could not parse JSON from the model');
  return { profile: clean(parsed), sources };
}

/** OneDrive locks files mid-write; save via a temp file and rename. */
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

async function main() {
  const { data: rows, error } = await db.from('hotels').select('*').not('emirate', 'is', null);
  if (error) throw new Error(error.message);

  let queue = (rows ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name));
  if (only) queue = queue.filter((h: any) => h.name.toLowerCase().includes(only));
  if (!force) queue = queue.filter((h: any) => !(h.room_types?.length && h.restaurants?.length && h.intro?.length));
  queue = queue.slice(0, limit);

  console.log(`${queue.length} hotel${queue.length === 1 ? '' : 's'} to profile${force ? ' (force)' : ''}`);
  if (!queue.length) return;

  const manifest: Record<string, any> = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {};
  let done = 0;
  const failures: string[] = [];

  const worker = async () => {
    for (;;) {
      const h = queue.shift();
      if (!h) return;
      try {
        const { profile, sources } = await research(h);
        const { error: upErr } = await db
          .from('hotels')
          .update({
            intro: profile.intro,
            features: profile.features.length ? profile.features : h.features,
            room_types: profile.roomTypes,
            restaurants: profile.restaurants,
            meal_plans: profile.mealPlans.length ? profile.mealPlans : h.meal_plans,
            best_for: profile.bestFor.length ? profile.bestFor : h.best_for,
            style: profile.style || h.style,
            area: profile.area || h.area,
            getting_there: profile.gettingThere,
            transfer_duration: profile.transferDuration,
          })
          .eq('id', h.id);
        if (upErr) throw new Error(upErr.message);

        manifest[h.name] = {
          id: h.id,
          emirate: h.emirate,
          confidence: profile.confidence,
          officialSite: profile.officialSite,
          rooms: profile.roomTypes.length,
          restaurants: profile.restaurants.length,
          notes: profile.notes,
          sources,
        };
        saveManifest(manifest);
        done++;
        const flag = profile.confidence === 'high' ? '✓' : profile.confidence === 'medium' ? '~' : '!';
        console.log(
          `${flag} ${h.name} — ${profile.roomTypes.length} rooms, ${profile.restaurants.length} venues, ${sources.length} sources`,
        );
      } catch (e: any) {
        failures.push(`${h.name}: ${e.message}`);
        console.error(`✗ ${h.name}: ${e.message}`);
      }
    }
  };

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log('\n────────── PROFILE REPORT ──────────');
  console.log(`Profiled: ${done} · Failed: ${failures.length}`);
  const low = Object.entries(manifest).filter(([, v]: any) => v.confidence === 'low');
  if (low.length) console.log(`Low confidence (review these): ${low.map(([k]) => k).join(', ')}`);
  if (failures.length) console.log(`\nFailures:\n${failures.join('\n')}`);
  console.log(`\nSources per hotel: ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
