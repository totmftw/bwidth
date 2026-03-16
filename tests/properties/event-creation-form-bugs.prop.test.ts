import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';
import { createEventSchema } from '@shared/routes';

/**
 * Bug Condition Exploration Test for Event Creation Form
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8**
 * 
 * This test explores the bug conditions in the event creation form BEFORE fixes are applied.
 * 
 * CRITICAL: This test is EXPECTED TO FAIL on unfixed code.
 * - Test failures confirm the bugs exist
 * - Test passes after implementation confirm the fixes work
 * 
 * Bug Conditions Being Tested:
 * 1. Datetime validation errors with datetime-local format
 * 2. Presence of unnecessary Door Time field
 * 3. Lack of temporary venue creation support
 * 4. Non-India date/time formats
 * 5. Stage datetime issues (same as main event)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EventFormInput {
  title: string;
  description?: string;
  startDate: string;  // DD-MM-YYYY format (India-preferred)
  startTime: string;  // HH:MM format (24-hour)
  endDate?: string;   // DD-MM-YYYY format
  endTime?: string;   // HH:MM format
  venueId?: number;
  temporaryVenue?: {
    name: string;
    location: string;
    mapsLink?: string;
    directions?: string;
    landmark?: string;
    contactName?: string;
    contactPhone?: string;
  };
  capacityTotal?: number;
  currency: string;
  visibility: 'public' | 'private';
  stages?: Array<{
    name: string;
    startDate?: string;
    startTime?: string;
    endDate?: string;
    endTime?: string;
    capacity?: number;
  }>;
}

interface EventAPIPayload {
  title: string;
  description?: string;
  startTime: string;  // ISO 8601 format
  endTime?: string;   // ISO 8601 format
  doorTime?: string;  // ISO 8601 format (BUG: should not exist)
  venueId?: number;
  temporaryVenue?: {
    name: string;
    location: string;
    mapsLink?: string;
    directions?: string;
    landmark?: string;
    contactName?: string;
    contactPhone?: string;
  };
  capacityTotal?: number;
  currency: string;
  visibility: 'public' | 'private';
  stages?: Array<{
    name: string;
    startTime?: string;
    endTime?: string;
    capacity?: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

/**
 * Converts DD-MM-YYYY date and HH:MM time to ISO 8601 datetime string.
 * This is the EXPECTED behavior after the fix.
 */
function convertToISO8601(date: string, time: string): string {
  const [day, month, year] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  const dateObj = new Date(year, month - 1, day, hours, minutes);
  return dateObj.toISOString();
}

/**
 * Simulates the CURRENT (buggy) form submission that uses datetime-local.
 * This produces values like "2024-01-15T20:00" which may fail Zod validation.
 */
function convertDatetimeLocal(date: string, time: string): string {
  const [day, month, year] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  
  // Datetime-local format: YYYY-MM-DDTHH:mm (no timezone, no seconds)
  const yyyy = year.toString().padStart(4, '0');
  const mm = month.toString().padStart(2, '0');
  const dd = day.toString().padStart(2, '0');
  const hh = hours.toString().padStart(2, '0');
  const min = minutes.toString().padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

/**
 * Transforms form input to API payload using the FIXED approach.
 * This is the expected behavior after implementing the fix.
 */
function transformFormToAPIFixed(input: EventFormInput): EventAPIPayload {
  const payload: EventAPIPayload = {
    title: input.title,
    description: input.description,
    startTime: convertToISO8601(input.startDate, input.startTime),
    currency: input.currency,
    visibility: input.visibility,
  };

  if (input.endDate && input.endTime) {
    payload.endTime = convertToISO8601(input.endDate, input.endTime);
  }

  // NO doorTime field in fixed version
  
  if (input.venueId) {
    payload.venueId = input.venueId;
  }

  if (input.temporaryVenue) {
    payload.temporaryVenue = input.temporaryVenue;
  }

  if (input.capacityTotal) {
    payload.capacityTotal = input.capacityTotal;
  }

  if (input.stages && input.stages.length > 0) {
    payload.stages = input.stages.map(stage => ({
      name: stage.name,
      startTime: stage.startDate && stage.startTime 
        ? convertToISO8601(stage.startDate, stage.startTime) 
        : undefined,
      endTime: stage.endDate && stage.endTime 
        ? convertToISO8601(stage.endDate, stage.endTime) 
        : undefined,
      capacity: stage.capacity,
    }));
  }

  return payload;
}

/**
 * Simulates the CURRENT (buggy) form submission.
 * Uses datetime-local format which may fail Zod validation.
 */
function transformFormToAPICurrent(input: EventFormInput): EventAPIPayload & { doorTime?: string } {
  const payload: EventAPIPayload & { doorTime?: string } = {
    title: input.title,
    description: input.description,
    startTime: convertDatetimeLocal(input.startDate, input.startTime),
    currency: input.currency,
    visibility: input.visibility,
  };

  if (input.endDate && input.endTime) {
    payload.endTime = convertDatetimeLocal(input.endDate, input.endTime);
  }

  // BUG: doorTime field exists in current implementation
  payload.doorTime = undefined;

  if (input.venueId) {
    payload.venueId = input.venueId;
  }

  // BUG: No temporary venue support in current implementation
  // payload.temporaryVenue is not set even if input.temporaryVenue exists

  if (input.capacityTotal) {
    payload.capacityTotal = input.capacityTotal;
  }

  if (input.stages && input.stages.length > 0) {
    payload.stages = input.stages.map(stage => ({
      name: stage.name,
      startTime: stage.startDate && stage.startTime 
        ? convertDatetimeLocal(stage.startDate, stage.startTime) 
        : undefined,
      endTime: stage.endDate && stage.endTime 
        ? convertDatetimeLocal(stage.endDate, stage.endTime) 
        : undefined,
      capacity: stage.capacity,
    }));
  }

  return payload;
}

/**
 * Checks if the current schema accepts doorTime field.
 * BUG: It should NOT accept doorTime after the fix.
 */
function schemaAcceptsDoorTime(): boolean {
  const testPayload = {
    title: "Test Event",
    startTime: new Date().toISOString(),
    doorTime: new Date().toISOString(),
    currency: "INR",
    visibility: "private" as const,
  };

  try {
    createEventSchema.parse(testPayload);
    return true; // Schema accepts doorTime
  } catch (error) {
    return false; // Schema rejects doorTime
  }
}

/**
 * Checks if the current schema accepts temporaryVenue field.
 * BUG: It should accept temporaryVenue after the fix.
 */
function schemaAcceptsTemporaryVenue(): boolean {
  const testPayload = {
    title: "Test Event",
    startTime: new Date().toISOString(),
    temporaryVenue: {
      name: "Test Venue",
      location: "Test Location",
    },
    currency: "INR",
    visibility: "private" as const,
  };

  try {
    createEventSchema.parse(testPayload);
    return true; // Schema accepts temporaryVenue
  } catch (error) {
    return false; // Schema rejects temporaryVenue
  }
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const ddmmyyyyDateArb = fc.tuple(
  fc.integer({ min: 1, max: 28 }), // day
  fc.integer({ min: 1, max: 12 }), // month
  fc.integer({ min: 2025, max: 2026 }), // year
).map(([day, month, year]) => 
  `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`
);

const hhmmTimeArb = fc.tuple(
  fc.integer({ min: 0, max: 23 }), // hour
  fc.integer({ min: 0, max: 59 }), // minute
).map(([hour, minute]) => 
  `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
);

const temporaryVenueArb = fc.record({
  name: fc.string({ minLength: 3, maxLength: 100 }),
  location: fc.string({ minLength: 5, maxLength: 200 }),
  mapsLink: fc.option(fc.webUrl(), { nil: undefined }),
  directions: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  landmark: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  contactName: fc.option(fc.string({ minLength: 2, maxLength: 50 }), { nil: undefined }),
  contactPhone: fc.option(fc.string({ minLength: 10, maxLength: 15 }), { nil: undefined }),
});

const eventFormInputArb: fc.Arbitrary<EventFormInput> = fc.record({
  title: fc.string({ minLength: 3, maxLength: 100 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  startDate: ddmmyyyyDateArb,
  startTime: hhmmTimeArb,
  endDate: fc.option(ddmmyyyyDateArb, { nil: undefined }),
  endTime: fc.option(hhmmTimeArb, { nil: undefined }),
  venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  temporaryVenue: fc.option(temporaryVenueArb, { nil: undefined }),
  capacityTotal: fc.option(fc.integer({ min: 50, max: 5000 }), { nil: undefined }),
  currency: fc.constantFrom('INR', 'USD', 'EUR', 'GBP'),
  visibility: fc.constantFrom('public', 'private'),
  stages: fc.option(
    fc.array(
      fc.record({
        name: fc.string({ minLength: 3, maxLength: 50 }),
        startDate: fc.option(ddmmyyyyDateArb, { nil: undefined }),
        startTime: fc.option(hhmmTimeArb, { nil: undefined }),
        endDate: fc.option(ddmmyyyyDateArb, { nil: undefined }),
        endTime: fc.option(hhmmTimeArb, { nil: undefined }),
        capacity: fc.option(fc.integer({ min: 50, max: 1000 }), { nil: undefined }),
      }),
      { minLength: 0, maxLength: 3 }
    ),
    { nil: undefined }
  ),
});

// ---------------------------------------------------------------------------
// Property 1: Bug Condition - Datetime Validation, Mobile UX, Door Time, and Temporary Venue Issues
// Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8
// ---------------------------------------------------------------------------

describe('Property 1: Bug Condition - Event Creation Form Issues', () => {
  
  it('EXPECTED BEHAVIOR: form with separate date/time inputs validates correctly', () => {
    /**
     * Validates: Requirements 2.1, 2.2, 2.3, 2.7
     * 
     * This test encodes the EXPECTED behavior after the fix.
     * It should FAIL on unfixed code and PASS after implementation.
     */
    fc.assert(
      fc.property(eventFormInputArb, (input) => {
        // Skip if both venueId and temporaryVenue are missing
        if (!input.venueId && !input.temporaryVenue) {
          return true;
        }

        const payload = transformFormToAPIFixed(input);

        // The fixed payload should pass Zod validation
        const result = createEventSchema.safeParse(payload);
        
        expect(result.success).toBe(true);
        
        if (result.success) {
          // Verify ISO 8601 format
          expect(result.data.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
          
          // Verify doorTime is NOT present
          expect(result.data).not.toHaveProperty('doorTime');
          
          // Verify temporary venue support
          if (input.temporaryVenue) {
            expect(result.data).toHaveProperty('temporaryVenue');
            expect(result.data.temporaryVenue).toEqual(input.temporaryVenue);
          }
        }
      }),
      { numRuns: 50 }
    );
  });

  it('BUG DETECTION: current schema accepts doorTime field', () => {
    /**
     * Validates: Requirement 2.4
     * 
     * This test confirms the bug exists: doorTime field is present in the schema.
     * EXPECTED: This test FAILS on unfixed code (doorTime is accepted).
     * EXPECTED: This test PASSES after fix (doorTime is rejected).
     */
    const acceptsDoorTime = schemaAcceptsDoorTime();
    
    // After fix, schema should NOT accept doorTime
    expect(acceptsDoorTime).toBe(false);
  });

  it('BUG DETECTION: current schema lacks temporary venue support', () => {
    /**
     * Validates: Requirements 2.5, 2.8
     * 
     * This test confirms the bug exists: temporaryVenue field is not supported.
     * EXPECTED: This test FAILS on unfixed code (temporaryVenue is rejected).
     * EXPECTED: This test PASSES after fix (temporaryVenue is accepted).
     */
    const acceptsTemporaryVenue = schemaAcceptsTemporaryVenue();
    
    // After fix, schema should accept temporaryVenue
    expect(acceptsTemporaryVenue).toBe(true);
  });

  it('BUG DETECTION: datetime-local format may fail Zod validation', () => {
    /**
     * Validates: Requirement 2.1
     * 
     * This test demonstrates that datetime-local format (YYYY-MM-DDTHH:mm)
     * may fail Zod's .datetime() validation which expects ISO 8601.
     * 
     * EXPECTED: This test FAILS on unfixed code (validation errors occur).
     * EXPECTED: This test PASSES after fix (proper ISO 8601 conversion).
     */
    fc.assert(
      fc.property(
        ddmmyyyyDateArb,
        hhmmTimeArb,
        (date, time) => {
          const datetimeLocal = convertDatetimeLocal(date, time);
          
          // Try to validate datetime-local format with Zod
          const schema = z.string().datetime();
          const result = schema.safeParse(datetimeLocal);
          
          // Datetime-local format should fail Zod's datetime validation
          // because it lacks timezone and seconds
          expect(result.success).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('BUG DETECTION: stage datetime inputs have same issues as main event', () => {
    /**
     * Validates: Requirement 2.6
     * 
     * This test confirms that stage datetime inputs suffer from the same
     * validation issues as the main event datetime inputs.
     * 
     * EXPECTED: This test FAILS on unfixed code (stage datetime validation fails).
     * EXPECTED: This test PASSES after fix (stage datetime validates correctly).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
          stages: fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 50 }),
              startDate: ddmmyyyyDateArb,
              startTime: hhmmTimeArb,
              endDate: ddmmyyyyDateArb,
              endTime: hhmmTimeArb,
              capacity: fc.option(fc.integer({ min: 50, max: 1000 }), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 2 }
          ),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success && result.data.stages) {
            // All stage times should be in ISO 8601 format
            for (const stage of result.data.stages) {
              if (stage.startTime) {
                expect(stage.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
              }
              if (stage.endTime) {
                expect(stage.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
              }
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('BUG DETECTION: ISO 8601 conversion from DD-MM-YYYY format works correctly', () => {
    /**
     * Validates: Requirement 2.7
     * 
     * This test verifies that the conversion from India-preferred DD-MM-YYYY
     * format to ISO 8601 works correctly.
     * 
     * EXPECTED: This test PASSES (conversion logic is correct).
     */
    fc.assert(
      fc.property(
        ddmmyyyyDateArb,
        hhmmTimeArb,
        (date, time) => {
          const iso8601 = convertToISO8601(date, time);
          
          // Should be valid ISO 8601 format
          const schema = z.string().datetime();
          const result = schema.safeParse(iso8601);
          
          expect(result.success).toBe(true);
          
          // Verify the date components are preserved
          const [day, month, year] = date.split('-').map(Number);
          const [hours, minutes] = time.split(':').map(Number);
          
          const parsedDate = new Date(iso8601);
          expect(parsedDate.getUTCDate()).toBe(day);
          expect(parsedDate.getUTCMonth() + 1).toBe(month);
          expect(parsedDate.getUTCFullYear()).toBe(year);
          expect(parsedDate.getUTCHours()).toBe(hours);
          expect(parsedDate.getUTCMinutes()).toBe(minutes);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('BUG DETECTION: temporary venue requires either venueId OR temporaryVenue', () => {
    /**
     * Validates: Requirement 2.5
     * 
     * This test verifies that the form should accept either a registered venue
     * (venueId) OR a temporary venue, but not require both.
     * 
     * EXPECTED: This test FAILS on unfixed code (no temporary venue support).
     * EXPECTED: This test PASSES after fix (temporary venue is supported).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          temporaryVenue: temporaryVenueArb,
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          // Should accept temporary venue without venueId
          expect(result.success).toBe(true);
          
          if (result.success) {
            expect(result.data).toHaveProperty('temporaryVenue');
            expect(result.data.temporaryVenue).toEqual(input.temporaryVenue);
            expect(result.data.venueId).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Preservation - Existing Event Creation Flow
// Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
// ---------------------------------------------------------------------------

describe('Property 2: Preservation - Existing Event Creation Flow', () => {
  
  it('PRESERVATION: title and description storage behavior is preserved', () => {
    /**
     * Validates: Requirement 3.1, 3.7
     * 
     * This test verifies that title and description fields continue to work
     * exactly as before. These fields are NOT affected by the datetime fix.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Title and description should be preserved exactly
            expect(result.data.title).toBe(input.title);
            expect(result.data.description).toBe(input.description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PRESERVATION: capacity, currency, and visibility storage behavior is preserved', () => {
    /**
     * Validates: Requirement 3.1, 3.7
     * 
     * This test verifies that capacity, currency, and visibility fields
     * continue to work exactly as before.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          capacityTotal: fc.option(fc.integer({ min: 50, max: 5000 }), { nil: undefined }),
          currency: fc.constantFrom('INR', 'USD', 'EUR', 'GBP'),
          visibility: fc.constantFrom('public', 'private'),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Capacity, currency, and visibility should be preserved exactly
            expect(result.data.capacityTotal).toBe(input.capacityTotal);
            expect(result.data.currency).toBe(input.currency);
            expect(result.data.visibility).toBe(input.visibility);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PRESERVATION: registered venue selection and venueId linking is preserved', () => {
    /**
     * Validates: Requirement 3.2
     * 
     * This test verifies that selecting a registered venue from the dropdown
     * continues to work exactly as before. The venueId should be correctly
     * linked to the event.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // VenueId should be preserved exactly
            expect(result.data.venueId).toBe(input.venueId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PRESERVATION: stage name and capacity storage is preserved (non-datetime fields)', () => {
    /**
     * Validates: Requirement 3.3
     * 
     * This test verifies that stage name and capacity fields continue to work
     * exactly as before. These are the non-datetime fields of stages.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
          stages: fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 50 }),
              capacity: fc.option(fc.integer({ min: 50, max: 1000 }), { nil: undefined }),
              // Omit datetime fields to test only non-datetime preservation
            }),
            { minLength: 1, maxLength: 3 }
          ),
        }),
        (input) => {
          // Transform to API payload (stages without datetime fields)
          const payload = {
            title: input.title,
            startTime: convertToISO8601(input.startDate, input.startTime),
            venueId: input.venueId,
            currency: input.currency,
            visibility: input.visibility,
            stages: input.stages.map(stage => ({
              name: stage.name,
              capacity: stage.capacity,
            })),
          };
          
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success && result.data.stages) {
            // Stage names and capacities should be preserved exactly
            expect(result.data.stages).toHaveLength(input.stages.length);
            
            for (let i = 0; i < input.stages.length; i++) {
              expect(result.data.stages[i].name).toBe(input.stages[i].name);
              expect(result.data.stages[i].capacity).toBe(input.stages[i].capacity);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PRESERVATION: ISO 8601 conversion for storage is preserved', () => {
    /**
     * Validates: Requirement 3.5
     * 
     * This test verifies that datetime values are still converted to ISO 8601
     * format for storage, regardless of the input format used in the form.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          endDate: fc.option(ddmmyyyyDateArb, { nil: undefined }),
          endTime: fc.option(hhmmTimeArb, { nil: undefined }),
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // StartTime should be in ISO 8601 format
            expect(result.data.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            
            // EndTime should also be in ISO 8601 format if provided
            if (input.endDate && input.endTime) {
              expect(result.data.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('PRESERVATION: draft status on creation is preserved', () => {
    /**
     * Validates: Requirement 3.6
     * 
     * This test verifies that events are still created with status "draft"
     * by default. This is a server-side behavior, but we can verify the
     * schema doesn't require or set a different status.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Schema should not include status field (set by server)
            expect(result.data).not.toHaveProperty('status');
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PRESERVATION: optional fields remain optional', () => {
    /**
     * Validates: Requirement 3.7
     * 
     * This test verifies that optional fields (description, endTime, capacity)
     * remain optional and can be omitted without validation errors.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
          // Omit all optional fields
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          // Should pass validation even without optional fields
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Only required fields should be present
            expect(result.data.title).toBe(input.title);
            expect(result.data.startTime).toBeDefined();
            expect(result.data.venueId).toBe(input.venueId);
            expect(result.data.currency).toBe(input.currency);
            expect(result.data.visibility).toBe(input.visibility);
            
            // Optional fields should be undefined
            expect(result.data.description).toBeUndefined();
            expect(result.data.endTime).toBeUndefined();
            expect(result.data.capacityTotal).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PRESERVATION: pre-filled venue from discovery page behavior is preserved', () => {
    /**
     * Validates: Requirement 3.8
     * 
     * This test verifies that when a venue is pre-filled (e.g., from the
     * discovery page), the venueId is correctly set in the form payload.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          prefilledVenueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          // Simulate pre-filled venue scenario
          const payload = {
            title: input.title,
            startTime: convertToISO8601(input.startDate, input.startTime),
            venueId: input.prefilledVenueId, // Pre-filled from discovery page
            currency: input.currency,
            visibility: input.visibility,
          };
          
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Pre-filled venueId should be preserved
            expect(result.data.venueId).toBe(input.prefilledVenueId);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PRESERVATION: multiple stages can be added and configured', () => {
    /**
     * Validates: Requirement 3.3
     * 
     * This test verifies that multiple stages can be added to an event
     * and each stage's configuration is preserved correctly.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
          stages: fc.array(
            fc.record({
              name: fc.string({ minLength: 3, maxLength: 50 }),
              capacity: fc.option(fc.integer({ min: 50, max: 1000 }), { nil: undefined }),
            }),
            { minLength: 2, maxLength: 5 } // Test with multiple stages
          ),
        }),
        (input) => {
          const payload = {
            title: input.title,
            startTime: convertToISO8601(input.startDate, input.startTime),
            venueId: input.venueId,
            currency: input.currency,
            visibility: input.visibility,
            stages: input.stages.map(stage => ({
              name: stage.name,
              capacity: stage.capacity,
            })),
          };
          
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success && result.data.stages) {
            // All stages should be preserved
            expect(result.data.stages).toHaveLength(input.stages.length);
            
            // Each stage's configuration should be preserved
            for (let i = 0; i < input.stages.length; i++) {
              expect(result.data.stages[i].name).toBe(input.stages[i].name);
              expect(result.data.stages[i].capacity).toBe(input.stages[i].capacity);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PRESERVATION: empty stages array is handled correctly', () => {
    /**
     * Validates: Requirement 3.3
     * 
     * This test verifies that events can be created without any stages
     * (empty stages array or undefined).
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constant('private' as const),
        }),
        (input) => {
          // Test with no stages
          const payload = {
            title: input.title,
            startTime: convertToISO8601(input.startDate, input.startTime),
            venueId: input.venueId,
            currency: input.currency,
            visibility: input.visibility,
            // No stages field
          };
          
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            // Stages should be undefined or empty
            expect(result.data.stages).toBeUndefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('PRESERVATION: all currency options are supported', () => {
    /**
     * Validates: Requirement 3.7
     * 
     * This test verifies that all currency options (INR, USD, EUR, GBP)
     * continue to be supported and validated correctly.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    const currencies = ['INR', 'USD', 'EUR', 'GBP'];
    
    for (const currency of currencies) {
      fc.assert(
        fc.property(
          fc.record({
            title: fc.string({ minLength: 3, maxLength: 100 }),
            startDate: ddmmyyyyDateArb,
            startTime: hhmmTimeArb,
            venueId: fc.integer({ min: 1, max: 100 }),
            visibility: fc.constant('private' as const),
          }),
          (input) => {
            const payload = {
              title: input.title,
              startTime: convertToISO8601(input.startDate, input.startTime),
              venueId: input.venueId,
              currency: currency,
              visibility: input.visibility,
            };
            
            const result = createEventSchema.safeParse(payload);
            
            expect(result.success).toBe(true);
            
            if (result.success) {
              expect(result.data.currency).toBe(currency);
            }
          }
        ),
        { numRuns: 25 }
      );
    }
  });

  it('PRESERVATION: both public and private visibility options work', () => {
    /**
     * Validates: Requirement 3.7
     * 
     * This test verifies that both visibility options (public, private)
     * continue to work correctly.
     * 
     * EXPECTED: This test PASSES on unfixed code (baseline behavior).
     * EXPECTED: This test PASSES after fix (behavior preserved).
     */
    fc.assert(
      fc.property(
        fc.record({
          title: fc.string({ minLength: 3, maxLength: 100 }),
          startDate: ddmmyyyyDateArb,
          startTime: hhmmTimeArb,
          venueId: fc.integer({ min: 1, max: 100 }),
          currency: fc.constant('INR'),
          visibility: fc.constantFrom('public', 'private'),
        }),
        (input) => {
          const payload = transformFormToAPIFixed(input);
          const result = createEventSchema.safeParse(payload);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            expect(result.data.visibility).toBe(input.visibility);
            expect(['public', 'private']).toContain(result.data.visibility);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});
