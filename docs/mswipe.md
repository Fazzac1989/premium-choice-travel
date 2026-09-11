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

Paste `supabase/migrations/020-payment-links.sql` into the Supabase SQL
editor (it is also at the end of `RUN-ME.sql`). It adds one table,
`payment_links`. Until it is run, the panel cannot save a link and says so.

## 3. Prove it works

```bash
npx tsx scripts/mswipe-check.ts --link 10.00
```

Logs in, creates a real test link on the gateway and prints it, plus the
command to check its status later. Nothing is written to the database.

## Using it

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
| Links, verification, marking instalments paid | `lib/payments/links.ts` |
| Admin actions | `lib/admin/payment-link-actions.ts` |
| Admin panel | `components/admin/PaymentLinks.tsx` |
| Callback | `app/api/payments/mswipe/callback/route.ts` |
| Connectivity check | `scripts/mswipe-check.ts` |
