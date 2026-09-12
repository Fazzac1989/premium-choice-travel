import Link from 'next/link';
import { redirect } from 'next/navigation';
import SignInForm from '@/components/SignInForm';
import Icon from '@/components/staycations/coastal/Icon';
import { getAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  link: 'That link was incomplete. Ask for a new one below.',
  expired: 'That link has expired or has already been used. Ask for a new one below.',
};

/**
 * Signing in without leaving Staycations.
 *
 * The master site's version of this page wears the Premium Choice Travel
 * header, which is a jarring thing to meet halfway through booking a hotel.
 * The form itself is the same component; only the surroundings change.
 */
export default async function CoastalSignInPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  if (await getAccount()) redirect(searchParams.next ?? '/trips');
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <div className="cc-narrow py-8 lg:py-14">
      <h1 className="cc-h2">Sign in</h1>
      <p className="cc-body mt-2 text-sea-soft">
        Your stays in one place: vouchers, payment, changes and cancellations, and a specialist to
        ask. No password — we email you a link.
      </p>

      {error && (
        <p role="alert" className="mt-5 rounded-[10px] bg-wait-bg px-4 py-3 text-[14px] leading-[20px] text-wait-ink">
          {error}
        </p>
      )}

      <div className="cc-panel mt-6 p-5">
        <SignInForm next={searchParams.next ?? '/trips'} />
      </div>

      <ul className="mt-6 space-y-2.5">
        {[
          'See and print the voucher for any confirmed stay.',
          'Ask to change or cancel, and see what it costs first.',
          'Message a specialist in Dubai about a booking you already have.',
        ].map((line) => (
          <li key={line} className="flex items-start gap-2.5 text-[15px] leading-[22px] text-sea-soft">
            <Icon name="check" size={18} className="mt-0.5 shrink-0 text-petrol" />
            {line}
          </li>
        ))}
      </ul>

      <p className="cc-support mt-6">
        Rather talk?{' '}
        <a href="tel:+97144206965" className="font-semibold text-petrol">
          +971 4 420 6965
        </a>{' '}
        · or{' '}
        <Link href="/hotels" className="font-semibold text-petrol">
          keep looking at stays
        </Link>
        .
      </p>
    </div>
  );
}
