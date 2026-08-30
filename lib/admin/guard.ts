import 'server-only';
import { getAccount } from '@/lib/account';

/**
 * Throws unless a signed-in admin session exists. Call at the top of every
 * admin action.
 *
 * This used to accept any session, on the reasoning that only Premium Choice
 * staff had accounts in this Supabase project. Customer accounts ended that:
 * a shared project means a session proves someone signed in, not that they are
 * staff. The role on the profile decides, and a missing or unreadable profile
 * counts as a customer.
 */
export async function requireAdmin() {
  const account = await getAccount();
  if (!account || account.role !== 'admin') throw new Error('Not authorised');
  return account;
}
