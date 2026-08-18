export type GuideSection = { heading: string; body: string };

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
  status: 'draft' | 'published';
  updatedAt?: string;
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
