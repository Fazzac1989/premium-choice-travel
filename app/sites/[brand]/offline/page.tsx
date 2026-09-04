import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

/**
 * Shown by the service worker when a page cannot be fetched. Kept free of
 * data so it can be cached at install time and always renders.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'You’re offline',
  robots: { index: false, follow: false },
};

export default function OfflinePage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand) notFound();
  const base = brandBase(brand);

  return (
    <main className="flex min-h-[60svh] items-center">
      <div className="container-site max-w-xl py-16 text-center">
        <p className="eyebrow">{brand.name}</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">You’re offline.</h1>
        <p className="mt-4 text-ink-soft">
          This page needs a connection. Hotels you have already opened and your saved
          shortlist still work — or call us and we’ll take it from there.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`${base}/hotels/saved`} className="btn-primary">Saved hotels</Link>
          <a href="tel:+97144206965" className="btn-outline">Call +971 4 420 6965</a>
        </div>
      </div>
    </main>
  );
}
