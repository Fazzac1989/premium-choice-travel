import Link from 'next/link';
import { notFound } from 'next/navigation';
import OfferCard from '@/components/OfferCard';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getOffers, OFFER_SITES } from '@/lib/offers';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Offers' };

/** A brand site's live offers: its own and the ones for every brand. */
export default async function BrandOffersPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.externalUrl || !(OFFER_SITES as readonly string[]).includes(brand.key)) notFound();
  const base = brandBase(brand);
  const { offers } = await getOffers({ site: brand.key });

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">Offers</h1>
          <p className="mt-4 max-w-xl text-ink-soft">
            Dated deals, priced from Dubai. Every one is a starting point — tell us your dates and we
            shape it around you.
          </p>
        </div>
      </section>
      <section className="py-14 sm:py-16">
        <div className="container-site">
          {offers.length === 0 ? (
            <div className="rounded-2xl border border-line p-12 text-center">
              <p className="font-serif text-2xl text-ink">No offers running right now.</p>
              <p className="mx-auto mt-3 max-w-md text-ink-soft">
                Tell us what you have in mind and we’ll come back with a personal quote.
              </p>
              <Link href={`${base}/enquire`} className="btn-primary mt-6">Plan my trip</Link>
            </div>
          ) : (
            <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => <OfferCard key={o.id} offer={o} enquireBase={base} />)}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
