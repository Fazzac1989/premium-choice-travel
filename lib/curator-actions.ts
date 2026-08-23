'use server';

import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient, isSupabaseConfigured } from '@/lib/supabase/admin';
import { emailShell, sendEmail } from '@/lib/email';
import { getDestinations, getHotels, getPublishedPackages } from '@/lib/data';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CuratorAnswers = {
  tripType: string;
  departure: string;
  dateWindow: string;
  duration: string;
  adults: string;
  childrenAges: string;
  budget: string;
  priorities: string[];
  hotelStyle: string;
  pace: string;
  notes: string;
  destinationHint: string;
  sourcePage: string;
};

export type TripConcept = {
  title: string;
  destinations: string;
  route: string;
  nights: number;
  whyItFits: string;
  rhythm: string;
  experiences: string[];
  accommodationStyle: string;
  /** Suggested properties — ideas only, never a booking or a rate. */
  hotels: { name: string; where: string; why: string }[];
  bestSeason: string;
  budgetBand: string;
  startingJourney: string;
  /** Filled in after generation from our own destination photography. */
  images?: { url: string; alt: string }[];
};

export type ConceptsResult =
  | { ok: true; concepts: TripConcept[] }
  | { ok: false; error: string };

const CONCEPTS_SCHEMA = {
  type: 'object',
  properties: {
    concepts: {
      type: 'array',
      description: 'EXACTLY three genuinely differentiated holiday concepts — different destinations or clearly different trip shapes, never three near-identical variants.',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Evocative but concrete trip name, e.g. "Sri Lanka Tea, Trains & Beach"' },
          destinations: { type: 'string', description: 'Country/countries visited, comma separated' },
          route: { type: 'string', description: 'Suggested route, e.g. "Colombo → hill country → Yala → south coast"' },
          nights: { type: 'integer', description: 'Suggested total nights, matching the requested duration band' },
          whyItFits: { type: 'string', description: '2-3 sentences connecting this concept to what the traveller said they want' },
          rhythm: { type: 'string', description: 'One sentence on trip pace/shape, e.g. "Two-centre: four active days, then five slow beach days"' },
          experiences: { type: 'array', items: { type: 'string' }, description: 'Four to six signature experiences on this trip' },
          accommodationStyle: { type: 'string', description: 'Suggested accommodation style matching their preference' },
          hotels: {
            type: 'array',
            description:
              'Two or three real, currently-operating hotels or resorts that suit this traveller on this route. Prefer properties from the Premium Choice hotel list when one fits. Never invent a property name, never mention price, availability or any commercial relationship.',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'The property’s real, current name' },
                where: { type: 'string', description: 'Which stop or area it is in, e.g. "Kyoto, Higashiyama"' },
                why: { type: 'string', description: 'One short line on why it suits this traveller' },
              },
              required: ['name', 'where', 'why'],
              additionalProperties: false,
            },
          },
          bestSeason: { type: 'string', description: 'When this trip is at its best, phrased as guidance' },
          budgetBand: { type: 'string', description: 'Qualitative fit against their stated budget, e.g. "Comfortably within your range" or "At the upper end of your range". Never a number. Empty string if no budget given.' },
          startingJourney: { type: 'string', description: 'EXACT title of the Premium Choice journey from the library this concept adapts, when one fits. Empty string if the concept is fully bespoke.' },
        },
        required: ['title', 'destinations', 'route', 'nights', 'whyItFits', 'rhythm', 'experiences', 'accommodationStyle', 'hotels', 'bestSeason', 'budgetBand', 'startingJourney'],
        additionalProperties: false,
      },
    },
  },
  required: ['concepts'],
  additionalProperties: false,
} as const;

const SYSTEM = `You are the AI Holiday Curator for Premium Choice Travel, a Dubai-based tailor-made travel company. Your job is to turn a traveller's answers into three genuinely different holiday concepts that a human travel expert will then price and refine.

Hard rules — never break these:
- NEVER state or imply that flights, rooms, rates or availability are confirmed. These are inspiration concepts only.
- Hotels you name must be real, currently operating and correctly located. If you are not certain a property exists under that name today, leave it out — two solid suggestions beat three with an invented one. Never imply we have a contract, an allocation or a special rate with any property.
- NEVER quote prices, fares or numeric costs. The budgetBand field is qualitative only.
- NEVER give visa or entry-requirement advice beyond "our specialists will confirm entry requirements for your passports".
- NEVER guarantee weather; seasons are guidance.
- Do not recommend destinations under widely-known travel restrictions.
- NEVER propose a trip inside the UAE. Travellers already live there, and UAE stays are handled by Premium Choice Staycations. Every concept must involve travelling abroad.

Craft rules:
- The three concepts must be genuinely differentiated: different destinations, or clearly different shapes (e.g. one-centre unwind vs two-centre adventure vs touring journey).
- Travellers depart from the UAE (Dubai/Abu Dhabi). Favour realistic flight ranges for the stated duration: short breaks stay within ~4-5 hours; 10+ nights can go long-haul.
- Respect the stated dates/season: recommend destinations at their best then.
- If a destination hint is given, ONE concept should feature it (if it fits the season and party); the other two should broaden the horizon.
- Use British English. Be concrete and visual; avoid clichés like "unforgettable", "embark", "hidden gem", "memories that last a lifetime".
- Family answers with children's ages should shape the concepts (flight times, kids' clubs, interconnecting rooms, pacing).`;

/* ------------------------------------------------------------------ */
/* Generate three concepts                                             */
/* ------------------------------------------------------------------ */

export async function generateConcepts(
  answers: CuratorAnswers,
  rejectedTitles: string[] = []
): Promise<ConceptsResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'The inspiration service is not configured yet — please use Plan My Trip instead.' };
  }

  const [destinations, journeys, hotels] = await Promise.all([
    getDestinations(),
    getPublishedPackages(),
    getHotels(),
  ]);
  const destinationList = destinations
    .filter((d) => d.region !== 'Cruise Seas' && d.slug !== 'united-arab-emirates')
    .sort((a, b) => a.priorityRank - b.priorityRank)
    .map((d) => d.name)
    .join(', ');
  const uaeId = destinations.find((d) => d.slug === 'united-arab-emirates')?.id;
  const hotelList = hotels
    .filter((h: any) => h.destinationId !== uaeId && !h.emirate)
    .map((h: any) => {
      const dest = destinations.find((d) => d.id === h.destinationId)?.name;
      return `${h.name}${dest ? ` — ${dest}` : ''}${h.area ? `, ${h.area}` : ''}${h.style ? ` (${h.style})` : ''}`;
    })
    .join(String.fromCharCode(10));
  const journeyLibrary = journeys
    .filter((p) => p.brand !== 'staycations')
    .map((p) => `${p.title} [${p.brand}] — ${p.destinationName || '—'}, ${p.nights}n${p.tags?.length ? ` (${p.tags.join(', ')})` : ''}`)
    .join('\n');

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await client.messages.create({
      // Sonnet keeps the curator conversational-fast; concept quality holds up well.
      model: 'claude-sonnet-5',
      max_tokens: 8000,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: CONCEPTS_SCHEMA } },
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Destinations Premium Choice Travel actively sells (prefer these, strongest first): ${destinationList}.

Hotels Premium Choice knows and recommends (prefer these when one genuinely fits; otherwise name another real, current property):
${hotelList || '(none listed yet)'}

Premium Choice journey library (existing designed journeys — where one fits the brief, use it as a concept's starting point, put its EXACT title in startingJourney, and adapt pace/duration to the traveller; personalise rather than invent availability):
${journeyLibrary || '(no journeys published yet)'}

The traveller answered:
- Trip type: ${answers.tripType || 'open'}
- Departing from: ${answers.departure || 'Dubai'}
- When: ${answers.dateWindow || 'flexible'}
- Duration: ${answers.duration || 'flexible'}
- Party: ${answers.adults || '2'} adults${answers.childrenAges ? `, children aged ${answers.childrenAges}` : ''}
- Budget (total, AED): ${answers.budget || 'not stated'}
- What matters most: ${answers.priorities.join(', ') || 'not stated'}
- Hotel style: ${answers.hotelStyle || 'let us decide'}
- Pace: ${answers.pace || 'balanced'}
- Destination they were browsing: ${answers.destinationHint || 'none'}
- Notes / to avoid: ${answers.notes || 'none'}
${rejectedTitles.length ? `\nThey have already seen and passed on these ideas — propose something different: ${rejectedTitles.join('; ')}.` : ''}

Create the three concepts.`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return { ok: false, error: 'We couldn’t generate ideas for that request — try adjusting your answers.' };
    }
    const text = response.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return { ok: false, error: 'No ideas came back — please try again.' };
    const parsed = JSON.parse(text.text) as { concepts: TripConcept[] };
    if (!parsed.concepts?.length) return { ok: false, error: 'No ideas came back — please try again.' };
    // Illustrate each concept with our own licensed destination photography.
    const withImages = parsed.concepts.slice(0, 3).map((c) => {
      const named = c.destinations.split(/[,/&]|and/).map((n) => n.trim().toLowerCase()).filter(Boolean);
      const gallery: { url: string; alt: string }[] = [];
      const seen = new Set<string>();
      for (const name of named) {
        const dest = destinations.find(
          (d) => d.name.toLowerCase() === name || d.name.toLowerCase().includes(name) || name.includes(d.name.toLowerCase())
        );
        for (const img of dest?.gallery ?? []) {
          if (gallery.length >= 3 || seen.has(img.url)) continue;
          seen.add(img.url);
          gallery.push({ url: img.url, alt: img.alt || dest!.name });
        }
        if (gallery.length >= 3) break;
      }
      return { ...c, images: gallery };
    });
    return { ok: true, concepts: withImages };
  } catch (e: any) {
    console.error('[curator]', e?.message);
    return { ok: false, error: 'The inspiration service is busy — give it another try in a moment.' };
  }
}

/* ------------------------------------------------------------------ */
/* Hand the lead to staff                                              */
/* ------------------------------------------------------------------ */

export type LeadResult = { ok: boolean; message: string };

export async function submitInspirationLead(payload: {
  answers: CuratorAnswers;
  concepts: TripConcept[];
  selected: TripConcept | null;
  name: string;
  email: string;
  phone: string;
  channel: string;
}): Promise<LeadResult> {
  const { answers, concepts, selected } = payload;
  const name = payload.name.trim();
  const email = payload.email.trim();
  if (!name || !email) return { ok: false, message: 'Please add your name and email.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, message: 'That email address doesn’t look right.' };

  const brief = [
    `AI INSPIRATION LEAD${selected ? ` — chose “${selected.title}”` : ''}`,
    '',
    'WHAT THE CUSTOMER WANTS',
    `Trip type: ${answers.tripType || '—'} · From: ${answers.departure || '—'} · When: ${answers.dateWindow || 'flexible'} · Duration: ${answers.duration || '—'}`,
    `Party: ${answers.adults} adults${answers.childrenAges ? `, children ${answers.childrenAges}` : ''} · Budget: ${answers.budget || 'not stated'} AED total`,
    `Priorities: ${answers.priorities.join(', ') || '—'} · Hotels: ${answers.hotelStyle || '—'} · Pace: ${answers.pace || '—'}`,
    answers.notes ? `Notes: ${answers.notes}` : null,
    answers.destinationHint ? `Was browsing: ${answers.destinationHint}` : null,
    '',
    selected
      ? `RECOMMENDED STARTING ITINERARY\n${selected.title} — ${selected.destinations} (${selected.nights} nights)${selected.startingJourney ? `\nBased on PCT journey: ${selected.startingJourney}` : ''}\nRoute: ${selected.route}\nWhy it fits: ${selected.whyItFits}\nExperiences: ${selected.experiences.join('; ')}\nStay: ${selected.accommodationStyle} · Season: ${selected.bestSeason}${selected.hotels?.length ? `
Hotels shown: ${selected.hotels.map((h) => `${h.name} (${h.where})`).join('; ')}` : ''}`
      : 'No concept selected — customer asked to speak to an expert directly.',
    '',
    `OTHER CONCEPTS SHOWN: ${concepts.filter((c) => c.title !== selected?.title).map((c) => c.title).join(' | ') || '—'}`,
    `Preferred contact: ${payload.channel || 'any'}${payload.phone ? ` · ${payload.phone}` : ''}`,
    '',
    'Next step: verify season/availability, confirm entry requirements for passports, and price the itinerary.',
  ]
    .filter((l) => l !== null)
    .join('\n');

  if (isSupabaseConfigured()) {
    const db = createAdminClient();
    // The lead always lands in the existing enquiries workflow…
    const { error } = await db.from('enquiries').insert({
      name,
      email,
      phone: payload.phone.trim() || null,
      package_title: `AI Inspiration — ${selected?.title ?? answers.tripType ?? 'open brief'}`,
      travel_dates: answers.dateWindow || null,
      travellers: `${answers.adults} adults${answers.childrenAges ? `, children ${answers.childrenAges}` : ''}`,
      message: brief,
      status: 'new',
    });
    if (error) {
      console.error('[curator lead]', error.message);
      return { ok: false, message: 'Something went wrong — please try again or call us.' };
    }
    // …and, when the structured table exists, a full record too.
    await db
      .from('ai_leads')
      .insert({
        source_page: answers.sourcePage || null,
        destination: answers.destinationHint || null,
        departure: answers.departure || null,
        date_window: answers.dateWindow || null,
        duration: answers.duration || null,
        party: `${answers.adults} adults${answers.childrenAges ? `, children ${answers.childrenAges}` : ''}`,
        budget_aed: answers.budget || null,
        styles: [answers.tripType].filter(Boolean),
        priorities: answers.priorities,
        hotel_pref: answers.hotelStyle || null,
        pace: answers.pace || null,
        notes: answers.notes || null,
        concepts,
        selected,
        customer_name: name,
        email,
        phone: payload.phone.trim() || null,
        channel: payload.channel || null,
      })
      .then(({ error: e }) => {
        if (e) console.log('[curator lead] ai_leads skipped:', e.message);
      });
  }

  const notifyTo = process.env.ENQUIRY_NOTIFY_EMAIL;
  if (notifyTo) {
    await sendEmail({
      to: notifyTo,
      replyTo: email,
      subject: `New AI inspiration lead — ${name}${selected ? ` · ${selected.title}` : ''}`,
      html: emailShell({
        title: 'New AI inspiration lead',
        bodyHtml: `<pre style="font-size:12px;line-height:1.6;white-space:pre-wrap;font-family:inherit">${brief
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</pre>`,
      }),
    });
  }

  return { ok: true, message: 'A specialist will come back — typically within one working day — with real availability and pricing.' };
}
