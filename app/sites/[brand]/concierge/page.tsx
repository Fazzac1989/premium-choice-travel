import { notFound } from 'next/navigation';
import ConciergeForm from '@/components/staycations/coastal/ConciergeForm';
import Icon from '@/components/staycations/coastal/Icon';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getAccount, getAccountActivity } from '@/lib/account';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Concierge',
  description: 'Message a Premium Choice specialist about your stay.',
  robots: { index: false, follow: false },
};

export default async function ConciergePage({
  params,
  searchParams,
}: {
  params: { brand: string };
  searchParams: { trip?: string };
}) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'staycations') notFound();
  const base = brandBase(brand);

  const account = await getAccount();
  const activity = account ? await getAccountActivity(account) : null;
  const accountTrips = (activity?.bookings ?? []).map((r: any) => ({
    reference: r.supplier_reference || `PCS-${r.id}`,
    label: `${r.hotel_name} — ${r.check_in}`,
  }));

  return (
    <div className="cc-wrap py-6 lg:py-10">
      <h1 className="cc-h2">Concierge</h1>
      <p className="cc-body mt-1 max-w-xl text-sea-soft">
        A Premium Choice specialist in Dubai answers every message personally. There is no bot here, and nobody will
        promise you something the hotel has not agreed.
      </p>

      <div className="mt-6 lg:grid lg:grid-cols-[1fr_320px] lg:items-start lg:gap-10">
        <div className="cc-panel p-4 sm:p-5">
          <h2 className="cc-h4">Send a message</h2>
          <p className="cc-support mt-1">
            Replies usually arrive the same working day. Anything urgent — a late arrival, a change on the day — is
            faster by phone.
          </p>
          <div className="mt-4">
            <ConciergeForm accountTrips={accountTrips} preselect={searchParams.trip} />
          </div>
        </div>

        <aside className="mt-5 space-y-3 lg:mt-0">
          <a href="tel:+97144206965" className="cc-card flex items-center gap-3 p-4 hover:border-petrol">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mist text-petrol">
              <Icon name="phone" size={20} />
            </span>
            <span>
              <span className="block text-[15px] font-medium text-sea-ink">+971 4 420 6965</span>
              <span className="cc-support block">Our Dubai office</span>
            </span>
          </a>

          <div className="cc-card p-4">
            <h2 className="text-[15px] font-medium text-sea-ink">What we can do</h2>
            <ul className="mt-2 space-y-2">
              {[
                'Price a stay we cannot quote online, including more than one room',
                'Ask the hotel for early check-in, a cot, connecting rooms or a quiet floor',
                'Change or cancel a request — we will tell you what it costs first',
                'Explain a rate’s terms before you commit to anything',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-[14px] leading-[20px] text-sea-soft">
                  <Icon name="check" size={16} className="mt-0.5 shrink-0 text-petrol" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          <div className="cc-card p-4">
            <h2 className="text-[15px] font-medium text-sea-ink">Where your trips live</h2>
            <p className="cc-support mt-1">
              Every request, quote and confirmation is in{' '}
              <a href={`${base}/trips`} className="font-semibold text-petrol">
                Trips
              </a>
              . Signing in brings requests from every device together.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
