/**
 * Populate the Staycations hotel directory from the research file
 * (scratchpad research-uae-hotels.json or lib/generated/uae-hotels.json).
 *
 * Idempotent: matches existing hotels by (lowercased) name and updates them;
 * creates the rest. Only verifiable directory facts are written — no rates,
 * no availability claims, no stock photos pretending to be hotel photos.
 *
 * Usage: npx tsx scripts/seed-uae-hotels.ts [path-to-research.json]
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, existsSync } from 'node:fs';

config({ path: '.env.local' });
config({ path: '.env' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing Supabase env (.env.local)');
  process.exit(1);
}
const db = createClient(url, serviceKey, { auth: { persistSession: false } });

type ResearchHotel = {
  name: string;
  emirate: string;
  area?: string | null;
  stars?: number | null;
  style?: string | null;
  mealPlans?: string[];
  keyFeatures?: string[];
  bestFor?: string[];
  note?: string | null;
};

const EMIRATES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain'];

async function main() {
  const path =
    process.argv[2] ??
    ['lib/generated/uae-hotels.json',
     'C:/Users/chris/AppData/Local/Temp/claude/C--Users-chris-OneDrive-Dokumente-Chris-Farrell-International-FZ-LLC-Premium-Choice-Travel/695848c4-fdb4-4ab2-9110-d90e6782dce8/scratchpad/research-uae-hotels.json',
    ].find(existsSync);
  if (!path || !existsSync(path)) {
    console.error('Research file not found — pass the path as an argument.');
    process.exit(1);
  }
  const { hotels } = JSON.parse(readFileSync(path, 'utf8').replace(/^﻿/, '')) as { hotels: ResearchHotel[] };
  console.log(`${hotels.length} hotels in ${path}`);

  const { data: uaeDest } = await db.from('destinations').select('id').eq('slug', 'united-arab-emirates').maybeSingle();

  const { data: existingRows, error } = await db.from('hotels').select('id, name');
  if (error) throw new Error(error.message);
  const existingByName = new Map((existingRows ?? []).map((r: any) => [String(r.name).trim().toLowerCase(), r.id]));

  let created = 0, updated = 0, skipped = 0, columnsMissing = false;
  const perEmirate: Record<string, number> = {};

  for (const h of hotels) {
    if (!h.name?.trim() || !EMIRATES.includes(h.emirate)) {
      skipped++;
      console.warn(`⚠ skipped: ${h.name ?? '(no name)'} — invalid emirate "${h.emirate}"`);
      continue;
    }
    const key = h.name.trim().toLowerCase();
    const id = existingByName.get(key);

    const basicRow = {
      name: h.name.trim(),
      destination_id: uaeDest?.id ?? null,
      area: h.area?.trim() || null,
      style: h.style?.trim() || null,
      description: h.note?.trim() || null,
      sort_order: EMIRATES.indexOf(h.emirate) * 100,
    };
    const fullRow = {
      ...basicRow,
      features: (h.keyFeatures ?? []).filter(Boolean),
      meal_plans: (h.mealPlans ?? []).filter(Boolean),
      stars: h.stars ?? null,
      emirate: h.emirate,
      best_for: (h.bestFor ?? []).filter(Boolean),
      status: 'published',
    };

    let res = await (id
      ? db.from('hotels').update(columnsMissing ? basicRow : fullRow).eq('id', id)
      : db.from('hotels').insert(columnsMissing ? basicRow : fullRow));
    if (res.error && /column|schema cache/i.test(res.error.message)) {
      columnsMissing = true;
      res = await (id
        ? db.from('hotels').update(basicRow).eq('id', id)
        : db.from('hotels').insert(basicRow));
    }
    if (res.error) {
      console.error(`✗ ${h.name}: ${res.error.message}`);
      continue;
    }
    id ? updated++ : created++;
    perEmirate[h.emirate] = (perEmirate[h.emirate] ?? 0) + 1;
    console.log(`${id ? '↻' : '＋'} [${h.emirate}] ${h.name}${h.stars ? ` (${h.stars}★)` : ''}`);
  }

  console.log('\n────────── HOTEL DIRECTORY REPORT ──────────');
  for (const e of EMIRATES) if (perEmirate[e]) console.log(`${e}: ${perEmirate[e]}`);
  console.log(`Created: ${created} · Updated: ${updated} · Skipped: ${skipped}`);
  if (columnsMissing) {
    console.warn('\n⚠ Directory columns missing — paste supabase/RUN-ME.sql (migration 008) into the Supabase SQL editor, then re-run this script.');
  }
  console.log('\nNo rates, availability claims or stock "hotel photos" were written; real photography can be added per hotel in the admin.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
