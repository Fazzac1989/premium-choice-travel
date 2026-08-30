import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import AccountDetails from '@/components/AccountDetails';
import { signOutAccount } from '@/lib/account-actions';
import { getAccount, getAccountActivity } from '@/lib/account';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Your account',
  robots: { index: false, follow: false },
};

const STATUS: Record<string, { label: string; tone: string }> = {
  new: { label: 'With a specialist', tone: 'bg-teal/10 text-teal-deep' },
  sent: { label: 'Ready to view', tone: 'bg-teal text-white' },
  accepted: { label: 'Accepted', tone: 'bg-ink text-white' },
  declined: { label: 'Declined', tone: 'bg-sand text-ink-soft' },
  expired: { label: 'Expired', tone: 'bg-sand text-ink-soft' },
  quoted: { label: 'Quote sent', tone: 'bg-teal text-white' },
  confirmed: { label: 'Confirmed', tone: 'bg-teal text-white' },
  closed: { label: 'Closed', tone: 'bg-sand text-ink-soft' },
};

function Status({ status }: { status: string }) {
  const s = STATUS[status] ?? { label: status, tone: 'bg-sand text-ink-soft' };
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${s.tone}`}>
      {s.label}
    </span>
  );
}

function when(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default async function AccountPage() {
  const account = await getAccount();
  if (!account) redirect('/account/sign-in');
  if (account.role === 'admin') redirect('/admin');

  const { enquiries, bookings, quotes } = await getAccountActivity(account);
  const nothingYet = enquiries.length === 0 && bookings.length === 0 && quotes.length === 0;
  const firstName = (account.fullName || '').trim().split(/\s+/)[0];

  return (
    <>
      <SiteHeader solid />
      <main className="pt-[72px]">
        <section className="border-b border-line bg-sand">
          <div className="container-site flex flex-wrap items-end justify-between gap-4 py-12 sm:py-14">
            <div>
              <p className="eyebrow">Your account</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink">
                {firstName ? `Hello, ${firstName}` : 'Hello'}
              </h1>
              <p className="mt-2 text-sm text-ink-soft">{account.email}</p>
            </div>
            <form action={signOutAccount}>
              <button type="submit" className="text-sm font-semibold text-teal-deep hover:underline">
                Sign out
              </button>
            </form>
          </div>
        </section>

        <div className="container-site grid gap-12 py-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16 sm:py-14">
          <div className="min-w-0 space-y-12">
            {nothingYet && (
              <div className="rounded-2xl border border-line p-10 text-center">
                <p className="font-serif text-2xl text-ink">Nothing here yet</p>
                <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-ink-soft">
                  When you ask us about a hotel or a journey, it appears here — along with the
                  quotes we send back.
                </p>
                <Link href="/plan" className="btn-primary mt-6 inline-block">
                  Plan a trip
                </Link>
              </div>
            )}

            {quotes.length > 0 && (
              <div>
                <p className="eyebrow">Quotes</p>
                <h2 className="mt-1 font-serif text-2xl text-ink">What we have priced for you</h2>
                <div className="mt-5 space-y-3">
                  {quotes.map((q: any) => {
                    const total = Number(q.total) || 0;
                    const expires = q.validity ? new Date(q.validity) : null;
                    const lapsed = expires ? expires.getTime() < Date.now() : false;
                    return (
                      <div key={q.id} className="rounded-2xl border border-line p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-serif text-lg text-ink">{q.title}</p>
                            <p className="mt-1 text-sm text-ink-soft">
                              {q.ref}
                              {q.travelDates ? ` · ${q.travelDates}` : ''}
                            </p>
                            {expires && (
                              <p className={`mt-1 text-sm ${lapsed ? 'text-ink-soft' : 'text-teal-deep'}`}>
                                {lapsed ? 'Expired on ' : 'Valid until '}
                                {when(q.validity)}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <Status status={q.status} />
                            {total > 0 && (
                              <p className="mt-2 font-serif text-lg text-teal-deep">
                                {q.currency} {total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
                          <Link
                            href={`/quotes/${q.publicToken}`}
                            className="text-sm font-bold text-teal-deep hover:underline"
                          >
                            View the full quote →
                          </Link>
                          <a
                            href={`/api/quotes/pdf?token=${q.publicToken}`}
                            className="text-sm font-semibold text-ink-soft hover:text-teal-deep"
                          >
                            Download PDF
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {bookings.length > 0 && (
              <div>
                <p className="eyebrow">Booking requests</p>
                <h2 className="mt-1 font-serif text-2xl text-ink">Rooms you have asked us for</h2>
                <div className="mt-5 space-y-3">
                  {bookings.map((b: any) => (
                    <div key={b.id} className="rounded-2xl border border-line p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-serif text-lg text-ink">{b.hotel_name}</p>
                          <p className="mt-1 text-sm text-ink-soft">
                            {b.check_in} · {b.nights} night{b.nights === 1 ? '' : 's'} ·{' '}
                            {b.adults} adult{b.adults === 1 ? '' : 's'}
                            {b.children ? `, ${b.children} child${b.children === 1 ? '' : 'ren'}` : ''}
                          </p>
                          {b.room_name && (
                            <p className="mt-1 text-sm text-ink-soft">
                              {b.room_name}
                              {b.board ? ` · ${b.board}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <Status status={b.status} />
                          {b.amount && (
                            <p className="mt-2 font-serif text-lg text-teal-deep">
                              {b.currency} {Number(b.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
                        Asked on {when(b.created_at)}
                        {b.status === 'new' ? ' — a specialist is confirming this with the hotel.' : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {enquiries.length > 0 && (
              <div>
                <p className="eyebrow">Enquiries</p>
                <h2 className="mt-1 font-serif text-2xl text-ink">What you have asked us</h2>
                <div className="mt-5 space-y-3">
                  {enquiries.map((e: any) => (
                    <div key={e.id} className="rounded-2xl border border-line p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-serif text-lg text-ink">
                            {e.package_title || 'General enquiry'}
                          </p>
                          {(e.travel_dates || e.travellers) && (
                            <p className="mt-1 text-sm text-ink-soft">
                              {[e.travel_dates, e.travellers].filter(Boolean).join(' · ')}
                            </p>
                          )}
                          {e.message && (
                            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{e.message}</p>
                          )}
                        </div>
                        <Status status={e.status} />
                      </div>
                      <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
                        Sent on {when(e.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <AccountDetails fullName={account.fullName} phone={account.phone} email={account.email} />
            <div className="mt-6 rounded-2xl bg-ink p-7 text-white">
              <h3 className="font-serif text-xl">Need us?</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Reply to any email we have sent you, or call — you will get a person who knows
                your file.
              </p>
              <p className="mt-4 text-sm">
                <a className="font-semibold text-teal" href="tel:+97144206965">
                  +971 4 420 6965
                </a>
              </p>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-ink-soft">
              Payments and travel documents are coming to this page next. Anything you ask us —
              and every quote we send back — appears above.
            </p>
          </aside>
        </div>
      </main>
    </>
  );
}
