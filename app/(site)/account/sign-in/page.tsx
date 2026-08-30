import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SignInForm from '@/components/SignInForm';
import { getAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign in',
  description: 'Sign in to see your enquiries, booking requests and quotes with Premium Choice Travel.',
  robots: { index: false, follow: false },
};

const ERRORS: Record<string, string> = {
  link: 'That link was incomplete. Ask for a new one below.',
  expired: 'That link has expired or has already been used. Ask for a new one below.',
};

export default async function SignInPage({ searchParams }: { searchParams: { error?: string; next?: string } }) {
  if (await getAccount()) redirect('/account');
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site max-w-lg py-14 sm:py-16">
            <p className="eyebrow">Your account</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">Sign in</h1>
            <p className="mt-3 text-ink-soft">
              See everything you have asked us about in one place — enquiries, booking requests and
              the quotes we have sent you.
            </p>
          </div>
        </section>
        <section className="py-12 sm:py-16">
          <div className="container-site max-w-md">
            {error && (
              <p className="mb-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-ink">
                {error}
              </p>
            )}
            <SignInForm next={searchParams.next ?? '/account'} />
          </div>
        </section>
      </main>
    </>
  );
}
