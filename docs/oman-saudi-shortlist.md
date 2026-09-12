# Oman and Saudi Arabia — proposed directory

A first list to argue with, not a decision. The UAE directory is 62 hotels
built the same way: chosen by hand, then researched one at a time.

**Edit this file, then tell me to run it.** Delete what you would not sell,
add what I have missed, and correct any name that is not what the property
calls itself now. The names are what the seeding and mapping scripts match
on, so a wrong one costs a manual fix later.

## How these were chosen

The same test as the UAE list: properties a UAE resident would actually book
for a long weekend or a short break, that we can describe honestly, and that
a specialist would be happy to put their name to. Weighted towards the places
our customers already drive and fly to.

Nothing here is contracted or verified against the supplier's catalogue yet.
That happens at mapping time, and anything the mapper cannot match comes back
on a list for a decision.

## Oman — 12

Muscat is the weekend drive from Dubai; Musandam is the one people do in a
day and wish they had not.

| Hotel | Area |
|---|---|
| Shangri-La Al Husn, Muscat | Muscat |
| Shangri-La Barr Al Jissah, Muscat | Muscat |
| The Chedi Muscat | Muscat |
| Al Bustan Palace, a Ritz-Carlton Hotel | Muscat |
| Kempinski Hotel Muscat | Muscat |
| W Muscat | Muscat |
| JW Marriott Muscat | Muscat |
| Alila Jabal Akhdar | Nizwa |
| Anantara Al Jabal Al Akhdar Resort | Nizwa |
| Six Senses Zighy Bay | Musandam |
| Atana Khasab | Musandam |
| Al Baleed Resort Salalah by Anantara | Salalah |

## Saudi Arabia — 12

Riyadh and Jeddah are business and family weekends. AlUla and the Red Sea are
the trips people are starting to ask about by name.

| Hotel | Area |
|---|---|
| Four Seasons Hotel Riyadh at Kingdom Centre | Riyadh |
| The Ritz-Carlton, Riyadh | Riyadh |
| Mandarin Oriental Al Faisaliah, Riyadh | Riyadh |
| Hyatt Regency Riyadh Olaya | Riyadh |
| Waldorf Astoria Jeddah Qasr Al Sharq | Jeddah |
| The Ritz-Carlton, Jeddah | Jeddah |
| Rosewood Jeddah | Jeddah |
| Park Hyatt Jeddah Marina Club and Spa | Jeddah |
| Banyan Tree AlUla | AlUla |
| Habitas AlUla | AlUla |
| Six Senses Southern Dunes, The Red Sea | The Red Sea |
| The St. Regis Red Sea Resort | The Red Sea |

## What happens when you approve it

Each step is a script that already exists, now that hotels carry a country.

1. **Seed** the rows from this list, as drafts, so nothing appears on the
   website before the supplier scope is agreed.
2. **Map** each to a Hotelbeds code by coordinates and name. Anything
   unmatched comes back for a decision rather than being guessed at.
3. **Research** a profile and a price band per hotel. This is the step that
   spends Claude web search credit, roughly in proportion to the number of
   hotels, so it is worth cutting the list before this rather than after.
4. **Photographs** from Google Places, our own cached copies. Same rule as
   the UAE: real pictures of the actual property or none at all.
5. **Publish** once Hotelbeds have confirmed the scope change in
   `docs/hotelbeds-scope-change.md`.

## Two things I would decide now

**Price bands are in dirhams.** The UAE bands (under AED 700, 700–1,500,
1,500–3,000, 3,000+) work for Oman. Saudi city hotels sit lower and the Red
Sea resorts sit far higher, so the top band will hold a lot. Worth deciding
whether Saudi gets its own bands before the research runs, because redoing it
means paying for it twice.

**Nobody has stayed in these yet.** The brand promise is hotels our
specialists have been to. Until someone has, the honest line for a new
country is that these are chosen rather than visited, and the profiles should
be written that way.
