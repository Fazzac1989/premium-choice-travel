import 'server-only';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import * as core from './links-core';

/**
 * The application's entry point for payment links.
 *
 * The logic lives in links-core.ts, which takes its database client as an
 * argument so a support script can run the identical path. This file is the
 * server-only wrapper that supplies the service-role client.
 */

export type { PaymentLinkRow, CreateLinkInput } from './links-core';
export { needsMigration } from './links-core';

export async function listPaymentLinks(quoteId: number) {
  if (!isSupabaseConfigured()) return [];
  return core.listPaymentLinks(createAdminClient(), quoteId);
}

export async function createLinkForQuote(input: core.CreateLinkInput) {
  if (!isSupabaseConfigured()) return { ok: false as const, error: 'The database is not configured.' };
  return core.createLinkForQuote(createAdminClient(), input);
}

export async function verifyLink(id: number) {
  if (!isSupabaseConfigured()) return { ok: false, status: 'unknown', detail: 'The database is not configured.' };
  return core.verifyLink(createAdminClient(), id);
}

export async function handleCallback(orderId: string, gatewayPaymentId: string) {
  if (!isSupabaseConfigured()) return { found: false, status: 'ignored' };
  return core.handleCallback(createAdminClient(), orderId, gatewayPaymentId);
}
