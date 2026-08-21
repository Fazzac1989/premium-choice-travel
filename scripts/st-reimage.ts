/**
 * School Trips re-imaging (rate-limit-aware, two-phase).
 *
 * Replaces every image across trips (hero + 4 gallery + existing itinerary-day
 * images) and country pages (all country_images rows) with freshly licensed
 * Shutterstock photography: bright daytime shots, location + subject as the
 * theme, model-released for people, horizontal, licensed at full size with a
 * 2200px optimised copy stored under unique paths in the trip-images bucket.
 *
 * The API app allows 100 requests/hour, so the script:
 *  - PHASE A picks images (search), caching repeated queries;
 *  - PHASE B licenses in batches of 10 per API call, then downloads/uploads
 *    (which don't count against the API) and updates the database;
 *  - sleeps until the advertised ratelimit-reset whenever the quota is spent.
 * Fully checkpointed in the manifest — safe to stop and re-run any time.
 *
 * Usage: npx tsx scripts/st-reimage.ts
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

config({ path: '.env.local' });

const SS = process.env.SHUTTERSTOCK_API_TOKEN;
if (!SS) { console.error('Missing SHUTTERSTOCK_API_TOKEN'); process.exit(1); }
const pcst = createClient(process.env.PCST_SUPABASE_URL!, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const MANIFEST_PATH = 'lib/generated/st-shutterstock-manifest.json';
type Picked = { key: string; imageId: string; path: string; description: string };
type Stored = Picked & { url: string; sourceUrl: string; width?: number; height?: number; bytes?: number };
type Manifest = { picked: Record<string, Picked>; done: Record<string, Stored>; applied: Record<string, boolean>; failures: string[] };
const base: Manifest = { picked: {}, done: {}, applied: {}, failures: [] };
const manifest: Manifest = existsSync(MANIFEST_PATH)
  ? { ...base, ...JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) }
  : base;
// OneDrive sync can transiently lock the file — write atomically, with retries.
const save = () => {
  mkdirSync('lib/generated', { recursive: true });
  const body = JSON.stringify(manifest, null, 1);
  for (let i = 0; i < 5; i++) {
    try {
      const tmp = MANIFEST_PATH + '.tmp';
      writeFileSync(tmp, body);
      require('node:fs').renameSync(tmp, MANIFEST_PATH);
      return;
    } catch (e) {
      if (i === 4) { console.error('manifest save failed:', (e as Error).message); return; }
      const wait = 300 * (i + 1);
      const end = Date.now() + wait;
      while (Date.now() < end) { /* brief sync wait */ }
    }
  }
};

const usedIds = new Set([
  ...Object.values(manifest.picked).map((m) => m.imageId),
  ...Object.values(manifest.done).map((m) => m.imageId),
]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* -------- rate-limit-aware fetch -------- */
// Leave headroom in every hourly window so interactive admin searches
// (which share this app's 100/hour quota) always get through.
const QUOTA_FLOOR = 12;

async function ssFetch(url: string, init?: RequestInit): Promise<Response> {
  for (let i = 0; i < 30; i++) {
    let res: Response;
    try {
      res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${SS}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
    } catch (e: any) {
      console.log(`  (network error ${e.cause?.code ?? e.message} — retrying in 10s)`);
      await sleep(10_000);
      continue;
    }
    const remaining = Number(res.headers.get('ratelimit-remaining') ?? Infinity);
    const reset = Number(res.headers.get('ratelimit-reset') ?? 0);
    if (res.status !== 429) {
      if (remaining <= QUOTA_FLOOR && reset > Date.now()) {
        const waitMs = Math.min(70 * 60_000, reset - Date.now() + 5000);
        console.log(`  (leaving ${remaining} quota for admin searches — sleeping ${Math.round(waitMs / 60000)} min)`);
        await sleep(waitMs);
      }
      return res;
    }
    const waitMs = Math.max(60_000, Math.min(70 * 60_000, reset - Date.now() + 5000));
    console.log(`  (hourly quota spent — sleeping ${Math.round(waitMs / 60000)} min until reset)`);
    await sleep(waitMs);
  }
  throw new Error('rate limited for many hours');
}

/* -------- search with query cache -------- */
const queryCache = new Map<string, { id: string; description: string; thumb: string }[]>();
async function candidates(query: string, people: boolean, sort: string) {
  const ck = `${sort}|${people}|${query}`;
  if (queryCache.has(ck)) return queryCache.get(ck)!;
  const params = new URLSearchParams({ query, per_page: '20', sort, image_type: 'photo', orientation: 'horizontal', safe: 'true' });
  if (people) params.set('people_model_released', 'true');
  const res = await ssFetch(`https://api.shutterstock.com/v2/images/search?${params}`);
  if (!res.ok) { console.error(`  search HTTP ${res.status} for "${query}"`); return []; }
  const json: any = await res.json();
  const list = ((json.data ?? []) as any[])
    .filter((r) => r.assets?.huge_thumb?.url || r.assets?.preview?.url)
    .map((r) => ({
      id: String(r.id),
      description: String(r.description ?? query).slice(0, 200),
      thumb: String(r.assets?.huge_thumb?.url || r.assets?.preview?.url),
    }));
  queryCache.set(ck, list);
  await sleep(300);
  return list;
}

async function drainIfReady(threshold = 30) {
  while (Object.keys(manifest.picked).length >= threshold) {
    const pending = Object.values(manifest.picked).slice(0, 10);
    await licenseBatch(pending);
    for (const b of pending) {
      if (manifest.picked[b.key] && !manifest.done[b.key]) delete manifest.picked[b.key];
    }
    save();
  }
}

async function brightness(thumbUrl: string): Promise<number> {
  try {
    const res = await fetch(thumbUrl);
    if (!res.ok) return -1;
    const stats = await sharp(Buffer.from(await res.arrayBuffer())).stats();
    const [r, g, b] = stats.channels;
    return 0.299 * r.mean + 0.587 * g.mean + 0.114 * b.mean;
  } catch { return -1; }
}

const BRIGHT_MIN = 95; // 0-255 luminance — rejects night shots and heavy shadow

async function pick(key: string, query: string, people: boolean, pathPrefix: string, sort = 'relevance') {
  if (manifest.picked[key] || manifest.done[key]) return;
  let list: Awaited<ReturnType<typeof candidates>>;
  try {
    list = await candidates(query, people, sort);
  } catch (e: any) {
    manifest.failures.push(`${key}: ${e.message}`); save(); return;
  }
  let hit: (typeof list)[number] | null = null;
  let brightest: { c: (typeof list)[number]; y: number } | null = null;
  for (const c of list) {
    if (usedIds.has(c.id)) continue;
    const y = await brightness(c.thumb);
    if (y >= BRIGHT_MIN) { hit = c; break; }
    if (y > 0 && (!brightest || y > brightest.y)) brightest = { c, y };
  }
  // Fall back to the brightest available rather than dropping the slot.
  if (!hit && brightest) { hit = brightest.c; console.log(`  (no bright result for "${query}" — using brightest, y=${Math.round(brightest.y)})`); }
  if (!hit) { manifest.failures.push(`${key}: no unused result for "${query}"`); save(); return; }
  usedIds.add(hit.id);
  manifest.picked[key] = { key, imageId: hit.id, path: `${pathPrefix}-${hit.id}.jpg`, description: hit.description };
  save();
}

/* -------- phase B: batch license + store -------- */
async function licenseBatch(batch: Picked[]) {
  const res = await ssFetch('https://api.shutterstock.com/v2/images/licenses', {
    method: 'POST',
    body: JSON.stringify({ images: batch.map((b) => ({ image_id: b.imageId, size: 'huge' })) }),
  });
  if (!res.ok) {
    console.error(`  license batch HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return;
  }
  const json: any = await res.json();
  for (let i = 0; i < batch.length; i++) {
    const b = batch[i];
    const dl = json.data?.[i]?.download?.url;
    if (!dl) { manifest.failures.push(`${b.key}: no download url (${JSON.stringify(json.data?.[i]?.error ?? 'unknown')})`); save(); continue; }
    try {
      const img = await fetch(dl);
      const raw = Buffer.from(await img.arrayBuffer());
      const optimised = await sharp(raw).resize({ width: 2200, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
      const { error } = await pcst.storage.from('trip-images').upload(b.path, optimised, {
        contentType: 'image/jpeg', cacheControl: '31536000', upsert: true,
      });
      if (error) { manifest.failures.push(`${b.key}: storage ${error.message}`); save(); continue; }
      const url = pcst.storage.from('trip-images').getPublicUrl(b.path).data.publicUrl;
      const meta = await sharp(optimised).metadata();
      manifest.done[b.key] = {
        ...b, url,
        sourceUrl: `https://www.shutterstock.com/image-photo/${b.imageId}`,
        width: meta.width, height: meta.height, bytes: optimised.length,
      };
      delete manifest.picked[b.key];
      save();
      console.log(`  ✓ stored ${b.key}`);
    } catch (e: any) {
      manifest.failures.push(`${b.key}: ${e.message}`);
      save();
    }
  }
}

/* -------- theming -------- */
const SUBJECT_THEME: [RegExp, string][] = [
  [/politic/i, 'parliament government building tour'],
  [/religio/i, 'cathedral temple architecture'],
  [/science|steam/i, 'science museum interactive exhibit'],
  [/math/i, 'science museum discovery children'],
  [/art|design and tech|film|media/i, 'art gallery museum'],
  [/business|econom/i, 'modern city business district'],
  [/english|literature/i, 'historic library theatre'],
  [/geograph/i, 'dramatic landscape nature'],
  [/history/i, 'historic landmark monument'],
  [/language/i, 'old town street cafe culture'],
  [/music|performing/i, 'concert hall theatre stage'],
  [/outdoor|volunteer/i, 'outdoor adventure hiking teenagers'],
  [/ski/i, 'ski slopes sunny alps'],
  [/sport|physical/i, 'sports stadium training youth'],
];
const themeFor = (subject: string) => SUBJECT_THEME.find(([re]) => re.test(subject))?.[1] ?? 'famous landmark';
const firstCity = (city: string | null) => (city ?? '').split(/[·,\/]/)[0].trim();

async function main() {
  const [{ data: trips }, { data: days }, { data: countries }, { data: countryImages }, { data: subjects }] = await Promise.all([
    pcst.from('trips').select('id, title, city, subject_id, country_id'),
    pcst.from('itinerary_days').select('id, trip_id, title, image_url').not('image_url', 'is', null),
    pcst.from('countries').select('id, name'),
    pcst.from('country_images').select('id, country_id, role, sort_order'),
    pcst.from('subjects').select('id, name'),
  ]);
  const countryName = new Map((countries ?? []).map((c: any) => [c.id, c.name]));
  const subjectName = new Map((subjects ?? []).map((s: any) => [s.id, s.name]));

  /* PHASE A — pick every image */
  console.log('PHASE A: selecting images…');
  for (const t of trips ?? []) {
    const country = countryName.get(t.country_id) ?? '';
    const subject = subjectName.get(t.subject_id) ?? '';
    const cityRaw = firstCity(t.city) || country;
    const city = cityRaw;
    const place = cityRaw.toLowerCase() === country.toLowerCase() ? cityRaw : `${cityRaw} ${country}`;
    const theme = themeFor(subject);
    await pick(`trip:${t.id}:hero`, `${place} landmark daytime`, false, `shutterstock/trips/${t.id}/hero`, 'popular');
    await pick(`trip:${t.id}:gallery:0`, `${place} skyline sunny blue sky`, false, `shutterstock/trips/${t.id}/g0`);
    await pick(`trip:${t.id}:gallery:1`, `happy school students group educational trip ${theme}`, true, `shutterstock/trips/${t.id}/g1`);
    await pick(`trip:${t.id}:gallery:2`, `${country} ${theme} daylight`, false, `shutterstock/trips/${t.id}/g2`);
    await pick(`trip:${t.id}:gallery:3`, `${city} street life culture vibrant sunny`, false, `shutterstock/trips/${t.id}/g3`);
    await drainIfReady();
  }
  for (const d of days ?? []) {
    const trip = (trips ?? []).find((t: any) => t.id === d.trip_id);
    const country = countryName.get(trip?.country_id) ?? '';
    const cityD = firstCity(trip?.city) || country;
    const placeD = cityD.toLowerCase() === country.toLowerCase() ? cityD : `${cityD} ${country}`;
    await pick(`day:${d.id}`, `${placeD} ${String(d.title ?? '').slice(0, 50)} sunny daylight`, false, `shutterstock/days/${d.id}`);
    await drainIfReady();
  }
  for (const ci of countryImages ?? []) {
    const name = countryName.get(ci.country_id) ?? '';
    const variant = ci.role === 'hero'
      ? `${name} landmark daytime`
      : [`${name} capital city skyline daylight`, `${name} culture heritage site bright`, `${name} nature landscape sunny`,
         `${name} historic architecture daylight`, `${name} street life vibrant day`, `${name} scenic view summer`][(ci.sort_order ?? 0) % 6];
    await pick(`country-image:${ci.id}`, variant, false, `shutterstock/countries/${ci.country_id}/${ci.id}`, ci.role === 'hero' ? 'popular' : 'relevance');
    await drainIfReady();
  }
  console.log(`PHASE A done — picked: ${Object.keys(manifest.picked).length}, already stored: ${Object.keys(manifest.done).length}`);

  /* PHASE B — license in batches of 10, download, store */
  console.log('PHASE B: licensing + storing…');
  while (true) {
    const pending = Object.values(manifest.picked).slice(0, 10);
    if (!pending.length) break;
    await licenseBatch(pending);
    // Anything still pending after its batch means licensing failed — drop it
    // (recorded in failures) so the loop can't spin forever.
    for (const b of pending) {
      if (manifest.picked[b.key] && !manifest.done[b.key]) delete manifest.picked[b.key];
    }
    save();
  }

  /* PHASE C — apply to database */
  console.log('PHASE C: updating database…');
  let applied = 0;
  for (const t of trips ?? []) {
    const k = `apply:trip:${t.id}`;
    if (manifest.applied[k]) continue;
    const hero = manifest.done[`trip:${t.id}:hero`];
    const gallery = [0, 1, 2, 3].map((i) => manifest.done[`trip:${t.id}:gallery:${i}`]).filter(Boolean) as Stored[];
    if (!hero || gallery.length < 4) continue; // apply once complete, atomically

    const legacy = await pcst.from('trips').update({ hero_image: hero.url, hero_alt: hero.description, gallery: gallery.map((g) => g.url) }).eq('id', t.id);
    if (legacy.error) { manifest.failures.push(`${k}: ${legacy.error.message}`); save(); continue; }

    // The public pages render curated trip_images — replace those rows too
    // (old rows deleted per the brief; old storage files retained for quotes).
    const rights = (e: Stored, role: string, sortOrder: number) => ({
      trip_id: t.id, role, url: e.url, alt_text: e.description,
      caption: null, width: e.width ?? null, height: e.height ?? null, bytes: e.bytes ?? null,
      source: 'Shutterstock', source_url: e.sourceUrl, photographer: null,
      licence: 'Shutterstock Standard License', attribution_required: false,
      downloaded_at: new Date().toISOString(), sort_order: sortOrder, approved: true,
    });
    await pcst.from('trip_images').delete().eq('trip_id', t.id).in('role', ['hero', 'gallery']);
    const { error } = await pcst.from('trip_images').insert([
      rights(hero, 'hero', 0),
      ...gallery.map((g, i) => rights(g, 'gallery', i)),
    ]);
    if (error) manifest.failures.push(`${k}: trip_images ${error.message}`);
    else { manifest.applied[k] = true; applied++; console.log(`  ✓ applied trip ${t.id}`); }
    save();
  }
  for (const d of days ?? []) {
    const k = `apply:day:${d.id}`;
    if (manifest.applied[k]) continue;
    const e = manifest.done[`day:${d.id}`];
    if (!e) continue;
    const { error } = await pcst.from('itinerary_days').update({ image_url: e.url, image_alt: e.description }).eq('id', d.id);
    if (error) manifest.failures.push(`${k}: ${error.message}`);
    else { manifest.applied[k] = true; applied++; }
    save();
  }
  for (const ci of countryImages ?? []) {
    const k = `apply:country-image:${ci.id}`;
    if (manifest.applied[k]) continue;
    const e = manifest.done[`country-image:${ci.id}`];
    if (!e) continue;
    const { error } = await pcst.from('country_images').update({
      url: e.url, alt_text: e.description, source: 'Shutterstock', source_url: e.sourceUrl,
      photographer: null, licence: 'Shutterstock Standard License', attribution_required: false,
      downloaded_at: new Date().toISOString(), approved: true,
    }).eq('id', ci.id);
    if (error) manifest.failures.push(`${k}: ${error.message}`);
    else { manifest.applied[k] = true; applied++; }
    save();
  }

  console.log('\n────────── RE-IMAGING REPORT ──────────');
  console.log(`Images stored: ${Object.keys(manifest.done).length} · database rows updated this run: ${applied}`);
  console.log(`Trips: ${(trips ?? []).length} (hero + 4 gallery each) · day images: ${(days ?? []).length} · country images: ${(countryImages ?? []).length}`);
  if (manifest.failures.length) console.log(`Failures (${manifest.failures.length}) — last 15:\n${manifest.failures.slice(-15).join('\n')}`);
  console.log(`Licence audit manifest: ${MANIFEST_PATH}`);
}

main().catch((e) => { console.error(e); save(); process.exit(1); });
