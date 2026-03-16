import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createEventSchema } from '../../shared/routes';

// Property 2: Preservation - Existing Event Creation Flow
describe('Property 2: Preservation - Existing Event Creation Flow', () => {
  it('preserves valid event creation with registered venues and various fields', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 3, maxLength: 200 }), // title
        fc.option(fc.string(), { nil: undefined }), // description
        fc.integer({ min: 1 }), // capacity
        fc.constantFrom('INR', 'USD', 'EUR', 'GBP'), // currency
        fc.constantFrom('public', 'private'), // visibility
        fc.option(fc.integer({ min: 1 }), { nil: undefined }), // venueId
        fc.array(fc.record({
          name: fc.string({ minLength: 1 }),
          capacity: fc.option(fc.integer({ min: 1 }), { nil: undefined })
        })), // stages
        (title, description, capacityTotal, currency, visibility, venueId, stages) => {
          // Add valid times to bypass datetime errors and purely test preservation
          const input = {
            title,
            description,
            startTime: "2026-04-15T22:00:00Z",
            endTime: "2026-04-16T04:00:00Z",
            capacityTotal,
            // doorTime is currently supported but will be removed, so we omit from test to keep validity
            currency,
            visibility,
            venueId,
            stages: stages.map(s => ({ ...s, startTime: "2026-04-15T22:00:00Z" }))
          };
          
          const result = createEventSchema.safeParse(input);
          expect(result.success).toBe(true);
        }
      )
    );
  });
});
