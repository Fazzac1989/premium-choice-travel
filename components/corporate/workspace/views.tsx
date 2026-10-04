import Link from 'next/link';
import { centreBudgets, openItems, tripLifecycle, uncodedLifecycle } from '@/lib/corporate/workspace/budget';
import {
  canApprove, currentApproval, hasRole, isOfferLive, tripStage, visibleTrips,
} from '@/lib/corporate/workspace/rules';
import { ROLE_LABELS, type Offer, type Trip } from '@/lib/corporate/workspace/types';
import {
  Banner, centreLabel, Empty, formatDate, formatDateTime, memberName, money, Panel, StageChip, Stat, Table, TripLink,
  type Ctx,
} from './parts';

const sortTrips = (trips: Trip[]) => [...trips].sort((a, b) => b.departOn.localeCompare(a.departOn));

/* ── Overview ───────────────────────────────────────────────── */

export function Overview(c: Ctx) {
  const { s, me, base, now } = c;
  const mine = sortTrips(visibleTrips(s, me));
  const upcoming = mine.filter((t) => ['booked', 'approved', 'options', 'requested'].includes(tripStage(s, t, now))).reverse();
  const toApprove = hasRole(me, 'approver') ? pendingForApprover(c) : [];
  const finance = hasRole(me, 'finance');
  const budgets = centreBudgets(s, now);
  const totals = budgets.reduce(
    (a, b) => ({ budget: a.budget + (b.budget ?? 0), spent: a.spent + b.incurred, committed: a.committed + b.committed + b.reserved }),
    { budget: 0, spent: 0, committed: 0 },
  );
  const items = finance ? openItems(s, now) : [];
  const expectedRefunds = s.refunds.filter((r) => r.status === 'claimed' || r.status === 'authorised').reduce((n, r) => n + r.amountMinor, 0);
  const credits = s.credits.filter((cr) => cr.status === 'available');
  const cur = s.company.billingCurrency;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{s.company.name}</p>
          <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">Hello, {me.fullName.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-ink-soft">{me.roles.map((r) => ROLE_LABELS[r]).join(' · ')}</p>
        </div>
        {(hasRole(me, 'traveller') || hasRole(me, 'arranger')) && (
          <Link href={`${base}/request`} className="btn-primary !px-5 !py-2.5">Request a trip</Link>
        )}
      </div>

      {finance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Spent (invoiced)" value={money(totals.spent, cur)} note={`of ${money(totals.budget, cur)} budgeted across cost centres`} />
          <Stat label="Committed" value={money(totals.committed, cur)} note="Booked but not invoiced, plus approved but not yet booked" />
          <Stat label="Refunds expected" value={money(expectedRefunds, cur)} note="Claimed from suppliers; not counted until received" />
          <Stat label="Airline credits" value={money(credits.reduce((n, cr) => n + cr.amountMinor, 0), cur)} note={`${credits.length} unused, named-traveller credits`} />
        </div>
      )}

      {toApprove.length > 0 && (
        <Panel title={`Waiting for your approval (${toApprove.length})`} action={<Link href={`${base}/approvals`} className="text-sm font-semibold text-teal-deep hover:underline">All approvals →</Link>}>
          <TripRows c={c} trips={toApprove} />
        </Panel>
      )}

      <Panel title={hasRole(me, 'arranger') || finance ? 'Coming up' : 'Your trips'} action={<Link href={`${base}/trips`} className="text-sm font-semibold text-teal-deep hover:underline">All trips →</Link>}>
        {upcoming.length ? <TripRows c={c} trips={upcoming.slice(0, 8)} /> : <Empty>Nothing coming up.</Empty>}
      </Panel>

      {finance && (
        <Panel title={`Open items (${items.length})`} action={<Link href={`${base}/finance`} className="text-sm font-semibold text-teal-deep hover:underline">Invoices & credits →</Link>}>
          {items.length ? (
            <Table
              head={['Item', 'Detail', 'Waiting on', 'Amount']}
              align={['left', 'left', 'left', 'right']}
              rows={items.slice(0, 8).map((i) => [i.kind, i.label, i.owner, i.amountMinor === null ? '' : money(i.amountMinor, cur)])}
            />
          ) : (
            <Empty>Nothing open. Every booking is invoiced and every refund is in.</Empty>
          )}
        </Panel>
      )}

      <Panel title="Recent activity">
        {s.audit.length ? (
          <ul className="space-y-2.5">
            {s.audit
              .filter((e) => !e.tripId || visibleTrips(s, me).some((t) => t.id === e.tripId))
              .slice(0, 8)
              .map((e) => (
                <li key={e.id} className="flex flex-wrap gap-x-3 text-sm">
                  <span className="w-28 shrink-0 text-ink-soft">{formatDateTime(e.createdAt)}</span>
                  <span className="text-ink"><strong className="font-semibold">{e.actorLabel}</strong> · {e.action}</span>
                </li>
              ))}
          </ul>
        ) : (
          <Empty>No activity yet.</Empty>
        )}
      </Panel>
    </div>
  );
}

function pendingForApprover({ s, me, now }: Ctx) {
  return sortTrips(
    s.trips.filter(
      (t) => tripStage(s, t, now) === 'options' && s.offers.some((o) => o.tripId === t.id && canApprove(s, me, o, now).ok),
    ),
  ).reverse();
}

function TripRows({ c, trips }: { c: Ctx; trips: Trip[] }) {
  const { s, base, now } = c;
  return (
    <Table
      head={['Trip', 'Traveller', 'Route', 'Dates', 'Cost centre', 'Stage']}
      rows={trips.map((t) => [
        <TripLink key="r" base={base} ref_={t.ref} />,
        memberName(s, t.travellerMemberId),
        `${t.origin} → ${t.destination}`,
        `${formatDate(t.departOn)}${t.returnOn ? ` – ${formatDate(t.returnOn)}` : ''}`,
        <span key="c" className="text-ink-soft">{centreLabel(s, t.costCentreId)}</span>,
        <StageChip key="s" stage={tripStage(s, t, now)} />,
      ])}
    />
  );
}

/* ── Trips ──────────────────────────────────────────────────── */

export function Trips(c: Ctx) {
  const trips = sortTrips(visibleTrips(c.s, c.me));
  return (
    <div className="space-y-6">
      <Header title="Trips" text={hasRole(c.me, 'arranger') || hasRole(c.me, 'finance') ? 'Every trip in your programme, newest departure first.' : 'Your trips, newest departure first.'}>
        {(hasRole(c.me, 'traveller') || hasRole(c.me, 'arranger')) && (
          <Link href={`${c.base}/request`} className="btn-primary !px-5 !py-2.5">Request a trip</Link>
        )}
      </Header>
      <Panel title={`${trips.length} trips`}>{trips.length ? <TripRows c={c} trips={trips} /> : <Empty>No trips yet.</Empty>}</Panel>
    </div>
  );
}

function Header({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">{title}</h1>
        {text && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{text}</p>}
      </div>
      {children}
    </div>
  );
}

/* ── One trip ───────────────────────────────────────────────── */

export function TripDetail(c: Ctx & { tripRef: string }) {
  const { s, me, base, now, demo, search } = c;
  const trip = visibleTrips(s, me).find((t) => t.ref === c.tripRef);
  if (!trip) {
    return (
      <div className="space-y-4">
        <Header title="Trip not found" text="It may belong to someone else in your programme, or the reference is wrong." />
        <Link href={`${base}/trips`} className="btn-outline">Back to trips</Link>
      </div>
    );
  }
  const stage = tripStage(s, trip, now);
  const offers = s.offers.filter((o) => o.tripId === trip.id).sort((a, b) => a.revision - b.revision);
  const approval = currentApproval(s, trip.id);
  const bookings = s.bookings.filter((b) => b.tripId === trip.id);
  const invoices = s.invoices.filter((i) => i.tripId === trip.id);
  const refunds = s.refunds.filter((r) => r.tripId === trip.id);
  const life = tripLifecycle(s, trip, now);
  const cur = s.company.billingCurrency;
  const seesMoney = hasRole(me, 'finance') || hasRole(me, 'approver') || hasRole(me, 'arranger');
  const events = s.audit.filter((e) => e.tripId === trip.id);

  return (
    <div className="space-y-6">
      <Link href={`${base}/trips`} className="text-sm font-semibold text-teal-deep hover:underline">← Trips</Link>
      {search.error && <Banner tone="error">{search.error}</Banner>}
      {search.sent && <Banner tone="ok">Trip requested. Your account team has been told and will send options for approval.</Banner>}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">{trip.ref}</p>
          <h1 className="mt-1 font-serif text-3xl text-ink sm:text-4xl">{trip.origin} → {trip.destination}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {memberName(s, trip.travellerMemberId)} · {formatDate(trip.departOn, true)}
            {trip.returnOn ? ` – ${formatDate(trip.returnOn, true)}` : ' · one way'}
          </p>
        </div>
        <StageChip stage={stage} />
      </div>

      {trip.cancelledAt && <Banner>Cancelled on {formatDate(trip.cancelledAt, true)}{trip.cancelReason ? ` — ${trip.cancelReason}` : ''}.</Banner>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <Panel title="Options">
            {offers.length ? (
              <div className="space-y-4">
                {offers.map((o) => <OfferCard key={o.id} c={c} offer={o} />)}
              </div>
            ) : (
              <Empty>Your account team is preparing options. You will see them here, with the full cost and the change and refund terms of each.</Empty>
            )}
          </Panel>

          <Panel title="Bookings">
            {bookings.length ? (
              <Table
                head={['What', 'Supplier', 'Reference', 'Status', ...(seesMoney ? ['Amount'] : [])]}
                align={['left', 'left', 'left', 'left', 'right']}
                rows={bookings.map((b) => [
                  <span key="d"><span className="capitalize">{b.kind}</span> · {b.description}</span>,
                  b.supplier,
                  b.supplierRef,
                  b.status === 'cancelled' ? `Cancelled${b.cancelSupplierRef ? ` (${b.cancelSupplierRef})` : ''}` : 'Confirmed',
                  ...(seesMoney
                    ? [
                        <span key="a">
                          {money(b.amountMinor, b.currency)}
                          {b.sourceCurrency && b.sourceAmountMinor !== null && (
                            <span className="block text-xs text-ink-soft">{money(b.sourceAmountMinor, b.sourceCurrency)} at {b.fxRate}</span>
                          )}
                        </span>,
                      ]
                    : []),
                ])}
              />
            ) : (
              <Empty>{approval ? 'Approved. Your account team is rechecking the price and booking.' : 'Nothing booked yet. Bookings are made only after approval.'}</Empty>
            )}
          </Panel>

          {seesMoney && (invoices.length > 0 || refunds.length > 0) && (
            <Panel title="Invoices and refunds">
              <Table
                head={['Document', 'Date', 'Status', 'Amount']}
                align={['left', 'left', 'left', 'right']}
                rows={[
                  ...invoices.map((i) => [
                    `${i.kind === 'invoice' ? 'Invoice' : 'Credit note'} ${i.number}`,
                    formatDate(i.issuedOn, true),
                    i.status,
                    (i.kind === 'credit_note' ? '−' : '') + money(i.amountMinor, i.currency),
                  ]),
                  ...refunds.map((r) => [
                    `Refund · ${r.supplier}${r.note ? ` · ${r.note}` : ''}`,
                    formatDate(r.receivedOn ?? r.claimedOn, true),
                    r.status,
                    r.status === 'received' && r.receivedMinor !== null ? money(r.receivedMinor, r.currency) : money(r.amountMinor, r.currency),
                  ]),
                ]}
              />
            </Panel>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Details">
            <dl className="space-y-3 text-sm">
              <Row k="Purpose" v={trip.purpose} />
              <Row k="Cost centre" v={centreLabel(s, trip.costCentreId)} />
              <Row k="Entity" v={s.entities.find((e) => e.id === trip.entityId)?.name ?? '—'} />
              <Row k="Requested by" v={`${memberName(s, trip.requestedByMemberId)}, ${formatDate(trip.createdAt, true)}`} />
              {approval && <Row k="Approved by" v={`${memberName(s, approval.approverMemberId)}, ${formatDate(approval.createdAt, true)}${approval.policyVersion ? ` · policy v${approval.policyVersion}` : ''}`} />}
              {trip.notes && <Row k="Notes" v={trip.notes} />}
            </dl>
          </Panel>

          {seesMoney && (
            <Panel title="Cost to date">
              <dl className="space-y-2 text-sm">
                <Row k="Invoiced (net)" v={money(life.incurred, cur)} />
                <Row k="Booked, not invoiced" v={money(life.committed, cur)} />
                <Row k="Approved, not booked" v={money(life.reserved, cur)} />
                {life.proposed > 0 && <Row k="Awaiting approval (lowest option)" v={money(life.proposed, cur)} />}
              </dl>
              {demo || life.excluded === 0 ? null : <p className="mt-3 text-xs text-ink-soft">{life.excluded} item(s) in another currency are not included.</p>}
            </Panel>
          )}

          <Panel title="Activity">
            {events.length ? (
              <ul className="space-y-2 text-sm">
                {events.map((e) => (
                  <li key={e.id}>
                    <span className="text-ink-soft">{formatDateTime(e.createdAt)}</span>
                    <span className="block text-ink"><strong className="font-semibold">{e.actorLabel}</strong> · {e.action}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No activity yet.</Empty>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-soft">{k}</dt>
      <dd className="text-right text-ink">{v}</dd>
    </div>
  );
}

function OfferCard({ c, offer }: { c: Ctx; offer: Offer }) {
  const { s, me, now, demo } = c;
  const decision = s.approvals.find((a) => a.offerId === offer.id);
  const live = isOfferLive(offer, now);
  const verdict = canApprove(s, me, offer, now);
  const status = offer.withdrawnAt
    ? 'Withdrawn'
    : decision
      ? `${decision.decision === 'approved' ? 'Approved' : 'Declined'} by ${memberName(s, decision.approverMemberId)}`
      : live
        ? `Valid until ${formatDateTime(offer.expiresAt)}`
        : 'Expired';

  return (
    <div className={`rounded-xl border p-4 ${offer.recommended && live && !decision ? 'border-teal-deep' : 'border-line'} ${!live && !decision ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-soft">
            Option {offer.revision}{offer.recommended ? ' · Recommended' : ''}{offer.inPolicy ? ' · In policy' : ' · Outside policy'}
          </p>
          <h3 className="mt-1 font-serif text-xl text-ink">{offer.label}</h3>
        </div>
        <p className="font-serif text-2xl text-ink">{money(offer.totalMinor, offer.currency)}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{offer.details}</p>
      <dl className="mt-3 grid gap-1 text-xs text-ink-soft sm:grid-cols-2">
        {offer.changeTerms && <div><dt className="inline font-semibold text-ink">Changes: </dt><dd className="inline">{offer.changeTerms}</dd></div>}
        {offer.refundTerms && <div><dt className="inline font-semibold text-ink">Refunds: </dt><dd className="inline">{offer.refundTerms}</dd></div>}
      </dl>
      {offer.policyNote && <p className="mt-2 text-xs text-ink">{offer.policyNote}</p>}
      <p className="mt-3 text-xs font-semibold text-ink-soft">{status}</p>

      {verdict.ok && (
        <form className="mt-4 space-y-3 border-t border-line pt-4">
          <input type="hidden" name="offer" value={offer.id} />
          <label className="field-label" htmlFor={`cm-${offer.id}`}>Comment (optional)</label>
          <input id={`cm-${offer.id}`} name="comment" className="field" placeholder="e.g. Approved — client meeting confirmed" />
          <div className="flex flex-wrap gap-3">
            <button type={demo ? 'button' : 'submit'} name="decision" value="approve" className="btn-primary !px-5 !py-2.5" disabled={demo}>
              Approve {money(offer.totalMinor, offer.currency)}
            </button>
            <button type={demo ? 'button' : 'submit'} name="decision" value="decline" className="btn-outline !px-5 !py-2.5" disabled={demo}>
              Decline
            </button>
          </div>
          {demo && <p className="text-xs text-ink-soft">Demo: buttons are shown as an approver sees them; nothing is saved.</p>}
        </form>
      )}
    </div>
  );
}

/* ── Approvals ──────────────────────────────────────────────── */

export function Approvals(c: Ctx) {
  const { s, me } = c;
  const pending = pendingForApprover(c);
  const decided = s.approvals
    .filter((a) => a.approverMemberId === me.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="space-y-6">
      <Header
        title="Approvals"
        text={`You approve a specific option at a specific price. If the price moves by more than ${(s.company.priceToleranceBps / 100).toFixed(0)}% before booking, the trip comes back to you.${me.approvalLimitMinor !== null ? ` Your limit is ${money(me.approvalLimitMinor, s.company.billingCurrency)} per trip.` : ''}`}
      />
      <Panel title={`Waiting for you (${pending.length})`}>
        {pending.length ? <TripRows c={c} trips={pending} /> : <Empty>Nothing waiting for your approval.</Empty>}
      </Panel>
      <Panel title="Your decisions">
        {decided.length ? (
          <Table
            head={['Trip', 'Decision', 'Date', 'Amount']}
            align={['left', 'left', 'left', 'right']}
            rows={decided.map((a) => {
              const t = s.trips.find((t) => t.id === a.tripId)!;
              return [<TripLink key="t" base={c.base} ref_={t.ref} />, a.decision === 'approved' ? 'Approved' : 'Declined', formatDate(a.createdAt, true), money(a.amountMinor, a.currency)];
            })}
          />
        ) : (
          <Empty>No decisions yet.</Empty>
        )}
      </Panel>
      <p className="text-xs text-ink-soft">Nobody can approve their own trip.</p>
    </div>
  );
}

/* ── Spend ──────────────────────────────────────────────────── */

export function Spend(c: Ctx) {
  const { s, now, base } = c;
  const cur = s.company.billingCurrency;
  const rows = centreBudgets(s, now);
  const uncoded = uncodedLifecycle(s, now);
  return (
    <div className="space-y-6">
      <Header
        title="Spend"
        text="Each amount sits in one column only, so nothing is counted twice. Invoiced is net of credit notes. Awaiting approval is a forecast and is not taken off the budget. Refunds count only once a credit note arrives."
      >
        {hasRole(c.me, 'finance') && (
          <a href={c.exportHref} className="btn-outline !px-5 !py-2.5">Download CSV</a>
        )}
      </Header>
      <Panel title="By cost centre">
        <Table
          head={['Cost centre', 'Budget', 'Invoiced', 'Booked', 'Approved', 'Remaining', 'Awaiting approval', 'If approved']}
          align={['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right']}
          rows={rows.map((r) => [
            <span key="c">
              <strong className="font-semibold">{r.centre.code}</strong> · {r.centre.name}
              {r.centre.clientName && <span className="block text-xs text-ink-soft">{r.centre.clientName}{r.centre.billable ? ' · billable' : ''}</span>}
            </span>,
            r.budget === null ? '—' : money(r.budget, cur),
            money(r.incurred, cur),
            money(r.committed, cur),
            money(r.reserved, cur),
            r.remaining === null ? '—' : <span key="rem" className={r.remaining < 0 ? 'font-semibold text-err-ink' : ''}>{money(r.remaining, cur)}</span>,
            money(r.proposed, cur),
            r.remainingIfApproved === null ? '—' : <span key="ia" className={r.remainingIfApproved < 0 ? 'font-semibold text-err-ink' : ''}>{money(r.remainingIfApproved, cur)}</span>,
          ])}
        />
        {uncoded.trips > 0 && (
          <p className="mt-4 text-sm text-ink">
            {uncoded.trips} trip(s) have no cost centre: {money(uncoded.incurred + uncoded.committed + uncoded.reserved, cur)} invoiced, booked or approved.
          </p>
        )}
      </Panel>
      <Panel title="By trip">
        <Table
          head={['Trip', 'Traveller', 'Cost centre', 'Invoiced', 'Booked', 'Approved', 'Awaiting']}
          align={['left', 'left', 'left', 'right', 'right', 'right', 'right']}
          rows={sortTrips(s.trips).map((t) => {
            const l = tripLifecycle(s, t, now);
            return [<TripLink key="t" base={base} ref_={t.ref} />, memberName(s, t.travellerMemberId), centreLabel(s, t.costCentreId), money(l.incurred, cur), money(l.committed, cur), money(l.reserved, cur), money(l.proposed, cur)];
          })}
        />
      </Panel>
    </div>
  );
}

/* ── Invoices & credits ─────────────────────────────────────── */

export function Finance(c: Ctx) {
  const { s, now, base } = c;
  const cur = s.company.billingCurrency;
  const items = openItems(s, now);
  const tripRef = (id: string | null) => s.trips.find((t) => t.id === id)?.ref;
  return (
    <div className="space-y-6">
      <Header title="Invoices & credits" text="Every invoice and credit note, refunds as claimed and as received, and unused airline credits with their expiry dates." />
      <Panel title={`Open items (${items.length})`}>
        {items.length ? (
          <Table head={['Item', 'Detail', 'Waiting on', 'Amount']} align={['left', 'left', 'left', 'right']}
            rows={items.map((i) => [i.kind, i.label, i.owner, i.amountMinor === null ? '' : money(i.amountMinor, cur)])} />
        ) : <Empty>Nothing open.</Empty>}
      </Panel>
      <Panel title="Invoices and credit notes">
        {s.invoices.length ? (
          <Table head={['Number', 'Trip', 'Entity', 'Issued', 'Status', 'Amount']} align={['left', 'left', 'left', 'left', 'left', 'right']}
            rows={s.invoices.map((i) => [
              `${i.kind === 'invoice' ? 'Invoice' : 'Credit note'} ${i.number}`,
              tripRef(i.tripId) ? <TripLink key="t" base={base} ref_={tripRef(i.tripId)!} /> : '—',
              s.entities.find((e) => e.id === i.entityId)?.name ?? '—',
              formatDate(i.issuedOn, true),
              <span key="s" className="capitalize">{i.status}</span>,
              (i.kind === 'credit_note' ? '−' : '') + money(i.amountMinor, i.currency),
            ])} />
        ) : <Empty>No invoices yet.</Empty>}
      </Panel>
      <Panel title="Refunds">
        {s.refunds.length ? (
          <Table head={['Supplier', 'Trip', 'Claimed', 'Status', 'Claimed amount', 'Received']} align={['left', 'left', 'left', 'left', 'right', 'right']}
            rows={s.refunds.map((r) => [
              `${r.supplier}${r.note ? ` · ${r.note}` : ''}`,
              tripRef(r.tripId) ? <TripLink key="t" base={base} ref_={tripRef(r.tripId)!} /> : '—',
              formatDate(r.claimedOn, true),
              <span key="s" className="capitalize">{r.status}</span>,
              money(r.amountMinor, r.currency),
              r.receivedMinor === null ? '—' : `${money(r.receivedMinor, r.currency)} · ${formatDate(r.receivedOn, true)}`,
            ])} />
        ) : <Empty>No refunds claimed.</Empty>}
      </Panel>
      <Panel title="Airline credits">
        {s.credits.length ? (
          <>
            <Table head={['Traveller', 'Airline', 'Ticket', 'Expires', 'Status', 'Value']} align={['left', 'left', 'left', 'left', 'left', 'right']}
              rows={s.credits.map((cr) => [memberName(s, cr.memberId), cr.airline, cr.ticketNumber, formatDate(cr.expiresOn, true), <span key="s" className="capitalize">{cr.status}</span>, money(cr.amountMinor, cr.currency)])} />
            <p className="mt-3 text-xs text-ink-soft">Credits are usually for the named traveller and the issuing airline only, and are not cash. We check them before buying a new ticket for that traveller.</p>
          </>
        ) : <Empty>No unused credits.</Empty>}
      </Panel>
    </div>
  );
}

/* ── Team & policy ──────────────────────────────────────────── */

export function Team(c: Ctx) {
  const { s } = c;
  const policy = s.policies[0];
  return (
    <div className="space-y-6">
      <Header title="Team & policy" text="Who can travel, arrange, approve and see finance. To change anyone’s access or limits, ask your account manager — changes are recorded." />
      <Panel title="People">
        <Table head={['Name', 'Email', 'Roles', 'Approval limit']} align={['left', 'left', 'left', 'right']}
          rows={s.members.filter((m) => m.active).map((m) => [
            m.fullName, m.email, m.roles.map((r) => ROLE_LABELS[r]).join(', '),
            m.roles.includes('approver') || m.roles.includes('admin') ? (m.approvalLimitMinor === null ? 'No limit' : money(m.approvalLimitMinor, s.company.billingCurrency)) : '—',
          ])} />
      </Panel>
      <Panel title="Cost centres">
        <Table head={['Code', 'Name', 'Type', 'Client', 'Budget']} align={['left', 'left', 'left', 'left', 'right']}
          rows={s.costCentres.map((cc) => [cc.code, cc.name, cc.kind, cc.clientName ? `${cc.clientName}${cc.billable ? ' (billable)' : ''}` : '—', cc.budgetMinor === null ? '—' : money(cc.budgetMinor, s.company.billingCurrency)])} />
      </Panel>
      <Panel title={policy ? `Travel policy · version ${policy.version}` : 'Travel policy'}>
        {policy ? (
          <>
            <p className="whitespace-pre-line text-sm leading-relaxed text-ink">{policy.summary}</p>
            <p className="mt-3 text-xs text-ink-soft">In force since {formatDate(policy.createdAt, true)}. Every option and approval records the version that applied.</p>
          </>
        ) : <Empty>Your policy has not been loaded yet.</Empty>}
      </Panel>
    </div>
  );
}

/* ── Request a trip ─────────────────────────────────────────── */

export function RequestTrip(c: Ctx) {
  const { s, me, demo, search } = c;
  const arranger = hasRole(me, 'arranger');
  const travellers = s.members.filter((m) => m.active && (m.roles.includes('traveller') || m.id === me.id));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Header title="Request a trip" text="Tell us where and when. Your account team sends suitable options with the full cost; nothing is booked until it is approved." />
      {search.error && <Banner tone="error">{search.error}</Banner>}
      <form className="card space-y-4 p-6">
        {arranger ? (
          <div>
            <label className="field-label" htmlFor="rq-traveller">Who is travelling?</label>
            <select id="rq-traveller" name="traveller" className="field" defaultValue={me.id}>
              {travellers.map((m) => <option key={m.id} value={m.id}>{m.fullName}</option>)}
            </select>
          </div>
        ) : (
          <p className="text-sm text-ink-soft">For: <strong className="text-ink">{me.fullName}</strong></p>
        )}
        <div>
          <label className="field-label" htmlFor="rq-purpose">Purpose *</label>
          <input id="rq-purpose" name="purpose" required className="field" placeholder="e.g. Client workshop, site visit" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="rq-origin">From *</label>
            <input id="rq-origin" name="origin" required className="field" defaultValue="Dubai" />
          </div>
          <div>
            <label className="field-label" htmlFor="rq-dest">To *</label>
            <input id="rq-dest" name="destination" required className="field" />
          </div>
          <div>
            <label className="field-label" htmlFor="rq-out">Depart *</label>
            <input id="rq-out" name="depart_on" type="date" required className="field" />
          </div>
          <div>
            <label className="field-label" htmlFor="rq-back">Return</label>
            <input id="rq-back" name="return_on" type="date" className="field" />
          </div>
        </div>
        <div>
          <label className="field-label" htmlFor="rq-cc">Cost centre</label>
          <select id="rq-cc" name="cost_centre" className="field" defaultValue="">
            <option value="">Not sure — the account team will ask</option>
            {s.costCentres.filter((cc) => cc.active).map((cc) => <option key={cc.id} value={cc.id}>{cc.code} · {cc.name}</option>)}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="rq-notes">Anything else?</label>
          <textarea id="rq-notes" name="notes" rows={3} className="field" placeholder="Preferred times, hotel near the office, a meeting that cannot move…" />
        </div>
        <p className="text-xs text-ink-soft">Do not add passport or payment card details here.</p>
        <button type={demo ? 'button' : 'submit'} disabled={demo} className="btn-primary w-full disabled:opacity-60">Send request</button>
        {demo && <p className="text-center text-xs text-ink-soft">Demo: the form is shown as it works; nothing is sent.</p>}
      </form>
    </div>
  );
}

