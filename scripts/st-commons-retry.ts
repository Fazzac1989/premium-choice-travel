/**
 * Retry pass for slots the vision picker refused: Claude first names
 * specific, photogenic, iconic subjects for the place (Sagrada Família
 * rather than "Barcelona landmark"), Commons is searched per subject, and
 * the vision picker judges the much stronger candidate pool.
 *
 * Reads/extends the st-commons-fill checkpoint. Usage:
 *   npx tsx scripts/st-commons-retry.ts
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
const check: { done: Record<string, string>; failures: string[] } = JSON.parse(readFileSync(CHECK_PATH, 'utf8'));
const save = () => {
  mkdirSync('lib/generated', { recursive: true });
  for (let i = 0; i < 5; i++) {
    try {
      writeFileSync(CHECK_PATH + '.tmp', JSON.stringify(check, null, 1));
      renameSync(CHECK_PATH + '.tmp', CHECK_PATH);
      return;
    } catch { /* retry */ }
  }
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---- Commons + gates (same behaviour as the fill script) ---- */
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
    `&gsrsearch=${encodeURIComponent(`filetype:bitmap ${query}`)}&gsrnamespace=6&gsrlimit=20` +
    `&prop=imageinfo&iiprop=url|size|extmetadata|mime&iiurlwidth=640`;
  try {
    const json: any = await (await fetch(url, { headers: UA })).json();
    return (Object.values(json?.query?.pages ?? {}) as any[])
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

/** Claude names specific photogenic subjects worth searching. */
async function iconicSubjects(place: string, role: string): Promise<string[]> {
  try {
    const res = await claude.messages.create({
      model: 'claude-opus-5',
      max_tokens: 300,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: { subjects: { type: 'array', items: { type: 'string' } } },
            required: ['subjects'],
            additionalProperties: false,
          },
        },
      },
      system:
        'Name specific, real, photogenic subjects a picture editor would search to illustrate a place — famous ' +
        'landmarks, viewpoints, natural wonders. Short search phrases (2-5 words), no commentary. Four subjects.',
      messages: [{ role: 'user', content: `Place: ${place}\nImage role: ${role}` }],
    });
    const block = res.content.find((b) => b.type === 'text');
    const out = block && block.type === 'text' ? JSON.parse(block.text) : null;
    return (out?.subjects ?? []).slice(0, 4);
  } catch {
    return [];
  }
}

async function claudePick(pool: Candidate[], role: string, place: string): Promise<{ c: Candidate; alt: string } | null> {
  if (!pool.length) return null;
  try {
    const blocks: any[] = [
      { type: 'text', text: `Place: ${place}\nRole on the page: ${role}\nCandidates follow, numbered in order:` },
    ];
    const viable: Candidate[] = [];
    for (const c of pool) {
      try {
        const res = await fetch(c.previewUrl, { headers: UA });
        if (!res.ok) continue;
        const jpeg = await sharp(Buffer.from(await res.arrayBuffer()))
          .resize({ width: 640, withoutEnlargement: true }).jpeg({ quality: 70 }).toBuffer();
        blocks.push({ type: 'text', text: `[${viable.length}] ${c.title}` });
        blocks.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpeg.toString('base64') } });
        viable.push(c);
      } catch { /* skip */ }
      if (viable.length >= 8) break;
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
              suitable: { type: 'boolean' },
              index: { type: 'integer' },
              alt_text: { type: 'string' },
            },
            required: ['suitable', 'index', 'alt_text'],
            additionalProperties: false,
          },
        },
      },
      system:
        'You are picking photography for a premium school-travel website. Choose the image a picture editor ' +
        'would run: BRIGHT daytime light with the main subject clearly lit, colourful and detailed — sharp ' +
        'focus, iconic for the stated place, positive feel. REJECT: silhouettes, sunrise/sunset shots where ' +
        'the subject is dark or backlit, night shots, heavy overcast, shadowed or underexposed subjects, ' +
        'traffic scenes, signs, maps, paintings. If nothing meets the bar return suitable=false. Alt text: ' +
        'one sentence, under 120 characters, British English, never starting "Image of".',
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

async function produceViaLandmarks(role: string, place: string, minWidth: number, landscapeOnly: boolean, path: string, usedTitles: Set<string>) {
  const subjects = await iconicSubjects(place, role);
  if (!subjects.length) return null;
  const pool: Candidate[] = [];
  const seen = new Set<string>();
  for (const subject of subjects) {
    const found = await searchCommons(subject, minWidth, landscapeOnly);
    for (const c of found) {
      if (seen.has(c.title) || usedTitles.has(c.title)) continue;
      seen.add(c.title);
      const y = await brightness(c.previewUrl);
      if (y >= 85) pool.push(c);
      if (pool.length >= 10) break;
    }
    if (pool.length >= 10) break;
    await sleep(200);
  }
  const picked = await claudePick(pool, role, place);
  if (!picked) return null;
  const res = await fetch(scaled(picked.c.title, landscapeOnly ? 2600 : 1800), { headers: UA });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 12 * 1024 * 1024) return null;
  const ext = picked.c.mime === 'image/png' ? 'png' : 'jpg';
  const fullPath = `${path}.${ext}`;
  const { error } = await pcst.storage.from(BUCKET).upload(fullPath, buf, { contentType: picked.c.mime, cacheControl: '31536000', upsert: false });
  if (error) return null;
  usedTitles.add(picked.c.title);
  return {
    url: pcst.storage.from(BUCKET).getPublicUrl(fullPath).data.publicUrl,
    alt: picked.alt || place,
    candidate: picked.c,
    bytes: buf.length,
  };
}

const rightsRow = (r: NonNullable<Awaited<ReturnType<typeof produceViaLandmarks>>>) => ({
  url: r.url, alt_text: r.alt, caption: r.candidate.description?.slice(0, 160) ?? null,
  width: r.candidate.width, height: r.candidate.height, bytes: r.bytes,
  source: 'Wikimedia Commons', source_url: r.candidate.sourceUrl,
  photographer: r.candidate.photographer, licence: r.candidate.licence,
  attribution_required: !/^(cc0|public domain|pdm)/i.test(r.candidate.licence ?? ''),
  downloaded_at: new Date().toISOString(), approved: true,
});

async function main() {
  const manifest = JSON.parse(readFileSync('lib/generated/st-shutterstock-manifest.json', 'utf8'));
  const usedTitles = new Set<string>();

  const [{ data: countries }, { data: countryImages }, { data: trips }] = await Promise.all([
    pcst.from('countries').select('id, name, slug'),
    pcst.from('country_images').select('id, country_id, role, sort_order, source'),
    pcst.from('trips').select('id, title, city, country_id'),
  ]);
  const countryById = new Map((countries ?? []).map((c: any) => [c.id, c]));

  /* Countries still on old imagery (source Wikimedia + not in checkpoint done) */
  const pendingCountry = (countryImages ?? []).filter(
    (ci: any) => ci.source === 'Wikimedia Commons' && !check.done[`country:${ci.id}`]
  );
  console.log(`Retrying ${pendingCountry.length} country images via iconic-subject search…`);
  let cDone = 0;
  for (const ci of pendingCountry) {
    const key = `country:${ci.id}`;
    const country = countryById.get(ci.country_id);
    if (!country) continue;
    const isHero = ci.role === 'hero';
    const r = await produceViaLandmarks(ci.role, country.name, isHero ? 1800 : 1400, isHero, `commons-fill/countries/${country.id}/${ci.id}-${Date.now()}`, usedTitles);
    if (!r) { console.log(`  – still nothing good for ${country.name} (${ci.role})`); continue; }
    const { error } = await pcst.from('country_images').update({ ...rightsRow(r), sort_order: ci.sort_order }).eq('id', ci.id);
    if (error) continue;
    check.done[key] = r.url;
    cDone++;
    save();
    console.log(`✓ ${country.name} (${ci.role})`);
    await sleep(300);
  }

  /* Trips still without a fresh hero */
  const heroless = (trips ?? []).filter(
    (t: any) => !manifest.done[`trip:${t.id}:hero`] && !check.done[`trip:${t.id}`]
  );
  console.log(`\nRetrying ${heroless.length} trip heroes via iconic-subject search…`);
  let tDone = 0;
  for (const t of heroless) {
    const key = `trip:${t.id}`;
    const country = countryById.get(t.country_id)?.name ?? '';
    const city = String(t.city ?? '').split(/[·,\/]/)[0].trim() || country;
    const place = city.toLowerCase() === country.toLowerCase() ? city : `${city}, ${country}`;
    const r = await produceViaLandmarks('hero', place, 1800, true, `commons-fill/trips/${t.id}/hero-${Date.now()}`, usedTitles);
    if (!r) { console.log(`  – still nothing good for ${place}`); continue; }
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
    if (error) continue;
    check.done[key] = r.url;
    tDone++;
    save();
    console.log(`✓ ${t.title}`);
    await sleep(300);
  }

  console.log('\n────────── RETRY REPORT ──────────');
  console.log(`Country images recovered: ${cDone}/${pendingCountry.length}`);
  console.log(`Trip heroes recovered: ${tDone}/${heroless.length}`);
}

main().catch((e) => { console.error(e); save(); process.exit(1); });
