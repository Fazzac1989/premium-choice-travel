export type GuideSection = { heading: string; body: string };

/** A hotel photo from the Google Places API — always shown with attribution. */
export type PlacePhotoRef = { name: string; width: number; height: number; attribution: string };

/** A restaurant or bar, optionally with its own real photograph. */
export type VenueSection = GuideSection & { placeId?: string; photo?: string; attribution?: string };

export type GalleryImage = { url: string; alt: string };

/** 1-12 month numbers per suitability band. */
export type Seasonality = { best: number[]; good: number[]; possible: number[] };

export type Destination = {
  id: number;
  slug: string;
  name: string;
  region: string;
  blurb: string;
  heroImage: string;
  featured: boolean;
  sortOrder: number;
  /** "About the country" editorial paragraphs. */
  intro: string[];
  /** Seasonal guidance prose, e.g. { heading: "November – April", body: "Dry season …" }. */
  whenToTravel: GuideSection[];
  /** Culture & know-before-you-go sections with headers. */
  culture: GuideSection[];
  /** One-line proposition under the country name. */
  strapline: string;
  /** Why go / who it suits tags: Family, Couples, Beach, Golf … */
  tags: string[];
  /** Month-by-month suitability for the seasonality bar. */
  seasonality: Seasonality;
  /** Regions/cities within the country. */
  subDestinations: GuideSection[];
  /** Things to experience cards. */
  experiences: GuideSection[];
  /** Where to stay: styles and areas (no invented hotel partnerships). */
  stay: GuideSection[];
  /** Holiday concepts we can build — content anchors, not fixed packages. */
  journeyIdeas: string[];
  /** Lightbox gallery images. */
  gallery: GalleryImage[];
  /** Editorial/commercial priority (1 = highest). */
  priorityRank: number;
  published: boolean;
};

export type ItineraryDay = {
  label: string;
  title: string;
  description: string;
  /** Photograph shown beside this day on the public trip page (optional). */
  imageUrl?: string | null;
  /** Linked hotel ids for this stage (optional). */
  hotelIds?: number[];
  /** Linked experience ids for this stage (optional). */
  experienceIds?: number[];
};

export type Hotel = {
  id: number;
  destinationId: number | null;
  name: string;
  area: string;
  style: string;
  description: string;
  image: string;
  sortOrder: number;
  /** Editorial introduction paragraphs. */
  intro: string[];
  /** Feature bullet points (kids' club, house reef, spa …). */
  features: string[];
  /** Room categories with a short description each. */
  roomTypes: GuideSection[];
  /** Restaurants & bars with a short description each. */
  restaurants: VenueSection[];
  /** Available board bases, e.g. "Bed & Breakfast", "All-Inclusive". */
  mealPlans: string[];
  /** How to get there, in prose. */
  gettingThere: string;
  /** e.g. "15 minutes by speedboat from Malé airport". */
  transferDuration: string;
  /** Gallery image URLs. */
  gallery: string[];
  /** Official star rating (5, 4, 3) — null when unverified. */
  stars?: number | null;
  /** UAE emirate for the Staycations directory. */
  emirate?: string;
  /** Filter tags, e.g. family, couples, beach, desert. */
  bestFor?: string[];
  featured?: boolean;
  /** 'draft' hotels are hidden from the websites. */
  status?: 'draft' | 'published';
  /** Rough price band, 1 (cheapest) to 4 — see lib/price-bands.ts. */
  priceBand?: number | null;
  /** Admin-entered guide price text — always shown as guidance, never a quote. */
  priceGuide?: string;
  /** Google place id — stable, so it is safe to keep. */
  placeId?: string;
  /** Real photography of the property, fetched live via /api/place-photo. */
  photos?: PlacePhotoRef[];
};

export type Experience = {
  id: number;
  destinationId: number | null;
  title: string;
  body: string;
  image: string;
  sortOrder: number;
};

export type Package = {
  id: number;
  slug: string;
  title: string;
  tagline: string;
  destinationSlug: string;
  destinationName: string;
  region: string;
  brand: string;
  category: string;
  nights: number;
  days: number;
  priceFrom: number | null;
  currency: string;
  heroImage: string;
  gallery: string[];
  overview: string[];
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: ItineraryDay[];
  hotelName: string | null;
  boardBasis: string | null;
  featured: boolean;
  status: 'draft' | 'review' | 'published';
  updatedAt?: string;
  /** AI-inspiration and filter tags: family, winter-sun, multi-centre … */
  tags?: string[];
  /** Who this journey suits. */
  whoFor?: string[];
  /** Why this journey works, in short points. */
  whyWorks?: string[];
  /** Seasonal advice prose (never a weather promise). */
  seasonalNotes?: string;
  /** Suggested extensions. */
  extensions?: string[];
  /** Brand-specific structured details (rounds/courses, ports, emirate …). */
  details?: Record<string, any>;
  seoTitle?: string;
  seoDescription?: string;
  /** 'on_request' hides numeric pricing until commercially approved. */
  priceStatus?: 'on_request' | 'approved';
  /** Why this record is held in draft/review. */
  reviewNote?: string;
};

export type Enquiry = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  packageId: number | null;
  packageTitle: string | null;
  travelDates: string | null;
  travellers: string | null;
  message: string;
  status: 'new' | 'contacted' | 'closed';
  createdAt: string;
};

export const CATEGORIES = [
  'Beach & Islands',
  'City Breaks',
  'Culture & Heritage',
  'Adventure',
  'Honeymoon',
  'Cruises',
  'Staycations',
  'Family',
] as const;

export const durationLabel = (p: { nights: number; days: number }) =>
  `${p.nights} nights / ${p.days} days`;

export const formatPrice = (currency: string, n: number) =>
  `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
