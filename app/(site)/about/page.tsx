import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';
import BrandGrid from '@/components/BrandGrid';

export const metadata = {
  title: 'About us',
  description:
    'Premium Choice Travel is a Dubai-based travel company founded by Paul Farrell — the trusted name behind six specialist travel brands.',
};

const BELIEFS = [
  {
    title: 'Personal service',
    text: 'A named specialist plans your trip and stays your contact throughout — no call centres, no ticket queues.',
  },
  {
    title: 'Expert knowledge',
    text: 'We recommend what we know first-hand, from the right room category to the right season.',
  },
  {
    title: 'Honest value',
    text: 'Clear, itemised pricing with no hidden extras. What we quote is what you pay.',
  },
  {
    title: 'Trust',
    text: 'A licensed UAE travel company that answers the phone — before, during and after your trip.',
  },
];

export default function AboutPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site py-14 sm:py-16">
            <p className="eyebrow">About us</p>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-tight text-ink sm:text-5xl">
              A travel company built around people
            </h1>
          </div>
        </section>

        {/* Story */}
        <section className="py-16">
          <div className="container-site grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5 text-[15px] leading-relaxed text-ink-soft">
              <p>
                Premium Choice Travel started in Dubai with a straightforward conviction:
                booking a holiday should feel like the start of the holiday. No copy-paste
                itineraries, no disappearing after the deposit — just experienced travel
                professionals who listen first and recommend second.
              </p>
              <p>
                Today that idea has grown into a family of specialist travel brands.
                Holidays around the world, educational travel for schools, staycations
                across the Emirates, cruises, golf trips and corporate travel — each with
                its own dedicated focus, all with the same standard of personal service.
              </p>
              <p>
                We’re proudly based in Jumeirah Lakes Towers, Dubai, and licensed in the
                UAE, working with hand-picked partners in destinations around the world.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image src="/images/hero.jpg" alt="Tropical beach with palm trees" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
        </section>

        {/* Founder */}
        <section className="bg-ink py-16 text-white sm:py-20">
          <div className="container-site grid items-center gap-12 lg:grid-cols-[1fr_1.3fr]">
            <div className="relative aspect-[3/4] max-w-sm overflow-hidden rounded-3xl bg-white/5">
              <Image src="/images/hero.jpg" alt="" fill className="object-cover opacity-80" sizes="(max-width: 1024px) 100vw, 33vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
              <div className="absolute bottom-0 p-6">
                <p className="font-serif text-2xl">Paul Farrell</p>
                <p className="text-sm text-white/70">Founder & Owner</p>
              </div>
            </div>
            <div>
              <p className="eyebrow !text-teal">Our founder</p>
              <h2 className="mt-3 font-serif text-3xl leading-tight sm:text-5xl">
                Travel has always been personal.
              </h2>
              <div className="mt-6 max-w-xl space-y-4 text-[15px] leading-relaxed text-white/75">
                <p>
                  Paul Farrell founded Premium Choice Travel in Dubai to build the kind of
                  travel company he wanted to book with himself: specialists who know
                  their product, prices without games, and a person — not a portal — on
                  the other end of the phone.
                </p>
                <p>
                  That approach shaped every Premium Choice brand since. Whether it’s a
                  family’s first Maldives holiday, a school expedition or a company
                  moving a team across the world, the same person who plans it stays
                  accountable for it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Beliefs */}
        <section className="py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="What we believe" title="What you can hold us to" center />
            <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
              {BELIEFS.map((v) => (
                <div key={v.title} className="rounded-2xl border border-line p-7">
                  <h3 className="font-serif text-xl text-teal-deep">{v.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Brands */}
        <section className="bg-sand py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading
              eyebrow="Our brands"
              title="One name. Six ways to travel."
              center
            />
            <div className="mt-10">
              <BrandGrid />
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
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
