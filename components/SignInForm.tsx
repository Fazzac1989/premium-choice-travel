'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { requestSignInLink, type AccountState } from '@/lib/account-actions';
import GuardFields, { type GuardValues } from '@/components/GuardFields';
import { useState } from 'react';

function SubmitButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending || !ready} className="btn-primary w-full disabled:opacity-60">
      {pending ? 'Sending…' : 'Email me a sign-in link'}
    </button>
  );
}

export default function SignInForm({ next = '/account' }: { next?: string }) {
  const [state, formAction] = useFormState<AccountState, FormData>(requestSignInLink, null);
  const [guard, setGuard] = useState<GuardValues>({ honeypot: '', stamp: '', turnstile: '', ready: false });

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
      <GuardFields onChange={setGuard} />
      {state && !state.ok && <p className="text-sm text-red-600">{state.message}</p>}
      <SubmitButton ready={guard.ready} />
      <p className="text-center text-xs leading-relaxed text-ink-soft">
        No password needed. We email you a link that signs you in — it works once and lasts an
        hour. If you have enquired before, everything you have sent us will be waiting.
      </p>
    </form>
  );
}
