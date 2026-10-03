# Hotel photography

Hotel photographs come from the Premium Choice trade platform (founder, 2026-10-03). Google
Places photos were switched off because every photo had to be pulled from Google and refreshed
within 30 days, which cost too much.

- A hotel whose `supplier_code` is a platform hotel id shows the platform's photographs: the
  supplier's own image library (Hotelbeds today), read from `GET /v1/hotels/{id}/content` at
  most once a day (`lib/platform/content.ts`, applied in `getHotels()`). Free to show: no
  per-view charge and nothing to refresh.
- Any other hotel shows what was chosen by hand (`hotels.image`, `hotels.gallery`), or the
  branded panel.
- To change a platform hotel's photographs, edit its profile on the trade console (Hotels), or
  re-import its destination there.

The old `hotels.photos` / `place_id` columns are no longer read and can be dropped later.
