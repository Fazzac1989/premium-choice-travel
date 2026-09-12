/**
 * Where we sell, and what the parts of a country are called.
 *
 * One list, so the search picker, the admin form, the footer links and the
 * seeding script cannot drift apart. They used to hold four separate copies
 * of the seven emirates between them.
 *
 * Adding a country is adding an entry here and then adding its hotels. The
 * order is the order a customer sees, so the home market leads.
 */

export type Country = {
  /** As stored on the hotel row and shown to a customer. */
  name: string;
  /** ISO code, for the supplier's catalogue and for Google's region bias. */
  code: 'AE' | 'OM' | 'SA';
  /** What that country calls its parts, in the order we list them. */
  regions: string[];
  /** The collective noun for a search across the whole country. */
  regionLabel: string;
  /**
   * The supplier's destination codes for the regions above, in the same
   * order. Only the ones we sell: the catalogue download walks this list, and
   * Saudi alone has 31 destinations we have no intention of carrying.
   */
  destinationCodes: string[];
};

export const COUNTRIES: Country[] = [
  {
    name: 'United Arab Emirates',
    code: 'AE',
    regionLabel: 'emirate',
    regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah', 'Fujairah', 'Ajman', 'Umm Al Quwain'],
    destinationCodes: ['DXB', 'AUH', 'SHJ', 'RKT', 'FJR', 'AJM', 'UMM', 'AE1', 'AAN'],
  },
  {
    name: 'Oman',
    code: 'OM',
    regionLabel: 'area',
    regions: ['Muscat', 'Musandam', 'Salalah', 'Nizwa', 'Sur', 'Duqm'],
    destinationCodes: ['MCT', 'KHS', 'SLL', 'OM1', 'SR3', 'DQM'],
  },
  {
    name: 'Saudi Arabia',
    code: 'SA',
    regionLabel: 'area',
    regions: ['Riyadh', 'Jeddah', 'AlUla', 'The Red Sea', 'Dammam and the East Coast', 'Abha', 'Taif'],
    destinationCodes: ['RUH', 'JED', 'U1L', 'RTD', 'DMM', 'AHB', 'TIF'],
  },
];

/** The regions we have stays in, for one country, ready to render. */
export type PlaceGroup = {
  country: string;
  /** How to head the group: "United Arab Emirates", "Oman". */
  label: string;
  regions: string[];
};

/**
 * Group the regions that actually have stays, in our own order.
 *
 * Built from the directory, never from the list above: offering Muscat before
 * there is a hotel in it is the kind of promise this app does not make.
 */
export function placeGroups(regions: string[]): PlaceGroup[] {
  const present = new Set(regions.filter(Boolean).map((r) => r.toLowerCase()));
  return COUNTRIES.map((c) => ({
    country: c.name,
    label: c.name,
    regions: c.regions.filter((r) => present.has(r.toLowerCase())),
  })).filter((g) => g.regions.length > 0);
}

export const DEFAULT_COUNTRY = COUNTRIES[0].name;

/** Every region we sell, in country order. The old EMIRATES list, generalised. */
export const ALL_REGIONS: string[] = COUNTRIES.flatMap((c) => c.regions);

/**
 * The seven emirates, still by that name.
 *
 * Kept because the UAE is the home market and several places say "emirate"
 * to a customer who would find "region" odd.
 */
export const EMIRATES: string[] = COUNTRIES[0].regions;

/**
 * Place words to ignore when matching a hotel name against the supplier's.
 * "Muscat" in both names is not evidence that they are the same hotel.
 */
export function placeWords(country?: Country): string[] {
  const all = country ? [country] : COUNTRIES;
  return all
    .flatMap((c) => [c.name, ...c.regions])
    .flatMap((s) => s.toLowerCase().split(/[^a-z]+/))
    .filter(Boolean)
    .concat(country?.code === 'AE' ? ['uae', 'emirates'] : [], ['saudi', 'arabia', 'oman', 'omani']);
}

export function countryByName(name: string): Country | undefined {
  return COUNTRIES.find((c) => c.name.toLowerCase() === String(name ?? '').toLowerCase());
}

/** Which country a region belongs to, for a hotel row that only carries one. */
export function countryOfRegion(region: string): Country | undefined {
  const r = String(region ?? '').toLowerCase();
  return COUNTRIES.find((c) => c.regions.some((x) => x.toLowerCase() === r));
}

/** Sort order for a region, so a list reads Dubai first and Taif last. */
export function regionRank(region: string): number {
  const i = ALL_REGIONS.findIndex((r) => r.toLowerCase() === String(region ?? '').toLowerCase());
  return i === -1 ? ALL_REGIONS.length : i;
}

/**
 * How to describe a search with no region chosen.
 *
 * "Across the UAE" was right while that was everything we sold. It stops
 * being right the moment a second country appears, and a customer who reads
 * it will not think to look for Muscat.
 */
export function anywhereLabel(countries: string[] = []): string {
  const names = countries.length ? countries : COUNTRIES.map((c) => c.name);
  if (names.length === 1) return `Across ${names[0] === 'United Arab Emirates' ? 'the UAE' : names[0]}`;
  return 'Anywhere we sell';
}

/** A country's name as it reads mid-sentence. */
export function shortCountry(name: string): string {
  return name === 'United Arab Emirates' ? 'the UAE' : name;
}
