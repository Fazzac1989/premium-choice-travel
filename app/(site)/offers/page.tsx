import type { Metadata } from 'next';
import Link from 'next/link';
import OfferCard from '@/components/OfferCard';
import SiteHeader from '@/components/SiteHeader';
import { BRANDS } from '@/lib/brands';
import { getOffers, offersForSite, OFFER_SITES } from '@/lib/offers';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Offers',
  description: 'Current offers across Premium Choice Holidays, Staycations, Cruises and Golf — dated deals, priced from Dubai.',
  alternates: { canonical: '/offers' },
};

/**
 * Every brand's live offers on one page, grouped by brand. Offers for
 * "every brand" appear once, at the top.
 */
export default async function OffersPage() {
  const { offers } = await getOffers();
  const shared = offersForSite(offers, '__none__');
  const groups = OFFER_SITES.map((site) => ({
    site,
    brand: BRANDS.find((b) => b.key === site),
    offers: offersForSite(offers, site).filter((o) => o.brand === site),
  })).filter((g) => g.offers.length > 0);
  const none = shared.length === 0 && groups.length === 0;

  return (
    <>
    <SiteHeader solid />
    <main className="pt-[72px]">
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">Premium Choice Travel</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Offers</h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            Dated deals across our brands, priced from Dubai. Every one is a starting point — tell us
            your dates and we shape it around you.
          </p>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="container-site space-y-14">
          {none && (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">No offers running right now.</p>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Tell us what you have in mind and we’ll come back with a personal quote.
              </p>
              <Link href="/plan" className="btn-primary mt-6">Plan my trip</Link>
            </div>
          )}

          {shared.length > 0 && (
            <div>
              <h2 className="font-serif text-3xl text-ink">Across every brand</h2>
              <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {shared.map((o) => <OfferCard key={o.id} offer={o} enquireBase="" />)}
              </div>
            </div>
          )}

          {groups.map((g) => (
            <div key={g.site}>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-serif text-3xl text-ink">{g.brand?.name ?? g.site}</h2>
                {g.brand && (
                  <Link href={`/brands/${g.brand.slug}`} className="text-sm font-semibold text-teal-deep hover:underline">
                    Visit {g.brand.name} →
                  </Link>
                )}
              </div>
              <div className="mt-6 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {g.offers.map((o) => <OfferCard key={o.id} offer={o} enquireBase="" />)}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
    </>
  );
}
