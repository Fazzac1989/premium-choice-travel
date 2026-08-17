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

export async function nextQuoteRef(): Promise<string> {
  const db = createAdminClient();
  const year = new Date().getFullYear();
  const { count } = await db
    .from('quotes')
    .select('id', { count: 'exact', head: true })
    .like('ref', `PCT-${year}-%`);
  return `PCT-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`;
}
