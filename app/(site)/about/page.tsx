import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';
import BrandGrid from '@/components/BrandGrid';

export const metadata = {
  title: 'Our story',
  description:
    'Premium Choice Travel is a family-owned, Dubai-based travel company built on four decades of experience, British roots and a genuine understanding of life in the UAE.',
};

/** The "right choice" list — the heart of the Premium Choice name. */
const RIGHT_CHOICE = [
  'The right flight times.',
  'The right room for your family.',
  'The right neighbourhood.',
  'The right resort.',
  'The right experiences.',
  'And people you can actually speak to when you need help.',
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">Our story</p>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              Travel has always been a family affair.
            </h1>
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
                src="/images/paul-farrell.jpg"
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
                We understand the lives of British expatriates because we have lived them
                ourselves.
              </p>
              <p>
                We know that travelling from the UAE is different. Your weekend starts
                differently. Your school holidays are different. Your flight options are
                different. Your family may be spread between several countries. You might
                be looking for a quick escape from Dubai, a summer holiday back in Europe,
                a once-in-a-lifetime journey, a golf break with friends, or somewhere
                completely new for the family to discover.
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
                {RIGHT_CHOICE.map((line) => (
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
                “We’re thinking about Japan next Easter — where would you recommend?”
              </p>
              <p>
                Someone who remembers that you prefer smaller hotels, that the children
                need connecting rooms, that you would rather fly overnight, or that you
                want somewhere with a great golf course nearby.
              </p>
              <p>Someone who is there before, during and after your holiday.</p>
              <p>Because after a lifetime in travel, one thing has never changed:</p>
            </div>
            <p className="mx-auto mt-8 max-w-xl font-serif text-3xl leading-snug text-ink sm:text-4xl">
              The best holidays aren’t booked.{' '}
              <em className="not-italic text-teal-deep">They’re carefully chosen.</em>
            </p>
            <p className="mt-8 font-semibold text-ink">Premium Choice Travel</p>
            <p className="mt-1 text-sm italic text-ink-soft">
              Family-owned. Dubai-based. Travelling the world for generations.
            </p>
          </div>
        </section>

        {/* Brands */}
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="Our brands" title="One name. Six ways to travel." center />
            <div className="mt-10">
              <BrandGrid />
            </div>
          </div>
        </section>

        <section className="bg-sand py-16 text-center">
          <div className="container-site">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">Come say hello</h2>
            <p className="mx-auto mt-4 max-w-md text-ink-soft">
              Jumeirah Lakes Towers, Dubai · Monday to Friday, 9.00am–7.30pm
            </p>
            <Link href="/contact" className="btn-primary mt-7">Talk to our team</Link>
          </div>
        </section>
      </main>
    </>
  );
}
