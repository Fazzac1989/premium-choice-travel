import { notFound } from 'next/navigation';
import CorporatePage from '@/components/corporate/CorporatePage';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { CORPORATE_PAGES } from '@/lib/corporate/content';

export const dynamic = 'force-dynamic';

const page = CORPORATE_PAGES['travel-support'];

export const metadata = { title: page.metaTitle, description: page.metaDescription };

/**
 * Traveller support. Someone mid-trip needs help, not a sales pitch, so the
 * way to reach us comes before anything else on the page.
 */
export default function Page({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'corporate') notFound();
  return (
    <CorporatePage
      base={brandBase(brand)}
      page={page}
      lead={
        <section className="container-site pt-10">
          <div className="rounded-2xl border-2 border-teal-deep bg-white p-6 sm:p-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-deep">Travelling with us now?</p>
            <div className="mt-3 grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="font-serif text-xl text-ink">During office hours</h2>
                <p className="mt-1 text-sm text-ink-soft">Monday to Friday, 9.00am–7.30pm UAE time</p>
                <a href="tel:+97144206965" className="mt-3 inline-block text-lg font-bold text-teal-deep hover:underline">
                  +971 4 420 6965
                </a>
              </div>
              <div>
                <h2 className="font-serif text-xl text-ink">Evenings, weekends and holidays</h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                  Call the 24/7 support number in your travel documents. Our partner can rebook and
                  rearrange within the authority your company has agreed with us.
                </p>
              </div>
            </div>
          </div>
        </section>
      }
    />
  );
}
