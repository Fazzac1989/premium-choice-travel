import Image from 'next/image';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SectionHeading from '@/components/SectionHeading';

export const metadata = {
  title: 'AI Inspiration',
  description:
    'Meet the Premium Choice AI Holiday Curator: answer a few questions, get three genuinely different trip ideas, then a human specialist prices the one you love.',
};

/** Faux browser chrome around a live mock of the real curator UI. */
function Screenshot({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <figure className="overflow-hidden rounded-2xl border border-line bg-white shadow-xl shadow-ink/10">
      <div className="flex items-center gap-2 border-b border-line bg-sand px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-danger/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal/40" />
        <span className="h-2.5 w-2.5 rounded-full bg-teal" />
        <span className="ml-3 truncate rounded-md bg-white px-3 py-1 text-[10px] text-ink-soft">
          premiumchoicetravel.com/inspiration
        </span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
      <figcaption className="border-t border-line bg-sand/60 px-5 py-2.5 text-xs text-ink-soft">{label}</figcaption>
    </figure>
  );
}

function Chip({ active = false, children }: { active?: boolean; children: React.ReactNode }) {
  return (
    <span
      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${
        active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink'
      }`}
    >
      {children}
    </span>
  );
}

const BRAND_USES = [
  ['Holidays', '“Somewhere warm in the Eid break, two kids, mid-range” → three tailor-made holiday shapes, from Thailand family resorts to a Sri Lanka mini-tour.'],
  ['Staycations', '“One night, this weekend, somewhere quiet” → desert camps, RAK beach resorts or a Saadiyat reset — matched to your budget band.'],
  ['Cruises', '“First cruise, no flights please” → Gulf sailings from Dubai’s doorstep, sized against fly-cruise alternatives for later.'],
  ['Golf Holidays', '“Four golfers, January, guaranteed tee times” → links, winter-sun and all-inclusive golf concepts with non-golfer options flagged.'],
  ['Corporate', '“Offsite for 20, three nights, wow-factor” → incentive-style concepts your account manager then builds properly.'],
  ['School Trips', 'Teachers use the dedicated School Trips platform — but tell the curator you’re planning for a school and it hands you straight to that team.'],
];

export default function AiInspirationPage() {
  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        {/* Hero */}
        <section className="border-b border-line bg-sand">
          <div className="container-site grid items-center gap-10 py-14 sm:py-16 lg:grid-cols-2">
            <div>
              <p className="eyebrow">AI Inspiration</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
                Don’t know where to go?{' '}
                <span className="text-teal-deep">That’s the fun part.</span>
              </h1>
              <p className="mt-5 max-w-lg text-ink-soft">
                Our AI Holiday Curator turns a vague wish — “somewhere warm, two kids,
                ten days, surprise us” — into three genuinely different trip ideas in
                under a minute. Then a human Premium Choice specialist takes over to
                make one of them real.
              </p>
              <div className="mt-7 flex flex-wrap gap-4">
                <Link href="/inspiration" className="btn-primary !px-8 !py-4">
                  ✨ Try it now — it’s free
                </Link>
                <a href="#how" className="btn-outline !bg-white !px-8 !py-4">How it works</a>
              </div>
            </div>
            {/* Hero mock: the question screen */}
            <Screenshot label="Step 1 — tell it how you like to travel">
              <p className="font-serif text-xl text-ink">What kind of trip are you dreaming about?</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Chip active>Beach</Chip>
                <Chip>Family</Chip>
                <Chip>Adventure</Chip>
                <Chip>Culture</Chip>
                <Chip>Safari</Chip>
                <Chip>Golf</Chip>
                <Chip>Cruise</Chip>
                <Chip>Surprise me</Chip>
              </div>
              <p className="field-label mt-5 !mb-2">Departing from</p>
              <div className="flex flex-wrap gap-2">
                <Chip active>Dubai</Chip>
                <Chip>Abu Dhabi</Chip>
                <Chip>Sharjah</Chip>
              </div>
              <div className="mt-5 text-right">
                <span className="btn-primary !px-6 !py-2 text-xs">Continue</span>
              </div>
            </Screenshot>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="py-16 sm:py-20">
          <div className="container-site">
            <SectionHeading
              eyebrow="How it works"
              title="Three steps. One minute. Zero pressure."
              center
            />
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              <div>
                <p className="font-serif text-5xl text-teal/40">1</p>
                <h3 className="mt-2 font-serif text-xl text-ink">Answer a few questions</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Trip type, dates or school holidays, who’s travelling, rough budget in
                  AED, what matters most — kids’ clubs, food, privacy, golf. Tap answers,
                  no typing needed.
                </p>
              </div>
              <div>
                <p className="font-serif text-5xl text-teal/40">2</p>
                <h3 className="mt-2 font-serif text-xl text-ink">Get three real ideas</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Not three versions of the same hotel — three genuinely different shapes
                  of trip, each with a route, signature experiences, the right season and
                  an honest read on your budget. Don’t like them? One tap regenerates.
                </p>
              </div>
              <div>
                <p className="font-serif text-5xl text-teal/40">3</p>
                <h3 className="mt-2 font-serif text-xl text-ink">A human takes over</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  Pick your favourite and it lands with a Premium Choice specialist as a
                  structured brief. They confirm availability, check entry requirements
                  and price it properly — usually within one working day.
                </p>
              </div>
            </div>

            {/* Screenshot pair */}
            <div className="mt-14 grid gap-8 lg:grid-cols-2">
              <Screenshot label="Step 2 — three genuinely different concepts, with honest budget guidance">
                <div className="rounded-xl border border-line p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-1">
                    <p className="font-serif text-lg text-ink">Sri Lanka Tea, Trains & Beach</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-deep">8 nights · Sri Lanka</span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-ink-soft">Colombo → hill country → Yala → south coast</p>
                  <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                    Fits your “culture plus beach” brief: the famous blue train through the
                    tea, a leopard safari the kids will never forget, then four slow days on
                    the south coast…
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {['Ella train ride', 'Leopard safari', 'Tea estate lunch', 'Galle Fort'].map((e) => (
                      <span key={e} className="rounded-full bg-teal/10 px-2.5 py-0.5 text-[10px] font-semibold text-teal-deep">{e}</span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[11px] text-ink-soft"><strong>Budget:</strong> Comfortably within your range</p>
                  <span className="btn-primary mt-3 inline-block !px-4 !py-1.5 text-[11px]">I like this — send to an expert</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-ink-soft">+ 2 more ideas below</span>
                  <span className="rounded-full border border-line px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                    Show me something completely different
                  </span>
                </div>
              </Screenshot>

              <Screenshot label="Step 3 — your idea becomes a specialist’s to-do list">
                <div className="rounded-xl border border-teal/40 bg-teal/5 p-5 text-center">
                  <p className="font-serif text-2xl text-teal-deep">Thanks. Leave the planning to us.</p>
                  <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-ink-soft">
                    A specialist will come back within one working day with real
                    availability and pricing — by WhatsApp, phone or email, your choice.
                  </p>
                </div>
                <div className="mt-4 rounded-xl bg-sand p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">What the specialist receives</p>
                  <ul className="mt-2 space-y-1 text-xs text-ink-soft">
                    <li>✓ Everything you told the curator</li>
                    <li>✓ The three ideas shown, and the one you chose</li>
                    <li>✓ A recommended starting itinerary to price</li>
                  </ul>
                </div>
              </Screenshot>
            </div>
          </div>
        </section>

        {/* Every brand */}
        <section className="bg-ink py-16 text-white sm:py-20">
          <div className="container-site">
            <SectionHeading
              eyebrow="One curator, every brand"
              title="It knows the whole Premium Choice family"
              text="Whatever you ask for, the curator draws on everything we sell — and routes you to the right specialist team."
              light
              center
            />
            <div className="mx-auto mt-12 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {BRAND_USES.map(([brand, text]) => (
                <div key={brand} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="font-serif text-lg text-teal">Premium Choice {brand}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/75">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="py-16 sm:py-20">
          <div className="container-site grid items-center gap-12 lg:grid-cols-2">
            <div>
              <SectionHeading
                eyebrow="The rules it lives by"
                title="Inspiration, never invention"
              />
              <ul className="mt-6 space-y-4 text-[15px] text-ink-soft">
                <li className="flex gap-3"><span className="text-teal">✦</span> It never quotes prices, availability or flight times — those come from a human, verified, in your written quote.</li>
                <li className="flex gap-3"><span className="text-teal">✦</span> Budget feedback is honest and directional: “comfortably within your range” or “at the upper end”, never a made-up number.</li>
                <li className="flex gap-3"><span className="text-teal">✦</span> Visa and entry rules are checked by our specialists against official sources before anything is booked.</li>
                <li className="flex gap-3"><span className="text-teal">✦</span> Your answers go to our travel team and nowhere else.</li>
                <li className="flex gap-3"><span className="text-teal">✦</span> Every idea is a starting point — the specialist reshapes it with you before a single dirham is committed.</li>
              </ul>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Image src="/images/hero/hero-2.jpg" alt="Boardwalk to overwater villas at sunset" fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
              <div className="absolute bottom-0 p-6 text-white">
                <p className="font-serif text-xl">Dreamed up in a minute.</p>
                <p className="text-sm text-white/80">Made real by people who’ve been there.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="container-site">
            <div className="rounded-3xl bg-ink px-8 py-14 text-center text-white sm:px-16">
              <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-tight sm:text-5xl">
                Sixty seconds from now, you’ll have three trips to argue about.
              </h2>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link href="/inspiration" className="btn-primary !px-9 !py-4 !text-base">
                  ✨ Give me some inspiration
                </Link>
                <Link href="/plan" className="btn !border !border-white/40 !px-9 !py-4 !text-base text-white hover:!border-teal hover:text-teal">
                  I already know — plan my trip
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
