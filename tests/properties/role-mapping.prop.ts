import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { normalizeRegistrationRole, shouldCreateOrganizerRecord, VALID_ROLES } from '../../server/role-utils';

/**
 * Property 1: Role registration mapping preserves consistency
 * Validates: Requirements 1.1, 1.2, 1.5
 *
 * For any user registration with a specified role, the stored metadata.role should be
 * "venue_manager" when the input role is "venue", "organizer" when the input role is
 * "organizer" (with a corresponding promoter record created), and "artist" when no role
 * is specified. The stored role should always be a valid value in the role_name enum.
 */
describe('Property 1: Role registration mapping preserves consistency', () => {
  it('maps "venue" to "venue_manager"', () => {
    /**Validates: Requirements 1.1 */
    fc.assert(
      fc.property(fc.constant('venue'), (role) => {
        expect(normalizeRegistrationRole(role)).toBe('venue_manager');
      }),
      { numRuns: 100 },
    );
  });

  it('maps "organizer" to "organizer" and flags organizer record creation', () => {
    /**Validates: Requirements 1.2 */
    fc.assert(
      fc.property(fc.constant('organizer'), (role) => {
        const normalized = normalizeRegistrationRole(role);
        expect(normalized).toBe('organizer');
        expect(shouldCreateOrganizerRecord(normalized)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('defaults to "artist" when no role is specified', () => {
    /**Validates: Requirements 1.5 */
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(undefined), fc.constant(null), fc.constant('')),
        (role) => {
          expect(normalizeRegistrationRole(role)).toBe('artist');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('normalized role is always a valid role_name enum value for known inputs', () => {
    /**Validates: Requirements 1.1, 1.2, 1.5 */
    const knownInputs = fc.oneof(
      fc.constant('venue'),
      fc.constant('organizer'),
      fc.constant('artist'),
      fc.constant('band_manager'),
      fc.constant('admin'),
      fc.constant('staff'),
      fc.constant(undefined),
      fc.constant(null),
      fc.constant(''),
    );

    fc.assert(
      fc.property(knownInputs, (role) => {
        const normalized = normalizeRegistrationRole(role);
        expect(VALID_ROLES).toContain(normalized);
      }),
      { numRuns: 100 },
    );
  });

  it('non-venue roles pass through unchanged', () => {
    /**Validates: Requirements 1.1, 1.2 */
    const nonVenueRoles = fc.oneof(
      fc.constant('artist'),
      fc.constant('organizer'),
      fc.constant('band_manager'),
      fc.constant('admin'),
      fc.constant('staff'),
    );

    fc.assert(
      fc.property(nonVenueRoles, (role) => {
        expect(normalizeRegistrationRole(role)).toBe(role);
      }),
      { numRuns: 100 },
    );
  });

  it('only organizer role triggers organizer record creation', () => {
    /**Validates: Requirements 1.2 */
    const allRoles = fc.oneof(
      fc.constant('venue'),
      fc.constant('artist'),
      fc.constant('band_manager'),
      fc.constant('admin'),
      fc.constant('staff'),
      fc.constant(undefined),
      fc.constant(null),
    );

    fc.assert(
      fc.property(allRoles, (role) => {
        const normalized = normalizeRegistrationRole(role);
        expect(shouldCreateOrganizerRecord(normalized)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 1 (extended): Arbitrary input handling', () => {
  it('always returns a non-empty string for any input', () => {
    /**Validates: Requirements 1.1, 1.2, 1.5 */
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.constant(undefined), fc.constant(null)),
        (role) => {
          const result = normalizeRegistrationRole(role);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('arbitrary string inputs that are valid roles remain valid after normalization', () => {
    /**Validates: Requirements 1.1, 1.2 */
    const validRoleInputs = fc.oneof(
      ...VALID_ROLES.map((r) => fc.constant(r as string)),
      fc.constant('venue'),
    );

    fc.assert(
      fc.property(validRoleInputs, (role) => {
        const normalized = normalizeRegistrationRole(role);
        expect(VALID_ROLES).toContain(normalized);
      }),
      { numRuns: 100 },
    );
  });
});


import { resolveUserRole, resolveContractRole } from '../../server/role-resolver';

/**
 * Property 2: Role resolver treats venue and venue_manager identically
 * Validates: Requirements 1.3, 1.4
 *
 * Feature: platform-core-fixes
 * Property 2: Role resolver treats venue and venue_manager identically
 *
 * For any user with metadata.role set to either "venue" or "venue_manager",
 * the role resolver should return the same canonical role string ("venue_manager"),
 * and all authorization checks should produce identical results for both values.
 */
describe('Property 2: Role resolver treats venue and venue_manager identically', () => {
  it('resolveUserRole returns the same canonical role for "venue" and "venue_manager"', () => {
    /**Validates: Requirements 1.3, 1.4 */
    fc.assert(
      fc.property(
        // Generate arbitrary optional profile entities to pair with the role
        fc.record({
          hasVenue: fc.boolean(),
          hasOrganizer: fc.boolean(),
          hasArtist: fc.boolean(),
        }),
        ({ hasVenue, hasOrganizer, hasArtist }) => {
          const baseProps = {
            ...(hasVenue ? { venue: { id: 1 } } : {}),
            ...(hasOrganizer ? { organizer: { id: 1 } } : {}),
            ...(hasArtist ? { artist: { id: 1 } } : {}),
          };

          const venueUser = { metadata: { role: 'venue' }, ...baseProps };
          const venueManagerUser = { metadata: { role: 'venue_manager' }, ...baseProps };

          const venueResult = resolveUserRole(venueUser);
          const venueManagerResult = resolveUserRole(venueManagerUser);

          expect(venueResult).toBe(venueManagerResult);
          expect(venueResult).toBe('venue_manager');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('resolveContractRole returns the same contract side for "venue" and "venue_manager"', () => {
    /**Validates: Requirements 1.4 */
    fc.assert(
      fc.property(
        // Generate an arbitrary fallback role to ensure metadata.role takes precedence
        fc.oneof(
          fc.constant(undefined),
          fc.constant('artist'),
          fc.constant('organizer'),
          fc.constant('promoter'),
        ),
        (fallbackRole) => {
          const venueUser = { metadata: { role: 'venue' }, role: fallbackRole };
          const venueManagerUser = { metadata: { role: 'venue_manager' }, role: fallbackRole };

          const venueResult = resolveContractRole(venueUser);
          const venueManagerResult = resolveContractRole(venueManagerUser);

          expect(venueResult).toBe(venueManagerResult);
          expect(venueResult).toBe('promoter');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('both resolvers agree: venue and venue_manager produce identical outcomes across all combinations', () => {
    /**Validates: Requirements 1.3, 1.4 */
    fc.assert(
      fc.property(
        fc.record({
          hasVenue: fc.boolean(),
          hasOrganizer: fc.boolean(),
          hasArtist: fc.boolean(),
          fallbackRole: fc.oneof(
            fc.constant(undefined as string | undefined),
            fc.constant('artist'),
            fc.constant('organizer'),
          ),
        }),
        ({ hasVenue, hasOrganizer, hasArtist, fallbackRole }) => {
          const baseProps = {
            ...(hasVenue ? { venue: { id: 1 } } : {}),
            ...(hasOrganizer ? { organizer: { id: 1 } } : {}),
            ...(hasArtist ? { artist: { id: 1 } } : {}),
            ...(fallbackRole ? { role: fallbackRole } : {}),
          };

          const venueUser = { metadata: { role: 'venue' }, ...baseProps };
          const venueManagerUser = { metadata: { role: 'venue_manager' }, ...baseProps };

          // Frontend resolver: both must produce the same result
          expect(resolveUserRole(venueUser)).toBe(resolveUserRole(venueManagerUser));

          // Contract resolver: both must produce the same result
          expect(resolveContractRole(venueUser)).toBe(resolveContractRole(venueManagerUser));
        },
      ),
      { numRuns: 100 },
    );
  });

  it('metadata.role takes precedence over profile entities for venue roles', () => {
    /**Validates: Requirements 1.3 */
    fc.assert(
      fc.property(
        fc.oneof(fc.constant('venue'), fc.constant('venue_manager')),
        fc.record({
          hasVenue: fc.boolean(),
          hasOrganizer: fc.boolean(),
          hasArtist: fc.boolean(),
        }),
        (role, { hasVenue, hasOrganizer, hasArtist }) => {
          const user = {
            metadata: { role },
            ...(hasVenue ? { venue: { id: 1 } } : {}),
            ...(hasOrganizer ? { organizer: { id: 1 } } : {}),
            ...(hasArtist ? { artist: { id: 1 } } : {}),
          };

          // Regardless of which profile entities are attached,
          // the metadata.role should win and resolve to venue_manager
          expect(resolveUserRole(user)).toBe('venue_manager');
        },
      ),
      { numRuns: 100 },
    );
  });
});
