import { describe, expect, it } from 'vitest';
import { SCHEMA, SYSTEM, countOptionalProperties } from '@/lib/brochure/proposal-import-prompt';

/**
 * The import schema is sent to the API on every use, and a schema the API
 * rejects means no document imports at all — which is how the first version of
 * this shipped-nearly: 26 optional parameters against a limit of 24.
 */
describe('the import schema', () => {
  it('has no optional parameters, so the API cannot reject it for having too many', () => {
    expect(countOptionalProperties(SCHEMA)).toBe(0);
  });

  it('requires every top-level field it defines', () => {
    const defined = Object.keys(SCHEMA.properties).sort();
    const required = [...SCHEMA.required].sort();
    expect(required).toEqual(defined);
  });

  it('requires every field on a day and on a flight', () => {
    const day = SCHEMA.properties.days.items;
    expect([...day.required].sort()).toEqual(Object.keys(day.properties).sort());

    const flight = SCHEMA.properties.flights.items;
    expect([...flight.required].sort()).toEqual(Object.keys(flight.properties).sort());
  });

  it('allows null for the fields a document often does not state', () => {
    // A missing price or date must come back as null, not as a guess.
    for (const field of ['pricePerStudent', 'studentCount', 'travelStart', 'travelEnd'] as const) {
      expect(SCHEMA.properties[field].type, field).toContain('null');
    }
  });

  it('accepts no properties beyond the ones it names', () => {
    expect(SCHEMA.additionalProperties).toBe(false);
    expect(SCHEMA.properties.days.items.additionalProperties).toBe(false);
    expect(SCHEMA.properties.flights.items.additionalProperties).toBe(false);
  });

  it('constrains a flight direction to the two the renderer understands', () => {
    expect(SCHEMA.properties.flights.items.properties.direction.enum).toEqual([
      'outbound',
      'return',
    ]);
  });
});

describe('countOptionalProperties', () => {
  it('counts a property that is not required', () => {
    expect(
      countOptionalProperties({
        type: 'object',
        required: ['a'],
        properties: { a: { type: 'string' }, b: { type: 'string' } },
      }),
    ).toBe(1);
  });

  it('counts through arrays and nested objects', () => {
    expect(
      countOptionalProperties({
        type: 'object',
        required: ['rows'],
        properties: {
          rows: {
            type: 'array',
            items: {
              type: 'object',
              required: [],
              properties: { x: { type: 'string' }, y: { type: 'string' } },
            },
          },
        },
      }),
    ).toBe(2);
  });

  it('counts nothing when everything is required', () => {
    expect(
      countOptionalProperties({
        type: 'object',
        required: ['a', 'b'],
        properties: { a: { type: 'string' }, b: { type: 'string' } },
      }),
    ).toBe(0);
  });
});

describe('the import instructions', () => {
  it('tell the model not to invent the things a school would be held to', () => {
    expect(SYSTEM).toMatch(/never invent/i);
    for (const word of ['prices', 'dates', 'flight numbers']) {
      expect(SYSTEM.toLowerCase()).toContain(word);
    }
  });

  it('say plainly that an empty field is the right answer', () => {
    expect(SYSTEM.toLowerCase()).toContain('a plausible guess is a defect');
  });

  it('ask for the gaps to be reported rather than quietly left', () => {
    expect(SYSTEM.toLowerCase()).toContain('notes:');
  });
});
