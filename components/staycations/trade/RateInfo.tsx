import type { RateInfo } from '@/lib/staycations/stay-search';

const amount = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;

/**
 * What the chosen room's rate comes with (founder, 2026-10-06, as on the trade portal): the deal,
 * what is included, what is paid at the hotel and the hotel's important information. The hotel
 * sends its important information when the price is checked, so it shows in full at checkout.
 */
export default function RateInfoBlock({ info, className = '' }: { info: RateInfo | null; className?: string }) {
  if (!info) return null;
  return (
    <section aria-label="About this rate" className={`rounded-[12px] border border-sea-line bg-shell p-4 ${className}`}>
      <h3 className="text-[15px] font-semibold text-sea-ink">About this rate</h3>
      <dl className="mt-2 space-y-1.5 text-[14px]">
        {info.deal && (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-sea-soft">Offer</dt>
            <dd className="font-medium text-ok-ink">{info.deal}</dd>
          </div>
        )}
        {info.inclusions.length > 0 && (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-sea-soft">Included</dt>
            <dd className="text-sea-ink">{info.inclusions.join(', ')}</dd>
          </div>
        )}
        {info.payAtHotel.length > 0 && (
          <div className="flex gap-3">
            <dt className="w-28 shrink-0 text-sea-soft">At the hotel</dt>
            <dd className="text-sea-ink">
              {info.payAtHotel.map((c) => (
                <span key={`${c.label}-${c.currency}`} className="block">
                  {c.label}: <span className="tabular-nums">{amount(c.amount, c.currency)}</span>
                </span>
              ))}
              <span className="block text-[13px] text-sea-soft">Not included in the price. You pay it to the hotel.</span>
            </dd>
          </div>
        )}
      </dl>
      {info.notes.length > 0 && (
        <div className="mt-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-sea-soft">Important information</p>
          <ul className="mt-1 space-y-1 text-[14px] leading-[20px] text-sea-ink">
            {info.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
