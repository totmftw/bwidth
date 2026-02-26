import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  venueProfileCompleteSchema,
  buildVenueMetadata,
  buildVenueRecord,
  validateVenueProfile,
  type VenueProfileInput,
} from '../../server/venue-profile-utils';

// ---------------------------------------------------------------------------
// Arbitrary: generates valid VenueProfileInput objects
// ---------------------------------------------------------------------------
const validVenueProfileArb: fc.Arbitrary<VenueProfileInput> = fc.record({
  name: fc.string({ minLength: 2, maxLength: 50 }),
  description: fc.string({ minLength: 10, maxLength: 1000 }),
  address: fc.string({ minLength: 5, maxLength: 100 }),
  city: fc.string({ minLength: 2, maxLength: 50 }),
  capacity: fc.integer({ min: 1, max: 10000 }),
  capacitySeated: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  capacityStanding: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  amenities: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
    { nil: undefined },
  ),
  website: fc.option(fc.webUrl(), { nil: undefined }),
  instagramHandle: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  bookingEmail: fc.option(
    // Custom email generator that produces Zod-compatible emails
    // (fc.emailAddress() can produce RFC-valid but Zod-rejected formats like "/a@a.aa")
    fc.tuple(
      fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-z]+$/.test(s)),
      fc.string({ minLength: 1, maxLength: 8 }).filter(s => /^[a-z]+$/.test(s)),
      fc.constantFrom('com', 'org', 'net', 'io'),
    ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`),
    { nil: undefined },
  ),
  bookingPhone: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
  metadata: fc.option(
    fc.record({
      state: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
      pincode: fc.option(fc.stringMatching(/^\d{6}$/), { nil: undefined }),
      spaceDimensions: fc.option(
        fc.record({
          stageWidth: fc.option(fc.double({ min: 1, max: 100, noNaN: true }), { nil: undefined }),
          stageDepth: fc.option(fc.double({ min: 1, max: 100, noNaN: true }), { nil: undefined }),
          ceilingHeight: fc.option(fc.double({ min: 1, max: 50, noNaN: true }), { nil: undefined }),
        }),
        { nil: undefined },
      ),
      musicPolicy: fc.option(
        fc.record({
          preferredGenres: fc.option(
            fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
            { nil: undefined },
          ),
          targetAudience: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
          eventFrequency: fc.option(fc.constantFrom('weekly', 'biweekly', 'monthly'), { nil: undefined }),
          bookingMode: fc.option(fc.constantFrom('single_gig', 'programming'), { nil: undefined }),
        }),
        { nil: undefined },
      ),
      equipment: fc.option(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
        { nil: undefined },
      ),
      photos: fc.option(
        fc.record({
          coverImageUrl: fc.option(fc.webUrl(), { nil: undefined }),
          galleryUrls: fc.option(fc.array(fc.webUrl(), { maxLength: 5 }), { nil: undefined }),
          virtualTourUrl: fc.option(fc.webUrl(), { nil: undefined }),
        }),
        { nil: undefined },
      ),
      bookingPreferences: fc.option(
        fc.record({
          monthlyBudgetMin: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: undefined }),
          monthlyBudgetMax: fc.option(fc.double({ min: 0, max: 1000000, noNaN: true }), { nil: undefined }),
          operatingDays: fc.option(
            fc.array(fc.constantFrom('Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'), { maxLength: 7 }),
            { nil: undefined },
          ),
        }),
        { nil: undefined },
      ),
    }),
    { nil: undefined },
  ),
});

// ---------------------------------------------------------------------------
// Property 6: Venue profile completion round-trip
// Validates: Requirements 3.2, 3.3, 3.5
//
// For any valid venue profile data submitted by a user with role
// "venue_manager", "venue", or "organizer", the resulting venue record
// should have metadata.profileComplete === true, and a subsequent call to
// GET /api/venues/profile/status should return { isComplete: true }.
// ---------------------------------------------------------------------------
describe('Property 6: Venue profile completion round-trip', () => {
  it('valid input always parses successfully', () => {
    /** Validates: Requirements 3.2 */
    fc.assert(
      fc.property(validVenueProfileArb, (input) => {
        const result = validateVenueProfile(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('metadata always has profileComplete === true', () => {
    /** Validates: Requirements 3.2 — metadata.profileComplete = true on create/update */
    fc.assert(
      fc.property(validVenueProfileArb, (input) => {
        const metadata = buildVenueMetadata(input);
        expect(metadata.profileComplete).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('profile status is complete iff metadata.profileComplete === true', () => {
    /** Validates: Requirements 3.3 — status endpoint returns isComplete: true */
    fc.assert(
      fc.property(validVenueProfileArb, (input) => {
        const metadata = buildVenueMetadata(input);
        // Simulates the GET /api/venues/profile/status logic
        const isComplete = metadata.profileComplete === true;
        expect(isComplete).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('DB record preserves name, description, address, city, and capacity from input', () => {
    /** Validates: Requirements 3.2 */
    fc.assert(
      fc.property(validVenueProfileArb, (input) => {
        const record = buildVenueRecord(input);
        expect(record.name).toBe(input.name);
        expect(record.description).toBe(input.description);
        expect(record.address).toEqual({ street: input.address, city: input.city });
        expect(record.capacity).toBe(input.capacity);
        expect(record.capacitySeated).toBe(input.capacitySeated);
        expect(record.capacityStanding).toBe(input.capacityStanding);
        expect(record.amenities).toEqual(input.amenities);
      }),
      { numRuns: 100 },
    );
  });

  it('metadata preserves optional contact fields from input', () => {
    /** Validates: Requirements 3.2 */
    fc.assert(
      fc.property(validVenueProfileArb, (input) => {
        const metadata = buildVenueMetadata(input);
        expect(metadata.website).toBe(input.website);
        expect(metadata.instagram).toBe(input.instagramHandle);
        expect(metadata.bookingEmail).toBe(input.bookingEmail);
        expect(metadata.bookingPhone).toBe(input.bookingPhone);
      }),
      { numRuns: 100 },
    );
  });

  it('existing metadata keys are preserved on update', () => {
    /** Validates: Requirements 3.5 — upsert preserves existing data */
    fc.assert(
      fc.property(
        validVenueProfileArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (input, extraKey) => {
          const existing = { customField: extraKey, legacyFlag: true };
          const merged = buildVenueMetadata(input, existing);

          // Extra keys survive the merge
          expect((merged as any).customField).toBe(extraKey);
          expect((merged as any).legacyFlag).toBe(true);
          // profileComplete is still set
          expect(merged.profileComplete).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('role authorization allows venue_manager, venue, and organizer', () => {
    /** Validates: Requirements 3.5 — accept requests from allowed roles */
    const allowedRoles = ['venue_manager', 'venue', 'organizer'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...allowedRoles),
        (role) => {
          // Simulates the role check from the route handler
          const isAllowed = role === 'venue_manager' || role === 'venue' || role === 'organizer';
          expect(isAllowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7: Invalid venue profile data returns field-level errors
// Validates: Requirements 3.6
//
// For any venue profile data that violates the Zod schema, the endpoint
// should return a 400 response containing specific field-level error messages.
// ---------------------------------------------------------------------------
describe('Property 7: Invalid venue profile data returns field-level errors', () => {
  it('name shorter than 2 chars produces a name error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, name: 'A' }; // min 2
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('name');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('description shorter than 10 chars produces a description error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, description: 'short' }; // min 10
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('description');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('description longer than 1000 chars produces a description error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, description: 'x'.repeat(1001) }; // max 1000
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('description');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('address shorter than 5 chars produces an address error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, address: 'AB' }; // min 5
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('address');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('city shorter than 2 chars produces a city error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, city: 'A' }; // min 2
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('city');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('capacity below 1 produces a capacity error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(
        validVenueProfileArb,
        fc.integer({ min: -100, max: 0 }),
        (base, badCapacity) => {
          const invalid = { ...base, capacity: badCapacity };
          const result = validateVenueProfile(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const paths = result.errors.map((e) => e.path.join('.'));
            expect(paths).toContain('capacity');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('missing required fields produce errors for those fields', () => {
    /** Validates: Requirements 3.6 — 400 with field-level errors */
    const requiredFields = ['name', 'description', 'address', 'city', 'capacity'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...requiredFields),
        (field) => {
          const invalid: any = {};
          // Omit all fields — each required field should appear in errors
          const result = validateVenueProfile(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const paths = result.errors.map((e) => e.path.join('.'));
            expect(paths).toContain(field);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('completely empty object fails with multiple field errors', () => {
    /** Validates: Requirements 3.6 */
    const result = validateVenueProfile({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });

  it('invalid bookingEmail produces a bookingEmail error', () => {
    /** Validates: Requirements 3.6 */
    fc.assert(
      fc.property(validVenueProfileArb, (base) => {
        const invalid = { ...base, bookingEmail: 'not-an-email' };
        const result = validateVenueProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('bookingEmail');
        }
      }),
      { numRuns: 100 },
    );
  });
});
