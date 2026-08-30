'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestSignInLink, type AccountState } from '@/lib/account-actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Sending…' : 'Email me a sign-in link'}
    </button>
  );
}

export default function SignInForm({ next = '/account' }: { next?: string }) {
  const [state, formAction] = useFormState<AccountState, FormData>(requestSignInLink, null);

  if (state?.ok) {
    return (
      <div className="rounded-2xl border border-teal/40 bg-teal/5 p-7 text-center">
        <p className="font-serif text-xl text-teal-deep">Check your email</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="email" className="field-label">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="field"
        />
      </div>
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <SubmitButton />
      <p className="text-center text-xs leading-relaxed text-ink-soft">
        No password needed. We email you a link that signs you in — it works once and lasts an
        hour. If you have enquired before, everything you have sent us will be waiting.
      </p>
    </form>
  );
}
