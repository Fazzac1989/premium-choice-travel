# Hotelbeds scope change — email draft

Send from your own mailbox to **apitude@hotelbeds.com**, replying on the
certification thread if it is still open so the two are read together.

Our certification request declared **UAE hotels only**, enumerated by
destination code. We now intend to sell Oman and Saudi Arabia to the same
customers, so the declared scope has to change before the hotels go live.
That is what this email does.

Two things to be clear about internally before it goes:

- **The source market stays AE.** It describes the buyer, not the hotel. Our
  customers are UAE residents whether they are booking Dubai or Muscat, and
  changing it would change the rates we are offered.
- **Nothing outside the UAE is published until they reply.** The hotels can
  sit in the directory as drafts; the directory's own status field keeps them
  off the website.

---

**Subject:** Scope change — Premium Choice Travel (APItude Hotels): adding Oman and Saudi Arabia

Dear APItude team,

Further to our certification request, we would like to extend the commercial
scope we declared. Nothing about the integration itself changes: the same
workflow, the same source market, the same one-room, non-opaque, specialist-
confirmed model.

**What changes.** We declared UAE hotels only. We would like to add Oman and
Saudi Arabia, sold to the same AE source market, on the same terms.

Destinations we expect to sell:

- **Oman** — MCT (Muscat), SLL (Salalah), KHS (Musandam, Khasab), OM1
  (Nizwa), SR3 (Sur), DQM (Duqm Area).
- **Saudi Arabia** — RUH (Riyadh), JED (Jeddah), U1L (Al-Ula), RTD (The Red
  Sea), DMM (Dammam and East Coast), AHB (Abha), TIF (Taif).

**What does not change.**

- Source market remains **AE**. Our customers are UAE residents; the
  destination is what is widening, not the market.
- One distribution channel, the same B2C website with specialist
  confirmation.
- Opaque and package rates remain excluded.
- One room per booking.
- Prices shown in AED, converted at ECB rates until our contract currency is
  set.
- The same directory model: a curated list of properties we have researched,
  each mapped to your hotel code, not a catalogue dump.

**Why.** Our customers are UAE residents who drive to Oman and fly to Saudi
Arabia for the same kind of short break they take inside the Emirates. They
are the same trips, priced the same way, sold by the same specialists.

Please confirm whether this needs anything from us beyond this notification,
and whether it affects the certification currently in progress. We will not
publish any non-UAE property until you have confirmed.

Kind regards,

[your name, title, phone, company registration line]

---

## After they reply

1. Update the **Commercial decisions** section of
   `docs/hotelbeds-certification-request.md` so the two documents agree.
2. Update `docs/hotelbeds.md`, which says "UAE hotels only" in the commercial
   notes and describes the cached catalogue as the UAE one.
3. Rebuild the catalogue cache for the new countries with
   `scripts/map-hotelbeds-hotels.ts`, which now takes a country code.
4. Publish the hotels by moving them from draft to published in the admin.
