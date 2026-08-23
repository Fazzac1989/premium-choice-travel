'use client';

import { useState, useTransition } from 'react';
import {
  generateConcepts,
  submitInspirationLead,
  type CuratorAnswers,
  type TripConcept,
} from '@/lib/curator-actions';

const TRIP_TYPES = ['Beach', 'Family', 'Adventure', 'Culture', 'Safari', 'Ski', 'Golf', 'Cruise', 'City', 'Wellness', 'Surprise me'];
const DEPARTURES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Other'];
const DURATIONS = ['Long weekend', '4–6 nights', '7–9 nights', '10–14 nights', '15+ nights'];
const BUDGETS = ['Under 10,000', '10,000–20,000', '20,000–40,000', '40,000–75,000', '75,000+', 'Not sure yet'];
const PRIORITIES = ['Beach time', 'Food', 'Culture', 'Nature', 'Kids clubs', 'Waterparks', 'Nightlife', 'Privacy', 'Wildlife', 'Golf', 'Skiing', 'Shopping', 'Wellness', 'Slow pace', 'Active days'];
const HOTEL_STYLES = ['Good 4-star', 'Premium 5-star', 'Boutique', 'Villa', 'All-inclusive', 'Mix it up', 'Let PCT decide'];
const PACES = ['Slow & restorative', 'Balanced', 'See as much as possible'];
const CHANNELS = ['WhatsApp', 'Phone call', 'Email'];

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink hover:border-teal hover:text-teal-deep'
      }`}
    >
      {children}
    </button>
  );
}

export default function InspirationCurator({ destinationHint = '' }: { destinationHint?: string }) {
  const [step, setStep] = useState(0);
  const [pending, startTransition] = useTransition();

  const [answers, setAnswers] = useState<CuratorAnswers>({
    tripType: '', departure: 'Dubai', dateWindow: '', duration: '',
    adults: '2', childrenAges: '', budget: '', priorities: [],
    hotelStyle: '', pace: 'Balanced', notes: '', destinationHint,
    sourcePage: typeof window !== 'undefined' ? window.location.pathname : '',
  });
  const set = <K extends keyof CuratorAnswers>(k: K, v: CuratorAnswers[K]) =>
    setAnswers((a) => ({ ...a, [k]: v }));

  const [concepts, setConcepts] = useState<TripConcept[] | null>(null);
  const [rejected, setRejected] = useState<string[]>([]);
  const [selected, setSelected] = useState<TripConcept | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [contact, setContact] = useState({ name: '', email: '', phone: '', channel: 'WhatsApp' });
  const [done, setDone] = useState<string | null>(null);

  const STEPS = ['Trip', 'When', 'Who', 'Budget', 'Style', 'Ideas'];

  const generate = (extraRejected: string[] = []) => {
    setError(null);
    startTransition(async () => {
      const res = await generateConcepts(answers, extraRejected);
      if (res.ok) {
        setConcepts(res.concepts);
        setSelected(null);
        setStep(5);
      } else {
        setError(res.error);
      }
    });
  };

  const regenerate = () => {
    const titles = [...rejected, ...(concepts?.map((c) => c.title) ?? [])];
    setRejected(titles);
    generate(titles);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const res = await submitInspirationLead({
        answers, concepts: concepts ?? [], selected,
        name: contact.name, email: contact.email, phone: contact.phone, channel: contact.channel,
      });
      if (res.ok) setDone(res.message);
      else setError(res.message);
    });
  };

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-teal/40 bg-teal/5 p-10 text-center">
        <p className="font-serif text-3xl text-teal-deep">Thanks. Leave the planning to us.</p>
        <p className="mt-3 text-ink-soft">{done}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-1.5">
        {STEPS.map((label, i) => (
          <div key={label} className="flex-1">
            <div className={`h-1 rounded-full ${i <= step ? 'bg-teal' : 'bg-line'}`} />
            <p className={`mt-1.5 hidden text-[10px] font-semibold uppercase tracking-wider sm:block ${i <= step ? 'text-teal-deep' : 'text-ink-soft/50'}`}>
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="card p-8 sm:p-10">
        {step === 0 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">What kind of trip are you dreaming about?</h2>
            {answers.destinationHint && (
              <p className="mt-2 text-sm text-ink-soft">
                We’ll keep <span className="font-semibold text-teal-deep">{answers.destinationHint}</span> in mind — and show you a couple of alternatives too.
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {TRIP_TYPES.map((t) => (
                <Chip key={t} active={answers.tripType === t} onClick={() => set('tripType', t)}>{t}</Chip>
              ))}
            </div>
            <p className="field-label mt-6">Departing from</p>
            <div className="flex flex-wrap gap-2.5">
              {DEPARTURES.map((d) => (
                <Chip key={d} active={answers.departure === d} onClick={() => set('departure', d)}>{d}</Chip>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">When, and for how long?</h2>
            <p className="field-label mt-6">When can you travel?</p>
            <input
              className="field !py-3.5"
              placeholder="e.g. 20–28 December, ‘Eid break’, ‘any school holiday’, or ‘flexible’"
              value={answers.dateWindow}
              onChange={(e) => set('dateWindow', e.target.value)}
            />
            <p className="field-label mt-5">How long do you have?</p>
            <div className="flex flex-wrap gap-2.5">
              {DURATIONS.map((d) => (
                <Chip key={d} active={answers.duration === d} onClick={() => set('duration', d)}>{d}</Chip>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Who’s travelling?</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Adults</label>
                <input type="number" min={1} className="field !py-3.5" value={answers.adults} onChange={(e) => set('adults', e.target.value)} />
              </div>
              <div>
                <label className="field-label">Children’s ages (if any)</label>
                <input className="field !py-3.5" placeholder="e.g. 4 and 9" value={answers.childrenAges} onChange={(e) => set('childrenAges', e.target.value)} />
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Roughly, what’s the overall budget?</h2>
            <p className="mt-2 text-sm text-ink-soft">Total for everyone, in AED — it helps us pitch ideas at the right level. “Not sure” is a fine answer.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {BUDGETS.map((b) => (
                <Chip key={b} active={answers.budget === b} onClick={() => set('budget', b)}>{b} {b !== 'Not sure yet' ? 'AED' : ''}</Chip>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">What matters most?</h2>
            <p className="mt-2 text-sm text-ink-soft">Pick up to five.</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {PRIORITIES.map((p) => (
                <Chip
                  key={p}
                  active={answers.priorities.includes(p)}
                  onClick={() =>
                    set(
                      'priorities',
                      answers.priorities.includes(p)
                        ? answers.priorities.filter((x) => x !== p)
                        : answers.priorities.length < 5
                          ? [...answers.priorities, p]
                          : answers.priorities
                    )
                  }
                >
                  {p}
                </Chip>
              ))}
            </div>
            <p className="field-label mt-6">Hotel style</p>
            <div className="flex flex-wrap gap-2.5">
              {HOTEL_STYLES.map((h) => (
                <Chip key={h} active={answers.hotelStyle === h} onClick={() => set('hotelStyle', h)}>{h}</Chip>
              ))}
            </div>
            <p className="field-label mt-5">Pace</p>
            <div className="flex flex-wrap gap-2.5">
              {PACES.map((p) => (
                <Chip key={p} active={answers.pace === p} onClick={() => set('pace', p)}>{p}</Chip>
              ))}
            </div>
            <p className="field-label mt-6">Anything to avoid, accommodate or tell us? (optional)</p>
            <textarea
              rows={2}
              className="field"
              placeholder="e.g. been to Thailand twice, one vegetarian, avoid long drives, celebrating a big birthday…"
              value={answers.notes}
              onChange={(e) => set('notes', e.target.value)}
            />
          </>
        )}

        {step === 5 && concepts && !selected && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Three ideas to start the conversation</h2>
            <p className="mt-2 text-sm text-ink-soft">
              These are inspiration, not quotes — a human specialist confirms availability, entry requirements and pricing for the one you love.
            </p>
            <div className="mt-6 space-y-5">
              {concepts.map((c) => (
                <div key={c.title} className="overflow-hidden rounded-2xl border border-line transition-shadow hover:shadow-lg">
                  {c.images && c.images.length > 0 && (
                    <div className="grid grid-cols-3 gap-0.5">
                      {c.images.map((img) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={img.url}
                          src={img.url}
                          alt={img.alt}
                          loading="lazy"
                          className="h-32 w-full object-cover sm:h-36"
                        />
                      ))}
                    </div>
                  )}
                  <div className="p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-serif text-xl text-ink">{c.title}</h3>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-deep">{c.nights} nights · {c.destinations}</span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink-soft">{c.route}</p>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.whyItFits}</p>
                  <p className="mt-2 text-sm italic text-ink-soft">{c.rhythm}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {c.experiences.map((e) => (
                      <li key={e} className="rounded-full bg-teal/10 px-3 py-1 text-xs font-semibold text-teal-deep">{e}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
                    <span><strong>Stay:</strong> {c.accommodationStyle}</span>
                    <span><strong>Best time:</strong> {c.bestSeason}</span>
                    {c.budgetBand && <span><strong>Budget:</strong> {c.budgetBand}</span>}
                  </div>
                  {c.hotels?.length > 0 && (
                    <div className="mt-4 rounded-xl bg-sand p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                        Where you might stay
                      </p>
                      <ul className="mt-2 space-y-2">
                        {c.hotels.map((h) => (
                          <li key={h.name} className="text-sm text-ink">
                            <span className="font-semibold">{h.name}</span>
                            <span className="text-ink-soft"> · {h.where}</span>
                            <span className="block text-xs text-ink-soft">{h.why}</span>
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[11px] text-ink-soft">
                        Suggestions to react to — your specialist confirms availability, rooms and price.
                      </p>
                    </div>
                  )}
                  {c.startingJourney && (
                    <p className="mt-2 text-xs text-ink-soft">
                      Adapted from our designed journey <strong className="text-teal-deep">{c.startingJourney}</strong>
                    </p>
                  )}
                  <button type="button" onClick={() => setSelected(c)} className="btn-primary mt-5 !px-6 !py-2.5">
                    I like this — send to an expert
                  </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setStep(4)} className="text-sm font-semibold text-ink-soft hover:text-ink">
                ← Change my answers
              </button>
              <button type="button" onClick={regenerate} disabled={pending} className="btn-outline !px-5 !py-2.5 disabled:opacity-50">
                {pending ? 'Thinking…' : 'Show me something completely different'}
              </button>
            </div>
          </>
        )}

        {step === 5 && selected && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Great choice. Where should the expert reply?</h2>
            <p className="mt-2 text-sm text-ink-soft">
              Sending <span className="font-semibold text-teal-deep">{selected.title}</span> to the team — they’ll confirm availability and price it properly.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Name *</label>
                <input className="field" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Email *</label>
                <input type="email" className="field" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Phone / WhatsApp</label>
                <input className="field" placeholder="+971 …" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </div>
              <div>
                <label className="field-label">Preferred contact</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {CHANNELS.map((ch) => (
                    <Chip key={ch} active={contact.channel === ch} onClick={() => setContact({ ...contact, channel: ch })}>{ch}</Chip>
                  ))}
                </div>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
            <div className="mt-6 flex items-center justify-between">
              <button type="button" onClick={() => setSelected(null)} className="text-sm font-semibold text-ink-soft hover:text-ink">
                ← Back to the ideas
              </button>
              <button type="button" onClick={submit} disabled={pending} className="btn-primary !px-8 disabled:opacity-50">
                {pending ? 'Sending…' : 'Send to a travel expert'}
              </button>
            </div>
          </>
        )}

        {/* Wizard navigation */}
        {step < 5 && (
          <>
            {error && <p className="mt-4 text-sm text-danger">{error}</p>}
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`text-sm font-semibold text-ink-soft hover:text-ink ${step === 0 ? 'invisible' : ''}`}
              >
                ← Back
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  disabled={step === 0 && !answers.tripType}
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-primary !px-8 disabled:opacity-40"
                >
                  Continue
                </button>
              ) : (
                <button type="button" disabled={pending} onClick={() => generate(rejected)} className="btn-primary !px-8 disabled:opacity-50">
                  {pending ? 'Curating your ideas…' : '✨ Show me my three ideas'}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-ink-soft">
        Ideas are inspiration, not confirmed itineraries. Availability, entry requirements and
        pricing are always confirmed by a Premium Choice Travel specialist.
      </p>
    </div>
  );
}
