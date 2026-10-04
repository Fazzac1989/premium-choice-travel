import Image from 'next/image';
import Link from 'next/link';
import SectionHeading from '@/components/SectionHeading';
import ReviewBand from '@/components/corporate/ReviewBand';
import { REVIEW_CTA, REVIEW_HREF } from '@/lib/corporate/content';

const PROBLEMS = [
  'Trip requests arriving by email, WhatsApp and phone, with nobody sure which is current',
  'No clear view of what travel is committed until the invoices arrive',
  'Invoices and receipts still missing when the month is closed',
  'Refunds and airline credits nobody is tracking, quietly expiring',
  'Managers and assistants losing hours to chasing, rebooking and explaining',
];

const STEPS = [
  {
    title: 'Plan & approve',
    text: 'Requests come to one team. You see suitable options and the full cost, and the right person approves that exact quote.',
  },
  {
    title: 'Book & support',
    text: 'We book to your policy and stay with the trip — a named team in office hours, our 24/7 partner outside them.',
  },
  {
    title: 'Track & reconcile',
    text: 'Every cost is coded to your entity, department and project, and matched to invoices, payments, refunds and credits.',
  },
  {
    title: 'Review & improve',
    text: 'A monthly pack and a short review with your account manager — a few practical changes, each with an owner.',
  },
];

const ROLES = [
  {
    who: 'For travel organisers',
    title: 'One place to send every request',
    points: [
      'Book or request for anyone on your team',
      'Profiles and preferences remembered',
      'Approval status without chasing',
      'Group and project movements handled',
    ],
  },
  {
    who: 'For finance & procurement',
    title: 'Control before the money is spent',
    points: [
      'Approvals tied to the actual quote',
      'Costs coded by entity, department and project',
      'Refunds and airline credits on a register',
      'A monthly spend and reconciliation pack',
    ],
  },
  {
    who: 'For travellers',
    title: 'Someone to call when plans change',
    points: [
      'Confirmed itinerary and documents in one place',
      'A named team who knows their trips',
      'Round-the-clock help through our 24/7 partner',
      'Changes handled without starting again',
    ],
  },
];

const RESPONSIBILITIES = [
  ['One trip reference', 'From the first request to the final invoice, every message, approval and cost sits against one trip.'],
  ['Your approval rules', 'Trips are approved by the people you choose, at the limits you set, before anything is booked.'],
  ['A refund and credit register', 'Every refund claim and unused airline credit, with its value, status and expiry date.'],
  ['A named account manager', 'One accountable person who knows your travellers, your policy and your finance team.'],
  ['A monthly finance pack', 'Bookings matched to invoices and credits, costs by department and project, and open items with owners.'],
  ['Support around the clock', 'Our team in office hours and a contracted 24/7 partner for evenings, weekends and holidays.'],
];

const SPECIALIST = [
  {
    title: 'Meetings & events',
    text: 'Venues, delegate travel and accommodation, run with their own budget and deposit schedule.',
    href: '/meetings-and-groups',
  },
  {
    title: 'Incentive travel',
    text: 'Reward trips designed around the people being rewarded, and reconciled like any other project.',
    href: '/meetings-and-groups',
  },
  {
    title: 'Project travel',
    text: 'Teams moving to and from site, long stays and rotations — each cost coded to the project and client.',
    href: '/business-travel',
  },
];

export default function CorporateHome({ base, heroImage }: { base: string; heroImage: string }) {
  return (
    <>
      {/* 1 · The promise */}
      <section className="relative flex min-h-[88svh] items-center">
        <Image src={heroImage} alt="" fill priority className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/45 to-ink/80" />
        <div className="container-site relative pb-16 pt-28 text-white">
          <p className="eyebrow !text-white/70">Premium Choice Corporate · Dubai</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[1.05] sm:text-6xl">
            Your outsourced travel department.
          </h1>
          <p className="mt-5 max-w-2xl font-serif text-xl leading-snug text-white/90 sm:text-2xl">
            Personal support for your travellers. Clear control for your business.
          </p>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-white/80 sm:text-base">
            We bring travel planning, booking and support together with the controls your business
            needs. One accountable team runs your programme, while your finance and operations teams
            get a clear view of approvals, costs and anything still outstanding.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href={`${base}${REVIEW_HREF}`} className="btn-primary !px-6 !py-3">
              {REVIEW_CTA}
            </Link>
            <Link
              href={`${base}/how-we-work`}
              className="btn !border !border-white/40 !px-6 !py-3 text-white hover:!border-teal hover:text-teal"
            >
              How we work
            </Link>
          </div>
          {/* Someone already travelling with us is not a sales lead. */}
          <p className="mt-8 text-sm text-white/75">
            Travelling with us now?{' '}
            <Link href={`${base}/travel-support`} className="font-semibold text-white underline-offset-4 hover:text-teal hover:underline">
              Get traveller support →
            </Link>
          </p>
        </div>
      </section>

      {/* 2 · The problems */}
      <section className="py-16 sm:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-16">
          <SectionHeading
            eyebrow="Sound familiar?"
            title="Business travel rarely goes wrong at the booking. It goes wrong around it."
          />
          <ul className="grid content-start gap-3">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex gap-3 rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] leading-relaxed text-ink">
                <span className="mt-[2px] text-teal-deep" aria-hidden="true">✦</span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3 · The service in four steps */}
      <section className="bg-sand py-16 sm:py-20">
        <div className="container-site">
          <SectionHeading
            eyebrow="The service"
            title="We manage how your people travel — and how your business pays for it."
          />
          <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-line bg-white p-6">
                <p className="font-serif text-3xl text-teal-deep">{String(i + 1).padStart(2, '0')}</p>
                <h3 className="mt-3 font-serif text-xl text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </li>
            ))}
          </ol>
          <Link href={`${base}/how-we-work`} className="mt-8 inline-block text-sm font-bold text-teal-deep hover:underline">
            See every step →
          </Link>
        </div>
      </section>

      {/* 4 · By role */}
      <section className="py-16 sm:py-20">
        <div className="container-site">
          <SectionHeading eyebrow="Who it’s for" title="One service, three very different jobs done well." />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {ROLES.map((r) => (
              <div key={r.who} className="rounded-2xl border border-line bg-white p-7">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-deep">{r.who}</p>
                <h3 className="mt-2 font-serif text-2xl leading-snug text-ink">{r.title}</h3>
                <ul className="mt-5 grid gap-2.5">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-3 text-sm leading-relaxed text-ink-soft">
                      <span className="mt-[1px] text-teal-deep" aria-hidden="true">✓</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 · What we are accountable for */}
      <section className="bg-ink py-16 text-white sm:py-20">
        <div className="container-site">
          <p className="eyebrow !text-white/70">What you can hold us to</p>
          <h2 className="mt-3 max-w-2xl font-serif text-3xl leading-tight sm:text-4xl">
            Not a portal and a phone number. A team with clear responsibilities.
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {RESPONSIBILITIES.map(([title, text]) => (
              <div key={title} className="border-t border-white/15 pt-5">
                <h3 className="font-serif text-xl">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/70">{text}</p>
              </div>
            ))}
          </div>
          <Link href={`${base}/spend-and-reporting`} className="mt-10 inline-block text-sm font-bold text-white underline-offset-4 hover:underline">
            How spend control works →
          </Link>
        </div>
      </section>

      {/* 7 · Specialist services */}
      <section className="py-16 sm:py-20">
        <div className="container-site">
          <SectionHeading eyebrow="Alongside your programme" title="Meetings, incentives and project travel" />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {SPECIALIST.map((s) => (
              <Link
                key={s.title}
                href={`${base}${s.href}`}
                className="group rounded-2xl border border-line bg-sand p-7 transition-colors hover:border-teal-deep"
              >
                <h3 className="font-serif text-2xl text-ink group-hover:text-teal-deep">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{s.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8 · Getting started */}
      <section className="border-t border-line bg-sand py-16 sm:py-20">
        <div className="container-site grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <SectionHeading
            eyebrow="Getting started"
            title="Four steps, and nothing changes until you’ve seen the plan."
          />
          <ol className="grid gap-4">
            {[
              ['Travel programme review', 'How travel is requested, approved, booked and paid for today — and where time and money are lost.'],
              ['Proposal', 'The service, scope and terms in writing, matched to how your business travels.'],
              ['Set-up', 'Your travel policy, traveller profiles, approvers and cost codes, agreed with you.'],
              ['Live travel and review', 'A first period of real trips, then an honest look at what worked and what to change.'],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-5 rounded-2xl border border-line bg-white p-5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-deep text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-serif text-lg text-ink">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ReviewBand base={base} />
    </>
  );
}
