import Link from 'next/link';
import { CORPORATE_NAV, REVIEW_CTA, REVIEW_HREF, type CorporatePageContent } from '@/lib/corporate/content';
import ReviewBand from '@/components/corporate/ReviewBand';

/**
 * One Premium Choice Corporate service page: a header band, the sections as
 * heading-left / detail-right rows, links to the other services, and the
 * programme-review call to action.
 */
export default function CorporatePage({
  base,
  page,
  lead,
}: {
  base: string;
  page: CorporatePageContent;
  /** Anything that must come before the sections, e.g. the urgent-help box. */
  lead?: React.ReactNode;
}) {
  const others = CORPORATE_NAV.filter((l) => l.href !== `/${page.slug}`);
  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">{page.title}</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-ink-soft sm:text-base">{page.intro}</p>
          <Link href={`${base}${REVIEW_HREF}`} className="btn-primary mt-7 !px-6 !py-3">
            {REVIEW_CTA}
          </Link>
        </div>
      </section>

      {lead}

      <section className="py-14 sm:py-16">
        <div className="container-site divide-y divide-line">
          {page.sections.map((s) => (
            <div key={s.title} className="grid gap-4 py-8 first:pt-0 last:pb-0 lg:grid-cols-[1fr_1.6fr] lg:gap-12">
              <h2 className="font-serif text-2xl leading-snug text-ink">{s.title}</h2>
              <div>
                {s.text && <p className="text-[15px] leading-relaxed text-ink-soft">{s.text}</p>}
                {s.points && (
                  <ul className={`grid gap-2.5 ${s.text ? 'mt-4' : ''}`}>
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink-soft">
                        <span className="mt-[3px] text-teal-deep" aria-hidden="true">✦</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-line py-10">
        <div className="container-site">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-deep">More from Premium Choice Corporate</p>
          <ul className="mt-4 flex flex-wrap gap-3">
            {others.map((l) => (
              <li key={l.href}>
                <Link href={`${base}${l.href}`} className="btn-outline !px-4 !py-2 text-sm">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ReviewBand base={base} />
    </main>
  );
}
