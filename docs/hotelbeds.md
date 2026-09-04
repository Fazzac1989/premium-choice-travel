# Hotelbeds (APItude) — live hotel prices

Hotelbeds is the bed bank behind the Staycations booking flow: the "Book"
panel on a hotel page, the room options on the booking page, and the price
a specialist sees on a booking request. It replaces the LiteAPI sandbox; the
five LiteAPI codes are parked in `lib/generated/liteapi-parked-codes.json`.

## 1. Get the credentials (you, once)

1. Sign in at https://developer.hotelbeds.com and open the **Dashboard**.
2. Under your application you will see three API keys, one per suite. Take
   the **Hotels** one — the same key serves the Booking API and the Content
   API — together with its **Secret**.
3. Put both in `.env.local`:

   ```
   HOTELBEDS_API_KEY=…
   HOTELBEDS_SECRET=…
   ```

   and in Vercel → Settings → Environment Variables (Production, Preview and
   Development), then redeploy. Environment variables only reach a *new*
   deployment.

Never paste the key or secret anywhere else — the site signs every request
server-side and the browser never sees them.

### Optional variables

| Variable | Meaning |
|---|---|
| `HOTELBEDS_ENV` | `test` (default) or `live` once Hotelbeds certifies the integration |
| `HOTELBEDS_MARKUP_PERCENT` | Margin added to Hotelbeds' net rate for the customer price. Default 15. Ignored when the account returns a `sellingRate` of its own |
| `RATES_CURRENCY` | What customers see. Default `AED`. Supplier prices in any other currency are converted through the dirham's dollar peg using the European Central Bank's daily dollar rate (frankfurter.app, no key); if no rate can be fetched the price stays in the supplier's currency rather than being guessed |
| `RATES_PROVIDER` | Force a provider: `hotelbeds`, `liteapi` or `sample`. Otherwise the first configured one wins, Hotelbeds first |
| `RATES_PUBLIC` | `1` shows prices to everyone; until then only the preview cookie sees them (see `RATES_PREVIEW_KEY`) |

## 2. Prove it works (2 requests)

```bash
npx tsx scripts/hotelbeds-check.ts
```

Calls the status endpoint and, if a hotel is already mapped, one availability
search for the coming weekend, printing the room offers as the site would
show them.

## 3. Map our hotels to Hotelbeds codes (about 10 requests)

```bash
npx tsx scripts/map-hotelbeds-hotels.ts          # report only
npx tsx scripts/map-hotelbeds-hotels.ts --apply  # write supplier codes
```

The script downloads the UAE catalogue once (cached in
`lib/generated/hotelbeds-uae-hotels.json`, so re-runs cost nothing), takes
each of our hotels' coordinates from its Google place id (cached in
`lib/generated/hotel-coords.json`), and accepts a match only when the
Hotelbeds property is within 400 m **and** the names genuinely agree. UAE
resorts cluster, so distance alone is not safe. Anything unmatched stays
priced by hand — add its code in the admin ("Supplier hotel code") once you
have looked it up.

The report is written to `lib/generated/hotelbeds-codes.json`; `--apply`
copies the accepted codes to `hotels.supplier_code`.

## The test environment

- **50 requests a day** on the evaluation key, then HTTP 403 until midnight
  UTC. The site caches every quote for 12 hours and every room search for
  30 minutes, and both scripts cache to disk, so day-to-day use fits — but
  do not loop the check script.
- Test availability is **demo data**: prices are realistic but not bookable,
  and some real hotels return nothing. That is expected.
- The test account's currency is usually EUR. Prices are converted to
  dirhams before they are cached or shown (see `RATES_CURRENCY`). Ask
  Hotelbeds for AED on the live contract anyway — a booking is then priced
  in the currency it is paid in, with no exchange movement between the quote
  and the specialist's confirmation.

## Going live

Hotelbeds needs a signed agreement and a short certification (they review a
sample of the API calls). After that, set `HOTELBEDS_ENV=live` with the
production key and secret, and `RATES_PUBLIC=1` when you are happy for every
visitor to see prices. Booking is still a *request* — a specialist confirms
each one — so nothing here charges a card or holds a room.

## Confirming a booking (specialist-led)

The site never books on its own. A customer's request lands in
**Admin → Booking requests**; the request page has a **Hotelbeds** panel:

1. **Re-check this rate** — asks Hotelbeds to re-price the exact rate key
   (`/checkrates`). Mandatory for a rate Hotelbeds marks `RECHECK`; sensible
   for any request more than a few hours old. Updates the rate comments.
2. **Search again for this room** — a fresh availability search for the same
   dates, party and children's ages, moving the request onto today's rate key
   and price for the room the customer chose. Use it when Hotelbeds says the
   rate key has expired. Tells you if the price moved.
3. **Confirm with Hotelbeds** — lead guest as in the passport, other names
   (optional), children's ages (mandatory), a remark for the hotel, and a
   box confirming the customer has agreed price, terms and rate comments.
   Books with a 2% price tolerance, stores Hotelbeds' full reply on the
   request, sets the request to *confirmed* and emails the voucher (PDF) to
   the customer with a copy to `ENQUIRY_NOTIFY_EMAIL`.
4. After confirmation: **Download voucher**, **Email voucher to customer**
   (re-send), and **Cancel with Hotelbeds** behind a tick box. Cancelling
   stores the supplier's reported charge and closes the request.

Requires migration `supabase/migrations/018-supplier-bookings.sql` (also in
`RUN-ME.sql`). Until it is pasted, the panel's actions stop with a message
saying so; requests and prices are unaffected.

The voucher carries what Hotelbeds' certification lists: hotel name,
category, address and phone (from the Content API at confirmation time),
lead guest, one name per room, children's ages, Hotelbeds reference, our
reference (`PCS-<request id>`), dates, room, board, rate comments, the
cancellation line and "Payable through <supplier>, acting as agent … VAT …
Reference …". No price.

## Certification — where we stand (4 September 2026)

Hotelbeds certifies an integration before issuing live keys
(developer.hotelbeds.com → Hotels → Knowledge Base → Certification process;
requests go to apitude@hotelbeds.com with the workflow description, the
certification URL and any commercial exclusions). They check six areas.
Status of this site against each:

| Area | Requirement | Status |
|---|---|---|
| Technical | Correct headers, GZIP | ✅ `Accept-Encoding: gzip` on every call |
| Workflow | Availability → CheckRate only for `rateType=RECHECK` → Booking; never repeat availability | ✅ availability cached (12 h quotes, 30 min offers); the booking carries the quoted `rateKey`; CheckRate is enforced before a RECHECK rate; a new search only happens when the specialist asks for it |
| Availability | Show room, board, price, dates, category | ✅ |
| | Children need real ages | ✅ collected on the hotel page, carried through the search, the request and the booking |
| | Opaque rates (`packaging: true`) only in packages | ✅ excluded |
| | `sourceMarket` used consistently | ✅ AE, and prices only shown to that market |
| | Cancellation policies shown | ✅ deadline and non-refundable flag, on the page, the request and the voucher |
| | Rate comments shown before confirmation | ✅ resolved from the Content API (or CheckRate) and shown on the room and in the request panel; the specialist sees them again before confirming |
| | Promotions shown (suggested) | ✅ chips on each room |
| | Booking confirmation timeout ≥ 60 s | ✅ 75 s |
| | Respect `hotelMandatory` selling rates | ✅ a supplier `sellingRate` always wins over our margin |
| Voucher | Mandatory for every confirmed booking: hotel name + address, holder and one name per room, children's ages, Hotelbeds reference, dates, room, board, rate comments, "Payable through … VAT … Reference …" line | ✅ PDF emailed on confirmation, downloadable from the request |
| Content | Optional; stored locally, refreshed weekly; say which parts are used | ✅ catalogue stored (`lib/generated/hotelbeds-uae-hotels.json`); we use codes, names, coordinates, and at confirmation the address, phone and category. Photos stay Google's |
| Live environment | One real booking six months out (2 adults, 2 children, refundable rate), send voucher + price, then cancel it | ⏳ after certification — the admin panel does exactly this |

Exercised in the test environment on 4 September 2026: booking
`148-6139856` at Address Beach Resort (2 adults, 1 child aged 7) confirmed
and cancelled through the adapter, supplier "HOTELBEDS DMCC" with its VAT
number in the reply.

**Requesting certification.** Email apitude@hotelbeds.com with: the
workflow above (search → optional re-check → specialist confirms → voucher;
cancellation from the admin), the certification URL
(https://premiumchoicestaycations.com, rates behind the preview cookie —
give them the preview link), an admin login for the request page, and the
commercial notes: UAE hotels only, opaque rates excluded, `sourceMarket` AE,
prices converted to AED, no multi-room bookings.

## Where the code lives

| Piece | File |
|---|---|
| Adapter (availability, offers, check-rate, content) | `lib/rates/hotelbeds.ts` |
| Provider selection + caching | `lib/rates/index.ts` |
| Mapping script | `scripts/map-hotelbeds-hotels.ts` |
| Smoke test | `scripts/hotelbeds-check.ts` |
