/**
 * The instructions and shape used to read a proposal document.
 *
 * A plain module, not part of the server action: these are the substance of
 * the import, and they are worth being able to read, review and exercise
 * without an admin session or a database.
 */

export const SYSTEM = `You turn a school-trip proposal document into structured data for Premium Choice School Trips, a Dubai company that arranges educational travel.

Extract only what the document actually says. This is a commercial document: a school will be held to the price and the dates in it. Never invent prices, dates, flight numbers, hotel or venue names, times, or activities that are not in the source. When something is not stated, return an empty string, null, or an empty array. Every field is required, and an empty one is the correct answer when the document is silent — a plausible guess is a defect.

Guidance:
- title / titleEmphasis: split the trip's name so the second part reads in italics. "Finland Winter" + "Activity Adventure". If the name does not split naturally, put it all in title and leave titleEmphasis empty.
- eyebrow: the short classification line above the title, e.g. "Outdoor education · Finland". Build it only from what the document says.
- subtitle: one or two sentences introducing the trip, drawn from the document's own opening.
- intro: the introductory prose as two or three clean paragraphs. Keep the facts; drop internal notes, sales boilerplate and pricing tables.
- pctParents / pctChildren / pctTeachers: what the trip offers each of those three audiences, if the document addresses them. Empty if it does not.
- days: one entry per day, in order. summary is the prose paragraph; items is the timetable, one row per stated time or phase. timeLabel is free text — "09:00" and "Late morning" are both fine, copied as written. Use <b> in item text only where the document emphasises a venue or a flight.
- overnight: where the group sleeps that night, exactly as named.
- flights: only flights actually listed. Put the times in "note" as written, e.g. "Departs 08:45 · Arrives 13:20" — do not convert or normalise them.
- inclusions / exclusions: one short line each, bullet characters stripped.
- pricePerStudent: the per-student figure only, as a number, with no currency symbol. If the document gives a total, or a range, or a price per group, return null and say so in notes.
- travelStart / travelEnd: YYYY-MM-DD, only if the document states them. Otherwise null.
- notes: anything you could not extract confidently, anything ambiguous, and anything you deliberately left empty. This is read by staff before the proposal is sent.

Use British English, in the voice of an experienced travel professional writing to a head of department. Avoid "unforgettable", "embark on a journey" and "memories that last a lifetime".`;

/**
 * Every field is required.
 *
 * Not because every document has them, but because the API caps a schema at 24
 * optional parameters and this shape has more fields than that — the first
 * version was rejected outright, so no document would have imported at all.
 * Requiring everything and letting empty stand for "not stated" also says the
 * intent more plainly than optionality does.
 */
export const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'title',
    'titleEmphasis',
    'eyebrow',
    'subtitle',
    'preparedFor',
    'intro',
    'pctParents',
    'pctChildren',
    'pctTeachers',
    'inclusions',
    'exclusions',
    'currency',
    'pricePerStudent',
    'studentCount',
    'travelStart',
    'travelEnd',
    'days',
    'flights',
    'notes',
  ],
  properties: {
    title: { type: 'string' },
    titleEmphasis: { type: 'string' },
    eyebrow: { type: 'string' },
    subtitle: { type: 'string' },
    preparedFor: { type: 'string', description: 'The school, if the document names one.' },
    intro: { type: 'array', items: { type: 'string' } },
    pctParents: { type: 'string' },
    pctChildren: { type: 'string' },
    pctTeachers: { type: 'string' },
    inclusions: { type: 'array', items: { type: 'string' } },
    exclusions: { type: 'array', items: { type: 'string' } },
    currency: { type: 'string', description: 'Three-letter code if stated, else empty.' },
    pricePerStudent: { type: ['number', 'null'] },
    studentCount: { type: ['number', 'null'] },
    travelStart: { type: ['string', 'null'], description: 'YYYY-MM-DD, only if stated.' },
    travelEnd: { type: ['string', 'null'], description: 'YYYY-MM-DD, only if stated.' },
    days: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['dayNumber', 'date', 'title', 'summary', 'overnight', 'items'],
        properties: {
          dayNumber: { type: 'number' },
          date: { type: ['string', 'null'] },
          title: { type: 'string' },
          summary: { type: 'string' },
          overnight: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['timeLabel', 'text'],
              properties: { timeLabel: { type: 'string' }, text: { type: 'string' } },
            },
          },
        },
      },
    },
    flights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'direction',
          'flightNumber',
          'carrier',
          'fromCode',
          'fromName',
          'toCode',
          'toName',
          'note',
        ],
        properties: {
          direction: { type: 'string', enum: ['outbound', 'return'] },
          flightNumber: { type: 'string' },
          carrier: { type: 'string' },
          fromCode: { type: 'string' },
          fromName: { type: 'string' },
          toCode: { type: 'string' },
          toName: { type: 'string' },
          note: { type: 'string' },
        },
      },
    },
    notes: {
      type: 'array',
      items: { type: 'string' },
      description: 'What could not be extracted, was ambiguous, or was left deliberately empty.',
    },
  },
} as const;

/** Nothing may be optional: the API rejects a schema with more than 24. */
export function countOptionalProperties(schema: any): number {
  if (!schema || typeof schema !== 'object') return 0;
  let n = 0;
  if (schema.type === 'object' && schema.properties) {
    const required: string[] = schema.required ?? [];
    n += Object.keys(schema.properties).filter((k) => !required.includes(k)).length;
    for (const v of Object.values(schema.properties)) n += countOptionalProperties(v);
  }
  if (schema.type === 'array' && schema.items) n += countOptionalProperties(schema.items);
  return n;
}
