import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProgrammeReviewForm from '@/components/corporate/ProgrammeReviewForm';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Book a travel programme review',
  description:
    'Tell us how your business travels today. We’ll show you where time and money are being lost, and how we would run your travel programme.',
};

const OUTCOMES = [
  ['How travel works today', 'A simple map of how trips are requested, approved, booked, paid for and reconciled.'],
  ['Where the work goes', 'The admin, chasing and missing paperwork that sits around each trip.'],
  ['What could be recovered', 'Refunds and airline credits worth pursuing — identified, never counted until received.'],
  ['What we would do', 'A proposed service and scope, matched to how your business travels.'],
];

/** The Corporate sales enquiry. Someone already travelling is sent to support instead. */
export default function ProgrammeReviewPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.key !== 'corporate') notFound();
  const base = brandBase(brand);

  return (
    <main className="bg-sand">
      <div className="container-site grid gap-12 py-14 sm:py-16 lg:grid-cols-[1fr_1.15fr]">
        <div>
          <p className="eyebrow">Travel programme review</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Let’s look at how your business travels.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            Tell us a little about your company. We’ll arrange a conversation, look at a sample of
            recent travel with your permission, and show you what we find.
          </p>
          <ul className="mt-8 grid gap-5">
            {OUTCOMES.map(([title, text]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-[3px] text-teal-deep" aria-hidden="true">✦</span>
                <div>
                  <p className="font-semibold text-ink">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-8 rounded-xl border border-line bg-white p-4 text-sm text-ink-soft">
            Travelling with us now and need help?{' '}
            <Link href={`${base}/travel-support`} className="font-semibold text-teal-deep hover:underline">
              Go to traveller support →
            </Link>
          </p>
        </div>
        <div className="card p-6 sm:p-8">
          <ProgrammeReviewForm />
        </div>
      </div>
    </main>
  );
}
