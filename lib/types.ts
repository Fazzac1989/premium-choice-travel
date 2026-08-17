export type GuideSection = { heading: string; body: string };

export type Destination = {
  id: number;
  slug: string;
  name: string;
  region: string;
  blurb: string;
  heroImage: string;
  featured: boolean;
  sortOrder: number;
  /** Introductory paragraphs for the destination guide. */
  intro: string[];
  /** Seasonal guidance, e.g. { heading: "November – April", body: "Dry season …" }. */
  whenToTravel: GuideSection[];
  /** Culture & know-before-you-go sections with headers. */
  culture: GuideSection[];
};

export type ItineraryDay = { label: string; title: string; description: string };

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
