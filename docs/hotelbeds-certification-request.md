# Hotelbeds certification request — email draft

Send from your own mailbox to **apitude@hotelbeds.com**. Fill in the three
bracketed items first (reviewer login, preview link, your contact line).
Everything else is accurate as of 4 September 2026.

---

**Subject:** Certification request — Premium Choice Travel (APItude Hotels, test key)

Dear APItude team,

We have completed our Hotel Booking API and Content API integration on the
test environment and would like to request certification.

**Who we are.** Premium Choice Travel, Dubai (UAE travel agency). The
integration powers our Staycations brand, a directory of 62 UAE hotels at
https://premiumchoicestaycations.com. Source market: AE (UAE residents).

**Workflow (one distribution channel, B2C website with specialist confirmation).**

1. *Availability* (`POST /hotel-api/1.0/hotels`) — one hotel per search, for
   the dates, adults and children (with ages) the customer enters. Results
   are cached server-side for 30 minutes per hotel/dates/party so repeated
   views never repeat the search. The customer sees every room and board
   returned, with cancellation policies, promotions, rate comments (resolved
   through `GET /hotel-content-api/1.0/types/ratecomments`) and taxes payable
   at the hotel. Opaque rates (`packaging: true`) are excluded because we
   sell rooms alone.
2. The customer sends a *booking request* for one rate key. No booking is
   made at this point and no payment is taken online.
3. A specialist reviews the request in our admin. For a rate with
   `rateType = RECHECK` the admin requires a *CheckRate*
   (`POST /hotel-api/1.0/checkrates`) before confirmation; for BOOKABLE
   rates CheckRate is optional and only used when the specialist asks. If a
   rate key has expired, the specialist can run one new availability search
   for the same room; availability is never repeated automatically.
4. The specialist *confirms* (`POST /hotel-api/1.0/bookings`) with the
   holder, all passenger names and children's ages, our client reference
   (`PCS-<id>`), a remark, and `tolerance: 2`. The response is stored in
   full.
5. A *voucher* (PDF) is generated and emailed to the customer immediately:
   hotel name, category, address and phone (from
   `GET /hotel-content-api/1.0/hotels/{code}/details`), holder and passenger
   names with children's ages, Hotelbeds booking reference, our reference,
   check-in/out, room type, board, rate comments, cancellation terms, and
   "Payable through <supplier name>, acting as agent for the service
   operating company, details of which can be provided upon request. VAT:
   <supplier VAT number> Reference: <booking reference>". No price is shown.
6. *Cancellation* (`DELETE /hotel-api/1.0/bookings/{ref}?cancellationFlag=CANCELLATION`)
   from the same admin page; the supplier's reported charge is recorded.

Technical: every request carries `Api-key` and a per-request `X-Signature`,
`Accept-Encoding: gzip`, JSON in and out; booking confirmation timeout is
75 seconds; the content catalogue for the UAE (hotel codes, names,
coordinates) is stored on our side and refreshed on demand.

**Commercial decisions.**
- UAE hotels only (destinations AE1, AUH, DXB, FJR, RKT, SHJ, UMM, AAN).
- Opaque/package rates are not shown.
- One room per booking (no multi-room bookings at present).
- Prices are shown in AED; supplier currency is converted at ECB rates until
  our live contract is set to AED.
- Selling rates: when a `sellingRate` is returned it is shown as is
  (including `hotelMandatory`); otherwise net plus our margin.
- Cancellation policies are shown exactly as returned.
- Content: we use only hotel codes, names, coordinates, address, phone and
  category from the Content API. Hotel photography comes from another
  source.

**Certification URL.** https://premiumchoicestaycations.com — live prices
are behind a preview cookie while the key is a test key. Open this link
once in your browser to switch prices on for that browser:
[ https://premiumchoicestaycations.com/api/rates-preview?key=YOUR_RATES_PREVIEW_KEY ]
Then open any hotel, choose dates and "Show me prices".

**Admin login for the confirmation step.**
https://premium-choice-travel.vercel.app/admin/login
[ reviewer email / password — create a dedicated login for Hotelbeds ]
Booking requests are under "Booking requests"; each request page has the
Hotelbeds panel (Re-check, Search again, Confirm, Voucher, Cancel).

**Other information.** Payment: none required online. Language: English.
Other suppliers: none active on this site (a previous sandbox feed is
disabled). A test booking has already been made and cancelled on the test
environment: reference 148-6139991 (Address Beach Resort, 4–6 December
2026, 2 adults + 1 child aged 7).

Please let us know anything further you need. We are ready for the live
booking test (six months out, 2 adults/2 children, refundable rate, then
cancelled) as soon as live keys are issued.

Kind regards,
[ your name, role, phone ]
Premium Choice Travel, Dubai

---

## Before you send it

1. **Create a reviewer admin login** (do not share your own):

   ```bash
   npx tsx scripts/create-staff.ts hotelbeds-review@premiumchoicetravel.com 'choose-a-strong-password'
   ```

   That creates the login and gives it the admin role. Delete the user in
   Supabase → Authentication → Users once certification is done.
2. **Preview link**: replace `YOUR_RATES_PREVIEW_KEY` with the value of
   `RATES_PREVIEW_KEY` in Vercel. Changing that variable later revokes the
   link.
3. After certification, when live keys arrive: set `HOTELBEDS_API_KEY`,
   `HOTELBEDS_SECRET` and `HOTELBEDS_ENV=live` in Vercel, redeploy, do the
   live test booking from the admin, send them the voucher and price, then
   cancel it from the admin. Only then set `RATES_PUBLIC=1`.
