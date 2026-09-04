import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiriesList from '@/components/staycations/EnquiriesList';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My enquiries',
  description: 'The availability requests you have sent us.',
  robots: { index: false, follow: false },
};

export default function EnquiriesPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-10 sm:py-12">
          <p className="eyebrow">{brand.name}</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">My enquiries</h1>
          <p className="mt-3 max-w-xl text-ink-soft">
            The date checks sent from this device. A specialist replies to each one personally —
            or call <a className="font-semibold text-teal-deep" href="tel:+97144206965">+971 4 420 6965</a>.
          </p>
        </div>
      </section>
      <section className="py-10 sm:py-12">
        <div className="container-site max-w-3xl">
          <EnquiriesList base={base} />
          <p className="mt-8 text-sm text-ink-soft">
            Signed in with us?{' '}
            <Link href="/account" className="font-semibold text-teal-deep hover:underline">
              Quotes and bookings are in your account →
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
