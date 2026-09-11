/**
 * The payment gateway seam.
 *
 * Everything above this file — payment links on quotes, the booking flow that
 * emails a link and releases the voucher when it is paid — is written against
 * these three functions and knows nothing about any particular provider.
 *
 * **There is no provider behind it at the moment.** The previous gateway was
 * removed and Mamo Pay is expected to take its place. Until one is written,
 * `paymentsConfigured()` is false, the admin panels say so, and nothing can
 * create a link or claim a payment.
 *
 * To add one, write `lib/payments/<provider>.ts` exporting an object of type
 * `PaymentGateway`, list it in `GATEWAYS` below, and add its callback route at
 * `app/api/payments/<provider>/callback/route.ts`. Nothing else changes.
 *
 * Two rules any implementation must keep:
 *
 *  1. A callback is a doorbell, never a receipt. It may only tell us which of
 *     our own invoice ids to look at. Whether money arrived is decided by
 *     `status()`, which we call ourselves with our own credentials.
 *  2. No card details ever reach this application. The customer pays on the
 *     provider's own hosted page.
 */

export type PaymentLinkRequest = {
  /** Our own reference. The provider must return it on the callback. */
  invoiceId: string;
  /** Major units, e.g. 1250.5 for AED 1,250.50. */
  amount: number;
  customerEmail: string;
  customerMobile: string;
  /** Where the provider posts once the customer pays. */
  callbackUrl: string;
  /** Free-text notes carried through the provider, e.g. the quote reference. */
  notes?: [string?, string?, string?, string?];
  validityMinutes?: number;
};

export type PaymentLink = {
  /** The provider's own id for the transaction, for their dashboard. */
  txnId: string;
  /** Whatever a later status check needs. Stored as `encrypted_id`. */
  statusId: string;
  url: string;
  /** The provider's wording, useful when a specialist sends the link by hand. */
  message: string;
  expiresAt: string;
  raw: any;
};

export type PaymentStatus = {
  /** True only when the provider says the transaction completed. */
  paid: boolean;
  code: string;
  description: string;
  paidAt: string;
  orderId: string;
  raw: any;
};

export type PaymentGateway = {
  /** Lower-case slug, also the folder name of its callback route. */
  name: string;
  /** How it is written when a human reads it. */
  label: string;
  /** Which environment its credentials point at, e.g. 'uat' or 'live'. */
  env: string;
  /** The currency it settles in. A link in anything else is refused. */
  currency: string;
  createLink(input: PaymentLinkRequest): Promise<PaymentLink>;
  status(statusId: string): Promise<PaymentStatus>;
  /** A cheap round trip to prove the credentials work. */
  ping(): Promise<{ ok: boolean; detail: string }>;
};

/** Providers that are built and can be selected by their credentials. */
const GATEWAYS: Array<() => PaymentGateway | null> = [
  // Mamo Pay goes here.
];

/** The gateway this deployment is configured for, or null when there is none. */
export function paymentGateway(): PaymentGateway | null {
  for (const load of GATEWAYS) {
    const g = load();
    if (g) return g;
  }
  return null;
}

export function paymentsConfigured() {
  return paymentGateway() !== null;
}

/** What to tell a specialist when there is nothing to take money with. */
export const NO_GATEWAY =
  'No payment gateway is configured on this deployment — see docs/payments.md. Take the money another way for now.';

/** Where a provider posts when a customer pays. */
export function paymentCallbackPath(gateway: PaymentGateway) {
  return `/api/payments/${gateway.name}/callback`;
}

/** How a card payment is recorded against an instalment. */
export function paymentMethodLabel(gateway: PaymentGateway | null) {
  return gateway ? `Card (${gateway.label})` : 'Card';
}

export async function createPaymentLink(input: PaymentLinkRequest): Promise<PaymentLink> {
  const gateway = paymentGateway();
  if (!gateway) throw new Error(NO_GATEWAY);
  if (!(input.amount > 0)) throw new Error('A payment link needs an amount above zero.');
  return gateway.createLink(input);
}

export async function checkPaymentStatus(statusId: string): Promise<PaymentStatus> {
  const gateway = paymentGateway();
  if (!gateway) throw new Error(NO_GATEWAY);
  if (!statusId) throw new Error('A status check needs the transaction id from the link.');
  return gateway.status(statusId);
}
