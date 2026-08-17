import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getQuoteByToken, formatMoney, lineTotal, perPerson, quoteTotal, travellerCount } from '@/lib/quotes';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your personal quote',
  robots: { index: false, follow: false },
};

export default async function QuotePage({ params }: { params: { token: string } }) {
  const quote = await getQuoteByToken(params.token);
  if (!quote || quote.status === 'draft') notFound();

  const total = quoteTotal(quote.lines);
  const pp = perPerson(quote);
  const travellers = travellerCount(quote);
  const pdfUrl = `/api/quotes/pdf?token=${quote.publicToken}`;
  const validityLabel = quote.validity
    ? new Date(quote.validity).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="bg-sand">
      {/* Header */}
      <header className="bg-ink text-white">
        <div className="container-site flex items-center justify-between py-5">
          <Image src="/images/logo-white.png" alt="Premium Choice Travel" width={160} height={42} className="h-9 w-auto" />
          <a href={pdfUrl} className="btn-primary !px-5 !py-2.5 text-sm">Download PDF</a>
        </div>
      </header>

      {/* Cover */}
      <section className="relative bg-ink text-white">
        {quote.heroImage && (
          <>
            <Image src={quote.heroImage} alt="" fill className="object-cover opacity-40" sizes="100vw" />
          </>
        )}
        <div className="container-site relative py-16 sm:py-24">
          <p className="eyebrow !text-teal">Personal quote · {quote.ref}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">{quote.title}</h1>
          <div className="mt-8 flex flex-wrap gap-x-12 gap-y-4">
            {quote.clientName && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">Prepared for</p>
                <p className="mt-0.5 font-semibold">{quote.clientName}</p>
              </div>
            )}
            {quote.travelDates && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">Travel dates</p>
                <p className="mt-0.5 font-semibold">{quote.travelDates}</p>
              </div>
            )}
            {travellers > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">Travellers</p>
                <p className="mt-0.5 font-semibold">
                  {quote.adults ? `${quote.adults} adult${quote.adults === 1 ? '' : 's'}` : ''}
                  {quote.children ? `${quote.adults ? ' + ' : ''}${quote.children} child${quote.children === 1 ? '' : 'ren'}` : ''}
                </p>
              </div>
            )}
            {validityLabel && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal">Valid until</p>
                <p className="mt-0.5 font-semibold">{validityLabel}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container-site grid gap-10 py-12 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          {quote.notes && (
            <section className="card border-l-4 !border-l-teal p-6">
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">{quote.notes}</p>
            </section>
          )}

          {quote.itinerary.length > 0 && (
            <section className="card p-7">
              <p className="eyebrow">Day by day</p>
              <h2 className="mt-1 font-serif text-2xl text-ink">Your itinerary</h2>
              <ol className="mt-6">
                {quote.itinerary.map((day, i) => (
                  <li key={i} className="relative border-l-2 border-teal/30 pb-7 pl-6 last:pb-0">
                    <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-teal" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-deep">{day.label}</p>
                    {day.title && <h3 className="mt-1 font-semibold text-ink">{day.title}</h3>}
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{day.description}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {(quote.inclusions.length > 0 || quote.exclusions.length > 0) && (
            <section className="grid gap-6 sm:grid-cols-2">
              {quote.inclusions.length > 0 && (
                <div className="rounded-2xl border border-teal/30 bg-teal/5 p-6">
                  <h3 className="font-serif text-xl text-teal-deep">Included</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink">
                    {quote.inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 font-bold text-teal">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {quote.exclusions.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-serif text-xl text-ink">Not included</h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-ink-soft">
                    {quote.exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5">—</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}

          {quote.images.length > 0 && (
            <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {quote.images.map((src, i) => (
                <div key={i} className="relative aspect-[4/3] overflow-hidden rounded-xl">
                  <Image src={src} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
                </div>
              ))}
            </section>
          )}

          {quote.terms.length > 0 && (
            <section className="card p-7">
              <h3 className="font-serif text-xl text-ink">Terms & conditions</h3>
              <ol className="mt-4 space-y-2.5 text-xs leading-relaxed text-ink-soft">
                {quote.terms.map((t, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className="font-semibold text-teal-deep">{i + 1}.</span>
                    {t}
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        {/* Price sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card overflow-hidden">
            <div className="bg-ink p-6 text-white">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Your investment</p>
              <p className="mt-2 font-serif text-4xl text-teal">{formatMoney(quote.currency, total)}</p>
              {pp !== null && (
                <p className="mt-1 text-sm text-white/70">{formatMoney(quote.currency, pp)} per person</p>
              )}
            </div>
            <div className="divide-y divide-line">
              {quote.lines.map((l, i) => (
                <div key={i} className="flex items-start justify-between gap-4 px-6 py-3 text-sm">
                  <span className="text-ink-soft">
                    {l.description}
                    {l.qty !== 1 ? ` (× ${l.qty})` : ''}
                  </span>
                  <span className="shrink-0 font-semibold text-ink">{formatMoney(quote.currency, lineTotal(l))}</span>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t-2 border-ink p-6">
              <a href={pdfUrl} className="btn-primary w-full">Download as PDF</a>
              <a
                href={`mailto:info@premiumchoicetravel.com?subject=${encodeURIComponent(`Quote ${quote.ref} — I'd like to proceed`)}`}
                className="btn-dark w-full"
              >
                I’d like to book this
              </a>
              <p className="text-center text-xs text-ink-soft">
                Questions? Call <a href="tel:+97144206965" className="font-semibold text-teal-deep">+971 4 420 6965</a>
              </p>
            </div>
          </div>
        </aside>
      </main>

      <footer className="border-t border-line bg-white py-6">
        <p className="container-site text-center text-xs text-ink-soft">
          {quote.ref} · Premium Choice Travel JLT · Dubai, UAE · +971 4 420 6965 · info@premiumchoicetravel.com
        </p>
      </footer>
    </div>
  );
}
