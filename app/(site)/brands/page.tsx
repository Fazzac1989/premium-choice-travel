import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { BRANDS } from '@/lib/brands';

export const metadata = {
  title: 'Our brands',
  description:
    'Premium Choice Travel is the Dubai travel company behind six specialist brands — Holidays, School Trips, Staycations, Cruise, Golf Holidays and Corporate.',
};

export default function BrandsPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Our brands</p>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Whatever the journey, there’s a Premium Choice for it.
            </h1>
            <p className="mt-4 max-w-xl text-ink-soft">
              Six specialist travel brands. One trusted company behind them all.
            </p>
          </div>
        </section>

        {BRANDS.map((b, i) => (
          <section key={b.slug} className={i % 2 === 1 ? 'bg-sand/60' : ''}>
            <div
              className={`container-site grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 ${
                i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
                <Image src={b.heroImage} alt={b.name} fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
              <div>
                {b.logo ? (
                  <Image src={b.logo} alt={b.name} width={360} height={100} className="h-14 w-auto" />
                ) : (
                  <p className="eyebrow">Premium Choice</p>
                )}
                <h2 className="mt-4 font-serif text-3xl leading-tight text-ink sm:text-4xl">{b.tagline}</h2>
                <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">{b.longDescription}</p>
                <ul className="mt-5 flex max-w-lg flex-wrap gap-2">
                  {b.services.map((s) => (
                    <li key={s} className="rounded-full bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal-deep">
                      {s}
                    </li>
                  ))}
                </ul>
                {b.externalUrl ? (
                  <a href={b.externalUrl} target="_blank" rel="noopener" className="btn-primary mt-7">
                    {b.cta} ↗
                  </a>
                ) : (
                  <Link href={`/brands/${b.slug}`} className="btn-primary mt-7">
                    {b.cta}
                  </Link>
                )}
              </div>
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
