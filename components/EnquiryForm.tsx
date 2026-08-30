'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitEnquiry, type EnquiryState } from '@/lib/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Sending…' : 'Send enquiry'}
    </button>
  );
}

export default function EnquiryForm({
  packageId,
  packageTitle,
  compact = false,
  brand,
}: {
  packageId?: number;
  packageTitle?: string;
  compact?: boolean;
  /** Which of the six sites this form is on — names the brand on both emails. */
  brand?: string;
}) {
  const [state, formAction] = useFormState<EnquiryState, FormData>(submitEnquiry, null);

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
        <div>
          <label className="field-label" htmlFor="enq-dates">Travel dates</label>
          <input id="enq-dates" name="travel_dates" className="field" placeholder="e.g. 20–27 December" />
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="enq-travellers">Travellers</label>
        <input id="enq-travellers" name="travellers" className="field" placeholder="e.g. 2 adults, 2 children" />
      </div>
      <div>
        <label className="field-label" htmlFor="enq-message">Tell us about your trip</label>
        <textarea id="enq-message" name="message" rows={4} className="field" placeholder="Where would you like to go? Any special occasions?" />
      </div>
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <SubmitButton />
      <p className="text-center text-xs text-ink-soft">
        Or call us on <a className="font-semibold text-teal-deep" href="tel:+97144206965">+971 4 420 6965</a>
      </p>
    </form>
  );
}
