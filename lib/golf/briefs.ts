/**
 * The 40 golf package sourcing briefs from the 3 October 2026 audit workbook
 * (Premium_Choice_Golf_Holidays_Audit_and_Package_Plan.xlsx, sheet "Package plan").
 *
 * These are proposed combinations, not confirmed inventory or prices. They are
 * loaded into the admin as DRAFT golf journeys by scripts/seed-golf-briefs.ts
 * so the product team can source them one by one; nothing here is ever
 * published by a script. Text is kept exactly as the workbook has it.
 */
export type GolfBrief = {
  id: string;
  priority: string;
  action: string;
  title: string;
  destination: string;
  nights: number;
  rounds: number;
  hotel: string;
  courses: string;
  board: string;
  customer: string;
  structure: string;
  before: string;
  status: string;
  research: string[];
};

export const GOLF_BRIEFS: GolfBrief[] = [
  {
    "id": "P01",
    "priority": "1 First",
    "action": "New short break",
    "title": "Ras Al Khaimah Golf Weekend",
    "destination": "UAE / Ras Al Khaimah",
    "nights": 2,
    "rounds": 2,
    "hotel": "Waldorf Astoria Ras Al Khaimah",
    "courses": "Al Hamra x2",
    "board": "Breakfast",
    "customer": "UAE pairs and small groups",
    "structure": "Land-only. Self-drive or optional return group transfer.",
    "before": "Obtain UAE resident eligibility, weekend supplement, green fees and buggy terms.",
    "status": "Not sourced",
    "research": [
      "https://www.golfkings.co.uk/montgomerie-golf-club/"
    ]
  },
  {
    "id": "P02",
    "priority": "1 First",
    "action": "New short variant",
    "title": "Abu Dhabi Two-Course Weekend",
    "destination": "UAE / Abu Dhabi",
    "nights": 2,
    "rounds": 2,
    "hotel": "Park Rotana Abu Dhabi",
    "courses": "Yas Links x1; Abu Dhabi National x1",
    "board": "Breakfast",
    "customer": "UAE golfers with limited leave",
    "structure": "Add below the existing four-night Abu Dhabi itinerary.",
    "before": "Price the two courses separately. Check tee-time blocks and transfer costs.",
    "status": "Not sourced",
    "research": [
      "https://www.golfkings.co.uk/destinations/abu-dhabi-golf-holidays/park-rotana-hotel-abu-dhabi/"
    ]
  },
  {
    "id": "P03",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Kempinski Muscat Golf Escape",
    "destination": "Oman / Muscat",
    "nights": 3,
    "rounds": 2,
    "hotel": "Kempinski Hotel Muscat",
    "courses": "Al Mouj x2",
    "board": "Breakfast",
    "customer": "UAE couples and fourballs",
    "structure": "Offer self-drive land-only and separately quoted UAE flight options.",
    "before": "Source hotel, golf and airport transfer bundle. Confirm club carriage and border requirements as applicable.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/kempinski-hotel-muscat-oman"
    ]
  },
  {
    "id": "P04",
    "priority": "1 First",
    "action": "New value option",
    "title": "Dubai Golf and Marina",
    "destination": "UAE / Dubai",
    "nights": 4,
    "rounds": 3,
    "hotel": "Rove Dubai Marina",
    "courses": "Dubai Hills x1; The Els Club x1; Emirates Faldo x1",
    "board": "Breakfast",
    "customer": "Inbound golf groups",
    "structure": "Land-only with airport and golf transfers. Flights optional.",
    "before": "Contract matching travel dates and courses. Show Faldo daytime/night-time basis and buggies.",
    "status": "Not sourced",
    "research": [
      "https://eaglegolftours.com/"
    ]
  },
  {
    "id": "P05",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Sueno Belek All-Inclusive Golf",
    "destination": "Türkiye / Belek",
    "nights": 7,
    "rounds": 4,
    "hotel": "Sueno Hotels Golf Belek",
    "courses": "Sueno Pines x2; Sueno Dunes x2",
    "board": "All-inclusive",
    "customer": "Golf societies and mixed abilities",
    "structure": "Lead with a fixed four-round package. Quote UAE flights separately.",
    "before": "Get contracted dates, airport/golf transfers, buggy rates and genuine group concessions.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/sueno-pines-course"
    ]
  },
  {
    "id": "P06",
    "priority": "1 First",
    "action": "New resort option",
    "title": "Titanic Belek Golf and Beach",
    "destination": "Türkiye / Belek",
    "nights": 7,
    "rounds": 4,
    "hotel": "Titanic Deluxe Golf Belek",
    "courses": "Aspendos x2; Olympos x2",
    "board": "All-inclusive",
    "customer": "Couples, families and golfers",
    "structure": "A hotel-led alternative to Sueno with a separate non-golfer price.",
    "before": "Verify included restaurants, room category, shuttle operation and golf rates.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P07",
    "priority": "1 First",
    "action": "New resort option",
    "title": "Constance Belle Mare Golf Week",
    "destination": "Mauritius / East coast",
    "nights": 7,
    "rounds": 4,
    "hotel": "Constance Belle Mare Plage",
    "courses": "Legend x2; Links x2",
    "board": "Half board to source",
    "customer": "Couples and repeat golfers",
    "structure": "Separate resort stay from the existing east-coast touring itinerary.",
    "before": "Confirm green-fee entitlement, tee reservations and buggy charges. Use unlimited only with written terms.",
    "status": "Not sourced",
    "research": [
      "https://www.golfbreaks.com/en-gb/holidays/mauritius/constance-belle-mare-plage/"
    ]
  },
  {
    "id": "P08",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Heritage Golf and Beach",
    "destination": "Mauritius / Bel Ombre",
    "nights": 7,
    "rounds": 3,
    "hotel": "Heritage Awali Golf and Spa Resort",
    "courses": "Le Château x2; La Réserve x1",
    "board": "All-inclusive to source",
    "customer": "Golfing and non-golfing couples",
    "structure": "Offer La Réserve as an explicit included round or separately priced upgrade.",
    "before": "Confirm access conditions, supplements, caddie/buggy terms and the actual all-inclusive scope.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/mauritius-golf-south-west"
    ]
  },
  {
    "id": "P09",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Phuket Three-Course Escape",
    "destination": "Thailand / Phuket",
    "nights": 5,
    "rounds": 3,
    "hotel": "Angsana Laguna Phuket",
    "courses": "Laguna Phuket x1; Red Mountain x1; Loch Palm x1",
    "board": "Breakfast",
    "customer": "Friends and couples",
    "structure": "Shorter alternative to the existing seven-night journey. Private golf transfers.",
    "before": "Get caddie fee, recommended tip, buggy charge and wet-weather policy per course.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/golf-holidays/hosted-golf-trips-in-asia/"
    ]
  },
  {
    "id": "P10",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Hua Hin Golf Classics",
    "destination": "Thailand / Hua Hin",
    "nights": 7,
    "rounds": 4,
    "hotel": "Mövenpick Asara Resort and Spa Hua Hin",
    "courses": "Black Mountain x2; Pineapple Valley x2",
    "board": "Breakfast",
    "customer": "Golf-first groups",
    "structure": "One hotel, two leading courses, four rounds and rest days.",
    "before": "Confirm Bangkok airport transfer duration and price, course fees, buggies and caddies.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/hotels-resorts/thailand/hua-hin/movenpick-asara-resort-spa-hua-hin/"
    ]
  },
  {
    "id": "P11",
    "priority": "1 First",
    "action": "Refine existing",
    "title": "Da Nang Four-Round Collection",
    "destination": "Vietnam / Da Nang",
    "nights": 7,
    "rounds": 4,
    "hotel": "Hyatt Regency Danang Resort and Spa",
    "courses": "Hoiana Shores x2; Ba Na Hills x1; Montgomerie Links x1",
    "board": "Breakfast",
    "customer": "Golfers also interested in Hoi An",
    "structure": "Show each course and transfer. Add a non-golfer itinerary.",
    "before": "Confirm regional weather window, course conditions and UAE flight routing for the travel dates.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/hotels-resorts/vietnam/hyatt-regency-danang-resort-spa/"
    ]
  },
  {
    "id": "P12",
    "priority": "1 First",
    "action": "New resort option",
    "title": "La Cala Three-Course Break",
    "destination": "Spain / Costa del Sol",
    "nights": 4,
    "rounds": 3,
    "hotel": "La Cala Resort",
    "courses": "America x1; Asia x1; Europa x1",
    "board": "Breakfast",
    "customer": "Groups seeking a simpler resort trip",
    "structure": "Add an accessible resort option alongside the existing luxury Costa del Sol journey.",
    "before": "Source travel windows, airport transfers and buggy availability. Price per person on stated occupancy.",
    "status": "Not sourced",
    "research": [
      "https://www.golfbreaks.com/en-gb/holidays/mijas/la-cala-resort/"
    ]
  },
  {
    "id": "P13",
    "priority": "2 Next",
    "action": "New resort option",
    "title": "Amendoeira Apartment Golf Break",
    "destination": "Portugal / Algarve",
    "nights": 5,
    "rounds": 3,
    "hotel": "Amendoeira Golf Resort",
    "courses": "Faldo x1; O’Connor Jnr x2",
    "board": "Self-catering",
    "customer": "Fourballs and groups sharing apartments",
    "structure": "Show two-bedroom apartment occupancy and breakfast upgrade.",
    "before": "Verify beds, occupancy, cleaning charges, golf reservations and buggy inclusions.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/best-golf-resorts/algarve"
    ]
  },
  {
    "id": "P14",
    "priority": "2 Next",
    "action": "New resort option",
    "title": "Vilamoura Marina Golf Break",
    "destination": "Portugal / Algarve",
    "nights": 5,
    "rounds": 3,
    "hotel": "Tivoli Marina Vilamoura",
    "courses": "Three Vilamoura courses selected with supplier",
    "board": "Breakfast",
    "customer": "Groups wanting marina evenings",
    "structure": "Create a mid-range alternative to Algarve Icons, with named courses at launch.",
    "before": "Choose courses from current contracted inventory. Validate travel times and course naming.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P15",
    "priority": "2 Next",
    "action": "New resort option",
    "title": "La Manga Three-Course Stay",
    "destination": "Spain / Murcia",
    "nights": 5,
    "rounds": 3,
    "hotel": "Grand Hyatt La Manga Club Golf and Spa",
    "courses": "North x1; South x1; West x1",
    "board": "Breakfast",
    "customer": "Golf groups and families",
    "structure": "Five-night fly-and-stay variant suited to UAE travel time.",
    "before": "Validate access to each course, buggy terms and airport routing before publishing.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P16",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Westin Costa Navarino Golf Week",
    "destination": "Greece / Messinia",
    "nights": 5,
    "rounds": 4,
    "hotel": "The Westin Resort Costa Navarino",
    "courses": "Dunes; Bay; Hills; International Olympic Academy, one each",
    "board": "Breakfast",
    "customer": "Premium groups and couples",
    "structure": "Turn the existing four-course itinerary into a named-hotel offer.",
    "before": "Cost all four courses, golf shuttles, airport transfers and meal upgrades.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P17",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Aphrodite Hills Resort Golf",
    "destination": "Cyprus / Paphos",
    "nights": 5,
    "rounds": 3,
    "hotel": "Aphrodite Hills Hotel",
    "courses": "Aphrodite Hills x3; alternative course quoted separately",
    "board": "Breakfast to source",
    "customer": "Couples wanting one resort base",
    "structure": "Present a clear resort package before offering a multi-course upgrade.",
    "before": "Confirm room category, buggy policy, handicap requirements and tee-time availability.",
    "status": "Not sourced",
    "research": [
      "https://www.golfholidays.com/"
    ]
  },
  {
    "id": "P18",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Marrakech Golf and Medina",
    "destination": "Morocco / Marrakech",
    "nights": 5,
    "rounds": 3,
    "hotel": "Kenzi Menara Palace",
    "courses": "Three Marrakech courses to contract and name",
    "board": "All-inclusive to source",
    "customer": "Golfers seeking culture and meals included",
    "structure": "Use the existing itinerary with one definite hotel and three specified courses.",
    "before": "Choose practical course routing. Check inclusions, transfer vehicle and medina excursion price.",
    "status": "Not sourced",
    "research": [
      "https://www.golfholidaysdirect.com/"
    ]
  },
  {
    "id": "P19",
    "priority": "2 Next",
    "action": "New destination",
    "title": "Agadir All-Inclusive Golf",
    "destination": "Morocco / Agadir",
    "nights": 5,
    "rounds": 3,
    "hotel": "Iberostar Waves Founty Beach",
    "courses": "Golf du Soleil; Golf Les Dunes; Golf de l’Ocean, one each",
    "board": "All-inclusive",
    "customer": "Value-conscious golf groups",
    "structure": "Add a beach-led alternative to Marrakech.",
    "before": "Confirm golf supplier, airport and golf transfers, room allocation and seasonal pricing.",
    "status": "Not sourced",
    "research": [
      "https://www.golfbreaks.com/en-gb/",
      "https://www.golfkings.co.uk/holiday-types/flights-included-golf-holidays/"
    ]
  },
  {
    "id": "P20",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Fancourt and Pinnacle Point",
    "destination": "South Africa / Garden Route",
    "nights": 6,
    "rounds": 4,
    "hotel": "Fancourt Hotel",
    "courses": "Montagu x2; Outeniqua x1; Pinnacle Point x1",
    "board": "Breakfast",
    "customer": "Golf-first groups",
    "structure": "Base at Fancourt with one coastal day. Price The Links only as a verified upgrade.",
    "before": "Confirm course access, transport time, seasonal maintenance and arrival airport.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P21",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Cape Town Golf and Winelands",
    "destination": "South Africa / Cape Town",
    "nights": 7,
    "rounds": 3,
    "hotel": "The Portswood Hotel, plus a named Winelands stay if needed",
    "courses": "Steenberg; Pearl Valley; Arabella, one each",
    "board": "Breakfast",
    "customer": "Couples and golfers with non-playing partners",
    "structure": "Retain touring days and publish the actual daily driving distances.",
    "before": "Choose hotel bases around the route. Obtain driver, wine experience and course quotes.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/cape-town-winelands-golf"
    ]
  },
  {
    "id": "P22",
    "priority": "2 Next",
    "action": "New resort option",
    "title": "Fairmont St Andrews Summer Golf",
    "destination": "Scotland / Fife",
    "nights": 5,
    "rounds": 4,
    "hotel": "Fairmont St Andrews",
    "courses": "Kittocks x2; Torrance x2",
    "board": "Breakfast",
    "customer": "UAE summer travellers",
    "structure": "A defined resort product alongside the existing links pilgrimage.",
    "before": "Offer Old Course requests separately. Do not imply ballot or guaranteed Old Course access.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P23",
    "priority": "2 Next",
    "action": "Refine existing",
    "title": "Ireland Southwest Links Tour",
    "destination": "Ireland / Southwest",
    "nights": 7,
    "rounds": 4,
    "hotel": "Named hotels around Killarney and Lahinch to contract",
    "courses": "Ballybunion; Tralee; Waterville; Lahinch, one each",
    "board": "Breakfast",
    "customer": "Experienced links groups",
    "structure": "A touring product with luggage transport and sensible overnight bases.",
    "before": "Secure access and caddie terms. Map transfer days before finalising hotel nights.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/ireland-southwest-links"
    ]
  },
  {
    "id": "P24",
    "priority": "2 Next",
    "action": "New two-centre trip",
    "title": "Dubai and Abu Dhabi Golf Tour",
    "destination": "UAE / Two emirates",
    "nights": 7,
    "rounds": 5,
    "hotel": "Rove Dubai Marina and Park Rotana Abu Dhabi",
    "courses": "Dubai Hills; The Els Club; Faldo; Yas Links; Abu Dhabi National",
    "board": "Breakfast",
    "customer": "Inbound golfers",
    "structure": "Three Dubai rounds and two Abu Dhabi rounds with an inter-emirate transfer.",
    "before": "Price hotel night split, all transfers, course closures and arrival/departure airports.",
    "status": "Not sourced",
    "research": [
      "https://eaglegolftours.com/",
      "https://www.golfkings.co.uk/destinations/abu-dhabi-golf-holidays/park-rotana-hotel-abu-dhabi/"
    ]
  },
  {
    "id": "P25",
    "priority": "2 Next",
    "action": "New mixed-party option",
    "title": "Mauritius Couples Golf and Spa",
    "destination": "Mauritius / Bel Ombre",
    "nights": 7,
    "rounds": 2,
    "hotel": "Heritage Awali Golf and Spa Resort",
    "courses": "Le Château x2",
    "board": "All-inclusive to source",
    "customer": "One golfer and one non-golfer",
    "structure": "A selectable mixed-party offer under the Heritage package, with two different traveller prices.",
    "before": "Get non-golfer savings and a genuine spa credit quote. Do not create duplicate resort pages.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/mauritius-golf-south-west"
    ]
  },
  {
    "id": "P26",
    "priority": "2 Next",
    "action": "New group offer",
    "title": "Ras Al Khaimah Society Weekend",
    "destination": "UAE / Ras Al Khaimah",
    "nights": 2,
    "rounds": 2,
    "hotel": "Waldorf Astoria Ras Al Khaimah",
    "courses": "Al Hamra x2",
    "board": "Breakfast",
    "customer": "Groups of 8, 12 or 16",
    "structure": "A group option under the RAK package with scoring, dinner and shared transport.",
    "before": "Quote each group size and organiser benefit. Contract contiguous tee times and actual hosting services.",
    "status": "Not sourced",
    "research": [
      "https://www.golfkings.co.uk/montgomerie-golf-club/"
    ]
  },
  {
    "id": "P27",
    "priority": "3 Later",
    "action": "New destination",
    "title": "Bali Golf and Island Tour",
    "destination": "Indonesia / Bali",
    "nights": 7,
    "rounds": 3,
    "hotel": "Southern Bali hotel and Handara Golf and Resort, to contract",
    "courses": "New Kuta; Handara; Bukit Pandawa, one each",
    "board": "Breakfast",
    "customer": "Golfers wanting touring and scenery",
    "structure": "Use two bases to avoid long cross-island golf transfers.",
    "before": "Verify course formats, including the par-three layout, drive times and the final hotel selection.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/golf-information/golf-destination-guides/bali/"
    ]
  },
  {
    "id": "P28",
    "priority": "3 Later",
    "action": "New destination",
    "title": "Cambodia Golf and Temples",
    "destination": "Cambodia / Two centres",
    "nights": 8,
    "rounds": 4,
    "hotel": "Named Phnom Penh and Siem Reap hotels to contract",
    "courses": "Four rounds selected with a local golf DMC",
    "board": "Breakfast",
    "customer": "Cultural travellers with golf experience",
    "structure": "Build from a real supplier itinerary with temple days and named courses before launch.",
    "before": "Obtain a complete ground quote, domestic transport, courses and suitable travel months.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/"
    ]
  },
  {
    "id": "P29",
    "priority": "3 Later",
    "action": "New destination",
    "title": "Kuala Lumpur City Golf",
    "destination": "Malaysia / Kuala Lumpur",
    "nights": 4,
    "rounds": 3,
    "hotel": "Named central Kuala Lumpur hotel to contract",
    "courses": "Three visitor-accessible courses selected with a golf DMC",
    "board": "Breakfast",
    "customer": "Small groups and city-break golfers",
    "structure": "Combine city evenings with private golf transfers.",
    "before": "Verify visitor access and travel times. Require hotel and course names before publishing.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/"
    ]
  },
  {
    "id": "P30",
    "priority": "3 Later",
    "action": "New short break",
    "title": "Bangkok Golf and City Break",
    "destination": "Thailand / Bangkok",
    "nights": 3,
    "rounds": 2,
    "hotel": "Named Bangkok city hotel to contract",
    "courses": "Nikanti and Thana City, subject to supplier access",
    "board": "Breakfast",
    "customer": "UAE golfers taking a short overseas break",
    "structure": "Two rounds and one free city day. Keep flights and club baggage explicit.",
    "before": "Obtain confirmed course options, airport transfers and a hotel suitable for the route.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/"
    ]
  },
  {
    "id": "P31",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Scottish Highlands Four-Course Tour",
    "destination": "Scotland / Highlands",
    "nights": 5,
    "rounds": 4,
    "hotel": "Named Inverness/Nairn and Dornoch hotels to contract",
    "courses": "Nairn; Royal Dornoch; Brora; Cabot Highlands Castle Stuart",
    "board": "Breakfast",
    "customer": "Experienced links golfers",
    "structure": "Use two bases and a driver option rather than repeated long drives.",
    "before": "Confirm exact course access, seasonal maintenance, caddies and booking lead time.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/scottish-highlands-links"
    ]
  },
  {
    "id": "P32",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Northern Ireland Links Collection",
    "destination": "Northern Ireland",
    "nights": 5,
    "rounds": 3,
    "hotel": "Named Newcastle and Portrush area hotels to contract",
    "courses": "Royal County Down; Royal Portrush; Portstewart",
    "board": "Breakfast",
    "customer": "Bucket-list golf groups",
    "structure": "A high-touch enquiry product with a transparent access status for each club.",
    "before": "Contract tee times before advertising an included championship course as secured.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/northern-ireland-links"
    ]
  },
  {
    "id": "P33",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Madeira Scenic Golf Escape",
    "destination": "Portugal / Madeira",
    "nights": 5,
    "rounds": 3,
    "hotel": "Named Funchal seafront hotel to contract",
    "courses": "Palheiro x2; Santo da Serra x1",
    "board": "Breakfast",
    "customer": "Golfing couples and walkers",
    "structure": "Retain the scenic itinerary. Add a named hotel and costed flight connection.",
    "before": "Check connection times, golf weather contingency, buggy policy and excursions.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/madeira-golf-escape"
    ]
  },
  {
    "id": "P34",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Orlando and Sawgrass Golf Tour",
    "destination": "USA / Florida",
    "nights": 7,
    "rounds": 4,
    "hotel": "Rosen Plaza Hotel and Sawgrass Marriott Golf Resort and Spa",
    "courses": "TPC Sawgrass Stadium x1; Crooked Cat x1; Shingle Creek x2",
    "board": "Room only",
    "customer": "Bucket-list golfers",
    "structure": "Publish a two-base route with realistic driving and course timing.",
    "before": "Confirm Stadium access, stay conditions, resort fees, car/transfer basis and caddies.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P35",
    "priority": "3 Later",
    "action": "New destination",
    "title": "Myrtle Beach Golf Villa Week",
    "destination": "USA / South Carolina",
    "nights": 7,
    "rounds": 4,
    "hotel": "Myrtlewood Golf Villas",
    "courses": "Myrtlewood and Myrtle Beach National layouts, to specify",
    "board": "Self-catering",
    "customer": "Groups sharing villas",
    "structure": "Add a distinct US value option with stated villa occupancy.",
    "before": "Contract named courses, transport, villa beds, resort fees and flight connections.",
    "status": "Not sourced",
    "research": [
      "https://eaglegolftours.com/"
    ]
  },
  {
    "id": "P36",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Casa de Campo Caribbean Golf",
    "destination": "Dominican Republic / La Romana",
    "nights": 7,
    "rounds": 5,
    "hotel": "Casa de Campo Resort and Villas",
    "courses": "Teeth of the Dog x1; Dye Fore x2; The Links x2",
    "board": "All-inclusive to source",
    "customer": "Luxury golf groups",
    "structure": "Use one resort instead of suggesting distant courses without the transfer plan.",
    "before": "Confirm current course access, caddies, villa/room basis and the precise all-inclusive package.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/"
    ]
  },
  {
    "id": "P37",
    "priority": "3 Later",
    "action": "Refine existing",
    "title": "Rome Golf and City Escape",
    "destination": "Italy / Rome",
    "nights": 4,
    "rounds": 2,
    "hotel": "Named Rome hotel to contract",
    "courses": "Marco Simone x2",
    "board": "Breakfast",
    "customer": "Golfing couples and city travellers",
    "structure": "Clarify that this is play at a Ryder Cup venue, not tournament attendance.",
    "before": "Source hotel and transfers around the course. Confirm visitor tee-time access.",
    "status": "Not sourced",
    "research": [
      "https://premiumchoicegolfholidays.com/journeys/rome-ryder-cup-golf-break"
    ]
  },
  {
    "id": "P38",
    "priority": "3 Later",
    "action": "New tuition option",
    "title": "Muscat Golf Improvement Break",
    "destination": "Oman / Muscat",
    "nights": 3,
    "rounds": 2,
    "hotel": "Kempinski Hotel Muscat",
    "courses": "Al Mouj x2 plus coaching sessions",
    "board": "Breakfast",
    "customer": "Golfers actively seeking coaching",
    "structure": "Add a defined coaching option to the Muscat package.",
    "before": "Contract coach credentials, group ratio, tuition hours and practice-facility access.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/kempinski-hotel-muscat-oman",
      "https://www.golfholidaysdirect.com/"
    ]
  },
  {
    "id": "P39",
    "priority": "3 Later",
    "action": "New hosted offer",
    "title": "Phuket Hosted Women’s Golf Trip",
    "destination": "Thailand / Phuket",
    "nights": 5,
    "rounds": 3,
    "hotel": "Angsana Laguna Phuket",
    "courses": "Laguna Phuket; Red Mountain; Loch Palm, one each",
    "board": "Breakfast",
    "customer": "Women wanting a hosted social golf trip",
    "structure": "Offer fixed departures only after host and minimum numbers are contracted.",
    "before": "Specify host, group size, single-room price, ability range and departure cancellation terms.",
    "status": "Not sourced",
    "research": [
      "https://www.golfasian.com/golf-holidays/hosted-golf-trips-in-asia/",
      "https://www.golfholidaysdirect.com/"
    ]
  },
  {
    "id": "P40",
    "priority": "3 Later",
    "action": "New event offer",
    "title": "Dubai Watch and Play",
    "destination": "UAE / Dubai",
    "nights": 4,
    "rounds": 2,
    "hotel": "Rove Dubai Marina or contracted upgrade",
    "courses": "Dubai Hills x1; The Els Club x1",
    "board": "Breakfast",
    "customer": "Tournament spectators who also play",
    "structure": "Tie dates to the next confirmed event edition. Keep spectator tickets and playing rounds distinct.",
    "before": "Verify official ticket supply, event dates, local course closures and tournament branding rights.",
    "status": "Not sourced",
    "research": [
      "https://www.yourgolftravel.com/",
      "https://eaglegolftours.com/"
    ]
  }
];
