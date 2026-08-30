import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import TravellerList from '@/components/TravellerList';
import { getAccount } from '@/lib/account';
import { getTravellers } from '@/lib/travellers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Who is travelling',
  robots: { index: false, follow: false },
};

export default async function TravellersPage() {
  const account = await getAccount();
  if (!account) redirect('/account/sign-in?next=/account/travellers');
  if (account.role === 'admin') redirect('/admin');

  const travellers = await getTravellers(account.id);

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site max-w-3xl py-12 sm:py-14">
            <Link href="/account" className="text-xs font-semibold text-ink-soft hover:text-teal-deep">
              ← Your account
            </Link>
            <p className="eyebrow mt-4">Your travellers</p>
            <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">Who is travelling</h1>
            <p className="mt-3 max-w-xl text-ink-soft">
              Save the people you travel with once and we will use their details on every booking —
              spelled the way their passport spells them, which is what stops a booking having to
              be reissued.
            </p>
          </div>
        </section>

        <section className="py-12 sm:py-14">
          <div className="container-site max-w-3xl">
            <TravellerList travellers={travellers} />

            <div className="mt-10 rounded-2xl bg-sand p-6">
              <h2 className="font-serif text-lg text-ink">What we do with this</h2>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
                <li>
                  <span className="mr-2 text-teal">✦</span>
                  Only you and our specialists can see it. It is never shared beyond the hotel or
                  airline your booking is with.
                </li>
                <li>
                  <span className="mr-2 text-teal">✦</span>
                  Passport details are optional. Add them when a booking needs them, not before.
                </li>
                <li>
                  <span className="mr-2 text-teal">✦</span>
                  Remove a traveller at any time and their details go with them. Ask us and we will
                  delete anything else we hold.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
