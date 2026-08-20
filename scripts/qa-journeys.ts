/** Content QA over the authored journey library. Usage: npx tsx scripts/qa-journeys.ts */
import { HOLIDAYS_JOURNEYS } from '../lib/journeys/holidays';
import { STAYCATIONS_JOURNEYS } from '../lib/journeys/staycations';
import { CRUISES_JOURNEYS } from '../lib/journeys/cruises';
import { GOLF_JOURNEYS } from '../lib/journeys/golf';
import { HOLIDAYS_JOURNEYS_2 } from '../lib/journeys/holidays2';
import { CRUISES_JOURNEYS_2 } from '../lib/journeys/cruises2';
import { GOLF_JOURNEYS_2 } from '../lib/journeys/golf2';

const all = [...HOLIDAYS_JOURNEYS, ...STAYCATIONS_JOURNEYS, ...CRUISES_JOURNEYS, ...GOLF_JOURNEYS, ...HOLIDAYS_JOURNEYS_2, ...CRUISES_JOURNEYS_2, ...GOLF_JOURNEYS_2];
const banned = [
  'unforgettable', 'breathtaking', 'nestled', 'world-class', 'seamless',
  'discover the magic', 'something for everyone', 'memories to last a lifetime', 'hidden gem', 'bucket list',
];
const validDest = new Set(
  'albania,arabian-gulf,armenia,australia,austria,azerbaijan,bali,bhutan,cambodia,canada,caribbean,china,costa-rica,croatia,cyprus,czech-republic,denmark,dominican-republic,egypt,finland,france,georgia,germany,greece,hungary,iceland,india,ireland,italy,japan,jordan,kenya,malaysia,maldives,malta,mauritius,mediterranean,mexico,montenegro,morocco,nepal,netherlands,new-zealand,northern-europe,norway,oman,philippines,portugal,saudi-arabia,scotland,serbia,seychelles,singapore,slovenia,south-africa,south-korea,spain,sri-lanka,sweden,switzerland,tanzania,thailand,turkey,united-arab-emirates,united-kingdom,united-states,vietnam,antarctica'.split(',')
);

const problems: string[] = [];
const slugs = new Set<string>();
for (const j of all) {
  if (slugs.has(j.slug)) problems.push(`${j.slug}: DUPLICATE SLUG`);
  slugs.add(j.slug);
  const text = JSON.stringify(j).toLowerCase();
  for (const b of banned) if (text.includes(b)) problems.push(`${j.slug}: banned phrase "${b.trim()}"`);
  // "embarkation" (the port) is legitimate nautical vocabulary; the verb is the cliché.
  if (/\bembark(s|ed|ing)?\b/.test(text)) problems.push(`${j.slug}: banned verb "embark"`);
  if (!validDest.has(j.destinationSlug)) problems.push(`${j.slug}: bad destination ${j.destinationSlug}`);
  if (j.days !== j.nights + 1) problems.push(`${j.slug}: days != nights+1`);
  if (j.imageQueries.length < 7) problems.push(`${j.slug}: only ${j.imageQueries.length} image queries`);
  if (j.highlights.length < 4) problems.push(`${j.slug}: only ${j.highlights.length} highlights`);
  if (j.itinerary.length < 1) problems.push(`${j.slug}: no itinerary`);
  if (j.status === 'draft' && !j.reviewNote) problems.push(`${j.slug}: draft without reviewNote`);
  if (/\d[\d,]*\s*(aed|usd|eur|gbp|dollars|dirhams)/i.test(text)) problems.push(`${j.slug}: possible price mention`);
}
const perBrand: Record<string, Record<string, number>> = {};
for (const j of all) {
  const b = (perBrand[j.brand] ??= {});
  b[j.status] = (b[j.status] ?? 0) + 1;
}
console.log('total:', all.length, '| unique slugs:', slugs.size);
console.log('per brand:', JSON.stringify(perBrand));
console.log(problems.length ? `PROBLEMS (${problems.length}):\n${problems.join('\n')}` : 'ALL CHECKS PASS');
