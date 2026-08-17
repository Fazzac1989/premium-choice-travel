import type { GuideSection } from './types';

/**
 * Editorial guide content per destination: intro, when to travel, culture.
 * Seeded into the database; fully editable afterwards in the admin.
 */

type Guide = { intro: string[]; whenToTravel: GuideSection[]; culture: GuideSection[] };

export const EMPTY_GUIDE: Guide = { intro: [], whenToTravel: [], culture: [] };

export const DESTINATION_GUIDES: Record<string, Guide> = {
  maldives: {
    intro: [
      'A thousand coral islands scattered across the Indian Ocean, each one a private world of white sand and impossible blues. The Maldives is a four-hour hop from the Gulf, no visa fuss for most nationalities, and the rare destination that looks exactly like its photographs.',
      'One island, one resort is the rule — so choosing the right island is everything. That’s where we come in: budget, board basis, house reef, kids’ club or none, seaplane or speedboat — we match you to the island that fits.',
    ],
    whenToTravel: [
      { heading: 'November – April', body: 'The dry season: blue skies, calm lagoons and the best visibility for snorkelling and diving. Peak rates over Christmas and New Year — book those months early.' },
      { heading: 'May – October', body: 'The green season brings short tropical bursts of rain and softer prices — often 30–40% below peak. Surf picks up, and manta and whale-shark sightings peak on many atolls.' },
      { heading: 'Best value', body: 'May, September and early December hit the sweet spot: near-perfect weather at shoulder-season rates.' },
    ],
    culture: [
      { heading: 'Island life & etiquette', body: 'The Maldives is a Muslim nation. On resort islands dress as you please; on local islands shoulders and knees should be covered and alcohol is not available. A warm “Assalaamu alaikum” goes a long way.' },
      { heading: 'Food & flavours', body: 'Mas huni — smoked tuna, coconut and chilli scooped up with roshi flatbread — is the classic Maldivian breakfast. Ask your resort for a Maldivian night: garudhiya broth, reef fish curries and sticky bondibaiy rice.' },
    ],
  },
  georgia: {
    intro: [
      'Wedged between the Caucasus mountains and the Black Sea, Georgia packs cave monasteries, alpine passes, art-nouveau boulevards and eight thousand years of winemaking into a country smaller than Ireland — three hours from the Gulf with no visa for UAE residents.',
    ],
    whenToTravel: [
      { heading: 'May – June & September – October', body: 'The golden windows: warm valleys, clear mountain views and harvest festivals in wine country. October in Kakheti is the rtveli grape harvest — the best week of the year to visit.' },
      { heading: 'July – August', body: 'Ideal for the high Caucasus — Kazbegi and Svaneti trails are open and green — though Tbilisi runs hot.' },
      { heading: 'December – March', body: 'Gudauri’s ski season: genuinely good snow, tiny prices, and sulphur baths waiting back in Tbilisi.' },
    ],
    culture: [
      { heading: 'The supra', body: 'Georgia’s legendary feast, led by a tamada (toastmaster) through wine-fuelled toasts to peace, ancestors and guests. Refusing a toast is bad form — pacing yourself is wisdom.' },
      { heading: 'Wine, the original', body: 'Georgians have made wine in buried qvevri clay vessels for 8,000 years — a UNESCO-listed tradition. Amber wines are the signature; every family in Kakheti seems to make their own.' },
    ],
  },
  japan: {
    intro: [
      'Japan runs on a current of quiet precision — bullet trains that apologise for a one-minute delay, temple gardens raked at dawn, seven-course dinners served in wooden ryokans. It is at once the most futuristic and most traditional place you will ever visit.',
    ],
    whenToTravel: [
      { heading: 'March – April', body: 'Cherry-blossom season sweeps south to north. Magical and busy — hotels in Kyoto book out months ahead.' },
      { heading: 'October – November', body: 'Autumn colour turns temple gardens crimson. Crisp air, clear Fuji views — many say it beats spring.' },
      { heading: 'December – February', body: 'Snow monkeys, powder skiing in Hokkaido and steaming onsen. Cities are quiet and hotel value is excellent.' },
    ],
    culture: [
      { heading: 'Etiquette worth knowing', body: 'Shoes off where you see a genkan step; don’t stick chopsticks upright in rice; queue for everything; tipping is not done. Nobody expects perfection — effort is warmly received.' },
      { heading: 'Onsen & ryokan', body: 'A night in a ryokan with kaiseki dinner and a hot-spring soak is Japan distilled. Bathe before entering the water, and note some traditional onsen still decline visible tattoos — we’ll book you a private bath where needed.' },
    ],
  },
  switzerland: {
    intro: [
      'Switzerland compresses Europe’s most dramatic scenery into a country you can cross by train in a morning — glacier peaks, mirror lakes and villages where the trains run like clockwork because they are the clockwork.',
    ],
    whenToTravel: [
      { heading: 'June – September', body: 'Hiking season: green alps, open mountain railways and long days. July–August is peak — June and September are quieter and just as beautiful.' },
      { heading: 'December – March', body: 'Ski season across the Alps, Christmas markets in December, and the Glacier Express at its most cinematic.' },
    ],
    culture: [
      { heading: 'Four languages, one punctuality', body: 'German, French, Italian and Romansh share one railway timetable accurate to the minute. A “Grüezi” in Zurich becomes “Bonjour” by Montreux.' },
      { heading: 'Cheese, chocolate, honesty', body: 'Fondue is winter law, Alpine cheese huts sell rounds on unstaffed honesty shelves, and the chocolate really is better at the source.' },
    ],
  },
  thailand: {
    intro: [
      'Thailand remains Asia’s great all-rounder: limestone bays and jungle temples, street food that outclasses most restaurants, and a warmth of welcome that keeps travellers returning for decades.',
    ],
    whenToTravel: [
      { heading: 'November – February', body: 'The cool, dry season and classic time to visit — perfect beach weather on the Andaman coast and comfortable city sightseeing.' },
      { heading: 'March – May', body: 'Hot season. Fine for beach-focused trips; Songkran (Thai New Year, mid-April) turns the country into the world’s biggest water fight.' },
      { heading: 'June – October', body: 'Green season on the Andaman side, but the Gulf islands (Samui, Phangan) stay largely dry — we simply route you east.' },
    ],
    culture: [
      { heading: 'Temple etiquette', body: 'Cover shoulders and knees, remove shoes, and never point your feet at a Buddha image. The head is sacred, the feet are not — it shapes much of Thai body language.' },
      { heading: 'The wai and “sanuk”', body: 'Greet with a small bow over pressed palms, and remember sanuk — the Thai principle that everything, even work, should carry some joy. Smiling back is mandatory.' },
    ],
  },
  jordan: {
    intro: [
      'Jordan is the Middle East at its most welcoming: Nabataean cities carved into rose-red rock, Lawrence of Arabia’s desert, Roman ruins and the salty float of the Dead Sea — all within a few hours’ drive of each other.',
    ],
    whenToTravel: [
      { heading: 'March – May', body: 'Spring: wildflowers in the north, warm days in Petra and Wadi Rum, and the most comfortable hiking weather.' },
      { heading: 'September – November', body: 'Autumn mirrors spring — clear skies and golden desert light without summer’s heat.' },
      { heading: 'December – February', body: 'Cool and quiet. Petra with barely a crowd; pack layers for cold desert nights at camp.' },
    ],
    culture: [
      { heading: 'Bedouin hospitality', body: '“Ahlan wa sahlan” — you will hear it everywhere, usually with sweet tea attached. Accepting a glass is the polite start to any conversation, souk bargaining included.' },
      { heading: 'Mansaf & maqluba', body: 'Jordan’s national dish is mansaf — lamb in fermented yoghurt over rice, eaten by hand from a shared platter on special occasions. Say yes.' },
    ],
  },
  'united-arab-emirates': {
    intro: [
      'Home advantage: seven emirates of beach resorts, desert camps, mountain lodges and city icons — all within a tank of petrol. The UAE staycation has quietly become world-class, and residents get the best of it.',
    ],
    whenToTravel: [
      { heading: 'October – April', body: 'Prime season: beach weather without the furnace, al-fresco dining and desert nights cool enough for a fire.' },
      { heading: 'May – September', body: 'Summer brings serious heat — and serious hotel deals. Pool-and-spa resets and indoor city weekends at half the winter price.' },
    ],
    culture: [
      { heading: 'Majlis manners', body: 'Hospitality is the region’s oldest tradition — gahwa (cardamom coffee) and dates on arrival. Receive with the right hand, and a gentle shake of the cup says “no more, thank you”.' },
      { heading: 'Old and new', body: 'Between the towers there’s a deeper UAE: Al Fahidi’s wind-tower lanes, Sharjah’s museums, Al Ain’s oases and pearl-diving history along the coast.' },
    ],
  },
  scotland: {
    intro: [
      'The home of golf, single malts and weather with a sense of drama. Scotland’s links coastline is a pilgrimage every golfer should make once — and its castles, lochs and Highland roads reward the non-golfers just as richly.',
    ],
    whenToTravel: [
      { heading: 'May – September', body: 'Long daylight (golf until 9pm in June), the best chance of sunshine, and the Highland Games season. July–August is busiest around St Andrews.' },
      { heading: 'April & October', body: 'Shoulder months: quieter tee sheets and sharper rates — pack a windproof layer and embrace it.' },
    ],
    culture: [
      { heading: 'Clubhouse & ceilidh', body: 'Golf here is community, not luxury — jacket-and-tie dining rooms sit beside welcoming public links. If a ceilidh (folk dance night) appears, join it.' },
      { heading: 'Whisky wisdom', body: 'A distillery tour teaches the golden rule: add a drop of water, never ice, and never call it Scotch whiskey with an “e”.' },
    ],
  },
  portugal: {
    intro: [
      'Europe’s west edge: golden cliffs, Atlantic light and the continent’s most reliable winter golf. The Algarve pairs championship courses with fishing-village charm and long, unhurried lunches.',
    ],
    whenToTravel: [
      { heading: 'October – May', body: 'The golf sweet spot — mild, mostly dry and far from summer crowds. Christmas golf in shirtsleeves is entirely normal.' },
      { heading: 'June – September', body: 'Beach season: hot days tempered by Atlantic breezes. Book early tee times to beat the heat.' },
    ],
    culture: [
      { heading: 'Petiscos & port', body: 'Portugal’s answer to tapas: grilled sardines, garlic prawns and green wine by the sea. Finish with a tawny port — it’s from here, after all.' },
      { heading: 'Saudade', body: 'The untranslatable Portuguese feeling — a warm melancholy best heard in fado music drifting through old-town Faro or Lisbon.' },
    ],
  },
  turkey: {
    intro: [
      'Belek is Europe’s answer to a golf factory settings reset: a pine-lined Mediterranean strip stacked with championship courses and genuinely excellent all-inclusive resorts, four hours from the Gulf.',
    ],
    whenToTravel: [
      { heading: 'March – May & October – November', body: 'Prime golf: warm, dry and green. The big amateur weeks cluster here — book tee times early.' },
      { heading: 'June – September', body: 'Beach-first season; golfers tee off at dawn and spend afternoons by the water.' },
    ],
    culture: [
      { heading: 'Çay and hospitality', body: 'Tulip-shaped glasses of tea appear everywhere, always offered, never rushed. Accepting one is the start of every good conversation in Turkey.' },
      { heading: 'Beyond the fairways', body: 'Ancient Aspendos and Perge are half an hour from Belek — Roman theatres and agora streets between rounds.' },
    ],
  },
  mauritius: {
    intro: [
      'A volcanic island ringed by coral lagoon, where sugarcane hills meet some of the Indian Ocean’s best resort golf — and honeymooners, families and golfers all somehow get the holiday they wanted.',
    ],
    whenToTravel: [
      { heading: 'May – December', body: 'The cooler, drier season — ideal golf weather and the calmest lagoon conditions.' },
      { heading: 'January – April', body: 'Warm and lush with occasional tropical downpours; peak beach season and mango everything.' },
    ],
    culture: [
      { heading: 'A creole blend', body: 'Indian, African, Chinese and French heritage share the island — sega music on the beach, Diwali lights, dholl puri from street stalls and rum from the estate.' },
      { heading: 'Lagoon life', body: 'The reef keeps the lagoon pool-calm — glass-bottom boats, kite lagoons in the south-east, and turtles off Le Morne.' },
    ],
  },
  mediterranean: {
    intro: [
      'One sea, twenty civilisations. A Mediterranean cruise threads Santorini sunsets, Amalfi lemons and Barcelona nights into a single unpacking — the easiest way to taste Europe’s greatest coastline.',
    ],
    whenToTravel: [
      { heading: 'May – June & September – October', body: 'The connoisseur’s window: warm seas, open terraces and ports without peak-summer crowds.' },
      { heading: 'July – August', body: 'High summer — buzzing, hot and family-favourite. Book balcony cabins and early excursion slots.' },
    ],
    culture: [
      { heading: 'Port-day wisdom', body: 'The best Mediterranean port days trade ticking sights for one long lunch — a trattoria in a back lane beats a checklist every time.' },
    ],
  },
  'northern-europe': {
    intro: [
      'Fjords a thousand metres deep, waterfalls off the balcony and villages only reachable by sea — Northern Europe is cruising’s most dramatic stage, best played in the endless light of summer.',
    ],
    whenToTravel: [
      { heading: 'May – August', body: 'Fjord season: green cliffs, thundering falls and near-midnight sun. June–July for the longest days.' },
      { heading: 'September', body: 'First autumn colour on the fjord walls and a real chance of northern lights on late sailings.' },
    ],
    culture: [
      { heading: 'Koselig', body: 'Norway’s art of cosiness — wool blankets on deck, cinnamon buns in Bergen’s Bryggen lanes, and no rush whatsoever.' },
    ],
  },
  'arabian-gulf': {
    intro: [
      'The world’s easiest cruise: drive to the terminal after breakfast, sail past the Dubai skyline by dinner. Gulf itineraries link the region’s capitals with a private desert island — no flights, no jet lag.',
    ],
    whenToTravel: [
      { heading: 'November – March', body: 'The Gulf cruising season — warm days, cool evenings on deck and calm seas. December–January sailings book out first.' },
    ],
    culture: [
      { heading: 'Three countries, one sailing', body: 'Souk mornings in Muscat or Doha, museum afternoons in Abu Dhabi, beach days on a private island — each port a different face of the Gulf.' },
    ],
  },
};
