import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { mapQuote, quoteTotal } from '@/lib/quotes';

/**
 * Who is signed in, and what they are allowed to be.
 *
 * Staff and customers share one Supabase project, so "has a session" no longer
 * means "is an admin" — the role on the profile decides, and anything missing
 * or unreadable is treated as a customer rather than waved through.
 */

export type Account = {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  /** reviewer = staff who may use only the Booking requests section. */
  role: 'customer' | 'admin' | 'reviewer';
};

export type Role = Account['role'];

export async function getAccount(): Promise<Account | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Read through the service role: a profile row can be missing for a moment
  // after signup, and RLS should not be the thing that decides a role.
  const db = createAdminClient();
  const { data } = await db
    .from('profiles')
    .select('email, full_name, phone, role')
    .eq('id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: data?.email || user.email || '',
    fullName: data?.full_name ?? '',
    phone: data?.phone ?? '',
    role: data?.role === 'admin' ? 'admin' : data?.role === 'reviewer' ? 'reviewer' : 'customer',
  };
}

/** Anyone who belongs in the admin console at all. */
export function isStaffRole(role: Role | undefined | null) {
  return role === 'admin' || role === 'reviewer';
}

export async function isAdmin() {
  return (await getAccount())?.role === 'admin';
}

/**
 * Everything a customer has sent us.
 *
 * Matched on the account id where we have it, and otherwise on the email
 * address Supabase has verified for them — which is what makes requests they
 * sent before they ever had an account appear the moment they sign in.
 */
export async function getAccountActivity(account: Account) {
  const db = createAdminClient();
  const email = account.email.toLowerCase();

  const [enquiries, bookings, quotes] = await Promise.all([
    db
      .from('enquiries')
      .select('*')
      .or(`customer_id.eq.${account.id},email.ilike.${email}`)
      .order('created_at', { ascending: false }),
    db
      .from('booking_requests')
      .select('*')
      .or(`customer_id.eq.${account.id},email.ilike.${email}`)
      .order('created_at', { ascending: false }),
    // A draft is ours until we send it — a customer should never meet one.
    db
      .from('quotes')
      // Lines live in their own table and carry the cost and markup the total
      // is derived from, so they have to come with the quote.
      .select('*, quote_lines(*)')
      .neq('status', 'draft')
      .or(`customer_id.eq.${account.id},client_email.ilike.${email}`)
      .order('created_at', { ascending: false }),
  ]);

  return {
    enquiries: enquiries.data ?? [],
    bookings: bookings.data ?? [],
    quotes: (quotes.data ?? []).map((row: any) => {
      const q = mapQuote(row);
      return { ...q, total: quoteTotal(q.lines) };
    }),
  };
}

/** Attach past activity to the account, so later reads are a plain id match. */
export async function claimActivity(account: Account) {
  const db = createAdminClient();
  const email = account.email.toLowerCase();
  await Promise.all([
    db.from('enquiries').update({ customer_id: account.id }).is('customer_id', null).ilike('email', email),
    db.from('booking_requests').update({ customer_id: account.id }).is('customer_id', null).ilike('email', email),
    db.from('quotes').update({ customer_id: account.id }).is('customer_id', null).ilike('client_email', email),
  ]);
}
