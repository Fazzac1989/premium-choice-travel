'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import GuardFields, { type GuardValues } from '@/components/GuardFields';
import { requestSignInLink, signOutAccount, type AccountState } from '@/lib/account-actions';
import { saveBookingProfile, type ProfileState } from '@/lib/account-profile-actions';

/**
 * The two steps before a first booking: prove the email, then say who is
 * going.
 *
 * Both happen inside the request panel rather than on another page, because
 * the room someone has chosen is the thing they lose by being sent away. The
 * sign-in link comes back to this exact URL with the rate still selected.
 *
 * Asked once. A second booking skips straight past both and offers the names
 * already here as chips.
 */

const field =
  'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40';
const label = 'text-[11px] font-bold uppercase tracking-[0.16em] text-white/60';

function Submitting({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-4 w-full disabled:opacity-60">
      {pending ? busy : idle}
    </button>
  );
}

/** Step one: an email address we can prove. */
function SignInStep({ here }: { here: string }) {
  const [state, formAction] = useFormState<AccountState, FormData>(requestSignInLink, null);
  const [guard, setGuard] = useState<GuardValues>({ honeypot: '', stamp: '', turnstile: '', ready: false });

  if (state?.ok) {
    return (
      <div className="mt-4 rounded-lg bg-white/10 p-4">
        <p className="font-serif text-lg text-white">Check your email</p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/70">{state.message}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-white/50">
          The link brings you straight back to this room, with the price you were shown. Leave this
          page open if you like.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4">
      <input type="hidden" name="next" value={here} />
      <label htmlFor="gate-email" className={label}>
        Your email
      </label>
      <input
        id="gate-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className={`${field} mt-1.5`}
      />
      <div className="mt-3 [&_label]:text-white/60">
        <GuardFields onChange={setGuard} />
      </div>
      {state && !state.ok && <p className="mt-3 text-sm text-red-300">{state.message}</p>}
      <Submitting idle="Email me a sign-in link" busy="Sending…" />
      <p className="mt-3 text-[11px] leading-relaxed text-white/60">
        No password. We email you a link that signs you in and brings you back here. Your booking,
        voucher and any changes then live in your account.
      </p>
    </form>
  );
}

/** Step two: the names a hotel will check them in against. */
function DetailsStep({ email, fullName, phone }: { email: string; fullName: string; phone: string }) {
  const router = useRouter();
  const [state, formAction] = useFormState<ProfileState, FormData>(saveBookingProfile, null);
  const [companion, setCompanion] = useState(false);

  // The page is rendered on the server with the account on it, so once the
  // details are saved it has to be re-read for the form below to appear.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <div>
        <label htmlFor="gate-name" className={label}>
          Your full name, as in your passport *
        </label>
        <input
          id="gate-name"
          name="full_name"
          required
          defaultValue={fullName}
          placeholder="As printed, including middle names"
          className={`${field} mt-1.5`}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="gate-dob" className={label}>
            Date of birth *
          </label>
          <input id="gate-dob" name="date_of_birth" type="date" required className={`${field} mt-1.5`} />
        </div>
        <div>
          <label htmlFor="gate-phone" className={label}>
            Mobile / WhatsApp
          </label>
          <input
            id="gate-phone"
            name="phone"
            defaultValue={phone}
            placeholder="+971…"
            className={`${field} mt-1.5`}
          />
        </div>
      </div>

      {companion ? (
        <div className="rounded-lg bg-white/10 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className={label}>Who else is travelling</p>
            <button
              type="button"
              onClick={() => setCompanion(false)}
              className="text-[11px] font-semibold text-white/70 underline underline-offset-2"
            >
              Remove
            </button>
          </div>
          <input
            name="companion_name"
            placeholder="Their full name, as in their passport"
            className={`${field} mt-2`}
          />
          <label htmlFor="gate-cdob" className={`${label} mt-3 block`}>
            Their date of birth
          </label>
          <input id="gate-cdob" name="companion_dob" type="date" className={`${field} mt-1.5`} />
          <p className="mt-2 text-[11px] leading-relaxed text-white/50">
            Saved to your account. Next time you book, you pick them from a list instead of typing
            this again.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCompanion(true)}
          className="text-sm font-semibold text-white underline underline-offset-2"
        >
          + Add who else is travelling
        </button>
      )}

      {state && !state.ok && <p className="text-sm text-red-300">{state.message}</p>}
      <Submitting idle="Save and continue" busy="Saving…" />
      <p className="text-[11px] leading-relaxed text-white/60">
        Asked once. Everything after this is choosing a name rather than typing one. You can edit or
        delete any of it from your account at any time.
      </p>
    </form>
  );
}

export default function BookingGate({
  account,
  here,
}: {
  account: { email: string; fullName: string; phone: string } | null;
  here: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
        {account ? 'Step 2 of 2' : 'Step 1 of 2'}
      </p>
      <h3 className="mt-1 font-serif text-xl text-white">
        {account ? 'Who is travelling' : 'Sign in to send this request'}
      </h3>
      {!account && (
        <p className="mt-1.5 text-sm leading-relaxed text-white/70">
          So your booking, voucher and any changes have somewhere to live, and so we never ask you
          for the same details twice.
        </p>
      )}
      {account ? (
        <>
          <p className="mt-1.5 text-sm leading-relaxed text-white/70">
            Signed in as <strong className="text-white">{account.email}</strong>. Two things a hotel
            needs, and then we are done with forms.
          </p>
          {/* Its own form: a submit button inside the one below would be held
              up by the required fields, and forms cannot nest. */}
          <form action={signOutAccount} className="mt-1">
            <input type="hidden" name="next" value={here} />
            <button
              type="submit"
              className="text-[11px] font-semibold text-white/60 underline underline-offset-2 hover:text-white"
            >
              Not you? Sign out
            </button>
          </form>
          <DetailsStep email={account.email} fullName={account.fullName} phone={account.phone} />
        </>
      ) : (
        <SignInStep here={here} />
      )}
    </div>
  );
}
