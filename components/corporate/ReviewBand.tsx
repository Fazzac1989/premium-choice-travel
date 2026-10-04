import Link from 'next/link';
import { REVIEW_CTA, REVIEW_HREF } from '@/lib/corporate/content';

/** The closing call to action on every Premium Choice Corporate page. */
export default function ReviewBand({ base }: { base: string }) {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-site grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow !text-white/70">Start with a review</p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
            Find out where your travel programme is costing you time and money.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-white/75">
            We look at how travel is requested, approved, booked and paid for today, and show you
            what we would change — before you commit to anything.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-start">
          <Link href={`${base}${REVIEW_HREF}`} className="btn-primary !px-7 !py-3.5">
            {REVIEW_CTA}
          </Link>
          <a href="tel:+97144206965" className="btn !border !border-white/30 !px-7 !py-3.5 text-white hover:!border-teal hover:text-teal">
            Call +971 4 420 6965
          </a>
        </div>
      </div>
    </section>
  );
}
