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
