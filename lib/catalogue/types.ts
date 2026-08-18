import type { GuideSection, Seasonality } from '@/lib/types';

/**
 * A destination as authored in the content catalogue. Gallery images are
 * injected from lib/generated/destination-images.json; hero defaults to the
 * first gallery image; intro/whenToTravel/culture merge from
 * lib/destination-guides.ts where present.
 */
export type CatalogueEntry = {
  slug: string;
  name: string;
  region: string;
  strapline: string;
  blurb: string;
  tags: string[];
  seasonality: Seasonality;
  intro?: string[];
  whenToTravel?: GuideSection[];
  subDestinations?: GuideSection[];
  experiences?: GuideSection[];
  stay?: GuideSection[];
  journeyIdeas: string[];
  priorityRank: number;
  featured?: boolean;
  heroImage?: string;
};
