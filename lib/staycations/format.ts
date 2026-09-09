/**
 * Tidying supplier text for display.
 *
 * Bed banks send room and board names in whatever case their contracting
 * team typed — "DOUBLE OR TWIN STANDARD", "double or twin standard",
 * "Deluxe Marina City View Room". Only the casing is touched: the words
 * themselves are the hotel's, and changing them would change what was sold.
 */

const SMALL = new Set(['a', 'an', 'and', 'at', 'de', 'del', 'el', 'in', 'la', 'le', 'of', 'on', 'or', 'the', 'to', 'with']);
/** Abbreviations that would look wrong in title case. */
const KEEP_UPPER = new Set(['VIP', 'TV', 'AC', 'SPA', 'RO', 'BB', 'HB', 'FB', 'AI']);

export function titleCase(input: string): string {
  const text = String(input ?? '').trim();
  if (!text) return '';
  // Mixed case is the supplier having styled it themselves — leave it alone.
  const allUpper = text === text.toUpperCase();
  const allLower = text === text.toLowerCase();
  if (!allUpper && !allLower) return text;

  return text
    .toLowerCase()
    .split(/(\s+|-|\/)/)
    .map((part, i, parts) => {
      if (/^(\s+|-|\/)$/.test(part)) return part;
      const upper = part.toUpperCase();
      if (KEEP_UPPER.has(upper)) return upper;
      const isFirst = i === 0;
      const isLast = i === parts.length - 1;
      if (!isFirst && !isLast && SMALL.has(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/** A room as the customer should read it. */
export const roomLabel = (name: string) => titleCase(name);

/** A board basis as the customer should read it, with a sensible default. */
export const boardLabel = (board: string) => titleCase(board) || 'Room only';
