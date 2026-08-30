import 'server-only';

/**
 * Which brand an email is about, and how each one signs off.
 *
 * Six websites feed one inbox. A notification that just says "Premium Choice
 * Travel" makes a staycation weekend and a school trip look identical at a
 * glance, so every notification names its brand — in the subject line, where
 * it is visible from the phone lock screen, and at the top of the mail.
 *
 * A customer confirmation goes further: it should look like it came from the
 * site they were just on, not from a parent company they have never heard of.
 */

export type EmailBrand = {
  key: string;
  /** Header and sign-off. */
  name: string;
  /** Subject-line tag: "[Staycations]". */
  tag: string;
  /** Where a customer should look next. */
  site: string;
  /** One line about what this brand does, for the customer email. */
  blurb: string;
};

export const EMAIL_BRANDS: Record<string, EmailBrand> = {
  travel: {
    key: 'travel',
    name: 'Premium Choice Travel',
    tag: 'Travel',
    site: 'premiumchoicetravel.com',
    blurb: 'Tailor-made travel from the UAE, planned by people you can actually speak to.',
  },
  holidays: {
    key: 'holidays',
    name: 'Premium Choice Holidays',
    tag: 'Holidays',
    site: 'premiumchoiceholidays.com',
    blurb: 'Tailor-made holidays from the UAE, shaped around how you actually want to travel.',
  },
  staycations: {
    key: 'staycations',
    name: 'Premium Choice Staycations',
    tag: 'Staycations',
    site: 'premiumchoicestaycations.com',
    blurb: 'UAE hotels and weekends away, chosen by people who have stayed in them.',
  },
  cruises: {
    key: 'cruises',
    name: 'Premium Choice Cruise',
    tag: 'Cruise',
    site: 'premiumchoicecruise.com',
    blurb: 'Cruises from the UAE and beyond, matched to the ship and the season.',
  },
  golf: {
    key: 'golf',
    name: 'Premium Choice Golf Holidays',
    tag: 'Golf',
    site: 'premiumchoicegolfholidays.com',
    blurb: 'Golf trips arranged around your group, your handicaps and your tee times.',
  },
  corporate: {
    key: 'corporate',
    name: 'Premium Choice Corporate',
    tag: 'Corporate',
    site: 'premiumchoicecorporate.com',
    blurb: 'Business travel handled by one named contact who knows your account.',
  },
};

export function emailBrand(key: string | null | undefined): EmailBrand {
  return EMAIL_BRANDS[key ?? ''] ?? EMAIL_BRANDS.travel;
}
