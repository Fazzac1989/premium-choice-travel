import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getBrand } from '@/lib/brands';
import { brandBase } from '@/lib/brand-site';
import { getAccount, getAccountActivity } from '@/lib/account';
import { signOutAccount } from '@/lib/account-actions';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My booking',
  description: 'Your enquiries, quotes and bookings with Premium Choice Holidays.',
  robots: { index: false, follow: false },
};

/**
 * What a Holidays customer has with us.
 *
 * Deliberately not called "Trips": a holiday here does not yet reach a booking
 * on its own, so what this mostly shows is enquiries and the quotes that came
 * back from them. Saying "manage your booking" and then listing an enquiry
 * would be a small lie, so each section says what it is, and sections with
 * nothing in them say so rather than being hidden.
 *
 * Staycations has its own, much richer, Trips screen — stays carry payments,
 * cancellation standing and a platform reference. None of that exists here yet.
 */
const dateLabel = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

const STATUS_TONE: Record<string, string> = {
  new: 'bg-sun-wash text-slate',
  open: 'bg-sun-wash text-slate',
  sent: 'bg-sun-wash text-slate',
  accepted: 'bg-deal-bg text-deal-ink',
  confirmed: 'bg-deal-bg text-deal-ink',
  closed: 'bg-cloud text-slate-soft',
  declined: 'bg-cloud text-slate-soft',
  expired: 'bg-cloud text-slate-soft',
};

function Status({ value }: { value: string | null | undefined }) {
  const v = (value ?? '').toLowerCase();
  if (!v) return null;
  return (
    <span className={`rounded-md px-2 py-1 text-xs font-bold ${STATUS_TONE[v] ?? 'bg-cloud text-slate-soft'}`}>
      {v.charAt(0).toUpperCase() + v.slice(1)}
    </span>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const has = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <section className="mt-8">
      <h2 className="text-xl font-extrabold text-slate">{title}</h2>
      {has ? (
        <ul className="mt-3 grid gap-3">{children}</ul>
      ) : (
        <p className="mt-2 text-sm text-slate-soft">{empty}</p>
      )}
    </section>
  );
}

export default async function ManageBookingPage({ params }: { params: { brand: string } }) {
  const brand = getBrand(params.brand);
  if (!brand || brand.slug !== 'holidays') notFound();
  const base = brandBase(brand);

  const account = await getAccount();
  if (!account) redirect(`${base}/account/sign-in?next=${encodeURIComponent(`${base}/manage`)}`);
  if (account.role === 'admin' || account.role === 'reviewer') redirect('/admin');

  const { enquiries, quotes, bookings } = await getAccountActivity(account);

  const row = 'rounded-2xl border border-cloud-line bg-white p-5';

  return (
    <div className="container-site py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Premium Choice Holidays</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-[-0.02em] text-slate sm:text-4xl">
            My booking
          </h1>
          <p className="mt-2 text-sm text-slate-soft">Signed in as {account.email}</p>
        </div>
        <form action={signOutAccount}>
          <button
            type="submit"
            className="rounded-full border border-cloud-line px-4 py-2 text-sm font-bold text-slate hover:border-flame hover:text-flame"
          >
            Sign out
          </button>
        </form>
      </div>

      <Section
        title="Your bookings"
        empty="Nothing booked yet. Once a specialist confirms a holiday it will appear here."
      >
        {bookings.map((b: any) => (
          <li key={b.id} className={row}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate">{b.package_title ?? 'Holiday booking'}</span>
              <Status value={b.status} />
            </div>
            <p className="mt-1 text-sm text-slate-soft">
              {[b.travel_dates, dateLabel(b.created_at) && `Requested ${dateLabel(b.created_at)}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </Section>

      <Section
        title="Your quotes"
        empty="No quotes yet. When a specialist prices a holiday for you it will show here."
      >
        {quotes.map((q: any) => (
          <li key={q.id} className={row}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate">{q.title ?? `Quote ${q.ref ?? ''}`}</span>
              <Status value={q.status} />
            </div>
            <p className="mt-1 text-sm text-slate-soft">
              {[
                q.travelDates,
                q.total ? `${q.currency ?? 'AED'} ${Number(q.total).toLocaleString('en-GB')}` : '',
                q.validity ? `Valid until ${q.validity}` : '',
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {q.publicToken ? (
              <Link
                href={`/quote/${q.publicToken}`}
                className="mt-2 inline-block text-sm font-bold text-flame hover:underline"
              >
                View quote &rarr;
              </Link>
            ) : null}
          </li>
        ))}
      </Section>

      <Section
        title="Your enquiries"
        empty="You have not sent us an enquiry yet."
      >
        {enquiries.map((e: any) => (
          <li key={e.id} className={row}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate">{e.package_title ?? 'General enquiry'}</span>
              <Status value={e.status} />
            </div>
            <p className="mt-1 text-sm text-slate-soft">
              {[
                e.travel_dates,
                e.travellers,
                dateLabel(e.created_at) && `Sent ${dateLabel(e.created_at)}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </li>
        ))}
      </Section>

      <div className="mt-10 rounded-2xl bg-slate p-6 text-white">
        <h2 className="text-xl font-extrabold">Need to change something?</h2>
        <p className="mt-1 max-w-xl text-sm text-white/75">
          Dates, rooms, names on a booking — a specialist handles all of it. Call us on +971 4 420
          6965 or send a message and we will come back to you.
        </p>
        <Link
          href={`${base}/enquire`}
          className="mt-4 inline-block rounded-full bg-sun px-6 py-3 text-sm font-bold text-slate hover:bg-sun-deep"
        >
          Message a specialist
        </Link>
      </div>
    </div>
  );
}
