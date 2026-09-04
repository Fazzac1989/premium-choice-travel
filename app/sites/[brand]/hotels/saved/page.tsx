import Link from 'next/link';
import { notFound } from 'next/navigation';
import SavedHotelsList from '@/components/staycations/SavedHotelsList';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Saved hotels',
  description: 'The hotels you have shortlisted.',
  robots: { index: false, follow: false },
};

export default function SavedHotelsPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-10 sm:py-12">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">Saved hotels</h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            Your shortlist, ready to compare.{' '}
            <Link href={`${base}/hotels`} className="font-semibold text-teal-deep hover:underline">
              Back to all hotels →
            </Link>
          </p>
        </div>
      </section>
      <section className="py-10 sm:py-12">
        <div className="container-site">
          <SavedHotelsList base={base} />
        </div>
      </section>
    </main>
  );
}
