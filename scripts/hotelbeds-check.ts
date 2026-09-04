/**
 * Prove the Hotelbeds credentials work — two requests at most.
 *
 *   1. GET  /hotel-api/1.0/status
 *   2. POST /hotel-api/1.0/hotels for the first mapped hotel, next weekend
 *      (skipped when no hotel carries a Hotelbeds code yet; pass --code 1234
 *      to search a specific Hotelbeds hotel code instead)
 *
 * The evaluation key allows 50 requests a day, so this is not a thing to loop.
 *
 * Usage:
 *   npx tsx scripts/hotelbeds-check.ts
 *   npx tsx scripts/hotelbeds-check.ts --code 1234 --nights 2 --adults 2
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { hotelbeds, hotelbedsCredentials, hotelbedsStatus } from '../lib/rates/hotelbeds';

config({ path: '.env.local' });
config({ path: '.env' });

const args = process.argv.slice(2);
const arg = (name: string) => (args.includes(name) ? String(args[args.indexOf(name) + 1] ?? '') : '');

function nextFriday() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + (((5 - d.getUTCDay() + 7) % 7) || 7));
  return d.toISOString().slice(0, 10);
}

async function main() {
  const creds = hotelbedsCredentials();
  if (!creds) {
    console.error('HOTELBEDS_API_KEY and HOTELBEDS_SECRET are not set in .env.local — see docs/hotelbeds.md');
    process.exit(1);
  }
  console.log(`Environment: ${creds.env} (${creds.host})`);

  const status = await hotelbedsStatus();
  console.log(`Status endpoint: ${status.ok ? 'OK' : 'FAILED'} — ${status.detail}`);
  if (!status.ok) {
    console.log('\nA 403 here usually means the key is wrong, the secret is wrong, or today’s 50-request quota is spent.');
    process.exit(1);
  }

  let code = arg('--code');
  let label = code ? `Hotelbeds hotel ${code}` : '';
  if (!code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await db.from('hotels').select('name,supplier_code').not('supplier_code', 'is', null).limit(50);
      const first = (data ?? []).find((h: any) => /^\d+$/.test(String(h.supplier_code)));
      if (first) {
        code = String(first.supplier_code);
        label = `${first.name} (Hotelbeds ${code})`;
      }
    }
  }
  if (!code) {
    console.log('\nNo hotel carries a Hotelbeds code yet — run scripts/map-hotelbeds-hotels.ts, or pass --code <hotelbeds code>.');
    return;
  }

  const checkIn = arg('--from') || nextFriday();
  const nights = Number(arg('--nights')) || 2;
  const adults = Number(arg('--adults')) || 2;
  console.log(`\nAvailability: ${label}, ${checkIn} for ${nights} night(s), ${adults} adult(s)`);

  const offers = await hotelbeds.offers!({ hotelId: 0, supplierCode: code, checkIn, nights, adults, children: 0 });
  if (!offers.length) {
    console.log('No rooms came back. In the test environment that is common for real hotels — the demo inventory is small.');
    return;
  }
  console.log(`${offers.length} room option(s):`);
  for (const o of offers.slice(0, 12)) {
    const cancel = o.refundable === false ? 'non-refundable' : o.cancelBy ? `free cancellation until ${o.cancelBy.slice(0, 10)}` : 'terms unknown';
    console.log(`  ${o.currency} ${o.total.toFixed(2)}  ${o.roomName} · ${o.board} · ${cancel}` + (o.net != null ? `  (net ${o.net.toFixed(2)})` : ''));
  }
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
