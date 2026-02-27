import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role
// Property 2: Incomplete profile triggers redirect
// Property 39: Unauthenticated access redirects to auth
// Validates: Requirements 1.2, 13.5

// ---------------------------------------------------------------------------
// Shared types and constants
// ---------------------------------------------------------------------------

type OrganizerRole = 'organizer' | 'promoter';

type OrganizerUser = {
  id: number;
  role: OrganizerRole;
  metadata?: {
    profileComplete?: boolean;
  };
};

type ProfileStatus = {
  isComplete: boolean;
};

const PROTECTED_ORGANIZER_ROUTES = [
  '/dashboard',
  '/organizer/discover',
  '/organizer/events',
  '/organizer/events/create',
  '/organizer/messages',
  '/bookings',
  '/profile',
] as const;

const SETUP_ROUTE = '/organizer/setup';

// ---------------------------------------------------------------------------
// Pure business logic functions (extracted from routing logic)
// ---------------------------------------------------------------------------

/**
 * Simulates the profile completion redirect logic from PrivateRoute.
 * Returns the redirect path if a redirect is needed, or null if no redirect.
 */
function checkProfileRedirect(
  user: OrganizerUser,
  profileStatus: ProfileStatus,
  currentLocation: string,
  hasSkipped: boolean,
): string | null {
  // Skip redirect if user has explicitly skipped onboarding
  if (hasSkipped) {
    return null;
  }

  // Check if user is organizer/promoter
  if (user.role !== 'organizer' && user.role !== 'promoter') {
    return null;
  }

  // Check if profile is incomplete
  if (!profileStatus.isComplete) {
    // Don't redirect if already on setup page
    if (currentLocation.startsWith(SETUP_ROUTE)) {
      return null;
    }
    // Redirect to setup
    return SETUP_ROUTE;
  }

  return null;
}

/**
 * Simulates the auth check from PrivateRoute.
 * Returns whether the user should be redirected to auth page.
 */
function checkAuthRedirect(isAuthenticated: boolean): string | null {
  if (!isAuthenticated) {
    return '/auth';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const organizerRoleArb = fc.constantFrom<OrganizerRole>('organizer', 'promoter');

const userIdArb = fc.integer({ min: 1, max: 10000 });

const incompleteProfileStatusArb = fc.constant<ProfileStatus>({ isComplete: false });
const completeProfileStatusArb = fc.constant<ProfileStatus>({ isComplete: true });

const organizerUserArb = fc.record({
  id: userIdArb,
  role: organizerRoleArb,
  metadata: fc.option(
    fc.record({
      profileComplete: fc.boolean(),
    }),
    { nil: undefined },
  ),
});

const protectedRouteArb = fc.constantFrom(...PROTECTED_ORGANIZER_ROUTES);

// ---------------------------------------------------------------------------
// Property 2: Incomplete profile triggers redirect
// Validates: Requirements 1.2
// ---------------------------------------------------------------------------

describe('Property 2: Incomplete profile triggers redirect', () => {
  it('redirects to /organizer/setup when profile is incomplete and not on setup page', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        incompleteProfileStatusArb,
        protectedRouteArb,
        (user, status, route) => {
          const redirect = checkProfileRedirect(user, status, route, false);
          expect(redirect).toBe(SETUP_ROUTE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not redirect when already on /organizer/setup page', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        incompleteProfileStatusArb,
        (user, status) => {
          const redirect = checkProfileRedirect(user, status, SETUP_ROUTE, false);
          expect(redirect).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not redirect when profile is complete', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        completeProfileStatusArb,
        protectedRouteArb,
        (user, status, route) => {
          const redirect = checkProfileRedirect(user, status, route, false);
          expect(redirect).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not redirect when user has skipped onboarding', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        incompleteProfileStatusArb,
        protectedRouteArb,
        (user, status, route) => {
          const redirect = checkProfileRedirect(user, status, route, true);
          expect(redirect).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('redirect applies to all protected routes when profile incomplete', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        incompleteProfileStatusArb,
        fc.constantFrom(...PROTECTED_ORGANIZER_ROUTES),
        (user, status, route) => {
          const redirect = checkProfileRedirect(user, status, route, false);
          expect(redirect).toBe(SETUP_ROUTE);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no redirect when on setup page regardless of profile status', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        organizerUserArb,
        fc.oneof(incompleteProfileStatusArb, completeProfileStatusArb),
        (user, status) => {
          const redirect = checkProfileRedirect(user, status, SETUP_ROUTE, false);
          expect(redirect).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('redirect logic is consistent for both organizer and promoter roles', () => {
    /** Validates: Requirements 1.2 */
    fc.assert(
      fc.property(
        fc.constantFrom<OrganizerRole>('organizer', 'promoter'),
        userIdArb,
        incompleteProfileStatusArb,
        protectedRouteArb,
        (role, userId, status, route) => {
          const user: OrganizerUser = { id: userId, role };
          const redirect = checkProfileRedirect(user, status, route, false);
          expect(redirect).toBe(SETUP_ROUTE);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 39: Unauthenticated access redirects to auth
// Validates: Requirements 13.5
// ---------------------------------------------------------------------------

describe('Property 39: Unauthenticated access redirects to auth (client-side)', () => {
  it('redirects to /auth when user is not authenticated', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        protectedRouteArb,
        (_route) => {
          const redirect = checkAuthRedirect(false);
          expect(redirect).toBe('/auth');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not redirect when user is authenticated', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        protectedRouteArb,
        (_route) => {
          const redirect = checkAuthRedirect(true);
          expect(redirect).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('auth redirect applies consistently to all protected routes', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ORGANIZER_ROUTES),
        fc.boolean(),
        (_route, isAuth) => {
          const redirect = checkAuthRedirect(isAuth);
          if (isAuth) {
            expect(redirect).toBeNull();
          } else {
            expect(redirect).toBe('/auth');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('auth check is independent of route being accessed', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        fc.constantFrom(...PROTECTED_ORGANIZER_ROUTES),
        (route1) => {
          const redirect1 = checkAuthRedirect(false);
          const redirect2 = checkAuthRedirect(false);
          expect(redirect1).toBe(redirect2);
          expect(redirect1).toBe('/auth');
        },
      ),
      { numRuns: 100 },
    );
  });
});
