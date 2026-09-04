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

### How the photos are served — the 30-day cache

Google's terms allow its content to be cached for up to 30 days, so the
websites never stream photos from Google directly. Each photo is copied once
into our own Supabase Storage (`images/places/…`), served from there for
free, and re-fetched before it is 30 days old. That is roughly one Google
call per photo per month — inside the free allowance — instead of one call
per view per image size, which is what ran the bill up.

The copies live on the hotel rows themselves: every entry in `hotels.photos`
and every restaurant with a photo carries `url`, `path` and `cachedAt`.

- **Daily refresh** — `/api/cron/place-photo-cache` runs at 02:00 UTC
  (schedule in `vercel.json`) and renews the oldest copies first, up to 40
  a run. Set `CRON_SECRET` in Vercel if you want the endpoint locked to
  Vercel's scheduler; without it, an outsider can at most bring a refresh
  forward.
- **First fill / catch-up** — from your machine:

  ```bash
  npx tsx scripts/place-photo-cache.ts
  ```

  `--budget 100` caps the number of fetches; `--only atlantis` limits it to
  one hotel.

If a photo handle has expired on Google's side, the refresh renews the
hotel's handles (a free lookup) and caches the new pictures on the next run.
A restaurant whose handle expired loses its photo until
`scripts/hotel-photos.ts --refresh` finds it again.

### Streaming live from Google (normally off)

The old live proxy (`/api/place-photo`) still exists for a photo that has not
been cached yet, but it only runs when `PLACES_PHOTOS=on` is set next to the
key in Vercel — every image it serves is a billed request. Leave it off; the
cache covers everything. `/api/health` reports `placesPhotos` so you can see
which state a deployment is in.

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
