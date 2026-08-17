'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitEnquiry, type EnquiryState } from '@/lib/actions';

const TRIP_TYPES = ['Holiday', 'Staycation', 'Cruise', 'School Trip', 'Golf Holiday', 'Corporate Travel', 'Not sure yet'];
const WHEN_MODES = ['I have specific dates', 'Approximate dates', 'Still deciding'];
const PRIORITIES = ['Relaxation', 'Adventure', 'Culture', 'Family', 'Luxury', 'Golf', 'Value', 'Food', 'Something else'];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full !py-4 disabled:opacity-60">
      {pending ? 'Sending…' : 'Send my trip brief'}
    </button>
  );
}

function Chip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-5 py-3 text-sm font-semibold transition-colors ${
        active ? 'border-teal bg-teal text-white' : 'border-line bg-white text-ink hover:border-teal hover:text-teal-deep'
      }`}
    >
      {children}
    </button>
  );
}

export default function PlanWizard() {
  const [state, formAction] = useFormState<EnquiryState, FormData>(submitEnquiry, null);

  const [step, setStep] = useState(0);
  const [tripType, setTripType] = useState('');
  const [where, setWhere] = useState('');
  const [whenMode, setWhenMode] = useState('');
  const [whenDetail, setWhenDetail] = useState('');
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');
  const [groupNote, setGroupNote] = useState('');
  const [priorities, setPriorities] = useState<string[]>([]);

  const steps = ['Trip type', 'Where', 'When', 'Travellers', 'Priorities', 'Contact'];
  const canNext =
    (step === 0 && tripType) ||
    (step === 1) ||
    (step === 2 && whenMode) ||
    step === 3 ||
    step === 4;

  const togglePriority = (p: string) =>
    setPriorities((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const summary = [
    `Trip type: ${tripType || '—'}`,
    where ? `Where: ${where}` : null,
    whenMode ? `When: ${whenMode}${whenDetail ? ` (${whenDetail})` : ''}` : null,
    `Travellers: ${adults} adults${Number(children) > 0 ? `, ${children} children` : ''}${groupNote ? ` — ${groupNote}` : ''}`,
    priorities.length ? `What matters most: ${priorities.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  if (state?.ok) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-teal/40 bg-teal/5 p-10 text-center">
        <p className="font-serif text-3xl text-teal-deep">Thanks. Leave the planning to us.</p>
        <p className="mt-3 text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Progress */}
      <div className="mb-8 flex items-center gap-1.5">
        {steps.map((label, i) => (
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
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">What can we help you with?</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {TRIP_TYPES.map((t) => (
                <Chip key={t} active={tripType === t} onClick={() => setTripType(t)}>
                  {t}
                </Chip>
              ))}
            </div>
            {tripType === 'School Trip' && (
              <p className="mt-5 rounded-xl bg-sand p-4 text-sm text-ink-soft">
                School travel has its own dedicated team and platform —{' '}
                <a href="https://premiumchoiceschooltrips.com" target="_blank" rel="noopener" className="font-bold text-teal-deep hover:underline">
                  visit Premium Choice School Trips ↗
                </a>{' '}
                — or continue here and we’ll pass you across personally.
              </p>
            )}
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Where would you like to go?</h2>
            <p className="mt-2 text-sm text-ink-soft">A country, a city, “somewhere warm in January” — anything works.</p>
            <input
              autoFocus
              className="field mt-6 !py-4 !text-base"
              placeholder="e.g. Maldives, Japan, or ‘not sure — somewhere special’"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">When are you thinking?</h2>
            <div className="mt-6 flex flex-wrap gap-3">
              {WHEN_MODES.map((w) => (
                <Chip key={w} active={whenMode === w} onClick={() => setWhenMode(w)}>
                  {w}
                </Chip>
              ))}
            </div>
            {whenMode && whenMode !== 'Still deciding' && (
              <input
                className="field mt-5 !py-4"
                placeholder="e.g. 20–27 December, or ‘Eid break’"
                value={whenDetail}
                onChange={(e) => setWhenDetail(e.target.value)}
              />
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Who’s travelling?</h2>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="field-label">Adults</label>
                <input type="number" min={0} className="field !py-4 !text-base" value={adults} onChange={(e) => setAdults(e.target.value)} />
              </div>
              <div>
                <label className="field-label">Children</label>
                <input type="number" min={0} className="field !py-4 !text-base" value={children} onChange={(e) => setChildren(e.target.value)} />
              </div>
            </div>
            <input
              className="field mt-4"
              placeholder="Anything else — a group, a school, a company?"
              value={groupNote}
              onChange={(e) => setGroupNote(e.target.value)}
            />
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">What matters most?</h2>
            <p className="mt-2 text-sm text-ink-soft">Pick as many as you like.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {PRIORITIES.map((p) => (
                <Chip key={p} active={priorities.includes(p)} onClick={() => togglePriority(p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </>
        )}

        {step === 5 && (
          <form action={formAction}>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Nearly there — how do we reach you?</h2>
            <input type="hidden" name="travel_dates" value={whenMode ? `${whenMode}${whenDetail ? `: ${whenDetail}` : ''}` : ''} />
            <input type="hidden" name="travellers" value={`${adults} adults, ${children} children`} />
            <input type="hidden" name="package_title" value={`Plan My Trip — ${tripType || 'General'}`} />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Name *</label>
                <input name="name" required className="field" />
              </div>
              <div>
                <label className="field-label">Email *</label>
                <input name="email" type="email" required className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Phone / WhatsApp</label>
                <input name="phone" className="field" placeholder="+971 …" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Anything to add?</label>
                <textarea name="message" rows={5} className="field" defaultValue={summary} />
              </div>
            </div>
            {state && !state.ok && <p className="mt-3 text-sm text-danger">{state.message}</p>}
            <div className="mt-6">
              <SubmitButton />
            </div>
          </form>
        )}

        {/* Nav buttons */}
        {step < 5 && (
          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              className={`text-sm font-semibold text-ink-soft hover:text-ink ${step === 0 ? 'invisible' : ''}`}
            >
              ← Back
            </button>
            <button
              type="button"
              disabled={!canNext}
              onClick={() => setStep((s) => s + 1)}
              className="btn-primary !px-8 disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
        {step === 5 && (
          <button type="button" onClick={() => setStep(4)} className="mt-4 text-sm font-semibold text-ink-soft hover:text-ink">
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
