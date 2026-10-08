import Link from 'next/link';
import { notFound } from 'next/navigation';
import HolidaySearchPanel from '@/components/holidays/HolidaySearchPanel';
import { availableModes } from '@/lib/holidays/modes';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getDestinations } from '@/lib/data';
import { DEPOSIT_SCHEDULE } from '@/lib/holidays/deposit';

export const metadata = {
  title: 'Deposits',
  description: 'Book a holiday from a 5% deposit when you book six months ahead.',
};

/**
 * What you pay today.
 *
 * The schedule is the single source in lib/holidays/deposit, the same one the
 * search uses to put a figure on a result card — so this page and that badge
 * can never drift apart and quote a customer two different things.
 */
export default async function DepositsPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const base = brandBase(brand);
  const destinations = await getDestinations();

  return (
    <>
      <section className="bg-cloud">
        <div className="container-site py-12 sm:py-16">
          <p className="eyebrow">Premium Choice Holidays</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-[-0.02em] text-slate sm:text-5xl">
            Book from a 5% deposit
          </h1>
          <p className="mt-3 max-w-2xl text-[17px] text-slate-soft">
            How much you pay today depends on how far ahead you are booking. Search a holiday and
            we will show you your own figure on every result, rather than leaving you to work it
            out.
          </p>
        </div>
      </section>

      <section className="container-site py-12">
        <ol className="grid gap-4 sm:grid-cols-3">
          {DEPOSIT_SCHEDULE.map((row, i) => (
            <li key={row.when} className="rounded-2xl border border-cloud-line bg-white p-6">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-soft">
                {['Furthest ahead', 'In between', 'Closest in'][i]}
              </span>
              <p className="mt-2 text-2xl font-extrabold text-flame">{row.pay}</p>
              <p className="mt-1 text-sm text-slate-soft">{row.when}</p>
            </li>
          ))}
        </ol>

        <div className="mt-8 max-w-2xl text-[15px] leading-relaxed text-slate-soft">
          <h2 className="text-xl font-extrabold text-slate">The rest of it</h2>
          <p className="mt-2">
            The balance is due before you travel, and a specialist will tell you the date when they
            confirm your holiday. Deposits are counted by calendar month from the day you fly, so a
            holiday departing six months from today qualifies for 5%, and one departing the day
            before that is 10%.
          </p>
          <p className="mt-3">
            Holidays departing within three months are paid in full at the time of booking. Nothing
            is taken until a specialist has confirmed what is available and you have agreed the
            price.
          </p>
        </div>
      </section>

      <section className="border-y border-cloud-line bg-white">
        <div className="container-site py-6">
          <p className="mb-3 text-sm font-bold text-slate">See your deposit on a real holiday</p>
          <HolidaySearchPanel
            suggestions={destinations.map((d) => ({ name: d.name, region: d.region }))}
            action={`${base}/search`}
            modes={availableModes()}
            compact
          />
        </div>
      </section>

      <section className="container-site py-12">
        <Link
          href={`${base}/holidays`}
          className="text-sm font-bold text-flame underline-offset-4 hover:underline"
        >
          Browse holidays &rarr;
        </Link>
      </section>
    </>
  );
}
