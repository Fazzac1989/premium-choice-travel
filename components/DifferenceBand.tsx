import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';

/**
 * "The Premium Choice difference" band — shared between the master homepage
 * and every brand website so the family speaks with one voice.
 */
const DIFFERENCE = [
  {
    title: 'Personal',
    text: 'Real people who take the time to understand how you want to travel — and answer when you call.',
  },
  {
    title: 'Experienced',
    text: 'Travel knowledge built through years in the industry, from Gulf staycations to round-the-world itineraries.',
  },
  {
    title: 'Specialist',
    text: 'Six dedicated travel brands, each built around a different way to travel — never one-size-fits-all.',
  },
  {
    title: 'Connected',
    text: 'A Dubai base with hand-picked partners in destinations around the world.',
  },
  {
    title: 'Here when you need us',
    text: 'Personal assistance before, during and after your booking — especially when plans change.',
  },
];

export default function DifferenceBand({ planHref = '/plan' }: { planHref?: string }) {
  return (
    <section className="bg-ink py-16 text-white sm:py-20">
      <div className="container-site">
        <SectionHeading
          eyebrow="The Premium Choice difference"
          title="Why travellers stay with us"
          light
          center
        />
        <div className="mx-auto mt-12 grid max-w-5xl gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFERENCE.map((d) => (
            <div key={d.title} className="border-t-2 border-teal pt-5">
              <h3 className="font-serif text-xl text-white">{d.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">{d.text}</p>
            </div>
          ))}
          <div className="border-t-2 border-teal pt-5">
            <h3 className="font-serif text-xl text-teal">Talk to a travel expert</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/70">
              Not sure where to start? Tell us what kind of experience you’re after and
              we’ll shape it with you.
            </p>
            <Link href={planHref} className="mt-3 inline-block text-sm font-bold text-teal hover:underline">
              Start planning →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
