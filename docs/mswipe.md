# Taking payment — Mswipe UAE (utap) pay by link

Premium Choice quotes by hand and is paid afterwards, so the gateway is used
the way that business actually works: a specialist generates a payment link
for an amount owed, the customer pays on Mswipe's own hosted page, and the
instalment marks itself paid when Mswipe confirms it.

There is deliberately **no card form anywhere on the websites**. Card details
never reach our servers or our database, which keeps the compliance burden
small, and it matches what we told Hotelbeds during certification: payment is
not taken online at the point of booking.

## 1. Credentials (you, once)

Mswipe supplies a username, a password and a customer code. Put them in
`.env.local` for local work and in Vercel → Settings → Environment Variables
for the live site, then redeploy — variables only reach a *new* deployment.

```
MSWIPE_USER=…
MSWIPE_PASSWORD=…
MSWIPE_CUST_CODE=…
MSWIPE_ENV=uat          # 'live' once Mswipe issues production endpoints
```

Optional: `MSWIPE_BASE_URL` if they give a host other than the standard one,
and `MSWIPE_REF_ID` if the gateway user id differs from the username.

Until these are set the payment panel in the admin simply says the gateway is
not configured. Nothing else changes.

## 2. Database

Paste `supabase/migrations/020-payment-links.sql` and then
`supabase/migrations/021-booking-payment-links.sql` into the Supabase SQL
editor (both are also at the end of `RUN-ME.sql`). The first adds the
`payment_links` table; the second lets a link belong to a booking request and
records when that booking was paid. Until they are run the admin panels say
what is missing rather than failing silently.

## 3. Prove it works

```bash
npx tsx scripts/mswipe-check.ts --link 10.00
```

Logs in, creates a real test link on the gateway and prints it, plus the
command to check its status later. Nothing is written to the database.

## A Staycations hotel booking, end to end

For a hotel booked through Hotelbeds the money and the voucher are tied
together, and the app does the joining up:

1. The customer picks a room in the Staycations app and sends a request.
2. It arrives in **Admin -> Booking requests**.
3. The specialist fills in the guest names and presses **Confirm with
   Hotelbeds**. The box above the button, ticked by default, says to email a
   payment link and hold the voucher until it is paid.
4. The stay is booked with the hotel. The customer is emailed a payment link
   for the full selling price in dirhams. **No voucher yet.**
5. The link, its amount and its state are shown on the request page. It can be
   copied, re-sent, or checked against the gateway from there.
6. When the payment clears, the request is marked paid and **the voucher is
   emailed automatically**, with the PDF attached as always.

Untick the box to take the money another way; the voucher then goes out the
moment the booking is confirmed, exactly as it did before. If the link cannot
be created at all, the voucher is sent immediately rather than leaving a
paying customer with nothing in their inbox.

**Know this before you use it.** The stay is booked with the hotel before the
money arrives, so its cancellation terms start at confirmation, not at
payment. On a non-refundable rate an unpaid link is our exposure. Give the
link a short validity on those, and watch the payment state on the request.

This flow needs `supabase/migrations/021-booking-payment-links.sql`, which
ties a payment link to a booking request. Until it is run, confirming falls
back to the old behaviour and says so on the page.

## Taking payment on a quote

Open a quote in the admin. Under the payment schedule there is a **Payment
link** panel:

1. Choose which instalment is being paid, or "something else on this quote".
2. Check the amount, the customer's email and mobile, and how long the link
   should stay valid.
3. **Create payment link.** The link appears on screen with a copy button.
   Send it to the customer yourself — the app does not email it, so nothing
   goes out that you have not seen.
4. When the customer pays, the instalment on the schedule above marks itself
   paid, with the method "Card (Mswipe)" and the gateway's payment id as the
   reference.
5. If a customer says they have paid and the panel still says otherwise, use
   **Check with the gateway**.

## How a payment is confirmed, and why it is done that way

Mswipe posts to `/api/payments/mswipe/callback` when a customer finishes on
its page. **That post carries no signature**, so anyone who guessed the URL
could claim a payment. It is therefore treated as a doorbell, never a
receipt:

1. The post tells us one thing we trust — which of our own invoice ids to
   look at.
2. We then call Mswipe's `CheckStatus` ourselves, authenticated with our own
   credentials, against a transaction id we stored when we created the link.
3. Only that answer can set a link to paid, and only `Status: "0"` counts.

A forged callback therefore achieves nothing but a wasted status check. The
same path runs when a specialist presses "Check with the gateway", so a
missed callback never leaves money unrecorded.

## Currency

The gateway settles in dirhams. A quote in any other currency refuses to
generate a link rather than collecting a number nobody agreed; take those by
transfer.

## What the gateway is asked for, and what it returns

Observed against the UAT endpoints on 11 September 2026, not guessed from the
documentation:

| Call | Endpoint | Notes |
|---|---|---|
| Log in | `POST /MswipeGenericAPI/api/login` | `{user_name, user_pwd}` → `{status, token}`. The token is a JWT; we cache it in memory until shortly before it expires |
| Create link | `POST /IPG/IPGEpg/GetPaymentLink` | The token goes in the **body** as `SessionToken`, not a header. Returns `Txn_ID` and `SMSLink`; the link's `TransID` value is the encrypted id a status check needs |
| Check status | `POST /IPG/IPGEpg/CheckStatus` | `{refid, sessiontoken, ipgid}` → `Payload.Status`, where `"0"` means paid |
| Callback | our `/api/payments/mswipe/callback` | `Status`, `TransID`, `OrderID` (our invoice id), `PaymentID`. Unsigned — see above |

## Going live

Mswipe issue production endpoints once the UAT integration is signed off.
When they do: set `MSWIPE_ENV=live` with the production credentials, redeploy,
and take one real payment of a small amount to prove the callback reaches the
live domain. Ask them to rotate the UAT password at the same time.

## Where the code lives

| Piece | File |
|---|---|
| Gateway adapter | `lib/payments/mswipe.ts` |
| Links, verification, marking instalments paid, sending the voucher on payment | `lib/payments/links-core.ts` (wrapped by `links.ts`) |
| Quote admin actions | `lib/admin/payment-link-actions.ts` |
| Quote admin panel | `components/admin/PaymentLinks.tsx` |
| Booking confirm, link and voucher orchestration | `lib/admin/supplier-booking-actions.ts` |
| Booking request panel | `components/admin/SupplierBookingPanel.tsx` |
| Callback | `app/api/payments/mswipe/callback/route.ts` |
| Connectivity check | `scripts/mswipe-check.ts` |
