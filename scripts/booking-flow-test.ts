/**
 * End-to-end test of the Staycations booking flow, against the live database,
 * the Hotelbeds test environment and whichever payment gateway is
 * configured. With no gateway configured the payment steps are skipped and
 * the voucher goes out at confirmation, which is the fallback behaviour.
 *
 *   npx tsx <this> --search              # availability only, no booking
 *   npx tsx <this> --book                # search, book, link, email
 *   npx tsx <this> --check <requestId>   # ask the gateway, send voucher if paid
 *   npx tsx <this> --cancel <requestId>  # cancel with Hotelbeds, tidy up
 *
 * It calls exactly the functions the admin's buttons call, so a pass here is
 * a pass for the panel. It writes a real booking_requests row and makes a
 * real (test-environment) supplier booking. Use --cancel when done.
 */
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

import { hotelbedsSearchMany, hotelbedsWithComments } from '../lib/rates/hotelbeds';
import { convertOffers } from '../lib/rates/fx';
import { cancelRequest, confirmRequest, emailVoucherFor, loadRequest, money } from '../lib/rates/supplier-booking';
import { createLinkForBooking, emailPaymentRequest, listLinksForBooking, verifyLink } from '../lib/payments/links-core';
import { paymentGateway } from '../lib/payments/gateway';

const args = process.argv.slice(2);
const has = (n: string) => args.includes(n);
const arg = (n: string) => (has(n) ? String(args[args.indexOf(n) + 1] ?? '') : '');

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

// A test customer, not a real one. The address is ours.
const TEST_EMAIL = 'chris.farrell2602@gmail.com';
const TEST_NAME = 'Flow Test';

function inDays(n: number) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function line(s = '') {
  console.log(s);
}

async function pickOffer() {
  const { data: hotels } = await db
    .from('hotels')
    .select('id, name, emirate, supplier_code')
    .not('supplier_code', 'is', null)
    .order('id');
  const candidates = (hotels ?? []).filter((h: any) => /^[0-9]+$/.test(String(h.supplier_code)));
  if (!candidates.length) throw new Error('No hotel carries a numeric Hotelbeds code — run scripts/map-hotelbeds-hotels.ts.');

  // The test environment is thin, so ask about every mapped hotel at once.
  // That is one request, the same call the results page makes.
  const checkIn = arg('--date') || inDays(60);
  line(`Searching ${candidates.length} mapped hotels for ${checkIn}, 1 night, 2 adults...`);
  const byCode = await hotelbedsSearchMany(
    { checkIn, nights: 1, adults: 2, children: 0, childrenAges: [] } as any,
    candidates.map((h: any) => Number(h.supplier_code)),
  );
  line(`  ${byCode.size} hotel(s) have availability.`);
  if (!byCode.size) throw new Error('No availability anywhere on that date. Try --date YYYY-MM-DD.');

  for (const hotel of candidates) {
    const raw = byCode.get(Number(hotel.supplier_code));
    if (!raw?.length) continue;
    // Refundable first: this is a test booking and it will be cancelled.
    const withText = await hotelbedsWithComments(raw, checkIn);
    const offers = await convertOffers(withText);
    const sorted = [...offers].sort(
      (a, b) => Number(b.refundable === true) - Number(a.refundable === true) || a.total - b.total,
    );
    if (sorted.length) return { hotel, checkIn, offer: sorted[0], count: offers.length };
  }
  throw new Error('Availability came back but no offer survived conversion.');
}

async function doSearch() {
  const { hotel, checkIn, offer, count } = await pickOffer();
  line();
  line(`${count} offers. Cheapest ${offer.refundable === true ? 'refundable' : 'available'} one:`);
  line(`  ${offer.roomName} - ${offer.board}`);
  line(`  sell ${money(offer.total, offer.currency)} | net ${offer.net ? money(offer.net, offer.currency) : 'n/a'} | ${offer.rateType ?? 'BOOKABLE'}`);
  line(`  ${offer.refundable === true ? `refundable${offer.cancelBy ? ` until ${offer.cancelBy}` : ''}` : 'non-refundable'}`);
  return { hotel, checkIn, offer };
}

async function doBook() {
  const { hotel, checkIn, offer } = await doSearch();
  if (offer.currency !== 'AED') throw new Error(`Offer is in ${offer.currency}; this test expects the AED display currency.`);

  const fees = offer.extraFees.map((f) => `${f.currency} ${f.amount} ${f.description}`).join(', ');
  const { data: inserted, error } = await db
    .from('booking_requests')
    .insert({
      hotel_id: hotel.id,
      hotel_name: hotel.name,
      emirate: hotel.emirate,
      check_in: checkIn,
      nights: 1,
      adults: 2,
      children: 0,
      room_name: offer.roomName,
      board: offer.board,
      refundable: offer.refundable,
      cancel_by: offer.cancelBy,
      currency: offer.currency,
      amount: offer.total,
      net_amount: offer.net,
      extra_fees: fees || null,
      offer_id: offer.offerId,
      provider: 'hotelbeds',
      name: TEST_NAME,
      email: TEST_EMAIL,
      phone: '+971500000000',
      channel: 'email',
      notes: 'Automated end-to-end test of the payment-link flow. Cancel after.',
      status: 'new',
      children_ages: null,
      rate_comments: offer.comments ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(`Could not create the request: ${error.message}`);
  line();
  line(`Request #${inserted.id} created - /admin/requests/${inserted.id}`);

  line();
  line('Confirming with Hotelbeds, voucher held back...');
  const out = await confirmRequest(db, inserted, {
    holder: { name: 'Flow', surname: 'Test' },
    paxes: [
      { type: 'AD', name: 'Flow', surname: 'Test' },
      { type: 'AD', name: 'Second', surname: 'Test' },
    ],
    remark: 'Integration test - please ignore.',
    skipVoucher: true,
  });
  line(`  ${out.ok ? 'OK' : 'FAILED'}: ${out.note}`);
  if (!out.ok) process.exit(1);

  const fresh = await loadRequest(db, inserted.id);
  if (fresh.voucher_sent_at) throw new Error('The voucher was sent despite skipVoucher - that is the bug this flow exists to avoid.');
  line('  voucher_sent_at is empty, as it should be.');

  if (!paymentGateway()) {
    line();
    line('No payment gateway is configured, so there is no link to create.');
    line('Sending the voucher instead, which is what the admin does in this case...');
    const sent = await emailVoucherFor(db, fresh);
    line(`  ${sent.ok ? `voucher emailed to ${fresh.email}` : `voucher NOT emailed: ${sent.error}`}`);
    line();
    line(`When finished:  --cancel ${inserted.id}`);
    return;
  }
  line();
  line('Creating the payment link...');
  const link = await createLinkForBooking(db, {
    request: fresh,
    createdBy: 'booking-flow-test',
    siteUrl: 'https://www.premiumchoicetravel.com',
    validityMinutes: 72 * 60,
  });
  if (!link.ok) throw new Error(link.error);
  line(`  link #${link.link.id} for AED ${link.link.amount} | invoice ${link.link.invoiceId}`);
  line(`  ${link.link.url}`);

  const after = await loadRequest(db, inserted.id);
  line(`  booking_requests.payment_link_id = ${after.payment_link_id} (expected ${link.link.id})`);
  const listed = await listLinksForBooking(db, inserted.id);
  line(`  the request page would show ${listed.length} link(s).`);

  line();
  line('Emailing the payment request...');
  const mail = await emailPaymentRequest(after, link.link);
  line(`  ${mail.ok ? `sent to ${after.email}` : `NOT sent: ${mail.error}`}`);

  line();
  line('Asking the gateway whether it has been paid (it should say no)...');
  const check = await verifyLink(db, link.link.id);
  line(`  status ${check.status}: ${check.detail}`);
  const unpaid = await loadRequest(db, inserted.id);
  line(`  paid_at = ${unpaid.paid_at ?? 'null'} | voucher_sent_at = ${unpaid.voucher_sent_at ?? 'null'}`);

  line();
  line(`Pay the link above with a test card, then:  --check ${inserted.id}`);
  line(`When finished:                              --cancel ${inserted.id}`);
}

async function doCheck(id: number) {
  const links = await listLinksForBooking(db, id);
  if (!links.length) throw new Error('No payment link on that request.');
  const r = await verifyLink(db, links[0].id);
  line(`status ${r.status}: ${r.detail}`);
  const row = await loadRequest(db, id);
  line(`paid_at = ${row.paid_at ?? 'null'} | voucher_sent_at = ${row.voucher_sent_at ?? 'null'}`);
}

async function doCancel(id: number) {
  const row = await loadRequest(db, id);
  const out = await cancelRequest(db, row);
  line(`${out.ok ? 'OK' : 'FAILED'}: ${out.note}`);
}

async function main() {
  const gateway = paymentGateway();
  line(`Payment gateway: ${gateway ? `${gateway.label} (${gateway.env})` : 'none configured'}`);
  line(`Hotelbeds: ${process.env.HOTELBEDS_ENV ?? 'test'}`);
  line();
  if (has('--cancel')) return doCancel(Number(arg('--cancel')));
  if (has('--check')) return doCheck(Number(arg('--check')));
  if (has('--book')) return doBook();
  await doSearch();
}

main().catch((e) => {
  console.error(`\nFAILED: ${e?.message ?? e}`);
  process.exit(1);
});
