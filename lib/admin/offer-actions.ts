'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/guard';
import { OFFER_BRANDS } from '@/lib/offers-shared';

export type OfferActionState = { ok: boolean; message: string } | null;

const MIGRATION = 'supabase/migrations/020-offers.sql';

/** Every page an offer can appear on. */
function refresh() {
  revalidatePath('/admin/offers');
  revalidatePath('/offers');
  revalidatePath('/', 'layout');
}

export async function saveOffer(_prev: OfferActionState, formData: FormData): Promise<OfferActionState> {
  await requireAdmin();
  const db = createAdminClient();

  const id = formData.get('id') ? Number(formData.get('id')) : null;
  const title = String(formData.get('title') ?? '').trim();
  if (!title) return { ok: false, message: 'A title is required.' };
  const brand = String(formData.get('brand') ?? 'all');
  if (!(OFFER_BRANDS as readonly string[]).includes(brand)) return { ok: false, message: 'Choose a brand.' };

  const text = (k: string) => String(formData.get(k) ?? '').trim() || null;
  const date = (k: string) => {
    const v = text(k);
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  };
  const validFrom = date('valid_from');
  const validUntil = date('valid_until');
  if (validFrom && validUntil && validUntil < validFrom) {
    return { ok: false, message: 'The offer ends before it starts — check the dates.' };
  }
  const priceRaw = text('price_from');
  const priceFrom = priceRaw ? Number(priceRaw.replace(/[^0-9.]/g, '')) : null;
  if (priceRaw && !Number.isFinite(priceFrom)) return { ok: false, message: 'The price should be a number, e.g. 2450.' };

  const row = {
    brand,
    title,
    subtitle: text('subtitle'),
    description: text('description'),
    image: text('image'),
    badge: text('badge'),
    price_from: priceFrom,
    currency: (text('currency') ?? 'AED').toUpperCase().slice(0, 3),
    price_note: text('price_note'),
    valid_from: validFrom,
    valid_until: validUntil,
    cta_label: text('cta_label'),
    cta_href: text('cta_href'),
    status: formData.get('status') === 'published' ? 'published' : 'draft',
    sort_order: Number(formData.get('sort_order') ?? 0) || 0,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (id ? db.from('offers').update(row).eq('id', id) : db.from('offers').insert(row));
  if (error) {
    return /relation .* does not exist|schema cache/i.test(error.message)
      ? { ok: false, message: `The offers table isn’t migrated yet — run ${MIGRATION} in the Supabase SQL editor first.` }
      : { ok: false, message: error.message };
  }
  refresh();
  return { ok: true, message: id ? 'Saved.' : 'Offer added.' };
}

export async function deleteOffer(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!id) return;
  await createAdminClient().from('offers').delete().eq('id', id);
  refresh();
}
