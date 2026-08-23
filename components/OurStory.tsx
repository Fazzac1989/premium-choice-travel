import Image from 'next/image';
import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import BrandGrid from '@/components/BrandGrid';

type Variant = {
  /** What travelling from the UAE means for this brand's customer. */
  uaeIntro: string;
  uaeDetail: string;
  rightChoice: string[];
  /** The message a customer might send us. */
  message: string;
  remembers: string;
  closing: { plain: string; emphasis: string };
};

const DEFAULT_VARIANT: Variant = {
  uaeIntro: 'We know that travelling from the UAE is different.',
  uaeDetail:
    'Your weekend starts differently. Your school holidays are different. Your flight options are different. Your family may be spread between several countries. You might be looking for a quick escape from Dubai, a summer holiday back in Europe, a once-in-a-lifetime journey, a golf break with friends, or somewhere completely new for the family to discover.',
  rightChoice: [
    'The right flight times.',
    'The right room for your family.',
    'The right neighbourhood.',
    'The right resort.',
    'The right experiences.',
    'And people you can actually speak to when you need help.',
  ],
  message: '“We’re thinking about Japan next Easter — where would you recommend?”',
  remembers:
    'Someone who remembers that you prefer smaller hotels, that the children need connecting rooms, that you would rather fly overnight, or that you want somewhere with a great golf course nearby.',
  closing: { plain: 'The best holidays aren’t booked.', emphasis: 'They’re carefully chosen.' },
};

const VARIANTS: Record<string, Partial<Variant>> = {
  staycations: {
    uaeIntro: 'We know that a weekend away in the UAE is its own thing.',
    uaeDetail:
      'The clock starts on a Thursday evening. The drive matters as much as the destination. School holidays land differently here, the summer asks for indoor pools and shaded beaches, and the cooler months are gone before you have booked them. Sometimes you want the children exhausted by lunchtime; sometimes you want a quiet room, a spa and nobody asking you anything for two days.',
    rightChoice: [
      'The right emirate for the weekend you want.',
      'The right room for a family of four.',
      'The right beach, pool or desert.',
      'The right board basis.',
      'The right weekend to go — and the right one to avoid.',
      'And people you can actually speak to when you need help.',
    ],
    message: '“We fancy a weekend in Ras Al Khaimah with the kids — where’s good?”',
    remembers:
      'Someone who remembers that you want a kids’ club, that you would rather be on the beach than in the city, that late checkout matters more to you than the view, or that last time the connecting rooms were on the wrong side of the resort.',
    closing: { plain: 'The best weekends aren’t booked.', emphasis: 'They’re carefully chosen.' },
  },
  golf: {
    uaeIntro: 'We know that a golf trip runs to its own rhythm.',
    uaeDetail:
      'Tee times matter more than check-in times. The group has a spread of handicaps and one very fixed idea about which courses are non-negotiable. Someone needs their clubs to arrive, someone else does not play at all, and the flight home has to be after the last round rather than during it. From the UAE it is winter golf on your doorstep and long summer evenings in Scotland or Portugal when Dubai gets hot.',
    rightChoice: [
      'The right courses for your group.',
      'The right tee times, in the right order.',
      'The right hotel — on the course or near the town.',
      'The right buggy, caddie and club-carriage arrangements.',
      'The right time of year to play.',
      'And people you can actually speak to when you need help.',
    ],
    message: '“We’re thinking about the Algarve in October — which courses should we play?”',
    remembers:
      'Someone who remembers that your group plays off the back tees, that one of you would rather be at the spa, that you like to eat where the locals do, or that last year the first tee time was far too early.',
    closing: { plain: 'The best golf trips aren’t booked.', emphasis: 'They’re carefully chosen.' },
  },
};

/**
 * The Farrell family story — one source of truth, shown on the master site
 * and on every brand website so the words never drift apart. The family
 * history stays identical; the customer-facing examples speak to the brand.
 */
export default function OurStory({
  /** Set on a brand website, e.g. "Premium Choice Golf Holidays". */
  brandName,
  contactHref,
  /** The master site closes with the six-brand grid; brand sites don't. */
  showBrandGrid = false,
  /** Brand key — swaps the customer-facing examples for that brand's. */
  variant,
}: {
  brandName?: string;
  contactHref: string;
  showBrandGrid?: boolean;
  variant?: string;
}) {
  const copy: Variant = { ...DEFAULT_VARIANT, ...(variant ? VARIANTS[variant] ?? {} : {}) };
  return (
    <>
      <section className="border-b border-line bg-sand">
        <div className="container-site py-14 sm:py-16">
          <p className="eyebrow">{brandName ? `${brandName} · Our story` : 'Our story'}</p>
          <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
            Travel has always been a family affair.
          </h1>
          {brandName && (
            <p className="mt-4 max-w-2xl text-ink-soft">
              {brandName} is part of Premium Choice Travel — a family-owned travel company
              in Dubai.
            </p>
          )}
        </div>
      </section>

      {/* The family */}
      <section className="py-16">
        <div className="container-site grid items-start gap-12 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5 text-[15px] leading-relaxed text-ink-soft">
            <p>
              Premium Choice Travel is a family-owned travel company built on something
              increasingly rare in our industry:{' '}
              <strong className="font-semibold text-ink">
                real experience, personal relationships and genuine care for the people
                who travel with us.
              </strong>
            </p>
            <p>
              At the heart of the business is{' '}
              <strong className="font-semibold text-ink">Paul Farrell</strong>, whose
              career in travel stretches back four decades. Long before online booking
              engines, algorithms and endless comparison websites became the norm, Paul
              was building holidays through knowledge, relationships and personal
              service. Over the years, he has travelled extensively, worked across the
              industry and helped generations of customers discover the world.
            </p>
            <p className="font-serif text-xl leading-relaxed text-ink">
              That experience has become part of the Farrell family story.
            </p>
            <p>
              Paul’s wife has also spent the beginning of her career within the travel
              industry before spending the last 24 years within a well known school in
              Dubai, giving the family a shared understanding of what makes a great
              holiday — and, just as importantly, what can go wrong when the details are
              overlooked.
            </p>
            <p>
              Their son has followed the same path, building his own career in travel
              and tourism in the UAE and continuing a family connection with the
              industry that now spans generations.
            </p>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-sand">
            <Image
              src="/images/paul-farrell-golf.jpg"
              alt="Paul Farrell, founder of Premium Choice Travel"
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 40vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 p-6">
              <p className="font-serif text-2xl text-white">Paul Farrell</p>
              <p className="text-sm text-white/75">Founder, Premium Choice Travel</p>
            </div>
          </div>
        </div>
      </section>

      {/* British roots, Dubai home */}
      <section className="bg-ink py-16 text-white sm:py-20">
        <div className="container-site max-w-4xl">
          <p className="eyebrow !text-teal">Where we come from</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">
            British roots. Dubai home. A world of experience.
          </h2>
          <div className="mt-7 space-y-5 text-[15px] leading-relaxed text-white/75">
            <p>
              The Farrell family has a longstanding connection with Dubai and the UAE,
              while retaining the British roots that continue to shape the way we
              approach our customers.
            </p>
            <p className="font-serif text-xl leading-relaxed text-white">
              We understand expat life because we have lived it ourselves.
            </p>
            <p>
              <span className="text-white">{copy.uaeIntro}</span> {copy.uaeDetail}
            </p>
            <p className="text-white">That local understanding matters.</p>
            <p>
              Rather than simply showing you thousands of hotels and leaving you to work
              everything out yourself,{' '}
              <strong className="font-semibold text-teal">
                we help you make the right choice.
              </strong>
            </p>
          </div>
        </div>
      </section>

      {/* Why Premium Choice */}
      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <p className="eyebrow">Our name</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              That’s why we’re called Premium Choice.
            </h2>
            <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-soft">
              <p>
                For us, “Premium” does not necessarily mean the most expensive hotel, a
                first-class ticket or five-star luxury.
              </p>
              <p className="font-serif text-2xl text-teal-deep">It means a better choice.</p>
            </div>
          </div>
          <div>
            <ul className="space-y-3">
              {copy.rightChoice.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-3 rounded-xl bg-sand px-5 py-4 text-[15px] font-semibold text-ink"
                >
                  <span className="mt-0.5 text-teal">✦</span>
                  {line}
                </li>
              ))}
            </ul>
            <div className="mt-7 space-y-4 text-[15px] leading-relaxed text-ink-soft">
              <p>
                We combine decades of traditional travel experience with modern
                technology, carefully selected partners and a growing collection of
                journeys around the world.
              </p>
              <p>
                But technology will never replace the most important part of our
                business:{' '}
                <strong className="font-semibold text-ink">knowing our customers.</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* From our family to yours */}
      <section className="bg-sand py-16 sm:py-20">
        <div className="container-site max-w-3xl text-center">
          <p className="eyebrow">From our family to yours</p>
          <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-ink-soft">
            <p>
              We want Premium Choice Travel to feel like having someone in the travel
              industry you know and trust.
            </p>
            <p>Someone you can message and say:</p>
            <p className="font-serif text-xl italic leading-relaxed text-ink">
              {copy.message}
            </p>
            <p>{copy.remembers}</p>
            <p>Someone who is there before, during and after your holiday.</p>
            <p>Because after a lifetime in travel, one thing has never changed:</p>
          </div>
          <p className="mx-auto mt-8 max-w-xl font-serif text-3xl leading-snug text-ink sm:text-4xl">
            {copy.closing.plain}{' '}
            <em className="not-italic text-teal-deep">{copy.closing.emphasis}</em>
          </p>
          <p className="mt-8 font-semibold text-ink">Premium Choice Travel</p>
          <p className="mt-1 text-sm italic text-ink-soft">
            Family-owned. Dubai-based. Travelling the world for generations.
          </p>
        </div>
      </section>

      {showBrandGrid ? (
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="Our brands" title="One name. Six ways to travel." center />
            <div className="mt-10">
              <BrandGrid />
            </div>
          </div>
        </section>
      ) : (
        <section className="py-16 sm:py-20">
          <div className="container-site max-w-3xl text-center">
            <p className="eyebrow">Part of the family</p>
            <h2 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
              One trusted travel company. Six specialist ways to travel.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-ink-soft">
              Holidays, school travel, staycations, cruises, golf and corporate travel —
              each with its own specialists, all with the same family behind them.
            </p>
            <a
              href="https://premiumchoicetravel.com"
              target="_blank"
              rel="noopener"
              className="btn-outline mt-7"
            >
              Visit Premium Choice Travel ↗
            </a>
          </div>
        </section>
      )}

      <section className="bg-sand py-16 text-center">
        <div className="container-site">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">Come say hello</h2>
          <p className="mx-auto mt-4 max-w-md text-ink-soft">
            Jumeirah Lakes Towers, Dubai · Monday to Friday, 9.00am–7.30pm
          </p>
          <Link href={contactHref} className="btn-primary mt-7">Talk to our team</Link>
        </div>
      </section>
    </>
  );
}
