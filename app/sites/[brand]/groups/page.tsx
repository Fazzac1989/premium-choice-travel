import Link from 'next/link';
import { notFound } from 'next/navigation';
import EnquiryForm from '@/components/EnquiryForm';
import GolfCard from '@/components/golf/GolfCard';
import WhatsAppLink from '@/components/WhatsAppLink';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getPackagesByBrand } from '@/lib/data';
import { suitsGroups } from '@/lib/golf/catalogue';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Golf groups and societies',
  description:
    'Golf trips for societies, fourballs and corporate groups from the UAE: one per-person quote, rooming worked out and tee times requested together.',
};

/**
 * The organiser's path. It says only what the team does on every group quote
 * — no hosting, prizes or discounts are promised until they are contracted.
 */
const STEPS = [
  ['Tell us the group', 'Dates, how many golfers and non-golfers, how you want to share rooms, and the kind of golf you are after.'],
  ['We cost it properly', 'Hotel, rounds, transfers and flights from your airport, priced per person on the occupancy you gave us — non-golfers priced separately.'],
  ['Tee times together', 'We ask each club for tee times that run one after another, and tell you what the club has confirmed before anyone pays.'],
  ['One quote to share', 'A single quote the organiser can forward to the group, with what is and is not included spelled out.'],
];

export default async function GolfGroupsPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'golf') notFound();
  const base = brandBase(brand);
  const trips = (await getPackagesByBrand('golf')).filter(suitsGroups).slice(0, 6);

  return (
    <main>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-12 sm:py-14">
          <p className="eyebrow">Groups and societies</p>
          <h1 className="mt-2 max-w-2xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Golf trips for societies, fourballs and teams
          </h1>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Organising golf for eight or more is mostly admin: rooms, tee times, who pays what. Send us the brief and
            we come back with one quote the whole group can read.
          </p>
        </div>
      </section>

      <section className="py-12 sm:py-14">
        <div className="container-site grid gap-12 lg:grid-cols-[1fr_420px]">
          <div>
            <h2 className="font-serif text-3xl text-ink">How a group quote works</h2>
            <ol className="mt-6 grid gap-4 sm:grid-cols-2">
              {STEPS.map(([title, body], i) => (
                <li key={title} className="rounded-2xl border border-line p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-deep">Step {i + 1}</p>
                  <h3 className="mt-1 font-semibold text-ink">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
                </li>
              ))}
            </ol>

            {trips.length > 0 && (
              <>
                <div className="mt-14 flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-3xl text-ink">Trips that suit groups</h2>
                  <Link href={`${base}/journeys?group=1`} className="shrink-0 text-sm font-semibold text-teal-deep hover:underline">
                    See all →
                  </Link>
                </div>
                <div className="mt-6 grid gap-6 sm:grid-cols-2">
                  {trips.map((pkg) => (
                    <GolfCard key={pkg.slug} pkg={pkg} href={`${base}/journeys/${pkg.slug}`} />
                  ))}
                </div>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-7">
              <h2 className="font-serif text-2xl text-ink">Send the group brief</h2>
              <p className="mb-5 mt-1.5 text-sm text-ink-soft">Rough numbers are fine — we refine them with you.</p>
              <EnquiryForm brand="golf" packageTitle={`${brand.name} — group enquiry`} groups compact />
              <WhatsAppLink className="mt-3" text="Hello, I'm organising a golf group trip. Group size and dates: " />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
