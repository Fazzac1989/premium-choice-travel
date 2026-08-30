'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { saveAccountDetails, type AccountState } from '@/lib/account-actions';

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Saving…' : 'Save'}
    </button>
  );
}

/** Name and phone, kept so a customer does not retype them every time. */
export default function AccountDetails({
  fullName,
  phone,
  email,
}: {
  fullName: string;
  phone: string;
  email: string;
}) {
  const [state, formAction] = useFormState<AccountState, FormData>(saveAccountDetails, null);

  return (
    <form action={formAction} className="rounded-2xl border border-line p-6">
      <p className="eyebrow">Your details</p>
      <h3 className="mt-1 font-serif text-xl text-ink">How we reach you</h3>

      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="full_name" className="field-label">
            Full name
          </label>
          <input id="full_name" name="full_name" defaultValue={fullName} className="field" placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="phone" className="field-label">
            Mobile / WhatsApp
          </label>
          <input id="phone" name="phone" defaultValue={phone} className="field" placeholder="+971 50 …" />
        </div>
        <div>
          <label className="field-label">Email</label>
          <input value={email} readOnly disabled className="field bg-sand text-ink-soft" />
          <p className="mt-1 text-xs text-ink-soft">
            This is how you sign in. Ask us if you need it changed.
          </p>
        </div>
      </div>

      {state && (
        <p className={`mt-3 text-sm ${state.ok ? 'text-teal-deep' : 'text-red-600'}`}>{state.message}</p>
      )}
      <div className="mt-4">
        <SaveButton />
      </div>
    </form>
  );
}
