/**
 * One-off content tool: collects candidate gallery images per destination from
 * Unsplash search (URL + native alt description) into
 * lib/generated/destination-images.json for the catalogue to consume.
 *
 * Usage: node scripts/fetch-destination-images.mjs
 */
import { writeFileSync, mkdirSync } from 'node:fs';

const QUERIES = {
  maldives: 'maldives travel', thailand: 'thailand travel', mauritius: 'mauritius island',
  'sri-lanka': 'sri lanka travel', 'united-kingdom': 'england countryside london',
  japan: 'japan travel', vietnam: 'vietnam travel', greece: 'greece islands',
  turkey: 'turkey cappadocia istanbul', france: 'france paris riviera', italy: 'italy travel',
  spain: 'spain travel', bali: 'bali indonesia', canada: 'canada rockies', australia: 'australia sydney coast',
  'united-states': 'usa national parks new york', seychelles: 'seychelles beach',
  switzerland: 'switzerland alps', 'south-korea': 'south korea seoul', 'south-africa': 'south africa cape town safari',
  portugal: 'portugal lisbon algarve', georgia: 'georgia tbilisi caucasus', oman: 'oman travel',
  malaysia: 'malaysia travel', singapore: 'singapore city', austria: 'austria alps vienna',
  netherlands: 'netherlands amsterdam', finland: 'finland lapland', germany: 'germany bavaria',
  croatia: 'croatia dubrovnik coast', montenegro: 'montenegro kotor', azerbaijan: 'azerbaijan baku',
  armenia: 'armenia yerevan mountains', 'czech-republic': 'prague czech', morocco: 'morocco marrakech desert',
  egypt: 'egypt pyramids nile', tanzania: 'tanzania safari zanzibar', kenya: 'kenya safari masai mara',
  ireland: 'ireland cliffs countryside', 'new-zealand': 'new zealand landscape',
  'saudi-arabia': 'alula saudi arabia', jordan: 'jordan petra wadi rum', cyprus: 'cyprus beach',
  malta: 'malta valletta', albania: 'albania riviera', serbia: 'belgrade serbia',
  hungary: 'budapest hungary', slovenia: 'slovenia lake bled', norway: 'norway fjords',
  sweden: 'sweden stockholm', denmark: 'copenhagen denmark', iceland: 'iceland landscape',
  china: 'china great wall shanghai', india: 'india rajasthan kerala', nepal: 'nepal himalayas',
  bhutan: 'bhutan monastery', cambodia: 'cambodia angkor', philippines: 'philippines palawan',
  mexico: 'mexico travel', 'costa-rica': 'costa rica rainforest',
  scotland: 'scotland highlands golf', 'united-arab-emirates': 'dubai abu dhabi',
  mediterranean: 'mediterranean cruise santorini', 'northern-europe': 'norway fjord cruise',
  'arabian-gulf': 'dubai marina cruise',
  caribbean: 'caribbean beach island turquoise',
  antarctica: 'antarctica icebergs penguins expedition',
  'dominican-republic': 'dominican republic punta cana beach',
};

const out = {};
for (const [slug, query] of Object.entries(QUERIES)) {
  try {
    const res = await fetch(
      `https://unsplash.com/napi/search/photos?query=${encodeURIComponent(query)}&per_page=14`,
      { headers: { Accept: 'application/json' } }
    );
    const json = await res.json();
    const seen = new Set();
    out[slug] = (json.results ?? [])
      .filter((r) => r.premium !== true && r.urls?.raw)
      .map((r) => ({
        url: r.urls.raw.split('?')[0],
        alt: (r.alt_description || r.description || query).slice(0, 140),
      }))
      .filter((img) => !seen.has(img.url) && seen.add(img.url))
      .slice(0, 12);
    console.log(slug, out[slug].length);
  } catch (e) {
    console.error(slug, 'FAILED', e.message);
    out[slug] = [];
  }
  await new Promise((r) => setTimeout(r, 350));
}

mkdirSync('lib/generated', { recursive: true });
writeFileSync('lib/generated/destination-images.json', JSON.stringify(out, null, 1));
console.log('written lib/generated/destination-images.json');
