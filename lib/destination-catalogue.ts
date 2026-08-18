import type { Destination, GalleryImage } from './types';
import type { CatalogueEntry } from './catalogue/types';
import { WAVE1 } from './catalogue/wave1';
import { WAVE2 } from './catalogue/wave2';
import { WAVE3 } from './catalogue/wave3';
import { DESTINATION_GUIDES, EMPTY_GUIDE } from './destination-guides';
import { ABOUT_COPY } from './catalogue/about-copy';
import IMAGES from './generated/destination-images.json';

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

/** Long-standing hero images kept stable for pages that already exist. */
const HEROES: Record<string, string> = {
  maldives: img('photo-1514282401047-d79a71a590e8'),
  georgia: img('photo-1565008576549-57569a49371d'),
  japan: img('photo-1493976040374-85c8e12f0c0e'),
  switzerland: img('photo-1530122037265-a5f1f91d3b99'),
  thailand: img('photo-1552465011-b4e21bf6e79a'),
  jordan: img('photo-1548786811-dd6e453ccca7'),
  'united-arab-emirates': img('photo-1512453979798-5ea266f8880c'),
  scotland: img('photo-1672871582992-1b30b19878f5'),
  portugal: img('photo-1562760156-9353a70352ef'),
  turkey: img('photo-1764562155715-40df5778946e'),
  mauritius: img('photo-1513415277900-a62401e19be4'),
  mediterranean: img('photo-1613395877344-13d4a8e0d49e'),
  'northern-europe': img('photo-1518124880777-cf8c82231ffb'),
  'arabian-gulf': img('photo-1722502831583-b4e93ecc6027'),
};

/** Entries outside the 60-country roadmap that the site already sells. */
const EXTRAS: CatalogueEntry[] = [
  {
    slug: 'united-arab-emirates', name: 'United Arab Emirates', region: 'Middle East', priorityRank: 90,
    strapline: 'Home advantage.',
    blurb: 'Special offers on the UAE’s finest hotels — merchandised through Premium Choice Staycations.',
    tags: ['Staycations', 'Beach', 'Desert', 'Family', 'City Break'],
    seasonality: { best: [10, 11, 12, 1, 2, 3, 4], good: [5, 9], possible: [6, 7, 8] },
    journeyIdeas: ['UAE Luxury Staycation', 'Desert Oasis Escape', 'Saadiyat Island Retreat', 'Ras Al Khaimah Beach Weekend'],
  },
  {
    slug: 'scotland', name: 'Scotland', region: 'Europe', priorityRank: 91,
    strapline: 'The home of golf.',
    blurb: 'Ancient links, whisky evenings and coastline that made the game.',
    tags: ['Golf', 'Countryside', 'Culture', 'Self-Drive'],
    seasonality: { best: [5, 6, 7, 8, 9], good: [4, 10], possible: [11, 12, 1, 2, 3] },
    journeyIdeas: ['Scotland Links Classic', 'Edinburgh & the Highlands', 'Whisky & Golf Journey', 'North Coast 500 Road Trip'],
  },
  {
    slug: 'mediterranean', name: 'Mediterranean', region: 'Cruise Seas', priorityRank: 92,
    strapline: 'One sea, twenty civilisations.',
    blurb: 'Santorini sunsets, Amalfi lemons and Barcelona nights — one sailing, many worlds.',
    tags: ['Cruise', 'Islands', 'Culture', 'Couples'],
    seasonality: { best: [5, 6, 9, 10], good: [4, 7, 8], possible: [11, 12, 1, 2, 3] },
    journeyIdeas: ['Mediterranean Highlights Fly-Cruise', 'Greek Islands Cruise', 'Western Med with Family', 'Adriatic Discovery Sailing'],
  },
  {
    slug: 'northern-europe', name: 'Northern Europe', region: 'Cruise Seas', priorityRank: 93,
    strapline: 'Cruising’s most dramatic stage.',
    blurb: 'Fjords, midnight sun and Baltic capitals.',
    tags: ['Cruise', 'Fjords', 'Nature', 'Summer'],
    seasonality: { best: [6, 7, 8], good: [5, 9], possible: [10, 11, 12, 1, 2, 3, 4] },
    journeyIdeas: ['Norwegian Fjords Cruise', 'Baltic Capitals Sailing', 'Midnight Sun Voyage', 'British Isles Circuit'],
  },
  {
    slug: 'arabian-gulf', name: 'Arabian Gulf', region: 'Cruise Seas', priorityRank: 94,
    strapline: 'Sail from Dubai’s doorstep.',
    blurb: 'Skylines, souks and desert islands without a flight.',
    tags: ['Cruise', 'Family', 'Short Break', 'No-Fly'],
    seasonality: { best: [11, 12, 1, 2, 3], good: [10, 4], possible: [5, 6, 7, 8, 9] },
    journeyIdeas: ['Arabian Gulf Cruise from Dubai', 'Gulf & Oman Sailing', 'Festive Gulf Family Cruise', 'Long-Weekend Sea Escape'],
  },
];

const imagesFor = (slug: string): GalleryImage[] => {
  const set = (IMAGES as Record<string, { url: string; alt: string }[]>)[slug] ?? [];
  return set.map((i) => ({ url: `${i.url}?q=80&w=1600&auto=format&fit=crop`, alt: i.alt }));
};

function toDestination(entry: CatalogueEntry, id: number): Destination {
  const guide = DESTINATION_GUIDES[entry.slug] ?? EMPTY_GUIDE;
  const gallery = imagesFor(entry.slug);
  return {
    id,
    slug: entry.slug,
    name: entry.name,
    region: entry.region,
    blurb: entry.blurb,
    heroImage: entry.heroImage ?? HEROES[entry.slug] ?? gallery[0]?.url ?? '',
    featured: entry.featured ?? false,
    sortOrder: entry.priorityRank,
    intro: entry.intro?.length
      ? entry.intro
      : guide.intro.length
        ? guide.intro
        : ABOUT_COPY[entry.slug] ?? [],
    whenToTravel: entry.whenToTravel ?? guide.whenToTravel,
    culture: guide.culture,
    strapline: entry.strapline,
    tags: entry.tags,
    seasonality: entry.seasonality,
    subDestinations: entry.subDestinations ?? [],
    experiences: entry.experiences ?? [],
    stay: entry.stay ?? [],
    journeyIdeas: entry.journeyIdeas,
    gallery,
    priorityRank: entry.priorityRank,
    published: true,
  };
}

export const DESTINATION_CATALOGUE: Destination[] = [...WAVE1, ...WAVE2, ...WAVE3, ...EXTRAS]
  .sort((a, b) => a.priorityRank - b.priorityRank)
  .map((entry, i) => toDestination(entry, i + 1));

export const catalogueBySlug = new Map(DESTINATION_CATALOGUE.map((d) => [d.slug, d]));
