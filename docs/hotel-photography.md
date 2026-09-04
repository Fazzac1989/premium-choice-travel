# Real photography for the Staycations hotel directory

## Why not stock photos

Every other part of the site can use beautiful stock scenery, because a photo of
a beach in Thailand illustrating a Thailand holiday is honest.

A hotel directory is different. Somebody comparing Atlantis with Anantara is
choosing between two real buildings. A stock "luxury suite" captioned *Royal
Bridge Suite* is not decoration — it is a false claim about a room they are
about to pay for. So the directory only ever shows pictures of the actual
property.

There are three legitimate sources for that. We use them in this order.

---

## 1. Google Places — live now, covers hotels and restaurants

Real photographs of each hotel and of each restaurant inside it. Free-tier
generous, quick to switch on. This is what the code is already built for.

### Getting the key (about ten minutes)

1. Go to **https://console.cloud.google.com** and sign in with a Google account
   for the business.
2. Top-left, click the project dropdown → **New Project**. Name it
   `Premium Choice Travel`. Click **Create**, then make sure it is selected.
3. In the search bar at the top, type **Places API (New)** and open it. Click
   **Enable**. (It will ask you to set up billing — Google gives a large free
   monthly credit and our usage sits well inside it. There is no charge unless
   you exceed it, and you can set a cap in step 6.)
4. In the search bar type **Credentials** → **Create credentials** → **API key**.
   Copy the key it shows you.
5. Click **Edit API key** on that same key and lock it down:
   - *API restrictions* → **Restrict key** → tick **Places API (New)**.
   - Leave *Application restrictions* as **None** (the key is used from our
     server, not from a browser, so an IP or referrer restriction would break it).
6. Optional but sensible: **Billing → Budgets & alerts → Create budget**, set it
   to something like $25/month so you are emailed if usage ever climbs.

### Adding the key

**Locally** — open `.env.local` in the project and add a line:

```
GOOGLE_PLACES_API_KEY=paste-the-key-here
```

**On the live site** — Vercel → the `premium-choice-travel` project →
**Settings** → **Environment Variables** → **Add New**:

- Name: `GOOGLE_PLACES_API_KEY`
- Value: the key
- Environments: tick **Production**, **Preview** and **Development**

Then **Deployments** → the top deployment → **⋯** → **Redeploy**. Environment
variables only reach a *new* deployment.

### Switching the live photos on and off

Every photo the websites show is a billed Place Photo request, and Next's
image optimiser fetches each photo once per rendered width, so a busy
directory (or a crawler) can run the bill up quickly. Because of that the
live photos are **off by default** — the key on its own only lets the
script below look hotels up.

To show Google photos on the websites, add a second variable next to the key
(Vercel → Settings → Environment Variables, then redeploy):

```
PLACES_PHOTOS=on
```

Remove it (or set anything other than `on`) to switch the photos off again
without touching the key. `/api/health` reports `placesPhotos` so you can see
which state a deployment is in. While off, hotel pages show curated images
where they exist and the branded name panel where they do not.

### Running it

```bash
npx tsx scripts/hotel-photos.ts
```

That finds each hotel on Google, stores its place id and photo handles, and
looks up every restaurant we list inside it as its own place — so Nobu gets
Nobu's photographs, not a lobby shot. Any venue Google cannot confirm is inside
the right hotel is left without a photo rather than given the wrong one.

Re-run it monthly (`--refresh`) — Google only permits short-term caching of its
image handles, so they need renewing.

### What this does not cover

**Room-category photography.** Google's photos have no labels, so there is no
honest way to say *this* anonymous suite photo is the *Royal Bridge Suite*.
Room images come from source 2 or 3 below.

---

## 2. Bed-bank content feed — the proper long-term answer

When the bed bank goes in (Hotelbeds APItude, TBO, RateHawk and similar all do
this), its **content API** ships the hotel's own image library already tagged by
category: exterior, lobby, pool, *and room type*. That is the only source that
can caption a room photo truthfully, and it arrives licensed for us to display
as a seller.

The directory is already shaped for it — `room_types` is a list of
`{ heading, body }`, and adding a `photo` field to each is a one-line change,
exactly as was done for restaurants.

## 3. Hotel media kits — best quality, worth doing for the top twenty

As a licensed travel company, Premium Choice can ask each hotel's PR or trade
sales contact for their **media kit** or **image library** — professionally shot,
high resolution, and explicitly cleared for partner use. Slow (a few days each),
but the results beat both sources above.

Worth doing by hand for the properties that sell hardest — the Atlantis pair,
Jumeirah, Anantara, the Ritz-Carltons, Waldorf RAK — and letting Places cover
the long tail.
