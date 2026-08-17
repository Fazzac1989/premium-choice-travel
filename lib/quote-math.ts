import type { ItineraryDay } from '@/lib/types';

/** Pure quote types + arithmetic — importable from both server and client code. */

export type QuoteLine = {
  id?: number;
  description: string;
  qty: number;
  unitCost: number;
  markupPct: number;
};

export type Quote = {
  id: number;
  ref: string;
  publicToken: string;
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired';
  title: string;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  packageId: number | null;
  travelDates: string | null;
  validity: string | null;
  adults: number | null;
  children: number | null;
  notes: string | null;
  currency: string;
  defaultMarkupPct: number;
  heroImage: string | null;
  images: string[];
  itinerary: ItineraryDay[];
  inclusions: string[];
  exclusions: string[];
  terms: string[];
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  lines: QuoteLine[];
};

export const sellUnit = (l: QuoteLine) => l.unitCost * (1 + l.markupPct / 100);
export const lineTotal = (l: QuoteLine) => l.qty * sellUnit(l);
export const quoteTotal = (lines: QuoteLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0);
export const quoteCost = (lines: QuoteLine[]) => lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

export const travellerCount = (q: Pick<Quote, 'adults' | 'children'>) =>
  (q.adults ?? 0) + (q.children ?? 0);

export const perPerson = (q: Quote) => {
  const n = travellerCount(q);
  return n > 0 ? quoteTotal(q.lines) / n : null;
};

export const formatMoney = (currency: string, n: number) =>
  `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const DEFAULT_TERMS = [
  'This quotation is valid until the date shown; after this, prices and availability are subject to change.',
  'A non-refundable deposit of 25% confirms the booking; the balance is due 45 days before departure.',
  'Prices are per the group size shown and may change if traveller numbers change.',
  'Passports must be valid for at least 6 months beyond the return date. Visa requirements are the traveller’s responsibility — we are happy to advise.',
  'Comprehensive travel insurance is strongly recommended and can be arranged by Premium Choice Travel.',
  'All services are subject to the terms of Premium Choice Travel JLT and its suppliers.',
];
