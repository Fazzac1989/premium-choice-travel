import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const db = createClient(process.env.PCST_SUPABASE_URL, process.env.PCST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// China has facts and images but no region, so it never appears under a region filter.
const { error: cnErr } = await db.from('countries').update({ region: 'Asia' }).eq('slug', 'china');
console.log(`china region -> Asia: ${cnErr ? cnErr.message : 'ok'}`);

// Both UAE trips have no country set. If a UAE country exists, attach them.
const { data: uae } = await db
  .from('countries')
  .select('id, name, slug')
  .or('slug.eq.united-arab-emirates,slug.eq.uae,name.ilike.%emirates%')
  .maybeSingle();

if (!uae) {
  console.log('UAE country: NOT FOUND — needs creating in Countries first');
} else {
  console.log(`UAE country found: ${uae.name} (#${uae.id})`);
  const { error } = await db
    .from('trips')
    .update({ country_id: uae.id })
    .in('slug', ['the-uae-story-heritage-innovation-adventure', 'the-uae-story-heritage-innovation-adventure-2']);
  console.log(`UAE trips attached: ${error ? error.message : 'ok'}`);
}

// The two UAE trips look like duplicates — surface the facts, decide nothing.
const { data: dupes } = await db
  .from('trips')
  .select('slug, title, status, created_at, itinerary_days(count)')
  .in('slug', ['the-uae-story-heritage-innovation-adventure', 'the-uae-story-heritage-innovation-adventure-2']);
for (const d of dupes ?? []) {
  console.log(`  ${d.slug}: "${d.title}" (${d.status}), ${d.itinerary_days?.[0]?.count ?? 0} days, created ${d.created_at.slice(0, 10)}`);
}
