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

## Where the code lives

| Piece | File |
|---|---|
| Adapter (availability, offers, check-rate, content) | `lib/rates/hotelbeds.ts` |
| Provider selection + caching | `lib/rates/index.ts` |
| Mapping script | `scripts/map-hotelbeds-hotels.ts` |
| Smoke test | `scripts/hotelbeds-check.ts` |
