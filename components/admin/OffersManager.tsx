import Image from 'next/image';
import OfferForm from '@/components/admin/OfferForm';
import { getOffers, isLive, OFFER_BRAND_LABELS, untilLabel, priceLabel, type OfferBrand } from '@/lib/offers';

/**
 * The offers manager — the Group workspace sees every brand's; a brand
 * workspace sees its own and the ones for every brand, and adds under its
 * own name.
 */
export default async function OffersManager({ brand }: { brand?: OfferBrand }) {
  const { offers, migrated } = await getOffers();
  const shown = brand ? offers.filter((o) => o.brand === brand || o.brand === 'all') : offers;

  return (
    <>
      {!migrated && (
        <p className="mt-4 rounded-xl bg-danger/10 p-4 text-sm text-danger">
          The offers table isn’t migrated yet — paste supabase/migrations/020-offers.sql in the
          Supabase SQL editor, then reload.
        </p>
      )}

      {shown.length === 0 && migrated && (
        <p className="mt-6 text-sm text-ink-soft">No offers yet. Add the first one below.</p>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {shown.map((o) => {
          const live = isLive(o);
          return (
            <details key={o.id} className="card group">
              <summary className="flex cursor-pointer items-center gap-4 p-4 [&::-webkit-details-marker]:hidden">
                <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-sand">
                  {o.image && <Image src={o.image} alt="" fill sizes="80px" className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{o.title}</p>
                  <p className="text-xs text-ink-soft">
                    {OFFER_BRAND_LABELS[o.brand]}
                    {priceLabel(o) ? ` · ${priceLabel(o)}` : ''}
                    {untilLabel(o) ? ` · ${untilLabel(o)}` : ''}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    live ? 'bg-teal text-white' : o.status === 'published' ? 'bg-amber-100 text-amber-800' : 'bg-ink/10 text-ink-soft'
                  }`}
                >
                  {live ? 'Live' : o.status === 'published' ? 'Expired' : 'Draft'}
                </span>
                <span className="text-ink-soft transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="border-t border-line p-5">
                <OfferForm offer={o} lockBrand={brand && o.brand === brand ? brand : undefined} />
              </div>
            </details>
          );
        })}
      </div>

      <div className="card mt-8 p-6">
        <h2 className="font-serif text-xl text-ink">Add an offer</h2>
        <p className="mt-1 text-sm text-ink-soft">
          It shows on the Offers page of {brand ? OFFER_BRAND_LABELS[brand] : 'the brand you choose'} while
          it is published and within its dates.
        </p>
        <div className="mt-4">
          <OfferForm offer={null} lockBrand={brand} />
        </div>
      </div>
    </>
  );
}
