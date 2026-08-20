/**
 * Content tool: collects licensed candidate images per journey from Unsplash
 * search (each journey's authored imageQueries) into
 * lib/generated/journey-images.json for seed-journeys to consume.
 *
 * Idempotent + incremental: journeys that already have 7+ images are skipped,
 * so re-runs only fill gaps. Usage: npx tsx scripts/fetch-journey-images.ts
 */
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { HOLIDAYS_JOURNEYS } from '../lib/journeys/holidays';
import { STAYCATIONS_JOURNEYS } from '../lib/journeys/staycations';
import { CRUISES_JOURNEYS } from '../lib/journeys/cruises';
import { GOLF_JOURNEYS } from '../lib/journeys/golf';
import { HOLIDAYS_JOURNEYS_2 } from '../lib/journeys/holidays2';
import { CRUISES_JOURNEYS_2 } from '../lib/journeys/cruises2';
import { GOLF_JOURNEYS_2 } from '../lib/journeys/golf2';

type Img = { url: string; alt: string; source: string; license: string };

const OUT_PATH = 'lib/generated/journey-images.json';
const TARGET = 8;

const all = [...HOLIDAYS_JOURNEYS, ...STAYCATIONS_JOURNEYS, ...CRUISES_JOURNEYS, ...GOLF_JOURNEYS, ...HOLIDAYS_JOURNEYS_2, ...CRUISES_JOURNEYS_2, ...GOLF_JOURNEYS_2];

async function searchUnsplash(query: string, count: number): Promise<Img[]> {
  const res = await fetch(
    `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=${count + 4}`,
    { headers: { Accept: 'application/json' } }
  );
  if (!res.ok) return [];
  const json: any = await res.json();
  return ((json.results ?? []) as any[])
    .filter((r) => r.premium !== true && r.urls?.raw)
    .map((r) => ({
      url: r.urls.raw.split('?')[0] as string,
      alt: String(r.alt_description || r.description || query).slice(0, 140),
      source: `https://unsplash.com/photos/${r.id}`,
      license: 'Unsplash License',
    }))
    .slice(0, count);
}

async function main() {
  const out: Record<string, Img[]> = existsSync(OUT_PATH)
    ? JSON.parse(readFileSync(OUT_PATH, 'utf8'))
    : {};

  for (const j of all) {
    const have = out[j.slug]?.length ?? 0;
    if (have >= 7) {
      console.log(`${j.slug}: ${have} images already — skipped`);
      continue;
    }
    const seen = new Set<string>();
    const images: Img[] = [];
    for (const q of j.imageQueries) {
      if (images.length >= TARGET) break;
      // First query (hero) gets 2 candidates, the rest 1 each, so we reach 8+ with headroom.
      const want = images.length === 0 ? 2 : 1;
      try {
        const found = await searchUnsplash(q, want + 2);
        let taken = 0;
        for (const img of found) {
          if (taken >= want || images.length >= TARGET) break;
          if (seen.has(img.url)) continue;
          seen.add(img.url);
          images.push(img);
          taken++;
        }
      } catch (e: any) {
        console.error(`${j.slug} query "${q}" failed: ${e.message}`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    out[j.slug] = images;
    console.log(`${j.slug}: ${images.length} images`);
  }

  mkdirSync('lib/generated', { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(out, null, 1));
  const short = Object.entries(out).filter(([, v]) => v.length < 7).map(([k, v]) => `${k} (${v.length})`);
  console.log(`\nWritten ${OUT_PATH} — ${Object.keys(out).length} journeys.`);
  if (short.length) console.log(`Below 7 images (re-run to fill): ${short.join(', ')}`);
}

main();
