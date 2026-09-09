import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { mapOffer, offersForSite, type Offer } from '@/lib/offers-shared';

export * from '@/lib/offers-shared';

export type OffersResult = { offers: Offer[]; migrated: boolean };

/**
 * Every offer, drafts included, for the admin; or only the live ones for a
 * site when `site` is given. Before the migration has run the table is
 * missing, which the admin is told and the public pages treat as "none".
 */
export async function getOffers(options: { site?: string } = {}): Promise<OffersResult> {
  if (!isSupabaseConfigured()) return { offers: [], migrated: false };
  const db = createAdminClient();
  const { data, error } = await db.from('offers').select('*').order('sort_order').order('id', { ascending: false });
  if (error) return { offers: [], migrated: !/relation .* does not exist|schema cache/i.test(error.message) };
  const offers = (data ?? []).map(mapOffer);
  return { offers: options.site ? offersForSite(offers, options.site) : offers, migrated: true };
}
