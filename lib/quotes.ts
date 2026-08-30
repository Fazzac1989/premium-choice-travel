import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapQuoteRow } from '@/lib/quote-map';
import type { Quote } from '@/lib/quote-math';

export * from '@/lib/quote-math';
export { mapQuoteRow as mapQuote };

const QUOTE_SELECT = '*, quote_lines(*)';

export async function getQuoteByToken(token: string): Promise<Quote | null> {
  if (!token || !/^[0-9a-f-]{36}$/i.test(token)) return null;
  const db = createAdminClient();
  const { data } = await db.from('quotes').select(QUOTE_SELECT).eq('public_token', token).maybeSingle();
  return data ? mapQuoteRow(data) : null;
}

export async function getQuoteById(id: number): Promise<Quote | null> {
  const db = createAdminClient();
  const { data } = await db.from('quotes').select(QUOTE_SELECT).eq('id', id).maybeSingle();
  return data ? mapQuoteRow(data) : null;
}

export async function listQuotes(): Promise<Quote[]> {
  const db = createAdminClient();
  const { data } = await db
    .from('quotes')
    .select(QUOTE_SELECT)
    .order('updated_at', { ascending: false });
  return (data ?? []).map(mapQuoteRow);
}

/**
 * The next quote reference for this year.
 *
 * Counting the year's quotes and adding one looks right until a quote is
 * deleted: three rows numbered 0001, 0002 and 0004 produce 0004 again, and the
 * insert fails on the unique index. The highest existing number is what
 * matters, not how many there are.
 */
export async function nextQuoteRef(): Promise<string> {
  const db = createAdminClient();
  const year = new Date().getFullYear();
  const { data } = await db
    .from('quotes')
    .select('ref')
    .like('ref', `PCT-${year}-%`)
    .order('ref', { ascending: false })
    .limit(1);

  const highest = Number(data?.[0]?.ref?.split('-').pop()) || 0;
  return `PCT-${year}-${String(highest + 1).padStart(4, '0')}`;
}
