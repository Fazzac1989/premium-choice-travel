'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitEnquiry, type EnquiryState } from '@/lib/actions';
import GuardFields, { type GuardValues } from '@/components/GuardFields';
import { useState } from 'react';

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || !ready} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Sending…' : 'Send enquiry'}
    </button>
  );
}

export default function EnquiryForm({
  packageId,
  packageTitle,
  compact = false,
  brand,
  groups = false,
}: {
  packageId?: number;
  packageTitle?: string;
  compact?: boolean;
  /** Which of the six sites this form is on — names the brand on both emails. */
  brand?: string;
  /** Golf groups page: ask for the group size up front. */
  groups?: boolean;
}) {
  const golf = brand === 'golf';
  const [state, formAction] = useFormState<EnquiryState, FormData>(submitEnquiry, null);
  const [guard, setGuard] = useState<GuardValues>({ honeypot: '', stamp: '', turnstile: '', ready: false });

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-teal/40 bg-teal/5 p-6 text-center">
        <p className="font-serif text-xl text-teal-deep">Thank you!</p>
        <p className="mt-2 text-sm text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {brand && <input type="hidden" name="brand" value={brand} />}
      {packageId !== undefined && <input type="hidden" name="package_id" value={packageId} />}
      {packageTitle && <input type="hidden" name="package_title" value={packageTitle} />}

      {golf && <GolfBrief compact={compact} groups={groups} />}
      {golf && <p className="pt-1 text-sm font-semibold text-ink">Where should we send your ideas?</p>}

      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className="field-label" htmlFor="enq-name">Name *</label>
          <input id="enq-name" name="name" required className="field" placeholder="Your full name" />
        </div>
        <div>
          <label className="field-label" htmlFor="enq-email">Email *</label>
          <input id="enq-email" name="email" type="email" required className="field" placeholder="you@example.com" />
        </div>
        <div>
          <label className="field-label" htmlFor="enq-phone">Phone / WhatsApp</label>
          <input id="enq-phone" name="phone" className="field" placeholder="+971 …" />
        </div>
        {!golf && (
          <div>
            <label className="field-label" htmlFor="enq-dates">Travel dates</label>
            <input id="enq-dates" name="travel_dates" className="field" placeholder="e.g. 20–27 December" />
          </div>
        )}
      </div>
      {!golf && (
        <>
          <div>
            <label className="field-label" htmlFor="enq-travellers">Travellers</label>
            <input id="enq-travellers" name="travellers" className="field" placeholder="e.g. 2 adults, 2 children" />
          </div>
          <div>
            <label className="field-label" htmlFor="enq-message">Tell us about your trip</label>
            <textarea id="enq-message" name="message" rows={4} className="field" placeholder="Where would you like to go? Any special occasions?" />
          </div>
        </>
      )}
      {/* Signing in here is a link in an email, so there is no password to
          invent and nothing to confirm. Ticked by default because the whole
          point of the enquiry is to hear back, and this is where the answer
          will be — but it is a tick box, so it can be unticked. */}
      <label className="flex cursor-pointer items-start gap-2.5 text-sm text-ink-soft">
        <input
          type="checkbox"
          name="create_account"
          defaultChecked
          className="mt-0.5 h-4 w-4 shrink-0 accent-teal-deep"
        />
        <span>
          Email me a link so I can follow this enquiry and see any quote online. No password needed.
        </span>
      </label>
      <GuardFields onChange={setGuard} />
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <SubmitButton ready={guard.ready} />
      <p className="text-center text-xs text-ink-soft">
        Or call us on <a className="font-semibold text-teal-deep" href="tel:+97144206965">+971 4 420 6965</a>
      </p>
    </form>
  );
}

/**
 * The golf trip brief: the things a golf specialist needs before they can
 * cost anything, asked before the contact details. Only the dates are
 * prompted for; nothing here is required, so a quick question still goes.
 */
function GolfBrief({ compact, groups }: { compact: boolean; groups: boolean }) {
  const grid = compact ? 'grid grid-cols-2 gap-3' : 'grid gap-4 sm:grid-cols-3';
  return (
    <div className="space-y-4">
      <div>
        <label className="field-label" htmlFor="enq-dates">When would you like to go?</label>
        <input id="enq-dates" name="travel_dates" className="field" placeholder="e.g. 12–16 November, or 'March, flexible'" />
      </div>
      <div className={grid}>
        <div>
          <label className="field-label" htmlFor="enq-golfers">{groups ? 'Golfers in the group' : 'Golfers'}</label>
          <input id="enq-golfers" name="golfers" type="number" min={1} max={200} inputMode="numeric" className="field" placeholder={groups ? 'e.g. 12' : '2'} />
        </div>
        <div>
          <label className="field-label" htmlFor="enq-nongolfers">Non-golfers</label>
          <input id="enq-nongolfers" name="non_golfers" type="number" min={0} max={200} inputMode="numeric" className="field" placeholder="0" />
        </div>
        <div className={compact ? 'col-span-2' : ''}>
          <label className="field-label" htmlFor="enq-rooms">Rooms</label>
          <input id="enq-rooms" name="rooms" className="field" placeholder={groups ? 'e.g. 6 twins' : 'e.g. 1 double'} />
        </div>
      </div>
      <div className={compact ? 'space-y-4' : 'grid gap-4 sm:grid-cols-2'}>
        <div>
          <label className="field-label" htmlFor="enq-departure">Travelling from</label>
          <select id="enq-departure" name="departure" className="field" defaultValue="">
            <option value="">Not sure yet</option>
            <option>Dubai (DXB)</option>
            <option>Abu Dhabi (AUH)</option>
            <option>Sharjah (SHJ)</option>
            <option>Driving — UAE or Oman trip</option>
            <option>Arranging our own flights</option>
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="enq-budget">Budget per person</label>
          <select id="enq-budget" name="budget" className="field" defaultValue="">
            <option value="">Prefer to discuss</option>
            <option>Under AED 3,000</option>
            <option>AED 3,000–6,000</option>
            <option>AED 6,000–10,000</option>
            <option>AED 10,000–15,000</option>
            <option>Over AED 15,000</option>
          </select>
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="enq-message">Anything else?</label>
        <textarea id="enq-message" name="message" rows={compact ? 3 : 4} className="field"
          placeholder={groups ? 'Society name, competition format, courses you want, handicap range…' : 'Courses you want to play, handicaps, an occasion…'} />
      </div>
    </div>
  );
}
