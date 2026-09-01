/**
 * Rules the Proposal Studio applies, kept out of the actions file.
 *
 * `st-proposal-actions.ts` carries the 'use server' directive, where every
 * export has to be an async server action — so plain helpers cannot live there
 * and cannot be tested there either.
 */

/**
 * Combining marks are stripped by code point rather than by a character-range
 * regex. Raw high characters in source have been mangled by an encoding
 * round-trip in these repositories more than once, so this file stays ASCII.
 */
export const stripCombiningMarks = (s: string) =>
  Array.from(s)
    .filter((ch) => {
      const c = ch.codePointAt(0) ?? 0;
      return c < 0x0300 || c > 0x036f;
    })
    .join('');

/**
 * Letters that NFD cannot take apart.
 *
 * Decomposition only separates a base letter from a combining mark. A stroked
 * or ligatured letter is a single character with no mark to remove, so it would
 * otherwise be dropped as punctuation: Tromso written with a slashed o became
 * "troms". Destinations like that are ordinary school-trip fare.
 */
const NON_DECOMPOSABLE: Record<string, string> = {
  'ø': 'o', // o with stroke
  'æ': 'ae',
  'œ': 'oe',
  'ß': 'ss',
  'ð': 'd', // eth
  'þ': 'th', // thorn
  'ł': 'l', // l with stroke
  'đ': 'd', // d with stroke
  'ı': 'i', // dotless i
  'ŋ': 'n', // eng
  'ŧ': 't', // t with stroke
  ' ': ' ', // non-breaking space, common in pasted copy
};

/**
 * A slug is a public URL, so accents are folded rather than dropped.
 *
 * Without the fold, "Le Meridien" written with its accent became "le-mridien" —
 * a misspelt address that had already reached a sitemap once on the holidays
 * side of the estate.
 */
export const slugify = (s: string) =>
  stripCombiningMarks(s.normalize('NFD'))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, (ch) => NON_DECOMPOSABLE[ch] ?? ch)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Travel dates must run forwards.
 *
 * Returns an error message, or null when the pair is acceptable. A missing date
 * is acceptable: a proposal is priced before it is scheduled.
 */
export function validateTravelDates(
  start: string | null | undefined,
  end: string | null | undefined,
): string | null {
  if (!start || !end) return null;
  // ISO dates sort correctly as strings, and both come from a date input.
  if (end < start) return 'The return date is before the departure date.';
  return null;
}
