'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitEnquiry, type EnquiryState } from '@/lib/actions';
import GuardFields, { type GuardValues } from '@/components/GuardFields';
import { EMPLOYEE_BANDS, MAIN_PROBLEMS, SPEND_BANDS } from '@/lib/corporate/content';

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || !ready} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Sending…' : 'Request my review'}
    </button>
  );
}

/**
 * The Premium Choice Corporate sales form. It goes through the ordinary
 * enquiry pipeline (spam guard, enquiries table, both emails); the company
 * brief is folded into the message on the server — see corporateBrief.
 * No passport or card data is asked for here, on purpose.
 */
export default function ProgrammeReviewForm() {
  const [state, formAction] = useFormState<EnquiryState, FormData>(submitEnquiry, null);
  const [guard, setGuard] = useState<GuardValues>({ honeypot: '', stamp: '', turnstile: '', ready: false });

  if (state?.ok) {
    return (
      <div className="rounded-xl border border-teal/40 bg-teal/5 p-6 text-center">
        <p className="font-serif text-xl text-teal-deep">Thank you</p>
        <p className="mt-2 text-sm text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="brand" value="corporate" />
      <input type="hidden" name="package_title" value="Travel programme review" />
      <input type="hidden" name="corporate" value="1" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="pr-company">Company *</label>
          <input id="pr-company" name="company" required className="field" autoComplete="organization" />
        </div>
        <div>
          <label className="field-label" htmlFor="pr-employees">Employees</label>
          <select id="pr-employees" name="employees" className="field" defaultValue="">
            <option value="">Select</option>
            {EMPLOYEE_BANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="pr-name">Your name *</label>
          <input id="pr-name" name="name" required className="field" autoComplete="name" />
        </div>
        <div>
          <label className="field-label" htmlFor="pr-role">Your role</label>
          <input id="pr-role" name="role" className="field" placeholder="e.g. Finance Director, Office Manager" autoComplete="organization-title" />
        </div>
        <div>
          <label className="field-label" htmlFor="pr-email">Work email *</label>
          <input id="pr-email" name="email" type="email" required className="field" placeholder="you@company.com" autoComplete="email" />
        </div>
        <div>
          <label className="field-label" htmlFor="pr-phone">Phone</label>
          <input id="pr-phone" name="phone" className="field" placeholder="+971 …" autoComplete="tel" />
        </div>
        <div>
          <label className="field-label" htmlFor="pr-spend">Annual travel spend</label>
          <select id="pr-spend" name="travel_spend" className="field" defaultValue="">
            <option value="">Select</option>
            {SPEND_BANDS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="pr-problem">Main thing to fix</label>
          <select id="pr-problem" name="main_problem" className="field" defaultValue="">
            <option value="">Select</option>
            {MAIN_PROBLEMS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="pr-process">How is travel arranged today?</label>
        <textarea
          id="pr-process"
          name="message"
          rows={4}
          className="field"
          placeholder="Who books it, how it’s approved and paid for, and anything that keeps going wrong."
        />
      </div>
      <p className="text-xs text-ink-soft">
        Please don’t include passport or payment card details — we’ll never ask for them here.
      </p>
      <GuardFields onChange={setGuard} />
      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <SubmitButton ready={guard.ready} />
      <p className="text-center text-xs text-ink-soft">
        Or call us on <a className="font-semibold text-teal-deep" href="tel:+97144206965">+971 4 420 6965</a>
      </p>
    </form>
  );
}
