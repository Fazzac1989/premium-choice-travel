/**
 * Mswipe UAE (utap) — pay by link.
 *
 * The only gateway call this application makes is "please create a payment
 * page for this amount". The customer pays on Mswipe's own hosted page, so
 * no card number, expiry or CVV ever touches our servers or our database.
 *
 * Auth is a short-lived bearer token from /api/login, which the gateway then
 * expects back inside the request body as `SessionToken` rather than in a
 * header. That is their contract, not a mistake on our side.
 *
 * Contract observed against the UAT endpoints on 11 September 2026, not
 * guessed: login takes `user_name`/`user_pwd`; the order takes the fields
 * below; the reply carries `SMSLink`, whose `TransID` query value is the
 * encrypted id a later status check needs.
 */

const HOSTS = {
  uat: 'https://gwuaeuat.mswipedemo.com:8112',
  live: 'https://gwlive.utapbyeand.com',
};

/** Fixed by the gateway's documentation. */
const VERSION = 'VER4.0.0';
const DEFAULT_VALIDITY_MINUTES = 60 * 24;
const TIMEOUT_MS = 30_000;

export type MswipeConfig = {
  baseUrl: string;
  env: 'uat' | 'live';
  userName: string;
  password: string;
  /** The merchant's customer code. */
  custCode: string;
  /** The gateway user id sent as `refid`; defaults to the username. */
  refId: string;
};

export function mswipeConfig(): MswipeConfig | null {
  const userName = process.env.MSWIPE_USER;
  const password = process.env.MSWIPE_PASSWORD;
  const custCode = process.env.MSWIPE_CUST_CODE;
  if (!userName || !password || !custCode) return null;
  const env = process.env.MSWIPE_ENV === 'live' ? 'live' : 'uat';
  return {
    baseUrl: (process.env.MSWIPE_BASE_URL || HOSTS[env]).replace(/\/+$/, ''),
    env,
    userName,
    password,
    custCode,
    refId: process.env.MSWIPE_REF_ID || userName,
  };
}

export function mswipeConfigured() {
  return mswipeConfig() !== null;
}

export class MswipeError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`Mswipe ${status}: ${detail}`.trim());
    this.status = status;
    this.detail = detail;
  }
}

async function post<T = any>(cfg: MswipeConfig, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) throw new MswipeError(res.status, text.slice(0, 300));
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new MswipeError(res.status, `Unreadable reply: ${text.slice(0, 200)}`);
  }
}

/**
 * A session token, reused until shortly before it expires.
 *
 * Cached in memory only — a token is a credential, and one that outlives the
 * process it was minted in has no business in a database.
 */
let cached: { token: string; until: number } | null = null;

export async function mswipeToken(force = false): Promise<string> {
  const cfg = mswipeConfig();
  if (!cfg) throw new Error('Mswipe is not configured — see docs/mswipe.md');
  if (!force && cached && Date.now() < cached.until) return cached.token;

  const json = await post<any>(cfg, '/MswipeGenericAPI/api/login', {
    user_name: cfg.userName,
    user_pwd: cfg.password,
  });
  const token = String(json?.token ?? '');
  if (String(json?.status).toLowerCase() !== 'true' || !token) {
    throw new MswipeError(401, String(json?.response_message ?? 'Login refused'));
  }
  // Trust the token's own expiry where it has one, and stop a minute early.
  let until = Date.now() + 20 * 60_000;
  try {
    const exp = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString())?.exp;
    if (Number.isFinite(exp)) until = Math.min(until, exp * 1000 - 60_000);
  } catch {
    // Not a JWT we can read; the conservative default stands.
  }
  cached = { token, until };
  return token;
}

export type PaymentLinkRequest = {
  /** Our own reference. Comes back on the callback as OrderID. */
  invoiceId: string;
  /** Major units, e.g. 1250.5 for AED 1,250.50. */
  amount: number;
  customerEmail: string;
  customerMobile: string;
  /** Where the gateway posts once the customer pays. */
  callbackUrl: string;
  /** Free-text notes carried through the gateway, e.g. the quote reference. */
  notes?: [string?, string?, string?, string?];
  validityMinutes?: number;
};

export type PaymentLink = {
  txnId: string;
  /** The `TransID` from the link — what a status check needs. */
  encryptedId: string;
  url: string;
  /** The gateway's own wording, useful when a specialist sends the link by hand. */
  message: string;
  expiresAt: string;
  raw: any;
};

/** Pull the encrypted transaction id out of the hosted-page link. */
export function encryptedIdFromLink(link: string): string {
  const m = /[?&]TransID=([^&#]+)/i.exec(link ?? '');
  return m ? decodeURIComponent(m[1]) : '';
}

export async function createPaymentLink(input: PaymentLinkRequest): Promise<PaymentLink> {
  const cfg = mswipeConfig();
  if (!cfg) throw new Error('Mswipe is not configured — see docs/mswipe.md');
  if (!(input.amount > 0)) throw new Error('A payment link needs an amount above zero.');

  const validity = Math.max(5, Math.min(60 * 24 * 7, input.validityMinutes ?? DEFAULT_VALIDITY_MINUTES));
  const send = async (token: string) =>
    post<any>(cfg, '/IPG/IPGEpg/GetPaymentLink', {
      versionNo: VERSION,
      invoice_id: input.invoiceId,
      refid: cfg.refId,
      SessionToken: token,
      mobileNo: input.customerMobile ?? '',
      // The gateway takes the amount as a string in major units.
      amount: input.amount.toFixed(2),
      custCode: cfg.custCode,
      emailId: input.customerEmail ?? '',
      addlNote1: input.notes?.[0] ?? '',
      addlNote2: input.notes?.[1] ?? '',
      addlNote3: input.notes?.[2] ?? '',
      addlNote4: input.notes?.[3] ?? '',
      callBackUrl: input.callbackUrl,
      requestId: `${Date.now()}`,
      linkValidity: String(validity),
    });

  let json = await send(await mswipeToken());
  // A stale token reads as a refusal rather than a 401; one retry settles it.
  if (String(json?.Status).toLowerCase() !== 'true' && /token|session|unauth/i.test(String(json?.ResponseMessage ?? ''))) {
    json = await send(await mswipeToken(true));
  }

  const url = String(json?.SMSLink ?? '');
  if (String(json?.Status).toLowerCase() !== 'true' || !url) {
    throw new MswipeError(Number(json?.ResponseCode ?? json?.Responsecode ?? 502), String(json?.ResponseMessage ?? 'No link returned'));
  }

  return {
    txnId: String(json?.Txn_ID ?? ''),
    encryptedId: encryptedIdFromLink(url),
    url,
    message: String(json?.MessageContent ?? ''),
    expiresAt: new Date(Date.now() + validity * 60_000).toISOString(),
    raw: json,
  };
}

export type PaymentStatus = {
  /** True only when the gateway says the transaction completed. */
  paid: boolean;
  code: string;
  description: string;
  /** The gateway's own timestamp, as it formats it. */
  paidAt: string;
  orderId: string;
  raw: any;
};

/**
 * Ask the gateway what really happened.
 *
 * This is the half that matters: the callback Mswipe posts is unsigned, so
 * anyone who guesses a URL could claim a payment. Nothing is ever marked paid
 * on the strength of that post — only on this answer, which is authenticated
 * with our own credentials against an id we stored ourselves.
 */
export async function checkPaymentStatus(encryptedId: string): Promise<PaymentStatus> {
  const cfg = mswipeConfig();
  if (!cfg) throw new Error('Mswipe is not configured — see docs/mswipe.md');
  if (!encryptedId) throw new Error('A status check needs the transaction id from the link.');

  const ask = async (token: string) =>
    post<any>(cfg, '/IPG/IPGEpg/CheckStatus', { refid: cfg.refId, sessiontoken: token, ipgid: encryptedId });

  let json = await ask(await mswipeToken());
  if (/token|session|unauth/i.test(String(json?.Message ?? ''))) json = await ask(await mswipeToken(true));

  const payload = json?.Payload ?? {};
  const code = String(payload?.Status ?? '');
  return {
    // "0" is the gateway's success code; everything else is not a payment.
    paid: code === '0',
    code,
    description: String(payload?.StatusDesc ?? json?.Message ?? ''),
    paidAt: String(payload?.Txndate ?? ''),
    orderId: String(payload?.OrderID ?? ''),
    raw: json,
  };
}

/** A quick end-to-end proof that the credentials work. Used by the check script. */
export async function mswipePing(): Promise<{ ok: boolean; detail: string }> {
  try {
    const token = await mswipeToken(true);
    return { ok: Boolean(token), detail: `token acquired (${token.length} chars)` };
  } catch (e: any) {
    return { ok: false, detail: String(e?.message ?? e) };
  }
}
