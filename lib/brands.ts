/**
 * The Premium Choice brand family. Premium Choice Travel is the master brand;
 * these are the six specialists that sit beneath it.
 *
 * `key` matches packages.brand in the database for the brands that sell
 * packages through this site. School Trips lives on its own platform.
 */

export type BrandKey = 'holidays' | 'golf' | 'cruises' | 'staycations' | 'corporate';

export type Brand = {
  key: BrandKey | 'school-trips';
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  longDescription: string;
  logo: string | null;
  logoWhite: string | null;
  heroImage: string;
  services: string[];
  cta: string;
  externalUrl?: string;
  sellsPackages: boolean;
};

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?q=80&w=${w}&auto=format&fit=crop`;

export const BRANDS: Brand[] = [
  {
    key: 'holidays',
    slug: 'holidays',
    name: 'Premium Choice Holidays',
    shortName: 'Holidays',
    tagline: 'Your holiday. Your way.',
    description: 'Tailor-made holidays, city breaks, beach escapes and extraordinary journeys around the world.',
    longDescription:
      'From Maldives overwater villas to Japan by bullet train, Premium Choice Holidays designs each trip around the people travelling — your dates, your pace, your budget. Real specialists plan it; one point of contact looks after it from enquiry to touchdown home.',
    logo: '/images/brands/holidays.png',
    logoWhite: '/images/brands/holidays-white.png',
    heroImage: '/images/hero.jpg',
    services: ['Tailor-made itineraries', 'Beach holidays', 'City breaks', 'Family holidays', 'Honeymoons', 'Escorted tours'],
    cta: 'Explore Holidays',
    sellsPackages: true,
  },
  {
    key: 'school-trips',
    slug: 'school-trips',
    name: 'Premium Choice School Trips',
    shortName: 'School Trips',
    tagline: 'The future of school travel.',
    description: 'Purpose-built educational travel experiences for schools, teachers and students.',
    longDescription:
      'Educational travel designed around students, teachers and the curriculum — with the planning tools, communication and safeguarding schools actually need. School Trips runs on its own dedicated platform.',
    logo: null,
    logoWhite: null,
    heroImage: img('photo-1526481280693-3bfa7568e0f3'),
    services: ['Curriculum-linked trips', 'Teacher planning portal', 'Parent communication', 'Risk assessment support', 'Trip management app'],
    cta: 'Explore School Trips',
    externalUrl: 'https://premiumchoiceschooltrips.com',
    sellsPackages: false,
  },
  {
    key: 'staycations',
    slug: 'staycations',
    name: 'Premium Choice Staycations',
    shortName: 'Staycations',
    tagline: 'The UAE. Rediscovered.',
    description: 'Exceptional hotels and escapes across all seven emirates, often with extras included.',
    longDescription:
      'Preferred rates at the UAE’s standout resorts — Palm Jumeirah icons, Saadiyat beach houses, Ras Al Khaimah cliffs and Fujairah’s mountain coast. Tell us the vibe and we’ll send hand-picked options, usually with breakfast, late checkout or resort credit thrown in.',
    logo: '/images/brands/staycations.png',
    logoWhite: '/images/brands/staycations-white.png',
    heroImage: img('photo-1512453979798-5ea266f8880c'),
    services: ['Weekend escapes', 'Family staycations', 'Beach resorts', 'Desert retreats', 'Romantic breaks', 'All-inclusive offers'],
    cta: 'Find a Staycation',
    sellsPackages: true,
  },
  {
    key: 'cruises',
    slug: 'cruise',
    name: 'Premium Choice Cruise',
    shortName: 'Cruises',
    tagline: 'See more of the world. Unpack once.',
    description: 'Ocean and river cruise experiences — from Arabian Gulf sailings to the Mediterranean and beyond.',
    longDescription:
      'Cruising from Dubai’s doorstep or flying out to join a ship anywhere in the world. We match you to the right line, the right ship and the right cabin — then wrap flights, transfers and hotel stays around the sailing so the whole journey is one booking.',
    logo: '/images/brands/cruises.png',
    logoWhite: '/images/brands/cruises-white.png',
    heroImage: img('photo-1548574505-5e239809ee19'),
    services: ['Arabian Gulf cruises', 'Mediterranean sailings', 'Northern Europe & fjords', 'River cruising', 'Fly-cruise packages', 'Group sailings'],
    cta: 'Explore Cruises',
    sellsPackages: true,
  },
  {
    key: 'golf',
    slug: 'golf-holidays',
    name: 'Premium Choice Golf Holidays',
    shortName: 'Golf Holidays',
    tagline: 'Great courses. Great destinations. Better golf trips.',
    description: 'Golf holidays designed around great courses — for pairs, groups and societies.',
    longDescription:
      'Links pilgrimages in Scotland, winter sun in the Algarve, all-inclusive golf in Belek or a round above the Indian Ocean in Mauritius. We build golf trips course-first: guaranteed tee times, the right resorts, and itineraries that keep non-golfers happy too.',
    logo: '/images/brands/golf.png',
    logoWhite: '/images/brands/golf-white.png',
    heroImage: img('photo-1587174486073-ae5e5cff23aa'),
    services: ['International golf holidays', 'Golf groups & societies', 'Guaranteed tee times', 'Golf & beach combinations', 'Tailor-made golf itineraries'],
    cta: 'Explore Golf Holidays',
    sellsPackages: true,
  },
  {
    key: 'corporate',
    slug: 'corporate',
    name: 'Premium Choice Corporate',
    shortName: 'Corporate',
    tagline: 'Business travel, personally managed.',
    description: 'Corporate travel, group movements, meetings and incentives — with a real account manager.',
    longDescription:
      'Flights, hotels and ground arrangements for businesses that want a person, not a portal. One account manager who knows your travellers and your policies, competitive fares through our trade partnerships, and someone to call when plans change mid-trip.',
    logo: '/images/brands/corporate.png',
    logoWhite: '/images/brands/corporate-white.png',
    heroImage: img('photo-1436491865332-7a61a109cc05'),
    services: ['Corporate travel management', 'Flights & accommodation', 'Group travel', 'Meetings & events', 'Incentive travel', 'Account management'],
    cta: 'Explore Corporate Travel',
    sellsPackages: false,
  },
];

export const getBrand = (slug: string) => BRANDS.find((b) => b.slug === slug) ?? null;

export const PACKAGE_BRANDS: { key: BrandKey; label: string }[] = [
  { key: 'holidays', label: 'Holidays' },
  { key: 'golf', label: 'Golf Holidays' },
  { key: 'cruises', label: 'Cruises' },
  { key: 'staycations', label: 'Staycations' },
  { key: 'corporate', label: 'Corporate' },
];

export const brandLabel = (key: string) =>
  PACKAGE_BRANDS.find((b) => b.key === key)?.label ?? 'Holidays';
