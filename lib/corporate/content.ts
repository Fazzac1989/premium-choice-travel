/**
 * Premium Choice Corporate — the words on premiumchoicecorporate.com.
 *
 * Positioning follows the Corporate business blueprint (October 2026): a
 * managed travel department for UAE businesses, personal for travellers and
 * accountable to finance. Every capability named here was confirmed as
 * delivered today by the business (4 October 2026): named account manager,
 * approvals and cost coding, refund and credit tracking, the monthly spend and
 * reconciliation pack, and out-of-hours cover through a contracted 24/7
 * partner. Do not add SLA times, prices, savings figures, integrations or a
 * client workspace here until they are real.
 *
 * Client-safe: the header (a client component) imports the navigation.
 */

export type CorporateLink = { href: string; label: string };

/** The site's own pages, in menu order. "About" is the shared family story. */
export const CORPORATE_NAV: CorporateLink[] = [
  { href: '/business-travel', label: 'Business travel' },
  { href: '/spend-and-reporting', label: 'Spend & reporting' },
  { href: '/travel-support', label: 'Traveller support' },
  { href: '/meetings-and-groups', label: 'Meetings & groups' },
  { href: '/how-we-work', label: 'How we work' },
];

/**
 * The client workspace itself: Premium Choice Corporate on the trade platform (founder,
 * 2026-10-04) — live search, booking on the spot, approvals. This site keeps only its demo.
 */
export const CORPORATE_APP_URL = 'https://app.premiumchoicecorporate.com';

export const REVIEW_HREF = '/programme-review';
export const REVIEW_CTA = 'Book a travel programme review';

/** Programme-review form options; the server accepts only these values. */
export const EMPLOYEE_BANDS = ['Under 50', '50–200', '200–500', 'Over 500'];
export const SPEND_BANDS = ['Under AED 500k', 'AED 500k–1m', 'AED 1–5m', 'AED 5–10m', 'Over AED 10m', 'Not sure'];
export const MAIN_PROBLEMS = [
  'Too much time spent arranging travel',
  'No control of spend before booking',
  'Invoices and reconciliation',
  'Refunds and unused airline credits',
  'Support when plans change',
  'Project or client recharging',
  'Meetings, groups or incentives',
  'Something else',
];

export type CorporateSection = {
  title: string;
  text?: string;
  points?: string[];
};

export type CorporatePageContent = {
  slug: string;
  /** Browser title and meta description. */
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  intro: string;
  sections: CorporateSection[];
};

export const CORPORATE_PAGES: Record<string, CorporatePageContent> = {
  'business-travel': {
    slug: 'business-travel',
    metaTitle: 'Managed business travel',
    metaDescription:
      'Flights, hotels, transfers and visas for UAE businesses — booked against your policy, changed when plans change, and supported by a named team.',
    eyebrow: 'Business travel',
    title: 'Every trip booked, changed and looked after by people who know your account.',
    intro:
      'We handle the whole journey — not just the first booking. Your travellers ask once; we find suitable options, get the right approval, book, and stay with the trip until it is closed off in your accounts.',
    sections: [
      {
        title: 'What we arrange',
        points: [
          'Flights, hotels and serviced apartments, including long stays',
          'Rail where it makes sense, airport transfers and car hire',
          'Visa and travel document assistance through suitable partners',
          'Executive itineraries with several stops and moving parts',
          'Team movements and project rotations',
        ],
      },
      {
        title: 'Options you can compare',
        text:
          'A cheap fare with no workable way to change it is rarely good value for a business. We show suitable options side by side with the all-in cost, the change and refund conditions, and why we recommend one — so the decision is quick and easy to defend.',
      },
      {
        title: 'Built around your travel policy',
        text:
          'We write the policy with you, or work from the one you have: cabin classes, hotel limits by city, how far ahead to book, preferred suppliers, who approves what, and how exceptions are handled. Then we book to it, every time, and keep a record of which rules applied when.',
      },
      {
        title: 'Changes and cancellations',
        text:
          'Plans move. When they do, we handle the change, record the penalty quoted and the decision taken, and keep the original booking safe until the replacement is confirmed. A cancellation is only marked done when the supplier has confirmed it.',
      },
    ],
  },

  'spend-and-reporting': {
    slug: 'spend-and-reporting',
    metaTitle: 'Travel spend control and reporting',
    metaDescription:
      'Approvals before booking, costs coded to your departments and projects, refunds and airline credits tracked, and a monthly pack your finance team can close with.',
    eyebrow: 'Spend & reporting',
    title: 'See what travel will cost before it is booked — and close it off cleanly after.',
    intro:
      'Most travel reports arrive after the money has gone. We put the control at the start — an approval against the actual quote — and finish the financial work at the end, so finance is not left chasing invoices and credits.',
    sections: [
      {
        title: 'Approval before money is committed',
        text:
          'The right person approves the trip with the business reason, the total estimated cost and any policy exceptions in front of them. The approval is tied to that quote: if the price moves beyond what you have agreed, we come back for a fresh approval rather than booking anyway.',
      },
      {
        title: 'Every trip coded the way you report',
        text:
          'Each trip is allocated to the right legal entity, department, project and client, and marked billable or not. Project travel stops disappearing into a general cost line, and recharging clients becomes a list rather than a hunt.',
      },
      {
        title: 'Refunds and airline credits that don’t quietly expire',
        points: [
          'A register of refundable bookings and outstanding refund claims',
          'Unused airline credits recorded with the traveller, airline and expiry date',
          'Credits checked and used before a new ticket is bought, where the fare rules allow',
          'Refunds reported as claimed, then as received — never counted before they arrive',
        ],
      },
      {
        title: 'A monthly spend and reconciliation pack',
        text:
          'Each month you receive bookings matched to invoices, payments and credit notes, costs by department and project, refunds and credits outstanding, and a short list of anything unresolved with who owns it. It is prepared in the format your finance team works with.',
      },
      {
        title: 'A review that leads to decisions',
        text:
          'Your account manager walks you through the month and suggests a small number of practical changes — a hotel to agree a rate with, a route booked too late, an approval step that slows things down — and records what was agreed and what happened.',
      },
    ],
  },

  'travel-support': {
    slug: 'travel-support',
    metaTitle: 'Traveller support, day and night',
    metaDescription:
      'A named account team in office hours and a contracted 24/7 support partner outside them — so travellers always reach someone who can help.',
    eyebrow: 'Traveller support',
    title: 'When plans change mid-trip, your people reach someone who can fix it.',
    intro:
      'Your travellers have a named team who knows their profiles and preferences, and round-the-clock cover outside office hours through our contracted 24/7 support partner.',
    sections: [
      {
        title: 'Before they go',
        points: [
          'Confirmed itinerary and documents in one place',
          'Visa and entry reminders where they apply',
          'Profiles kept up to date: seat, meal and loyalty preferences',
          'Clear instructions on who to contact, and when',
        ],
      },
      {
        title: 'During office hours',
        text:
          'Your named account manager and the team behind them handle changes, extensions and disruption — Monday to Friday, 9.00am to 7.30pm UAE time — with the full history of the trip in front of them.',
      },
      {
        title: 'Outside office hours',
        text:
          'Evenings, weekends and public holidays are covered by our contracted 24/7 support partner, who can rebook and rearrange within the authority you have agreed with us. Your account team picks up the detail the next working day.',
      },
      {
        title: 'When something goes wrong',
        text:
          'We keep the existing arrangements in place while we work on the alternatives, so a traveller is never left without a booking. Any extra cost is handled within the emergency authority you have set, and recorded for finance.',
      },
    ],
  },

  'meetings-and-groups': {
    slug: 'meetings-and-groups',
    metaTitle: 'Meetings, groups and incentives',
    metaDescription:
      'Conferences, off-sites, delegate travel and incentive trips — run with their own budget, deposit schedule and final reconciliation.',
    eyebrow: 'Meetings & groups',
    title: 'Conferences, off-sites and incentives — with the budget kept in view.',
    intro:
      'Group work has more moving parts and more money at risk than individual trips. We run it as its own project, with its own budget and a clear picture of deposits and cancellation exposure from the start.',
    sections: [
      {
        title: 'What we organise',
        points: [
          'Delegate flights and accommodation, in the UAE and abroad',
          'Venue sourcing for meetings, conferences and team off-sites',
          'Rooming lists, ground transport and on-the-day movements',
          'Incentive trips designed around the people being rewarded',
          'Project teams moving to and from site',
        ],
      },
      {
        title: 'Budget, deposits and exposure',
        text:
          'Every event has its own budget, a deposit schedule and a running view of what would be payable if numbers drop or the event moves. Attendance changes are tracked against the contract terms, so there are no surprises close to the date.',
      },
      {
        title: 'Closed off properly',
        text:
          'After the event you receive a final reconciliation of what was quoted, what changed and what was paid — coded to the right department or client.',
      },
    ],
  },

  'how-we-work': {
    slug: 'how-we-work',
    metaTitle: 'How we work',
    metaDescription:
      'From the first request to the final reconciliation: how Premium Choice Corporate runs a company travel programme, and what we ask of you.',
    eyebrow: 'How we work',
    title: 'From the first request to the final reconciliation.',
    intro:
      'Every trip follows the same path, with a clear owner at each step. That is what lets your travellers get on with the trip and your finance team close the month.',
    sections: [
      {
        title: '1 · Request',
        text:
          'A traveller or assistant sends the dates, destination, purpose and project. We open one trip reference and ask for anything that is missing.',
      },
      {
        title: '2 · Compare',
        text:
          'We prepare suitable options within your policy, with the all-in cost and the change and refund conditions of each.',
      },
      {
        title: '3 · Approve',
        text:
          'Your approver sees the purpose, the cost, the budget position and any exceptions, and approves that specific quote. Simple trips within an agreed limit can be pre-authorised.',
      },
      {
        title: '4 · Book',
        text:
          'We recheck the price and availability, book through the right channel and send confirmed documents.',
      },
      {
        title: '5 · Travel',
        text:
          'Your named team in office hours, and our 24/7 partner outside them, look after changes and disruption.',
      },
      {
        title: '6 · Reconcile',
        text:
          'Invoices, payments, changes and credits are matched to the trip. Anything that doesn’t match goes on an exceptions list with an owner.',
      },
      {
        title: '7 · Review',
        text:
          'Each month we review spend and service with you and agree a short list of improvements.',
      },
      {
        title: 'Getting started',
        points: [
          'A travel programme review: how your travel works today and where time and money are lost',
          'A written proposal setting out the service, scope and terms',
          'Set-up: your policy, traveller profiles, approvers and cost codes',
          'A first period of live travel, then a review of how it went',
        ],
      },
      {
        title: 'Your data',
        text:
          'We ask only for what a booking needs. Passport and payment details are never collected through this website, and sensitive documents are kept with restricted access.',
      },
    ],
  },
};
