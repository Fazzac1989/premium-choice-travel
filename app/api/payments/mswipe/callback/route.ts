import { NextRequest, NextResponse } from 'next/server';
import { handleCallback } from '@/lib/payments/links';

/**
 * Where Mswipe posts when a customer finishes on its hosted page.
 *
 * The post is unsigned, so it is treated as a doorbell rather than a receipt:
 * it tells us which of our own invoice ids to look at, and we then ask the
 * gateway ourselves, with our own credentials, whether the money arrived.
 * A forged post therefore achieves nothing except a wasted status check.
 *
 * Always answers 200. A gateway that reads an error here tends to retry for
 * hours, and there is nothing the sender could do about our problems anyway.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The gateway posts form-encoded or JSON depending on the integration. */
async function readBody(req: NextRequest): Promise<Record<string, string>> {
  const type = req.headers.get('content-type') ?? '';
  try {
    if (type.includes('application/json')) {
      const json = await req.json();
      return Object.fromEntries(Object.entries(json ?? {}).map(([k, v]) => [k, String(v ?? '')]));
    }
    const form = await req.formData();
    return Object.fromEntries(Array.from(form.entries()).map(([k, v]) => [k, String(v)]));
  } catch {
    return {};
  }
}

function pick(body: Record<string, string>, ...names: string[]): string {
  const lower = Object.fromEntries(Object.entries(body).map(([k, v]) => [k.toLowerCase(), v]));
  for (const n of names) {
    const v = lower[n.toLowerCase()];
    if (v) return v;
  }
  return '';
}

export async function POST(req: NextRequest) {
  const body = { ...Object.fromEntries(req.nextUrl.searchParams.entries()), ...(await readBody(req)) };
  const orderId = pick(body, 'OrderID', 'Order_ID', 'orderid', 'invoice_id');
  const paymentId = pick(body, 'PaymentID', 'payment_id');

  // Never log a whole gateway body: it can carry customer contact details.
  console.log('[mswipe callback]', JSON.stringify({ orderId, paymentId, status: pick(body, 'Status') }));

  try {
    const result = await handleCallback(orderId, paymentId);
    return NextResponse.json({ received: true, ...result });
  } catch (e: any) {
    console.error('[mswipe callback]', e?.message ?? e);
    return NextResponse.json({ received: true, status: 'error' });
  }
}

/** Some gateways probe the URL with a GET before using it. */
export function GET() {
  return NextResponse.json({ ok: true, endpoint: 'mswipe callback' });
}
