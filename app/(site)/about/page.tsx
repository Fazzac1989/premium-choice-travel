import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';

export const metadata = { title: 'About us' };

const VALUES = [
  {
    title: 'Specialists, not sellers',
    text: 'Our consultants travel the destinations they sell. You get first-hand advice on rooms, seasons and the details brochures skip.',
  },
  {
    title: 'Transparent pricing',
    text: 'Clear, itemised quotes with no hidden extras. What we quote is what you pay — and it’s valid until the date on the page.',
  },
  {
    title: 'With you throughout',
    text: 'A 24/7 support line while you travel. Flight delayed, plans changed? One WhatsApp and it’s handled.',
  },
  {
    title: 'UAE-licensed & local',
    text: 'A fully licensed Dubai agency in Jumeirah Lakes Towers — drop in for a coffee and plan face to face.',
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
              A Dubai travel agency that still believes in personal service
            </h1>
          </div>
        </section>

        <section className="py-16">
          <div className="container-site grid items-center gap-12 lg:grid-cols-2">
            <div className="space-y-5 text-[15px] leading-relaxed text-ink-soft">
              <p>
                Premium Choice Travel was founded in Dubai with a simple conviction: booking a
                holiday should feel like the start of the holiday. No call centres, no copy-paste
                itineraries — just experienced consultants who listen first and recommend second.
              </p>
              <p>
                Today we craft everything from Maldives honeymoons and Georgia road trips to
                round-Japan adventures, Gulf cruises and last-minute UAE staycations. Behind every
                trip sits the same process: understand the traveller, design the trip, price it
                transparently, and stay reachable until the flight home lands.
              </p>
              <p>
                We’re proudly UAE-based and UAE-licensed, working with hand-picked partners in
                over forty countries — many of whom we’ve known for a decade or more.
              </p>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image src="/images/hero.jpg" alt="Tropical beach with palm trees" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
          </div>
        </section>

        <section className="bg-ink py-16 text-white sm:py-20">
          <div className="container-site">
            <SectionHeading eyebrow="How we work" title="What you can hold us to" light />
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              {VALUES.map((v) => (
                <div key={v.title} className="rounded-2xl border border-white/10 bg-white/5 p-7">
                  <h3 className="font-serif text-xl text-teal">{v.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-white/80">{v.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 text-center">
          <div className="container-site">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">Come say hello</h2>
            <p className="mx-auto mt-4 max-w-md text-ink-soft">
              Jumeirah Lakes Towers, Dubai · Sunday to Thursday, 9am–6pm
            </p>
            <Link href="/contact" className="btn-primary mt-7">Get in touch</Link>
          </div>
        </section>
      </main>
    </>
  );
}
