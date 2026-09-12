import Link from 'next/link';
import { redirect } from 'next/navigation';
import TravellerList from '@/components/TravellerList';
import { getAccount } from '@/lib/account';
import { signOutAccount } from '@/lib/account-actions';
import { getTravellers } from '@/lib/travellers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Who is travelling',
  robots: { index: false, follow: false },
};

/** The saved passport spellings, inside the Staycations shell. */
export default async function CoastalTravellersPage() {
  const account = await getAccount();
  if (!account) redirect('/account/sign-in?next=/account/travellers');
  if (account.role === 'admin' || account.role === 'reviewer') redirect('/admin');

  const travellers = await getTravellers(account.id);

  return (
    <div className="cc-narrow py-8 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/trips" className="text-[15px] font-semibold text-petrol">
          ← Trips
        </Link>
        <form action={signOutAccount}>
          <button type="submit" className="min-h-[44px] text-[15px] font-semibold text-sea-soft hover:text-petrol">
            Sign out
          </button>
        </form>
      </div>
      <h1 className="cc-h2 mt-3">Who is travelling</h1>
      <p className="cc-body mt-2 text-sea-soft">
        Names exactly as printed in the passport. Saved here once, they fill themselves in every
        time you book, and a hotel never turns anyone away over a spelling.
      </p>
      <div className="mt-6">
        <TravellerList travellers={travellers} />
      </div>
    </div>
  );
}
