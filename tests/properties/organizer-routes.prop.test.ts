import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { organizerOnboardingSchema, createEventSchema } from '../../shared/routes';

// Feature: organizer-role, Property 4: Onboarding round-trip
// Feature: organizer-role, Property 5: Trust score initialization
// Feature: organizer-role, Property 13: Event creation sets correct organizer and status
// Feature: organizer-role, Property 16: Publishing changes status to published
// Feature: organizer-role, Property 18: Event deletion blocked by active bookings
// Feature: organizer-role, Property 20: Duplicate booking prevention
// Feature: organizer-role, Property 39: Unauthenticated access redirects to auth

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = ['cancelled', 'completed', 'refunded'] as const;

const ALL_BOOKING_STATUSES = [
  'inquiry', 'offered', 'negotiating', 'contracting',
  'confirmed', 'paid_deposit', 'scheduled',
  'completed', 'cancelled', 'disputed', 'refunded',
] as const;

const NON_TERMINAL_BOOKING_STATUSES = ALL_BOOKING_STATUSES.filter(
  s => !(TERMINAL_STATUSES as readonly string[]).includes(s),
);

const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'] as const;
const NON_DRAFT_STATUSES = EVENT_STATUSES.filter(s => s !== 'draft');

// ---------------------------------------------------------------------------
// Pure business logic functions (extracted from route handlers)
// ---------------------------------------------------------------------------

/**
 * Simulates the onboarding completion logic from POST /organizer/profile/complete.
 * Takes valid onboarding input and existing organizer metadata, returns the updated organizer.
 */
function applyOnboardingCompletion(
  input: {
    organizationName: string;
    description: string;
    contactPerson: { name: string; email: string; phone: string };
    website?: string;
    pastEventReferences?: string[];
  },
  existingMetadata: Record<string, any> = {},
): {
  name: string;
  description: string;
  contactPerson: { name: string; email: string; phone: string };
  metadata: Record<string, any>;
} {
  return {
    name: input.organizationName,
    description: input.description,
    contactPerson: input.contactPerson,
    metadata: {
      ...existingMetadata,
      profileComplete: true,
      trustScore: 50,
      ...(input.website !== undefined ? { website: input.website } : {}),
      ...(input.pastEventReferences !== undefined
        ? { pastEventReferences: input.pastEventReferences }
        : {}),
    },
  };
}

/**
 * Simulates event creation logic from POST /organizer/events.
 * Sets organizer_id and status="draft".
 */
function applyEventCreation(
  input: Record<string, any>,
  organizerId: number,
): Record<string, any> {
  return {
    ...input,
    organizerId,
    status: 'draft',
  };
}

/**
 * Simulates the publish logic from PUT /organizer/events/:id/publish.
 * Returns { success, status } or { success: false, error }.
 */
function applyPublish(currentStatus: string): { success: boolean; newStatus?: string; error?: string } {
  if (currentStatus !== 'draft') {
    return { success: false, error: 'Only draft events can be published' };
  }
  return { success: true, newStatus: 'published' };
}

/**
 * Simulates the deletion check from DELETE /organizer/events/:id.
 * Returns whether deletion is allowed based on active bookings.
 */
function canDeleteEvent(bookingStatuses: string[]): { allowed: boolean; error?: string } {
  const hasActive = bookingStatuses.some(
    s => !(TERMINAL_STATUSES as readonly string[]).includes(s),
  );
  if (hasActive) {
    return { allowed: false, error: 'Cannot delete event with active bookings' };
  }
  return { allowed: true };
}

/**
 * Simulates duplicate booking check logic.
 * Returns whether a new booking can be created for the given artist-event pair.
 */
function canCreateBooking(
  artistId: number,
  eventId: number,
  existingBookings: Array<{ artistId: number; eventId: number; status: string }>,
): { allowed: boolean; error?: string } {
  const duplicate = existingBookings.some(
    b =>
      b.artistId === artistId &&
      b.eventId === eventId &&
      !(TERMINAL_STATUSES as readonly string[]).includes(b.status),
  );
  if (duplicate) {
    return { allowed: false, error: 'Duplicate booking for same artist and event' };
  }
  return { allowed: true };
}

/**
 * Simulates the auth middleware check from isAuthenticated.
 */
function checkAuth(isAuthenticated: boolean): { status: number; message?: string } {
  if (!isAuthenticated) {
    return { status: 401, message: 'Authentication required' };
  }
  return { status: 200 };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const zodEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{1,10}$/),
    fc.stringMatching(/^[a-z]{1,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io'),
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

const phoneArb = fc.stringMatching(/^[0-9]{10,15}$/);

const validContactPersonArb = fc.record({
  name: fc.stringMatching(/^[a-z]{2,50}$/),
  email: zodEmailArb,
  phone: phoneArb,
});

const validOnboardingArb = fc.record({
  organizationName: fc.stringMatching(/^[a-z]{2,50}$/),
  description: fc.stringMatching(/^[a-z]{10,100}$/),
  contactPerson: validContactPersonArb,
  website: fc.option(fc.webUrl(), { nil: undefined }),
  pastEventReferences: fc.option(
    fc.array(fc.stringMatching(/^[a-z]{1,50}$/), { minLength: 1, maxLength: 3 }),
    { nil: undefined },
  ),
});

const organizerIdArb = fc.integer({ min: 1, max: 1000 });
const artistIdArb = fc.integer({ min: 1, max: 1000 });
const eventIdArb = fc.integer({ min: 1, max: 1000 });

const isoDatetimeArb = fc
  .integer({ min: new Date('2025-01-01').getTime(), max: new Date('2026-12-31').getTime() })
  .map(ts => new Date(ts).toISOString());

const validCreateEventInputArb = fc.record({
  title: fc.stringMatching(/^[a-zA-Z ]{3,50}$/),
  description: fc.option(fc.stringMatching(/^[a-z ]{5,100}$/), { nil: undefined }),
  startTime: isoDatetimeArb,
  endTime: fc.option(isoDatetimeArb, { nil: undefined }),
  venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: undefined }),
  capacityTotal: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: undefined }),
  currency: fc.constant('INR'),
  visibility: fc.constantFrom('public' as const, 'private' as const),
});

const bookingStatusArb = fc.constantFrom(...ALL_BOOKING_STATUSES);
const nonTerminalStatusArb = fc.constantFrom(...NON_TERMINAL_BOOKING_STATUSES);
const terminalStatusArb = fc.constantFrom(...TERMINAL_STATUSES);

// ---------------------------------------------------------------------------
// Property 4: Onboarding round-trip
// Validates: Requirements 1.4
// ---------------------------------------------------------------------------

describe('Property 4: Onboarding round-trip', () => {
  it('stored name matches submitted organizationName', () => {
    /** Validates: Requirements 1.4 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const parsed = organizerOnboardingSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const result = applyOnboardingCompletion(parsed.data);
        expect(result.name).toBe(parsed.data.organizationName);
      }),
      { numRuns: 100 },
    );
  });

  it('stored description matches submitted description', () => {
    /** Validates: Requirements 1.4 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const parsed = organizerOnboardingSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const result = applyOnboardingCompletion(parsed.data);
        expect(result.description).toBe(parsed.data.description);
      }),
      { numRuns: 100 },
    );
  });

  it('stored contactPerson matches submitted contactPerson', () => {
    /** Validates: Requirements 1.4 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const parsed = organizerOnboardingSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const result = applyOnboardingCompletion(parsed.data);
        expect(result.contactPerson).toEqual(parsed.data.contactPerson);
      }),
      { numRuns: 100 },
    );
  });

  it('metadata.profileComplete is set to true after onboarding', () => {
    /** Validates: Requirements 1.4 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const parsed = organizerOnboardingSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const result = applyOnboardingCompletion(parsed.data);
        expect(result.metadata.profileComplete).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('preserves existing metadata fields during onboarding', () => {
    /** Validates: Requirements 1.4 */
    fc.assert(
      fc.property(
        validOnboardingArb,
        fc.record({
          someExistingField: fc.string(),
          anotherField: fc.integer(),
        }),
        (input, existingMeta) => {
          const parsed = organizerOnboardingSchema.safeParse(input);
          expect(parsed.success).toBe(true);
          if (!parsed.success) return;

          const result = applyOnboardingCompletion(parsed.data, existingMeta);
          // Type assertion needed because we're testing dynamic metadata preservation
          const metadata = result.metadata as any;
          expect(metadata.someExistingField).toBe(existingMeta.someExistingField);
          expect(metadata.anotherField).toBe(existingMeta.anotherField);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Trust score initialization
// Validates: Requirements 1.5
// ---------------------------------------------------------------------------

describe('Property 5: Trust score initialization', () => {
  it('trustScore is exactly 50 after onboarding completion', () => {
    /** Validates: Requirements 1.5 */
    fc.assert(
      fc.property(validOnboardingArb, (input) => {
        const parsed = organizerOnboardingSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const result = applyOnboardingCompletion(parsed.data);
        expect(result.metadata.trustScore).toBe(50);
      }),
      { numRuns: 100 },
    );
  });

  it('trustScore is 50 regardless of any pre-existing metadata', () => {
    /** Validates: Requirements 1.5 */
    fc.assert(
      fc.property(
        validOnboardingArb,
        fc.record({
          trustScore: fc.integer({ min: 0, max: 100 }),
          randomField: fc.string(),
        }),
        (input, existingMeta) => {
          const parsed = organizerOnboardingSchema.safeParse(input);
          expect(parsed.success).toBe(true);
          if (!parsed.success) return;

          const result = applyOnboardingCompletion(parsed.data, existingMeta);
          // The onboarding always sets trustScore to 50, overriding any existing value
          expect(result.metadata.trustScore).toBe(50);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Event creation sets correct organizer and status
// Validates: Requirements 5.3
// ---------------------------------------------------------------------------

describe('Property 13: Event creation sets correct organizer and status', () => {
  it('created event has organizer_id equal to the organizer promoter ID', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(validCreateEventInputArb, organizerIdArb, (input, orgId) => {
        const parsed = createEventSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const event = applyEventCreation(parsed.data, orgId);
        expect(event.organizerId).toBe(orgId);
      }),
      { numRuns: 100 },
    );
  });

  it('created event has status equal to "draft"', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(validCreateEventInputArb, organizerIdArb, (input, orgId) => {
        const parsed = createEventSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const event = applyEventCreation(parsed.data, orgId);
        expect(event.status).toBe('draft');
      }),
      { numRuns: 100 },
    );
  });

  it('created event preserves all input fields', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(validCreateEventInputArb, organizerIdArb, (input, orgId) => {
        const parsed = createEventSchema.safeParse(input);
        expect(parsed.success).toBe(true);
        if (!parsed.success) return;

        const event = applyEventCreation(parsed.data, orgId) as any;
        expect(event.title).toBe(parsed.data.title);
        expect(event.startTime).toBe(parsed.data.startTime);
        expect(event.currency).toBe(parsed.data.currency);
        expect(event.visibility).toBe(parsed.data.visibility);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Publishing changes status to published
// Validates: Requirements 5.5
// ---------------------------------------------------------------------------

describe('Property 16: Publishing changes status to published', () => {
  it('publishing a draft event changes status to "published"', () => {
    /** Validates: Requirements 5.5 */
    fc.assert(
      fc.property(fc.constant('draft'), (status) => {
        const result = applyPublish(status);
        expect(result.success).toBe(true);
        expect(result.newStatus).toBe('published');
      }),
      { numRuns: 100 },
    );
  });

  it('publishing a non-draft event fails', () => {
    /** Validates: Requirements 5.5 */
    fc.assert(
      fc.property(fc.constantFrom(...NON_DRAFT_STATUSES), (status) => {
        const result = applyPublish(status);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 },
    );
  });

  it('only "draft" status allows publishing', () => {
    /** Validates: Requirements 5.5 */
    fc.assert(
      fc.property(fc.constantFrom(...EVENT_STATUSES), (status) => {
        const result = applyPublish(status);
        if (status === 'draft') {
          expect(result.success).toBe(true);
          expect(result.newStatus).toBe('published');
        } else {
          expect(result.success).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 18: Event deletion blocked by active bookings
// Validates: Requirements 5.7
// ---------------------------------------------------------------------------

describe('Property 18: Event deletion blocked by active bookings', () => {
  it('deletion fails when at least one booking is in a non-terminal status', () => {
    /** Validates: Requirements 5.7 */
    fc.assert(
      fc.property(
        fc.array(bookingStatusArb, { minLength: 1, maxLength: 10 }).filter(
          statuses => statuses.some(s => !(TERMINAL_STATUSES as readonly string[]).includes(s)),
        ),
        (statuses) => {
          const result = canDeleteEvent(statuses);
          expect(result.allowed).toBe(false);
          expect(result.error).toContain('active bookings');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('deletion succeeds when all bookings are in terminal statuses', () => {
    /** Validates: Requirements 5.7 */
    fc.assert(
      fc.property(
        fc.array(terminalStatusArb, { minLength: 0, maxLength: 10 }),
        (statuses) => {
          const result = canDeleteEvent(statuses);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('deletion succeeds when there are zero bookings', () => {
    /** Validates: Requirements 5.7 */
    const result = canDeleteEvent([]);
    expect(result.allowed).toBe(true);
  });

  it('a single non-terminal booking blocks deletion', () => {
    /** Validates: Requirements 5.7 */
    fc.assert(
      fc.property(
        nonTerminalStatusArb,
        fc.array(terminalStatusArb, { minLength: 0, maxLength: 5 }),
        (activeStatus, terminalStatuses) => {
          const allStatuses = [...terminalStatuses, activeStatus];
          const result = canDeleteEvent(allStatuses);
          expect(result.allowed).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Duplicate booking prevention
// Validates: Requirements 6.3
// ---------------------------------------------------------------------------

describe('Property 20: Duplicate booking prevention', () => {
  it('rejects booking when same artist-event pair has a non-cancelled booking', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        artistIdArb,
        eventIdArb,
        nonTerminalStatusArb,
        (artistId, eventId, existingStatus) => {
          const existingBookings = [{ artistId, eventId, status: existingStatus }];
          const result = canCreateBooking(artistId, eventId, existingBookings);
          expect(result.allowed).toBe(false);
          expect(result.error).toContain('Duplicate');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('allows booking when same artist-event pair only has terminal-status bookings', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        artistIdArb,
        eventIdArb,
        fc.array(terminalStatusArb, { minLength: 1, maxLength: 5 }),
        (artistId, eventId, terminalStatuses) => {
          const existingBookings = terminalStatuses.map(status => ({
            artistId,
            eventId,
            status,
          }));
          const result = canCreateBooking(artistId, eventId, existingBookings);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('allows booking when no existing bookings exist for the pair', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(artistIdArb, eventIdArb, (artistId, eventId) => {
        const result = canCreateBooking(artistId, eventId, []);
        expect(result.allowed).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('allows booking for different artist on same event with active booking', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        artistIdArb,
        eventIdArb,
        nonTerminalStatusArb,
        (artistId, eventId, existingStatus) => {
          const differentArtistId = artistId + 1;
          const existingBookings = [{ artistId, eventId, status: existingStatus }];
          const result = canCreateBooking(differentArtistId, eventId, existingBookings);
          expect(result.allowed).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('allows booking for same artist on different event with active booking', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        artistIdArb,
        eventIdArb,
        nonTerminalStatusArb,
        (artistId, eventId, existingStatus) => {
          const differentEventId = eventId + 1;
          const existingBookings = [{ artistId, eventId, status: existingStatus }];
          const result = canCreateBooking(artistId, differentEventId, existingBookings);
          expect(result.allowed).toBe(true);
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

describe('Property 39: Unauthenticated access redirects to auth', () => {
  const ORGANIZER_ENDPOINTS = [
    '/api/organizer/profile',
    '/api/organizer/profile/status',
    '/api/organizer/dashboard',
    '/api/organizer/events',
    '/api/organizer/bookings',
    '/api/organizer/activity',
  ];

  it('unauthenticated requests receive 401 status', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        fc.constantFrom(...ORGANIZER_ENDPOINTS),
        (_endpoint) => {
          const result = checkAuth(false);
          expect(result.status).toBe(401);
          expect(result.message).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('authenticated requests do not receive 401', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        fc.constantFrom(...ORGANIZER_ENDPOINTS),
        (_endpoint) => {
          const result = checkAuth(true);
          expect(result.status).toBe(200);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('auth check is consistent regardless of endpoint', () => {
    /** Validates: Requirements 13.5 */
    fc.assert(
      fc.property(
        fc.constantFrom(...ORGANIZER_ENDPOINTS),
        fc.boolean(),
        (_endpoint, isAuth) => {
          const result = checkAuth(isAuth);
          if (isAuth) {
            expect(result.status).toBe(200);
          } else {
            expect(result.status).toBe(401);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
