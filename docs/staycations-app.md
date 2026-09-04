# The Staycations app

premiumchoicestaycations.com installs as an app (a Progressive Web App). It
is the same website, so every hotel, photo and enquiry form is shared with
the site — there is no second codebase and nothing new in the admin.

## What the app does differently

- **Opens on the hotel list.** The manifest's start page is `/hotels`; the
  brand front page is never shown inside the app, and the logo goes to the
  hotels when running as an app.
- **Bottom tab bar** — Hotels · Saved · Enquiries · Call us — appears only
  in app mode (`display-mode: standalone`); the website is unchanged. The
  marketing footer is hidden in app mode for the same reason.
- **Saved hotels** (`/hotels/saved`) — the heart on every card and hotel
  page keeps a shortlist in the browser. No account needed; it stays on the
  device.
- **My enquiries** (`/enquiries`) — every availability request sent from
  the device is listed with its dates and party. The enquiry itself still
  goes to Supabase and the specialist inbox exactly as before.
- **Offline** — the service worker (`public/sw.js`) serves an offline page,
  reopens hotel pages already visited, and keeps the shortlist working.
  Pages are always fetched from the network first, so nothing goes stale.
- **Install prompt** — on Android/desktop Chrome a small card offers
  "Install"; on iPhone Safari it explains Share → Add to Home Screen (Safari
  has no install button). Dismissing hides it for two weeks.

## Files

| Piece | Where |
|---|---|
| Manifest (host-aware) | `app/manifest.webmanifest/route.ts` |
| Service worker | `public/sw.js` — bump `VERSION` when its logic changes |
| Icons | `public/images/pwa/` (from `brand assets/Staycations/…/app-icon-navy.png`) |
| Install prompt + worker registration | `components/brand-site/PwaSetup.tsx` |
| Tab bar | `components/brand-site/AppTabBar.tsx`, CSS in `globals.css` (`.pwa-only`, `.pwa-hidden`) |
| Saved hotels | `lib/pwa/saved-hotels.ts`, `components/staycations/SaveHotelButton.tsx`, `SavedHotelsList.tsx`, `/api/staycations/hotels` |
| Enquiries | `lib/pwa/local-enquiries.ts`, `components/staycations/EnquiriesList.tsx` |
| Offline page | `app/sites/[brand]/offline/page.tsx` |

The worker only registers on the brand's own domain, never on the master
site's `/sites/staycations` preview, because a worker's scope is the whole
origin.

## Testing an install

- **Android** — open the site in Chrome, wait for the card, tap Install.
- **iPhone** — Safari → Share → Add to Home Screen.
- **Desktop Chrome/Edge** — the install icon appears in the address bar.

Chrome's DevTools → Application → Manifest shows any installability problem.

## App Store / Google Play later

The same site can be wrapped without changes to it:

- **Google Play** — a Trusted Web Activity (PWABuilder generates the Android
  package from the manifest in minutes).
- **App Store** — Apple does not list bare PWAs, so wrap the site with
  Capacitor (a thin native shell around a web view) and submit that.

Both keep this codebase as the only source of truth.
