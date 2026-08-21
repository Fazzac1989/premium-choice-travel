'use server';

import Anthropic from '@anthropic-ai/sdk';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin/guard';
import { pcstClient, isPcstConfigured } from '@/lib/pcst';
import { revalidatePcst } from '@/lib/pcst-revalidate';
import { searchCommons, type Candidate } from '@/lib/images/commons';
import { searchShutterstock, licenseShutterstock, isShutterstockCandidate, shutterstockId, ShutterstockBusyError } from '@/lib/images/shutterstock';
import sharp from 'sharp';

/**
 * Building a country's public page: its editorial content and its photography.
 *
 * This existed only as a script, which is why a country added through the admin
 * never got the treatment — South Korea sat with no intro, no education notes
 * and no images until someone remembered to run it by hand. It is now an admin
 * action, so a new country is one click from complete.
 *
 * Content is drafted against the subjects the country actually carries; the
 * climate summary is grounded in the measured average temperature rather than
 * invented. Photography comes from Wikimedia Commons under free licences with
 * the rights metadata recorded, and a picker that prefers bright, colourful
 * photographs and would rather leave a slot empty than publish a grey one.
 */

const BUCKET = 'trip-images';

export type CountryPageResult =
  | { ok: true; images: number; missed: string[] }
  | { ok: false; error: string };

const NOT_CONFIGURED = { ok: false, error: 'School Trips database is not configured.' } as const;

const ROLES = [
  { role: 'hero', label: 'Hero — the country at a glance', minWidth: 3000 },
  { role: 'gallery', label: 'Iconic landmark — the postcard shot' },
  { role: 'gallery', label: 'Food — colourful local dishes, markets or street food' },
  { role: 'gallery', label: 'Walking and exploring — streets, old towns, students on foot' },
  { role: 'gallery', label: 'Adventure — the active, outdoor, memorable side' },
  { role: 'gallery', label: 'Culture — festivals, traditions, crafts, performance' },
] as const;

const CONTENT_SCHEMA = {
  type: 'object',
  properties: {
    intro: { type: 'string', description: 'Two sentences on why a school would bring students here.' },
    education_notes: {
      type: 'string',
      description:
        'Two to three sentences on what makes this country valuable as a classroom: what students can see or do here that they cannot at home.',
    },
    curriculum_links: {
      type: 'array',
      description: 'One entry per subject given, in the same order.',
      items: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          note: { type: 'string', description: 'One sentence on what this country offers that subject, naming real places.' },
        },
        required: ['subject', 'note'],
        additionalProperties: false,
      },
    },
    climate_summary: { type: 'string', description: 'Two sentences on the climate as a visiting school group experiences it.' },
    seasons: {
      type: 'array',
      description: 'Exactly four entries: Spring, Summer, Autumn, Winter.',
      items: {
        type: 'object',
        properties: {
          season: { type: 'string' },
          months: { type: 'string', description: 'e.g. "March to May"' },
          note: { type: 'string', description: 'Under 90 characters: what it is like and whether it suits a school trip.' },
        },
        required: ['season', 'months', 'note'],
        additionalProperties: false,
      },
    },
    safety_notes: {
      type: 'string',
      description:
        'Two sentences a teacher or parent would want: general safety, health and anything to prepare. Factual, reassuring, not alarmist.',
    },
    getting_there: {
      type: 'string',
      description: 'One or two sentences on flying from Dubai: rough flight time, whether it is direct, and time difference.',
    },
    useful_phrases: {
      type: 'array',
      description: 'Four short phrases students would enjoy using. Empty array if the country is English-speaking.',
      items: {
        type: 'object',
        properties: { phrase: { type: 'string' }, meaning: { type: 'string' } },
        required: ['phrase', 'meaning'],
        additionalProperties: false,
      },
    },
    image_queries: {
      type: 'array',
      description:
        'One Wikimedia Commons search per image role, in the order given, all different. Name a real, ' +
        'photographable subject in 2-5 words. For food, name a dish or a named market. For walking, name a ' +
        'street, old town or trail. For adventure, name the activity and place. For culture, name a festival, ' +
        'craft or performance tradition.',
      items: { type: 'string' },
    },
  },
  required: [
    'intro', 'education_notes', 'curriculum_links', 'climate_summary', 'seasons',
    'safety_notes', 'getting_there', 'useful_phrases', 'image_queries',
  ],
  additionalProperties: false,
} as const;

const CONTENT_SYSTEM = `You write destination pages for a premium school-travel company based in Dubai, read by teachers planning a trip and by the parents they must reassure.

Be specific and factual. Name real museums, sites, landforms and institutions rather than writing in generalities. Never invent statistics, prices or dates. Keep the tone warm but professional — this is a company that schools trust with their students, not a holiday brochure.

Write British English. Do not use exclamation marks. Do not describe the country as "vibrant", "bustling", "a feast for the senses" or similar travel-brochure filler.

For image_queries, remember Wikimedia Commons indexes named subjects: "Fushimi Inari torii gates" finds photographs, "vibrant street life" finds nothing.`;

const PICKER_SYSTEM =
  'You are the photography director for a premium school-travel website. These pictures have to make a ' +
  'teenager want to go and a parent feel confident.\n\n' +
  'Colour and light come first. Strongly prefer images whose title or description indicates bright ' +
  'daylight, blue sky, sunshine, vivid colour, blossom, autumn colour, festival, lanterns, market ' +
  'produce, painted buildings, sunset or clear mountain air. An image that is merely correct but flat, ' +
  'grey, overcast, dim or monochrome should lose to a livelier one every time.\n\n' +
  'Then relevance: it must genuinely show the stated role for this country.\n\n' +
  'Reject outright: night shots unless the role is explicitly about lights, grey or rainy scenes, ' +
  'close-ups of signs, plaques, statues or architectural details, museum object photographs on plain ' +
  'backgrounds, empty rooms, building sites, scaffolding, and anything that is a map, plan, diagram, ' +
  'painting, engraving or scale model rather than a photograph.\n\n' +
  'Write British English alt text describing only what the title and description support.';

const scaled = (title: string, w: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${w}`;

const UA = { 'User-Agent': 'PremiumChoiceTravel/1.0 (info@premiumchoicetravel.com)' };

/** Progressively broaden a phrase until Commons finds something usable. */
function variants(query: string, countryName: string): string[] {
  const words = query.trim().split(/\s+/);
  const out = [query];
  for (let n = words.length - 1; n >= 2; n--) out.push(words.slice(0, n).join(' '));
  const proper = words.filter((w) => /^[A-ZÞÐÁÉÍÓÚÖÆ]/.test(w));
  if (proper.length >= 2) out.push(proper.slice(0, 3).join(' '));
  out.push(`${countryName} ${words[words.length - 1]}`);
  return out.filter((v, i) => out.indexOf(v) === i);
}

async function findCandidates(query: string, minWidth: number, countryName: string) {
  // Shutterstock first; when its quota is spent or it finds nothing, fall
  // back to the Commons broadening ladder so generation still completes.
  try {
    const stock = await searchShutterstock(query, { minWidth, limit: 18 });
    if (stock.length) return { candidates: stock, usedQuery: query };
  } catch (e) {
    if (!(e instanceof ShutterstockBusyError)) throw e;
  }
  for (const q of variants(query, countryName)) {
    for (const w of [minWidth, Math.round(minWidth * 0.8), 1800]) {
      const found = await searchCommons(q, { minWidth: w, limit: 18 });
      if (found.length) return { candidates: found, usedQuery: q };
    }
  }
  return { candidates: [] as Candidate[], usedQuery: query };
}

async function pickImage(
  claude: Anthropic,
  candidates: Candidate[],
  label: string,
  countryName: string,
  used: string[]
): Promise<{ candidate: Candidate; altText: string } | null> {
  const pool = candidates.slice(0, 10);
  if (!pool.length) return null;
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 800,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              suitable: { type: 'boolean', description: 'False if none of the candidates is an acceptable photograph for this role.' },
              index: { type: 'integer' },
              alt_text: { type: 'string' },
            },
            required: ['suitable', 'index', 'alt_text'],
            additionalProperties: false,
          },
        },
      },
      system: PICKER_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `Country: ${countryName}\nRole: ${label}\n` +
            (used.length ? `Already used — pick a different subject:\n${used.map((s) => `  - ${s}`).join('\n')}\n` : '') +
            `\nCandidates:\n` +
            pool
              .map((c, i) => `[${i}] ${c.title}\n     ${c.width}x${c.height}\n     ${c.description ?? '(no description)'}`)
              .join('\n'),
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { candidate: pool[0], altText: '' };
    const out = JSON.parse(block.text);
    // Leave the slot empty rather than publish something the picker rejected.
    if (out.suitable === false) return null;
    return { candidate: pool[Math.max(0, Math.min(pool.length - 1, out.index))], altText: out.alt_text ?? '' };
  } catch {
    return { candidate: pool[0], altText: '' };
  }
}

/** Draft the content and curate the photography for one country. */
export async function generateStCountryPage(countryId: number): Promise<CountryPageResult> {
  await requireAdmin();
  if (!isPcstConfigured()) return NOT_CONFIGURED;
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: 'ANTHROPIC_API_KEY is not configured.' };

  const db = pcstClient();
  const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { data: country } = await db
    .from('countries')
    .select('id, name, slug, capital, avg_temp_c')
    .eq('id', countryId)
    .maybeSingle();
  if (!country) return { ok: false, error: 'Country not found.' };

  // Only the subjects this country actually carries published trips for.
  const { data: trips } = await db
    .from('trips')
    .select('subjects(name)')
    .eq('country_id', country.id)
    .eq('status', 'published');
  const subjects = Array.from(
    new Set((trips ?? []).map((t: any) => t.subjects?.name).filter(Boolean))
  ) as string[];

  /* ── content ── */
  let content: any;
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 4000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: CONTENT_SCHEMA } },
      system: CONTENT_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `Country: ${country.name}\n` +
            `Capital: ${country.capital ?? '(unknown)'}\n` +
            `Measured average annual temperature in the capital: ${country.avg_temp_c !== null ? country.avg_temp_c + '°C' : '(unknown)'}\n` +
            `School trips we run here cover these subjects: ${subjects.join(', ') || '(none yet)'}\n` +
            `Trips depart from Dubai.\n\n` +
            `Image roles, in order:\n${ROLES.map((r, i) => `${i + 1}. ${r.label}`).join('\n')}`,
        },
      ],
    });
    const block = res.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') return { ok: false, error: 'Claude returned no content.' };
    content = JSON.parse(block.text);
  } catch (e: any) {
    if (e instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: 'The Claude API key was rejected — check ANTHROPIC_API_KEY.' };
    }
    return { ok: false, error: `Content generation failed: ${e.message}` };
  }

  const { error: cErr } = await db
    .from('countries')
    .update({
      intro: content.intro,
      education_notes: content.education_notes,
      curriculum_links: content.curriculum_links,
      climate_summary: content.climate_summary,
      seasons: content.seasons,
      safety_notes: content.safety_notes,
      getting_there: content.getting_there,
      useful_phrases: content.useful_phrases,
      content_updated_at: new Date().toISOString(),
    })
    .eq('id', country.id);
  if (cErr) return { ok: false, error: cErr.message };

  /* ── photography — replace whatever was there ── */
  const { data: old } = await db.from('country_images').select('url').eq('country_id', country.id);
  for (const o of old ?? []) {
    const p = o.url?.split(`/${BUCKET}/`)[1];
    if (p) await db.storage.from(BUCKET).remove([decodeURIComponent(p)]);
  }
  await db.from('country_images').delete().eq('country_id', country.id);

  const used: string[] = [];
  const missed: string[] = [];
  let order = 0;

  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i];
    const query = content.image_queries?.[i] ?? `${country.name} landmark`;
    const minWidth = 'minWidth' in role ? (role as any).minWidth : 2400;

    const { candidates } = await findCandidates(query, minWidth, country.name);
    if (!candidates.length) {
      missed.push(role.label);
      continue;
    }

    const chosen = await pickImage(claude, candidates, role.label, country.name, used);
    if (!chosen) {
      missed.push(role.label);
      continue;
    }
    used.push(chosen.candidate.title.replace(/\.(jpg|jpeg|png)$/i, '').slice(0, 70));

    try {
      const fromShutterstock = isShutterstockCandidate(chosen.candidate);
      let buf: Buffer;
      if (fromShutterstock) {
        const raw = await licenseShutterstock(shutterstockId(chosen.candidate));
        buf = await sharp(raw)
          .resize({ width: role.role === 'hero' ? 2600 : 1800, withoutEnlargement: true })
          .jpeg({ quality: 82 })
          .toBuffer();
      } else {
        const res = await fetch(scaled(chosen.candidate.title, role.role === 'hero' ? 2600 : 1800), { headers: UA });
        if (!res.ok) throw new Error(`download ${res.status}`);
        buf = Buffer.from(await res.arrayBuffer());
      }
      const ext = fromShutterstock ? 'jpg' : chosen.candidate.mime === 'image/png' ? 'png' : 'jpg';
      const path = `countries/${country.slug}/${role.role}-${Date.now()}-${order}.${ext}`;

      const { error: upErr } = await db.storage.from(BUCKET).upload(path, buf, {
        contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
        cacheControl: '31536000',
      });
      if (upErr) throw new Error(upErr.message);
      const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

      const { error } = await db.from('country_images').insert({
        country_id: country.id,
        role: role.role,
        url,
        alt_text: chosen.altText,
        caption: chosen.candidate.description?.slice(0, 160) ?? null,
        width: chosen.candidate.width,
        height: chosen.candidate.height,
        bytes: buf.length,
        source: fromShutterstock ? 'Shutterstock' : 'Wikimedia Commons',
        source_url: chosen.candidate.sourceUrl,
        photographer: chosen.candidate.photographer,
        licence: chosen.candidate.licence,
        attribution_required: fromShutterstock
          ? false
          : !/^(cc0|public domain|pdm)/i.test(chosen.candidate.licence ?? ''),
        downloaded_at: new Date().toISOString(),
        sort_order: order++,
        approved: true,
      });
      if (error) throw new Error(error.message);
    } catch {
      missed.push(role.label);
    }
  }

  revalidatePath('/admin/school-trips/countries');
  await revalidatePcst(null, 'taxonomy');
  return { ok: true, images: order, missed };
}
