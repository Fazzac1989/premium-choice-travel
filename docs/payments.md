# Taking payment

Premium Choice quotes by hand and is paid afterwards, so payment works the way
that business actually does: a specialist generates a link for an amount owed,
the customer pays on the provider's own hosted page, and what they paid marks
itself off here once the provider confirms it.

There is deliberately **no card form anywhere on the websites**. Card details
never reach our servers or our database, which keeps the compliance burden
small, and it matches what we told Hotelbeds during certification: payment is
not taken online at the point of booking.

## There is no provider at the moment

The previous gateway was removed. Mamo Pay is expected to replace it. Until a
provider is written:

- The payment panels in the admin say a gateway is not configured.
- No link can be created and nothing can be marked paid.
- Confirming a booking emails the voucher straight away, which is exactly how
  it behaved before payment links existed.

Nothing else is affected. The `payment_links` table, the booking flow and the
admin panels are all still in place and provider-neutral.

## Adding a provider

Everything above the gateway is written against `lib/payments/gateway.ts` and
knows nothing about any particular company. To add one:

1. Write `lib/payments/<provider>.ts` exporting an object of type
   `PaymentGateway`: `name`, `label`, `env`, `currency`, `createLink`,
   `status` and `ping`.
2. Add it to the `GATEWAYS` list in `lib/payments/gateway.ts`. It should
   return `null` when its credentials are absent, so an unconfigured
   deployment simply has no gateway.
3. Add its callback route at
   `app/api/payments/<provider>/callback/route.ts`. The path is derived from
   `name`, so the two must match.
4. Put the credentials in `.env.local` and in Vercel, then redeploy.
   Variables only reach a *new* deployment.

### Two rules the implementation must keep

**A callback is a doorbell, never a receipt.** Assume it is unsigned and that
anyone could send it. It may tell us one thing only: which of our own invoice
ids to look at. Whether money actually arrived is decided by `status()`, which
we call ourselves against the provider with our own credentials. `verified_at`
in the database is set by that second answer and nothing else. If the provider
does offer a signed webhook, verify the signature and still confirm with a
status call before releasing anything.

**No card details touch this application.** The customer always pays on the
provider's hosted page.

## Currency

A gateway declares the currency it settles in. A quote or a booking in any
other currency refuses to generate a link rather than collecting a number
nobody agreed. Take those by transfer.

## A Staycations hotel booking, end to end

Once a provider is in place, the money and the voucher are tied together:

1. The customer picks a room in the Staycations app and sends a request.
2. It arrives in **Admin -> Booking requests**.
3. The specialist fills in the guest names and presses **Confirm with
   Hotelbeds**. The box above the button, ticked by default, says to email a
   payment link and hold the voucher until it is paid.
4. The stay is booked with the hotel. The customer is emailed a payment link
   for the full selling price. **No voucher yet.**
5. The link, its amount and its state are shown on the request page. It can be
   copied, re-sent, or checked against the provider from there.
6. When the payment clears, the request is marked paid and **the voucher is
   emailed automatically**, with the PDF attached as always.

Untick the box to take the money another way; the voucher then goes out at
confirmation. If the link cannot be created at all, the voucher is sent
immediately rather than leaving a paying customer with nothing in their inbox.

**Know this before you use it.** The stay is booked with the hotel before the
money arrives, so its cancellation terms start at confirmation, not at
payment. On a non-refundable rate an unpaid link is our exposure. Give the
link a short validity on those, and watch the payment state on the request.

## Taking payment on a quote

Open a quote in the admin. Under the payment schedule there is a **Payment
link** panel:

1. Choose which instalment is being paid, or "something else on this quote".
2. Check the amount, the customer's email and mobile, and how long the link
   should stay valid.
3. **Create payment link.** The link appears on screen with a copy button.
   Send it to the customer yourself.
4. When the customer pays, the instalment on the schedule above marks itself
   paid, with the gateway's payment id as the reference.
5. If a customer says they have paid and the panel still says otherwise, use
   **Check with the gateway**.

## Database

Two migrations, both already applied, both in `supabase/RUN-ME.sql`:

| Migration | What it adds |
|---|---|
| `020-payment-links.sql` | the `payment_links` table |
| `021-booking-payment-links.sql` | a link can belong to a booking request, and the request records when it was paid |

Neither is provider-specific, so a new gateway needs no migration.

## Testing the booking flow

```bash
npx tsx scripts/booking-flow-test.ts --search
```

`--search` only looks. `--book` runs the real thing end to end: a request row,
a supplier booking, a payment link and the email, then it prints `--check` and
`--cancel` commands for afterwards. With no gateway configured it books and
sends the voucher, which is the fallback path. It calls the same functions the
admin buttons call, so a pass there is a pass for the panel.

## Where the code lives

| Piece | File |
|---|---|
| The provider seam, and the rules | `lib/payments/gateway.ts` |
| Links, verification, marking instalments paid, sending the voucher on payment | `lib/payments/links-core.ts` (wrapped by `links.ts`) |
| Quote admin actions | `lib/admin/payment-link-actions.ts` |
| Quote admin panel | `components/admin/PaymentLinks.tsx` |
| Booking confirm, link and voucher orchestration | `lib/admin/supplier-booking-actions.ts` |
| Booking request panel | `components/admin/SupplierBookingPanel.tsx` |
| End-to-end test | `scripts/booking-flow-test.ts` |
