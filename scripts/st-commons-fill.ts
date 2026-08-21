/**
 * Option-2 fill: complete the School Trips re-imaging from Wikimedia Commons
 * (free) now the Shutterstock API allowance is spent.
 *
 *  - Replaces the remaining country_images rows still on old Commons imagery
 *    with fresh, brightness-gated, Claude-picked Commons photography.
 *  - Gives the 27 trips without a licensed hero a Commons hero and applies
 *    their already-licensed Shutterstock galleries from the manifest.
 *
 * Quality gates match the Shutterstock run: daytime brightness (luminance
 * >= 95 preferred), landscape heroes, Claude relevance pick, alt text, full
 * rights metadata with attribution recorded. Checkpointed and resumable.
 *
 * Usage: npx tsx scripts/st-commons-fill.ts
 */
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from 'node:fs';
import sharp from 'sharp';

config({ path: '.env.local' });

const pcst = createClient(process.env.PCST_SUPABASE_URL!, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const BUCKET = 'trip-images';

const CHECK_PATH = 'lib/generated/st-commons-fill.json';
const check: { done: Record<string, string>; failures: string[] } = existsSync(CHECK_PATH)
  ? JSON.parse(readFileSync(CHECK_PATH, 'utf8'))
  : { done: {}, failures: [] };
const save = () => {
  mkdirSync('lib/generated', { recursive: true });
  for (let i = 0; i < 5; i++) {
    try {
      writeFileSync(CHECK_PATH + '.tmp', JSON.stringify(check, null, 1));
      renameSync(CHECK_PATH + '.tmp', CHECK_PATH);
      return;
    } catch { /* OneDrive lock — retry */ }
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- Commons search (inline: lib version is server-only) ---------- */
const UA = { 'User-Agent': 'PremiumChoiceTravel/1.0 (info@premiumchoicetravel.com)' };
const FREE = /^(cc0|cc[- ]by([- ]sa)?([- ]\d(\.\d)?)?|public domain|pdm)/i;
const BLOCKED = /(nc|nd|fair use|non[- ]free)/i;

type Candidate = {
  title: string; previewUrl: string; width: number; height: number; mime: string;
  licence: string | null; photographer: string | null; description: string | null; sourceUrl: string;
};

const strip = (s: unknown) => (s ? String(s).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : null);

async function searchCommons(query: string, minWidth: number, landscapeOnly: boolean): Promise<Candidate[]> {
  const url =
    `https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&generator=search` +
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}&gsrnamespace=6&gsrlimit=24` +
    `&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=640`;
  try {
    const json: any = await (await fetch(url, { headers: UA })).json();
    const pages = Object.values(json?.query?.pages ?? {});
    return (pages as any[])
      .map((p): Candidate | null => {
        const ii = p.imageinfo?.[0];
        if (!ii) return null;
        const meta = ii.extmetadata ?? {};
        const licence = strip(meta.LicenseShortName?.value);
        if (!licence || !FREE.test(licence) || BLOCKED.test(licence)) return null;
        if (!/^image\/(jpeg|png)$/.test(ii.mime)) return null;
        if (ii.width < minWidth) return null;
        if (landscapeOnly && ii.width / ii.height < 1.15) return null;
        return {
          title: String(p.title).replace(/^File:/, ''),
          previewUrl: ii.thumburl ?? ii.url,
          width: ii.width, height: ii.height, mime: ii.mime,
          licence,
          photographer: strip(meta.Artist?.value),
          description: strip(meta.ImageDescription?.value),
          sourceUrl: ii.descriptionurl ?? ii.url,
        };
      })
      .filter((c): c is Candidate => c !== null);
  } catch {
    return [];
  }
}

const scaled = (title: string, w: number) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(title)}?width=${w}`;

async function brightness(url: string): Promise<number> {
  try {
    const res = await fetch(url, { headers: UA });
    if (!res.ok) return -1;
    const stats = await sharp(Buffer.from(await res.arrayBuffer())).stats();
    const [r, g, b] = stats.channels;
    return 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
  } catch { return -1; }
}

/** Claude picks the most suitable candidate and writes the alt text. */
async function claudePick(pool: Candidate[], role: string, place: string): Promise<{ c: Candidate; alt: string } | null> {
  if (!pool.length) return null;
  try {
    // Claude SEES the thumbnails — text metadata alone let grey roundabouts through.
    const blocks: any[] = [
      { type: 'text', text: `Place: ${place}\nRole on the page: ${role}\nCandidates follow, numbered in order:` },
    ];
    const viable: Candidate[] = [];
    for (const c of pool) {
      try {
        const res = await fetch(c.previewUrl, { headers: UA });
        if (!res.ok) continue;
        const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: 640, withoutEnlargement: true })
          .jpeg({ quality: 70 })
          .toBuffer();
        blocks.push({ type: 'text', text: `[${viable.length}] ${c.title}` });
        blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } });
        viable.push(c);
      } catch { /* skip unpreviewable */ }
    }
    if (!viable.length) return null;
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 400,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              suitable: { type: 'boolean', description: 'False when no candidate meets the standard.' },
              index: { type: 'integer' },
              alt_text: { type: 'string' },
            },
            required: ['suitable', 'index', 'alt_text'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You are picking photography for a premium school-travel website. Look at the images and choose the one ' +
        'a picture editor would run: bright DAYTIME light (blue or golden sky — reject grey, overcast or dull ' +
        'light), sharp focus, iconic and instantly recognisable for the stated place, positive feel. Reject: ' +
        'night shots, overcast scenes, traffic, roundabouts, car parks, signs, plaques, maps, paintings, empty ' +
        'interiors, anything mundane. If NOTHING meets the bar, return suitable=false. Alt text: one sentence, ' +
        'under 120 characters, British English, never starting "Image of".',
      messages: [{ role: 'user', content: blocks }],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = block && block.type === 'text' ? JSON.parse(block.text) : null;
    if (!out?.suitable || out.index < 0 || out.index >= viable.length) return null;
    return { c: viable[out.index], alt: String(out.alt_text).slice(0, 200) };
  } catch {
    return null;
  }
}

/** Search → brightness-gate → Claude pick → download → store. */
async function produce(query: string, role: string, place: string, minWidth: number, landscapeOnly: boolean, path: string, usedTitles: Set<string>) {
  let cands = (await searchCommons(query, minWidth, landscapeOnly)).filter((c) => !usedTitles.has(c.title));
  if (!cands.length) cands = (await searchCommons(`${place} ${role}`, Math.round(minWidth * 0.75), landscapeOnly)).filter((c) => !usedTitles.has(c.title));
  if (!cands.length) return null;

  // Brightness-gate the top candidates via their small previews.
  const gated: Candidate[] = [];
  const dim: Candidate[] = [];
  for (const c of cands.slice(0, 10)) {
    const y = await brightness(c.previewUrl);
    if (y >= 95) gated.push(c);
    else if (y > 0) dim.push(c);
    if (gated.length >= 6) break;
  }
  // Vision does the final judging — offer bright candidates first, dim as reserves.
  const pool = [...gated, ...dim];
  const picked = await claudePick(pool.slice(0, 8), role, place);
  if (!picked) return null;

  const res = await fetch(scaled(picked.c.title, landscapeOnly ? 2600 : 1800), { headers: UA });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) return null;
  const ext = picked.c.mime === 'image/png' ? 'png' : 'jpg';
  const fullPath = `${path}.${ext}`;
  const { error } = await pcst.storage.from(BUCKET).upload(fullPath, buf, {
    contentType: picked.c.mime, cacheControl: '31536000', upsert: false,
  });
  if (error) return null;
  const url = pcst.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl;
  usedTitles.add(picked.c.title);
  return {
    url, alt: picked.alt || picked.c.description?.slice(0, 160) || place,
    candidate: picked.c, bytes: buf.length,
  };
}

const rightsRow = (r: NonNullable<Awaited<ReturnType<typeof produce>>>) => ({
  url: r.url,
  alt_text: r.alt,
  caption: r.candidate.description?.slice(0, 160) ?? null,
  width: r.candidate.width,
  height: r.candidate.height,
  bytes: r.bytes,
  source: 'Wikimedia Commons',
  source_url: r.candidate.sourceUrl,
  photographer: r.candidate.photographer,
  licence: r.candidate.licence,
  attribution_required: !/^(cc0|public domain|pdm)/i.test(r.candidate.licence ?? ''),
  downloaded_at: new Date().toISOString(),
  approved: true,
});

async function main() {
  const manifest = JSON.parse(readFileSync('lib/generated/st-shutterstock-manifest.json', 'utf8'));
  const usedTitles = new Set<string>();

  const [{ data: countries }, { data: oldCountryImages }, { data: trips }, { data: subjects }] = await Promise.all([
    pcst.from('countries').select('id, name, slug'),
    pcst.from('country_images').select('id, country_id, role, sort_order, source').eq('source', 'Wikimedia Commons'),
    pcst.from('trips').select('id, title, city, subject_id, country_id'),
    pcst.from('subjects').select('id, name'),
  ]);
  const countryById = new Map((countries ?? []).map((c: any) => [c.id, c]));

  /* 1 — country images still on old Commons imagery: refresh in place */
  console.log(`Refreshing ${oldCountryImages?.length ?? 0} country images from Commons…`);
  let countryDone = 0;
  for (const ci of oldCountryImages ?? []) {
    const key = `country:${ci.id}`;
    if (check.done[key]) { countryDone++; continue; }
    const country = countryById.get(ci.country_id);
    if (!country) continue;
    const isHero = ci.role === 'hero';
    const variant = isHero
      ? `${country.name} famous landmark`
      : [`${country.name} capital skyline`, `${country.name} culture heritage`, `${country.name} landscape nature`,
         `${country.name} historic architecture`, `${country.name} street market`, `${country.name} scenic view`][(ci.sort_order ?? 0) % 6];
    const r = await produce(variant, ci.role, country.name, isHero ? 2000 : 1500, isHero, `commons-fill/countries/${country.id}/${ci.id}-${Date.now()}`, usedTitles);
    if (!r) { check.failures.push(`${key}: no suitable Commons result for "${variant}"`); save(); continue; }
    const { error } = await pcst.from('country_images').update({ ...rightsRow(r), sort_order: ci.sort_order }).eq('id', ci.id);
    if (error) { check.failures.push(`${key}: ${error.message}`); save(); continue; }
    check.done[key] = r.url;
    countryDone++;
    save();
    console.log(`✓ ${country.name} (${ci.role}) — ${countryDone}/${oldCountryImages?.length}`);
    await sleep(400);
  }

  /* 2 — trips without a licensed hero: Commons hero + licensed galleries */
  const heroless = (trips ?? []).filter((t: any) => !manifest.done[`trip:${t.id}:hero`]);
  console.log(`\nGiving ${heroless.length} trips a Commons hero + their licensed galleries…`);
  for (const t of heroless) {
    const key = `trip:${t.id}`;
    if (check.done[key]) continue;
    const country = countryById.get(t.country_id)?.name ?? '';
    const city = String(t.city ?? '').split(/[·,\/]/)[0].trim() || country;
    const place = city.toLowerCase() === country.toLowerCase() ? city : `${city} ${country}`;
    const r = await produce(`${place} landmark skyline`, 'hero', place, 2000, true, `commons-fill/trips/${t.id}/hero-${Date.now()}`, usedTitles);
    if (!r) { check.failures.push(`${key}: no suitable Commons hero for "${place}"`); save(); continue; }

    const gallery = [0, 1, 2, 3].map((i) => manifest.done[`trip:${t.id}:gallery:${i}`]).filter(Boolean);
    await pcst.from('trips').update({ hero_image: r.url, hero_alt: r.alt, ...(gallery.length ? { gallery: gallery.map((g: any) => g.url) } : {}) }).eq('id', t.id);
    await pcst.from('trip_images').delete().eq('trip_id', t.id).in('role', ['hero', 'gallery']);
    const rows: any[] = [{ trip_id: t.id, role: 'hero', sort_order: 0, ...rightsRow(r) }];
    gallery.forEach((g: any, i: number) => rows.push({
      trip_id: t.id, role: 'gallery', sort_order: i, url: g.url, alt_text: g.description,
      caption: null, width: g.width ?? null, height: g.height ?? null, bytes: g.bytes ?? null,
      source: 'Shutterstock', source_url: g.sourceUrl, photographer: null,
      licence: 'Shutterstock Standard License', attribution_required: false,
      downloaded_at: new Date().toISOString(), approved: true,
    }));
    const { error } = await pcst.from('trip_images').insert(rows);
    if (error) { check.failures.push(`${key}: ${error.message}`); save(); continue; }
    check.done[key] = r.url;
    save();
    console.log(`✓ ${t.title} — Commons hero + ${gallery.length} licensed gallery images`);
    await sleep(400);
  }

  console.log('\n────────── COMMONS FILL REPORT ──────────');
  console.log(`Country images refreshed: ${countryDone}/${oldCountryImages?.length ?? 0}`);
  console.log(`Trips completed: ${heroless.filter((t: any) => check.done[`trip:${t.id}`]).length}/${heroless.length}`);
  if (check.failures.length) console.log(`Failures (${check.failures.length}) — last 10:\n${check.failures.slice(-10).join('\n')}`);
}

main().catch((e) => { console.error(e); save(); process.exit(1); });
