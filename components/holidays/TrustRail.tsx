/**
 * The reassurance rail (founder, 2026-10-04).
 *
 * A package-holiday site leans on trust marks, which only works if they are
 * true. Everything switched on below is something Premium Choice can actually
 * stand behind today. The rest stays off until there is a number to put on it.
 *
 * To switch one on, set it to true and supply the detail it asks for. Do not
 * switch one on speculatively: a licence number that turns out to be wrong, or
 * an accreditation that lapsed, is a consumer-protection problem, not a design
 * one. ATOL in particular is a UK scheme and cannot be claimed by a UAE company.
 */
export const TRUST = {
  /** Card payments are taken through a PCI-compliant provider. True today. */
  securePayment: true,
  /** The company is in Dubai and the people answering are here. True today. */
  uaeBased: true,
  /** Prices come live from contracted suppliers rather than a stale brochure. */
  livePrices: true,

  /** Dubai Department of Economy and Tourism licence. Awaiting the number. */
  detLicence: null as string | null,
  /** IATA accreditation number, for ticketing. Awaiting the number. */
  iataNumber: null as string | null,
  /**
   * Low-deposit messaging. Off until the founder supplies the amount and the
   * conditions — and it only makes sense once a holiday can be paid for at all,
   * which today it cannot, because every journey ends in an enquiry.
   */
  deposit: null as { amount: string; terms: string } | null,
};

function Mark({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 shrink-0 text-flame" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate">{title}</span>
        <span className="block text-xs text-slate-soft">{sub}</span>
      </span>
    </li>
  );
}

const Lock = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 1 1 8 0v3" />
  </svg>
);
const Pin = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
    <circle cx="12" cy="10" r="2.5" />
  </svg>
);
const Tag = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  </svg>
);
const Badge = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
    <circle cx="12" cy="9" r="6" />
    <path d="m8.5 14-1.5 7 5-2.5 5 2.5-1.5-7" />
  </svg>
);

export default function TrustRail({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-label="Why book with us"
      className={compact ? 'rounded-2xl border border-cloud-line bg-white p-5' : 'bg-cloud py-10'}
    >
      <ul
        className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-4 ${compact ? '' : 'container-site'}`}
      >
        {TRUST.securePayment ? (
          <Mark icon={Lock} title="Secure payment" sub="Cards handled by our payment provider, never by us" />
        ) : null}
        {TRUST.uaeBased ? (
          <Mark icon={Pin} title="UAE specialists" sub="Dubai office, and the people who answer are here" />
        ) : null}
        {TRUST.livePrices ? (
          <Mark icon={Tag} title="Live prices" sub="Priced by our suppliers for your dates, not a brochure" />
        ) : null}
        {TRUST.detLicence ? (
          <Mark icon={Badge} title="Licensed in Dubai" sub={`DET licence ${TRUST.detLicence}`} />
        ) : null}
        {TRUST.iataNumber ? (
          <Mark icon={Badge} title="IATA accredited" sub={`IATA ${TRUST.iataNumber}`} />
        ) : null}
        {TRUST.deposit ? (
          <Mark icon={Tag} title={`Book from ${TRUST.deposit.amount}`} sub={TRUST.deposit.terms} />
        ) : null}
      </ul>
    </section>
  );
}
