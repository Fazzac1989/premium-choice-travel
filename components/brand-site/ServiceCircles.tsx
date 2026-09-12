import Link from 'next/link';
import Icon, { type IconName } from '@/components/staycations/coastal/Icon';

/**
 * What this brand actually sells, as the circles Staycations uses.
 *
 * The labels are the brand's own `services` list, unchanged — this is the
 * same content in the same design, not new copy. Each one opens the enquiry
 * form with its subject already set, so a specialist reading the email knows
 * what was clicked without anyone typing it.
 *
 * Staycations keeps its own version, because there the circles are real
 * filters over a hotel directory rather than a way into a conversation.
 */

/** An icon per service, by the wording in lib/brands.ts. */
const ICONS: Record<string, IconName> = {
  // Holidays
  'Tailor-made itineraries': 'note',
  'Beach holidays': 'wave',
  'City breaks': 'city',
  'Family holidays': 'family',
  Honeymoons: 'heart',
  'Escorted tours': 'map',
  // Cruise
  'Arabian Gulf cruises': 'ship',
  'Mediterranean sailings': 'wave',
  'Northern Europe & fjords': 'moon',
  'River cruising': 'ship',
  'Fly-cruise packages': 'plane',
  'Group sailings': 'guests',
  // Golf
  'International golf holidays': 'golf',
  'Golf groups & societies': 'guests',
  'Tee times arranged in advance': 'clock',
  'Golf & beach combinations': 'umbrella',
  'Tailor-made golf itineraries': 'note',
  // Corporate
  'Corporate travel management': 'briefcase',
  'Flights & accommodation': 'plane',
  'Group travel': 'guests',
  'Meetings & events': 'calendar',
  'Incentive travel': 'trips',
  'Account management': 'user',
};

export default function ServiceCircles({
  base,
  services,
  heading,
}: {
  base: string;
  services: string[];
  heading: string;
}) {
  const shown = services.filter((s) => ICONS[s]).slice(0, 6);
  // An icon nobody drew is worse than no row at all.
  if (shown.length < 3) return null;

  return (
    <section className="container-site py-10 sm:py-14">
      <h2 className="font-serif text-2xl text-ink sm:text-3xl">{heading}</h2>
      <ul className="mt-6 grid grid-cols-3 gap-3 sm:gap-6 lg:grid-cols-6">
        {shown.map((s) => (
          <li key={s} className="min-w-0">
            <Link
              href={`${base}/enquire?about=${encodeURIComponent(s)}`}
              className="group flex flex-col items-center gap-2.5 rounded-xl p-1 text-center"
            >
              <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-sand text-teal-deep transition-colors group-hover:bg-teal-deep group-hover:text-white sm:h-[68px] sm:w-[68px]">
                <Icon name={ICONS[s]} size={28} />
              </span>
              <span className="text-[13px] font-medium leading-[17px] text-ink sm:text-sm">{s}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
