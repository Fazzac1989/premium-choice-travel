/**
 * Currency conversion for supplier prices.
 *
 * Customers are UAE residents and see dirhams. A bed bank's test account
 * usually answers in euros, and even a live contract can carry the odd
 * dollar rate, so every quote is converted before it is cached or shown.
 *
 * The dirham is pegged to the US dollar (3.6725 since 1997), which means
 * only one live figure is needed: the dollar against everything else, from
 * the European Central Bank's daily reference rates via frankfurter.app —
 * free, keyless and stable. Rates are held in memory for twelve hours.
 *
 * If no rate can be had, the price is left in its own currency rather than
 * invented: a euro figure is honest, a stale dirham figure is not.
 */
import type { RoomOffer } from './types';

export const DISPLAY_CURRENCY = (process.env.RATES_CURRENCY || 'AED').toUpperCase();
/** UAE Central Bank peg. */
const AED_PER_USD = 3.6725;
const RATES_URL = 'https://api.frankfurter.dev/v1/latest?from=USD';
const HOLD_MS = 12 * 3600_000;

/** Units of each currency per one US dollar. */
type UsdRates = Record<string, number>;

let cached: { rates: UsdRates; at: number } | null = null;

async function usdRates(): Promise<UsdRates | null> {
  if (cached && Date.now() - cached.at < HOLD_MS) return cached.rates;
  try {
    const res = await fetch(RATES_URL, { next: { revalidate: 43200 } } as RequestInit);
    if (!res.ok) throw new Error(`FX ${res.status}`);
    const json: any = await res.json();
    const rates: UsdRates = { USD: 1, AED: AED_PER_USD };
    for (const [code, v] of Object.entries(json?.rates ?? {})) {
      if (Number.isFinite(Number(v)) && Number(v) > 0) rates[code.toUpperCase()] = Number(v);
    }
    cached = { rates, at: Date.now() };
    return rates;
  } catch (e: any) {
    console.error('[fx]', e?.message ?? e);
    return cached?.rates ?? null;
  }
}

/** Pure conversion given a USD rate table; null when a currency is unknown. */
export function convertAmount(amount: number, from: string, to: string, rates: UsdRates): number | null {
  const f = rates[from.toUpperCase()];
  const t = rates[to.toUpperCase()];
  if (!f || !t) return null;
  return Math.round((amount / f) * t * 100) / 100;
}

/** The current rate table, for callers that convert several figures at once. */
export async function fxRates(): Promise<UsdRates | null> {
  return usdRates();
}

/** One offer in the display currency; unchanged if it already is, or if no rate exists. */
export function convertOffer(o: RoomOffer, rates: UsdRates, to = DISPLAY_CURRENCY): RoomOffer {
  const conv = (amount: number, from: string) => convertAmount(amount, from, to, rates);
  const sameCurrency = o.currency.toUpperCase() === to;
  const total = sameCurrency ? o.total : conv(o.total, o.currency);
  if (total === null) return o;
  const net = o.net === null ? null : sameCurrency ? o.net : conv(o.net, o.currency);
  return {
    ...o,
    total,
    net: net ?? (sameCurrency ? o.net : null),
    currency: to,
    extraFees: o.extraFees.map((f) => {
      if (f.currency.toUpperCase() === to) return f;
      const amount = conv(f.amount, f.currency);
      return amount === null ? f : { ...f, amount, currency: to };
    }),
  };
}

export async function convertOffers(offers: RoomOffer[], to = DISPLAY_CURRENCY): Promise<RoomOffer[]> {
  if (!offers.length || offers.every((o) => o.currency.toUpperCase() === to && o.extraFees.every((f) => f.currency.toUpperCase() === to))) {
    return offers;
  }
  const rates = await usdRates();
  if (!rates) return offers;
  return offers.map((o) => convertOffer(o, rates, to));
}

/** A headline amount in the display currency, or the original pair if it cannot be converted. */
export async function convertMoney(amount: number, currency: string, to = DISPLAY_CURRENCY): Promise<{ amount: number; currency: string }> {
  if (currency.toUpperCase() === to) return { amount, currency: to };
  const rates = await usdRates();
  const converted = rates ? convertAmount(amount, currency, to, rates) : null;
  return converted === null ? { amount, currency } : { amount: converted, currency: to };
}
