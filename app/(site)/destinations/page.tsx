import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import WorldMapExplorer from '@/components/WorldMapExplorer';
import { getDestinations } from '@/lib/data';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Destinations',
  description:
    'Explore our world map of 60+ destinations hand-picked for travellers from the UAE — hover to light up a region, click to open the country guide.',
};

export default async function DestinationsPage() {
  const all = await getDestinations();

  const mapDestinations = all.map((d) => ({
    slug: d.slug,
    name: d.name,
    region: d.region,
    strapline: d.strapline || d.blurb,
  }));

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-12 sm:py-14">
            <p className="eyebrow">Destinations</p>
            <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Where will you go next?
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              {all.length} destinations, hand-picked for travellers from the UAE. Glide over
              the map — the places we know light up in Premium Choice teal.
            </p>
          </div>
        </section>

        <section className="py-10 sm:py-12">
          <div className="container-site">
            <WorldMapExplorer destinations={mapDestinations} />
          </div>
        </section>

        <section className="pb-16">
          <div className="container-site">
            <div className="rounded-3xl bg-ink px-8 py-12 text-center text-white sm:px-16">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
                Can’t decide? Let’s narrow it down together.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-white/75">
                Answer a few questions and our AI curator sketches three trip ideas —
                then a human specialist prices the one you love.
              </p>
              <Link href="/inspiration" className="btn-primary mt-7 !px-8 !py-3.5">
                ✨ Give me some inspiration
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
