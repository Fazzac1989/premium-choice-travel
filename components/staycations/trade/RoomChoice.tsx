'use client';

import { createContext, useContext, useState, useTransition, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from '@/components/staycations/coastal/Icon';
import { lockRoom } from '@/lib/staycations/search-actions';
import { cancellationLabel, moneyLabel, type PublicRate } from '@/lib/staycations/stay-search';
import RateInfoBlock from './RateInfo';

/**
 * The hotel page's rooms and its "Your stay" panel (founder, 2026-10-03: the trade portal's
 * layout). The list and the panel sit in different columns, so the chosen room is shared through
 * this provider; "Book this room" locks today's price on the platform and opens the checkout.
 */

type Ctx = { rates: PublicRate[]; chosen: PublicRate | null; choose: (r: PublicRate) => void };
const Choice = createContext<Ctx>({ rates: [], chosen: null, choose: () => {} });

export function RoomChoiceProvider({ rates, children }: { rates: PublicRate[]; children: ReactNode }) {
  const [chosen, setChosen] = useState<PublicRate | null>(rates[0] ?? null);
  return <Choice.Provider value={{ rates, chosen, choose: setChosen }}>{children}</Choice.Provider>;
}

/** Rooms grouped by type, each with its board, cancellation and total. */
export function RoomList({ nights }: { nights: number }) {
  const { rates, chosen, choose } = useContext(Choice);
  const groups = new Map<string, PublicRate[]>();
  // the same room from two suppliers can differ only in capitals: one group, cheapest first
  for (const r of rates) {
    const key = r.roomName.toLowerCase().replace(/\s+/g, ' ').trim();
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  const [all, setAll] = useState(false);
  const shown = Array.from(groups.entries()).slice(0, all ? undefined : 8);

  return (
    <div>
      <ul className="space-y-3">
        {shown.map(([room, list]) => (
          <li key={room} className="cc-panel overflow-hidden">
            <h3 className="flex items-center gap-2 border-b border-sea-line bg-shell px-4 py-3 text-[16px] font-semibold text-sea-ink">
              <Icon name="bed" size={18} />
              {list[0]!.roomName}
            </h3>
            <ul>
              {list.map((r) => {
                const on = chosen?.offerId === r.offerId;
                return (
                  <li key={r.offerId} className="border-b border-sea-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => choose(r)}
                      aria-pressed={on}
                      className={`grid w-full gap-2 px-4 py-3 text-start sm:grid-cols-[1fr_auto] sm:items-center ${on ? 'bg-mist' : 'hover:bg-shell'}`}
                    >
                      <span>
                        <span className="block text-[15px] font-medium text-sea-ink">{r.board}</span>
                        <span className={`block text-[14px] ${r.refundable ? 'text-ok-ink' : 'text-sea-soft'}`}>
                          {cancellationLabel(r)}
                        </span>
                        {(r.info?.deal || (r.info?.inclusions.length ?? 0) > 0) && (
                          <span className="block text-[13px] text-sea-soft">
                            {[r.info?.deal, ...(r.info?.inclusions ?? [])].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-4 sm:justify-end">
                        <span className="text-end">
                          <span className="block text-[18px] font-semibold tabular-nums text-sea-ink">
                            {moneyLabel(r.total, r.currency)}
                          </span>
                          <span className="block text-[12px] text-sea-soft">
                            {nights} night{nights === 1 ? '' : 's'} · {moneyLabel(r.perNight, r.currency)} a night
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? 'border-petrol bg-petrol text-white' : 'border-sea-line'}`}
                        >
                          {on && <Icon name="check" size={14} />}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>
      {groups.size > 8 && (
        <button type="button" onClick={() => setAll((a) => !a)} className="cc-btn-quiet mt-4 !rounded-full">
          {all ? 'Show fewer room types' : `Show all ${groups.size} room types`}
        </button>
      )}
    </div>
  );
}

/** The sticky panel: the chosen room, its total and "Book this room". */
export function StayPanel({
  base,
  slug,
  dates,
  party,
  nights,
}: {
  base: string;
  slug: string;
  dates: string;
  party: string;
  nights: number;
}) {
  const { chosen } = useContext(Choice);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');

  const book = () => {
    if (!chosen) return;
    setError('');
    start(async () => {
      const res = await lockRoom(chosen.offerId);
      if (res.ok) router.push(`${base}/hotels/${slug}/book?quote=${res.quoteId}`);
      else setError(res.message);
    });
  };

  if (!chosen) return null;
  return (
    <div className="cc-panel p-5">
      <h2 className="cc-h4 text-[19px]">Your stay</h2>
      <p className="mt-3 font-display text-[34px] font-semibold leading-[38px] text-sea-ink">
        {moneyLabel(chosen.total, chosen.currency)}
      </p>
      <p className="cc-support">
        total for {nights} night{nights === 1 ? '' : 's'}, taxes in · {moneyLabel(chosen.perNight, chosen.currency)} a night
      </p>
      <dl className="mt-4 space-y-2 border-t border-sea-line pt-4 text-[14px]">
        {(
          [
            ['When', dates],
            ['Guests', `${party} · 1 room`],
            ['Room', chosen.roomName],
            ['Board', chosen.board],
            ['Cancellation', cancellationLabel(chosen)],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-sea-soft">{k}</dt>
            <dd className={`text-end font-medium ${k === 'Cancellation' && chosen.refundable ? 'text-ok-ink' : 'text-sea-ink'}`}>{v}</dd>
          </div>
        ))}
      </dl>
      <RateInfoBlock info={chosen.info} className="mt-4" />
      {error && (
        <p role="alert" className="mt-4 rounded-[10px] bg-err-bg px-3 py-2 text-[14px] text-err-ink">
          {error}
        </p>
      )}
      <button type="button" onClick={book} disabled={pending} className="cc-btn-primary mt-5 w-full !rounded-full">
        {pending ? 'Checking the price with the hotel…' : 'Book this room'}
      </button>
      <ul className="mt-5 space-y-2 text-[13px] leading-[18px] text-sea-soft">
        <li className="flex gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-petrol" />
          Confirmed straight away; your card is only charged once the hotel is booked.
        </li>
        <li className="flex gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-petrol" />
          Cancel online from My trips while the hotel’s terms allow.
        </li>
        <li className="flex gap-2">
          <Icon name="check" size={16} className="mt-0.5 shrink-0 text-petrol" />
          A specialist in Dubai on <Link href="tel:+97144206965" className="font-semibold text-petrol">+971 4 420 6965</Link>.
        </li>
      </ul>
    </div>
  );
}
