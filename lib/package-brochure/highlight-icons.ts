/**
 * A mark against each highlight, chosen from the words the package already
 * uses. The School Trips brochure does the same for subjects; these are the
 * categories a golf highlight actually falls into.
 *
 * The match is deliberately shallow. A highlight that reads like golf gets the
 * flag, one that mentions a hotel gets the bed, and anything that matches
 * nothing gets a plain tick — a wrong-but-confident icon would be worse than a
 * neutral one.
 */

type Icon = { paths: string[]; circle?: [number, number, number] };

const TICK: Icon = { paths: ['M8 12.5l2.8 2.8L16.5 9.5'], circle: [12, 12, 8.5] };

const ICONS: { test: RegExp; icon: Icon }[] = [
  // Golf itself: a flag on a green.
  {
    test: /\b(round|rounds|tee|golf|links|course|courses|fairway|green|putt|handicap|championship|par)\b/i,
    icon: { paths: ['M7 20V4', 'M7 4.5h9.5L13.5 8l3 3.5H7'] },
  },
  // Where you sleep.
  {
    test: /\b(hotel|resort|night|nights|stay|staying|suite|room|rooms|lodge|villa|accommodation)\b/i,
    icon: { paths: ['M3.5 18v-5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2V18', 'M3.5 18h17', 'M6.5 10.5V8a1.5 1.5 0 0 1 1.5-1.5h8A1.5 1.5 0 0 1 17.5 8v2.5'] },
  },
  // Getting there.
  {
    test: /\b(flight|flights|fly|flying|airport|transfer|transfers|return|direct)\b/i,
    icon: { paths: ['M3 13.5l18-6-4.5 12-3.5-5z', 'M13 14.5l-3 4v-4'] },
  },
  // Sea and sand.
  {
    test: /\b(beach|sea|coast|coastal|ocean|island|lagoon|bay|sand|swim)\b/i,
    icon: { paths: ['M3 17c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0', 'M3 20.5c2 1.4 4 1.4 6 0s4-1.4 6 0 4 1.4 6 0', 'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'] },
  },
  // Food, drink and evenings out.
  {
    test: /\b(dinner|dining|restaurant|breakfast|lunch|meal|meals|wine|whisky|dram|bar|all-inclusive)\b/i,
    icon: { paths: ['M7 3.5v7a2.5 2.5 0 0 0 5 0v-7', 'M9.5 13v7.5', 'M17 3.5c-1.5 1.5-2 3-2 5s.5 2.5 2 2.5V3.5z', 'M17 11v9.5'] },
  },
  // Towns, culture, the non-golf day.
  {
    test: /\b(city|town|old town|culture|cultural|museum|castle|cathedral|historic|heritage|market|shopping)\b/i,
    icon: { paths: ['M4 20V9.5l8-5 8 5V20', 'M4 20h16', 'M10 20v-5h4v5'] },
  },
  // Mountains, scenery and the drive.
  {
    test: /\b(mountain|mountains|hills|scenic|scenery|view|views|valley|drive|road|countryside|safari)\b/i,
    icon: { paths: ['M3 19l6-9 4 5.5 2.5-3.5L21 19z'] },
  },
  // People: groups, societies, pairs, families.
  {
    test: /\b(group|groups|society|societies|pair|pairs|friends|family|families|partner|non-golfer|guests|players)\b/i,
    icon: { paths: ['M3.5 19.5a5 5 0 0 1 10 0', 'M16 13a5 5 0 0 1 4.5 6.5', 'M14.5 5.8a3 3 0 0 1 0 5.4'], circle: [8.5, 8, 3] },
  },
  // Spa, pool, the afternoon off.
  {
    test: /\b(spa|pool|relax|leisure|wellness|massage|thermal|sauna)\b/i,
    icon: { paths: ['M12 20.5c-4 0-7-2.5-7-6h14c0 3.5-3 6-7 6z', 'M9 11V6.5a1.5 1.5 0 0 1 3 0V11', 'M15 11V8'] },
  },
  // Weather and season.
  {
    test: /\b(sun|sunshine|winter|summer|weather|degrees|climate|warm|season)\b/i,
    icon: { paths: ['M12 3v2', 'M12 19v2', 'M4.2 4.2l1.4 1.4', 'M18.4 18.4l1.4 1.4', 'M3 12h2', 'M19 12h2', 'M4.2 19.8l1.4-1.4', 'M18.4 5.6l1.4-1.4'], circle: [12, 12, 4] },
  },
];

export function highlightIcon(text: string): Icon {
  const found = ICONS.find((i) => i.test.test(text));
  return found ? found.icon : TICK;
}
