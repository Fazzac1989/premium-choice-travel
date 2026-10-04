'use client';

import { signOutAccount } from '@/lib/account-actions';

/**
 * Sign out of the workspace. A client component on purpose: the same route
 * also renders SignInForm, and importing these account actions from both a
 * server and a client component in one route trips Next 14's dev bundler.
 */
export default function SignOut({ next }: { next: string }) {
  return (
    <form action={signOutAccount} className="lg:mt-3">
      <input type="hidden" name="next" value={next} />
      <button type="submit" className="text-xs font-semibold text-teal-deep hover:underline">Sign out</button>
    </form>
  );
}
