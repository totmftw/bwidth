import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  artistProfileCompleteSchema,
  buildArtistMetadata,
  buildArtistRecord,
  validateArtistProfile,
  type ArtistProfileInput,
} from '../../server/artist-profile-utils';

// ---------------------------------------------------------------------------
// Arbitrary: generates valid ArtistProfileInput objects
// ---------------------------------------------------------------------------
const validProfileArb: fc.Arbitrary<ArtistProfileInput> = fc.record({
  stageName: fc.string({ minLength: 2, maxLength: 30 }),
  bio: fc.string({ minLength: 50, maxLength: 500 }),
  location: fc.string({ minLength: 2, maxLength: 50 }),
  yearsOfExperience: fc.option(fc.integer({ min: 0, max: 50 }), { nil: undefined }),
  primaryGenre: fc.string({ minLength: 1, maxLength: 20 }),
  secondaryGenres: fc.option(
    fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 3 }),
    { nil: undefined },
  ),
  feeMin: fc.integer({ min: 100, max: 100000 }),
  feeMax: fc.integer({ min: 100, max: 100000 }),
  currency: fc.constant('INR'),
  performanceDurations: fc.option(
    fc.array(fc.constantFrom('30min', '45min', '60min', '90min', '120min'), { maxLength: 4 }),
    { nil: undefined },
  ),
  soundcloudUrl: fc.option(fc.webUrl(), { nil: undefined }),
  mixcloudUrl: fc.option(fc.webUrl(), { nil: undefined }),
  instagramHandle: fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: undefined }),
  websiteUrl: fc.option(fc.webUrl(), { nil: undefined }),
  achievements: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  technicalRider: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  equipmentRequirements: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
  travelPreferences: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
});

// ---------------------------------------------------------------------------
// Property 3: Artist profile completion round-trip
// Validates: Requirements 2.2, 2.3
//
// For any valid profile input, parsing succeeds, the built metadata always
// has profileComplete === true, and the DB record fields faithfully reflect
// the input values.
// ---------------------------------------------------------------------------
describe('Property 3: Artist profile completion round-trip', () => {
  it('valid input always parses successfully', () => {
    fc.assert(
      fc.property(validProfileArb, (input) => {
        const result = validateArtistProfile(input);
        expect(result.success).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('metadata always has profileComplete === true', () => {
    /** Validates: Requirement 2.2 — metadata.profileComplete = true on create/update */
    fc.assert(
      fc.property(validProfileArb, (input) => {
        const metadata = buildArtistMetadata(input);
        expect(metadata.profileComplete).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it('DB record preserves stageName, fees, location, and bio from input', () => {
    /** Validates: Requirement 2.2 */
    fc.assert(
      fc.property(validProfileArb, (input) => {
        const record = buildArtistRecord(input);
        expect(record.name).toBe(input.stageName);
        expect(record.bio).toBe(input.bio);
        expect(record.priceFrom).toBe(String(input.feeMin));
        expect(record.priceTo).toBe(String(input.feeMax));
        expect(record.currency).toBe(input.currency);
        expect(record.baseLocation).toEqual({ name: input.location });
      }),
      { numRuns: 200 },
    );
  });

  it('metadata preserves genre and optional fields from input', () => {
    fc.assert(
      fc.property(validProfileArb, (input) => {
        const metadata = buildArtistMetadata(input);
        expect(metadata.primaryGenre).toBe(input.primaryGenre);
        expect(metadata.secondaryGenres).toEqual(input.secondaryGenres || []);
        expect(metadata.soundcloud).toBe(input.soundcloudUrl);
        expect(metadata.instagram).toBe(input.instagramHandle);
      }),
      { numRuns: 200 },
    );
  });

  it('profile status is complete iff metadata.profileComplete === true', () => {
    /** Validates: Requirement 2.3 */
    fc.assert(
      fc.property(validProfileArb, (input) => {
        const metadata = buildArtistMetadata(input);
        // Simulates the status endpoint logic
        const isComplete = metadata.profileComplete === true;
        expect(isComplete).toBe(true);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4: Artist profile upsert idempotence
// Validates: Requirement 2.6
//
// Applying buildArtistMetadata twice with the same input (simulating an
// update over an existing record) produces the same profileComplete state
// and preserves all fields. The operation is idempotent.
// ---------------------------------------------------------------------------
describe('Property 4: Artist profile upsert idempotence', () => {
  it('applying profile completion twice yields same profileComplete and core fields', () => {
    /** Validates: Requirement 2.6 — update existing record rather than creating duplicate */
    fc.assert(
      fc.property(validProfileArb, (input) => {
        // First application (create)
        const meta1 = buildArtistMetadata(input);
        const record1 = buildArtistRecord(input);

        // Second application (update over existing metadata)
        const meta2 = buildArtistMetadata(input, meta1);
        const record2 = buildArtistRecord(input);

        // Core fields are identical
        expect(record2.name).toBe(record1.name);
        expect(record2.bio).toBe(record1.bio);
        expect(record2.priceFrom).toBe(record1.priceFrom);
        expect(record2.priceTo).toBe(record1.priceTo);
        expect(record2.currency).toBe(record1.currency);
        expect(record2.baseLocation).toEqual(record1.baseLocation);

        // profileComplete stays true
        expect(meta2.profileComplete).toBe(true);
        expect(meta2.primaryGenre).toBe(meta1.primaryGenre);
        expect(meta2.secondaryGenres).toEqual(meta1.secondaryGenres);
      }),
      { numRuns: 200 },
    );
  });

  it('existing metadata keys not in profile input are preserved on update', () => {
    fc.assert(
      fc.property(
        validProfileArb,
        fc.string({ minLength: 1, maxLength: 20 }),
        (input, extraKey) => {
          const existing = { customField: extraKey, legacyFlag: true };
          const merged = buildArtistMetadata(input, existing);

          // Extra keys survive the merge
          expect((merged as any).customField).toBe(extraKey);
          expect((merged as any).legacyFlag).toBe(true);
          // New keys are still set
          expect(merged.profileComplete).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Invalid artist profile data returns field-level errors
// Validates: Requirement 2.5
//
// For any input that violates at least one schema constraint, validation
// fails and returns Zod issues that reference the offending field path.
// ---------------------------------------------------------------------------
describe('Property 5: Invalid artist profile data returns field-level errors', () => {
  it('stageName shorter than 2 chars produces a stageName error', () => {
    fc.assert(
      fc.property(validProfileArb, (base) => {
        const invalid = { ...base, stageName: 'A' }; // min 2
        const result = validateArtistProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('stageName');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('bio shorter than 50 chars produces a bio error', () => {
    fc.assert(
      fc.property(validProfileArb, (base) => {
        const invalid = { ...base, bio: 'short' }; // min 50
        const result = validateArtistProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('bio');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('bio longer than 500 chars produces a bio error', () => {
    fc.assert(
      fc.property(validProfileArb, (base) => {
        const invalid = { ...base, bio: 'x'.repeat(501) }; // max 500
        const result = validateArtistProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('bio');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('feeMin below 100 produces a feeMin error', () => {
    fc.assert(
      fc.property(
        validProfileArb,
        fc.integer({ min: 0, max: 99 }),
        (base, lowFee) => {
          const invalid = { ...base, feeMin: lowFee };
          const result = validateArtistProfile(invalid);
          expect(result.success).toBe(false);
          if (!result.success) {
            const paths = result.errors.map((e) => e.path.join('.'));
            expect(paths).toContain('feeMin');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('missing required fields produce errors for those fields', () => {
    /** Validates: Requirement 2.5 — 400 with field-level errors */
    const requiredFields = ['stageName', 'bio', 'location', 'primaryGenre', 'feeMin', 'feeMax'] as const;

    fc.assert(
      fc.property(
        fc.constantFrom(...requiredFields),
        (field) => {
          const invalid: any = {};
          // Omit the target field entirely
          const result = validateArtistProfile(invalid);
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

  it('more than 3 secondary genres produces a secondaryGenres error', () => {
    fc.assert(
      fc.property(validProfileArb, (base) => {
        const invalid = { ...base, secondaryGenres: ['a', 'b', 'c', 'd'] }; // max 3
        const result = validateArtistProfile(invalid);
        expect(result.success).toBe(false);
        if (!result.success) {
          const paths = result.errors.map((e) => e.path.join('.'));
          expect(paths).toContain('secondaryGenres');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('completely empty object fails with multiple field errors', () => {
    const result = validateArtistProfile({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(1);
    }
  });
});
