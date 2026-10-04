/**
 * What sits under Offers (founder, 2026-10-04, after Jet2's menu).
 *
 * Jet2's version is mostly commercial propositions — free child places, pay
 * monthly, insurance, competitions. Each of those is a promise, so each one
 * here is switched on only when it is a promise Premium Choice is actually
 * making, and the entry says where the detail lives. An entry that is off is
 * not rendered at all: a menu item leading to "coming soon" is worse than no
 * menu item.
 *
 * To switch one on, set `available` and give it a real `href` and `blurb`.
 */

export type OfferLink = {
  slug: string;
  title: string;
  /** Path under the brand base. */
  href: string;
  blurb?: string;
  available: boolean;
};

export type OfferGroup = { heading: string; items: OfferLink[] };

export const OFFER_GROUPS: OfferGroup[] = [
  {
    heading: 'Holiday deals',
    items: [
      {
        slug: 'all-offers',
        title: 'All current offers',
        href: '/offers',
        blurb: 'Everything we are running right now',
        // The page states plainly when nothing is running, so it is never a lie.
        available: true,
      },
      {
        slug: 'all-inclusive',
        title: 'All inclusive holidays',
        href: '/holidays/all-inclusive',
        blurb: 'One price, meals and drinks settled',
        available: true,
      },
      {
        slug: 'short-breaks',
        title: 'Short breaks',
        href: '/holidays/short-breaks',
        blurb: 'A week or less',
        available: true,
      },
    ],
  },
  {
    heading: 'Ways to pay',
    items: [
      {
        slug: 'deposits',
        title: 'Book from a 5% deposit',
        href: '/deposits',
        blurb: 'Six months ahead, and we tell you your figure as you search',
        available: true,
      },
      {
        // Needs the terms: how much, over how long, and who provides it.
        slug: 'pay-monthly',
        title: 'Pay monthly',
        href: '/pay-monthly',
        available: false,
      },
      {
        // Needs to know whether this is sold, arranged, or merely recommended —
        // the three are different regulated things.
        slug: 'travel-insurance',
        title: 'Travel insurance',
        href: '/travel-insurance',
        available: false,
      },
    ],
  },
  {
    heading: 'Travelling as a family',
    items: [
      {
        slug: 'family',
        title: 'Family holidays',
        href: '/holidays/family',
        blurb: 'Built around what children will actually sit through',
        available: true,
      },
      {
        // Needs the list: which holidays, which dates, which ages. It is a
        // price claim, so it cannot be a general statement.
        slug: 'free-child-places',
        title: 'Free child places',
        href: '/free-child-places',
        available: false,
      },
    ],
  },
];

/** Only what is real, and only groups left with something in them. */
export function liveOfferGroups(): OfferGroup[] {
  return OFFER_GROUPS.map((g) => ({
    heading: g.heading,
    items: g.items.filter((i) => i.available),
  })).filter((g) => g.items.length > 0);
}
