import { redirect } from 'next/navigation';
import { getAccount } from '@/lib/account';

export const dynamic = 'force-dynamic';

/**
 * On Staycations the account *is* Trips — the tab bar has four destinations
 * and a fifth called "Account" holding the same list would be a second front
 * door to one room. Anyone arriving at /account is sent there.
 */
export default async function CoastalAccountPage() {
  const account = await getAccount();
  if (!account) redirect('/account/sign-in?next=/trips');
  if (account.role === 'admin' || account.role === 'reviewer') redirect('/admin');
  redirect('/trips');
}
