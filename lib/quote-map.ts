import type { Quote } from '@/lib/quote-math';

/** Maps a Supabase quotes row (with nested quote_lines) to the Quote shape. */
export function mapQuoteRow(row: any): Quote {
  return {
    id: row.id,
    ref: row.ref,
    publicToken: row.public_token,
    status: row.status,
    title: row.title,
    clientName: row.client_name,
    clientEmail: row.client_email,
    clientPhone: row.client_phone,
    packageId: row.package_id,
    travelDates: row.travel_dates,
    validity: row.validity,
    adults: row.adults,
    children: row.children,
    notes: row.notes,
    currency: row.currency ?? 'AED',
    defaultMarkupPct: Number(row.default_markup_pct ?? 0),
    heroImage: row.hero_image,
    images: row.images ?? [],
    itinerary: row.itinerary ?? [],
    inclusions: row.inclusions ?? [],
    exclusions: row.exclusions ?? [],
    terms: row.terms ?? [],
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lines: (row.quote_lines ?? [])
      .slice()
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((l: any) => ({
        id: l.id,
        description: l.description,
        qty: Number(l.qty),
        unitCost: Number(l.unit_cost),
        markupPct: Number(l.markup_pct),
      })),
  };
}
