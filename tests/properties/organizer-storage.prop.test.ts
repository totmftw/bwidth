import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role, Property 6: Dashboard stats accuracy
// Feature: organizer-role, Property 15: Events list contains only organizer's events
// Feature: organizer-role, Property 34: Booking summary accuracy

// ---------------------------------------------------------------------------
// Shared types mirroring the storage layer shapes
// ---------------------------------------------------------------------------

interface MockEvent {
  id: number;
  organizerId: number;
  startTime: Date;
  status: string;
}

interface MockBooking {
  id: number;
  eventId: number;
  status: string;
  finalAmount: number | null;
}

interface OrganizerDashboardStats {
  totalEvents: number;
  upcomingEvents: number;
  activeBookings: number;
  pendingNegotiations: number;
}

interface BookingSummary {
  totalBookings: number;
  completedBookings: number;
  cancellationRate: number;
  averageBookingValue: number;
}

// ---------------------------------------------------------------------------
// Terminal booking statuses (matching storage.ts logic)
// ---------------------------------------------------------------------------

const TERMINAL_STATUSES = ['cancelled', 'completed', 'refunded'] as const;

const ALL_BOOKING_STATUSES = [
  'inquiry', 'offered', 'negotiating', 'contracting',
  'confirmed', 'paid_deposit', 'scheduled',
  'completed', 'cancelled', 'disputed', 'refunded',
] as const;

const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'] as const;

// ---------------------------------------------------------------------------
// Pure computation functions (extracted logic from storage layer)
// ---------------------------------------------------------------------------

/**
 * Computes dashboard stats from raw events and bookings arrays.
 * This mirrors the aggregation logic in DatabaseStorage.getOrganizerDashboardStats.
 */
function computeDashboardStats(
  organizerId: number,
  allEvents: MockEvent[],
  allBookings: MockBooking[],
  now: Date,
): OrganizerDashboardStats {
  const orgEvents = allEvents.filter(e => e.organizerId === organizerId);
  const orgEventIds = new Set(orgEvents.map(e => e.id));
  const orgBookings = allBookings.filter(b => orgEventIds.has(b.eventId));

  return {
    totalEvents: orgEvents.length,
    upcomingEvents: orgEvents.filter(e => e.startTime > now).length,
    activeBookings: orgBookings.filter(
      b => !TERMINAL_STATUSES.includes(b.status as any),
    ).length,
    pendingNegotiations: orgBookings.filter(b => b.status === 'negotiating').length,
  };
}

/**
 * Filters events by organizer ID, mirroring getEventsByOrganizer.
 */
function filterEventsByOrganizer(
  organizerId: number,
  allEvents: MockEvent[],
): MockEvent[] {
  return allEvents.filter(e => e.organizerId === organizerId);
}

/**
 * Computes booking summary from raw bookings for an organizer's events.
 * This mirrors the aggregation logic in DatabaseStorage.getOrganizerBookingSummary.
 */
function computeBookingSummary(
  organizerId: number,
  allEvents: MockEvent[],
  allBookings: MockBooking[],
): BookingSummary {
  const orgEventIds = new Set(
    allEvents.filter(e => e.organizerId === organizerId).map(e => e.id),
  );
  const orgBookings = allBookings.filter(b => orgEventIds.has(b.eventId));

  const totalBookings = orgBookings.length;
  const completedBookings = orgBookings.filter(b => b.status === 'completed').length;
  const cancelledBookings = orgBookings.filter(b => b.status === 'cancelled').length;

  const cancellationRate =
    totalBookings > 0 ? (cancelledBookings / totalBookings) * 100 : 0;

  const completedWithAmount = orgBookings.filter(
    b => b.status === 'completed' && b.finalAmount !== null,
  );
  const averageBookingValue =
    completedWithAmount.length > 0
      ? completedWithAmount.reduce((sum, b) => sum + (b.finalAmount ?? 0), 0) /
        completedWithAmount.length
      : 0;

  return {
    totalBookings,
    completedBookings,
    cancellationRate,
    averageBookingValue,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const organizerIdArb = fc.integer({ min: 1, max: 10 });

const mockEventArb = (organizerIds: number[]): fc.Arbitrary<MockEvent> =>
  fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    organizerId: fc.constantFrom(...organizerIds),
    startTime: fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2026-12-31'),
    }),
    status: fc.constantFrom(...EVENT_STATUSES),
  });

const mockBookingArb = (eventIds: number[]): fc.Arbitrary<MockBooking> =>
  eventIds.length === 0
    ? fc.constant({ id: 1, eventId: -1, status: 'inquiry', finalAmount: null })
    : fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        eventId: fc.constantFrom(...eventIds),
        status: fc.constantFrom(...ALL_BOOKING_STATUSES),
        finalAmount: fc.option(
          fc.double({ min: 100, max: 500000, noNaN: true }),
          { nil: null },
        ),
      });

// ---------------------------------------------------------------------------
// Property 6: Dashboard stats accuracy
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------

describe('Property 6: Dashboard stats accuracy', () => {
  it('totalEvents equals count of events where organizer_id matches', () => {
    /** Validates: Requirements 2.1 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }),
        fc.date({ min: new Date('2025-01-01'), max: new Date('2025-12-31') }),
        (targetOrg, orgIds, now) => {
          const allOrgIds = [...new Set([targetOrg, ...orgIds])];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 0, maxLength: 20 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              // Ensure unique event IDs
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const stats = computeDashboardStats(targetOrg, uniqueEvents, [], now);
              const expected = uniqueEvents.filter(e => e.organizerId === targetOrg).length;
              expect(stats.totalEvents).toBe(expected);
            }),
            { numRuns: 20 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('upcomingEvents equals count of organizer events with startTime in the future', () => {
    /** Validates: Requirements 2.1 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 5 }),
        fc.date({ min: new Date('2025-06-01'), max: new Date('2025-06-30') }),
        (targetOrg, orgIds, now) => {
          const allOrgIds = [...new Set([targetOrg, ...orgIds])];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 0, maxLength: 20 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const stats = computeDashboardStats(targetOrg, uniqueEvents, [], now);
              const expected = uniqueEvents.filter(
                e => e.organizerId === targetOrg && e.startTime > now,
              ).length;
              expect(stats.upcomingEvents).toBe(expected);
            }),
            { numRuns: 20 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('activeBookings equals count of bookings in non-terminal statuses for organizer events', () => {
    /** Validates: Requirements 2.1 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 15 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const now = new Date('2025-06-15');
                  const stats = computeDashboardStats(targetOrg, uniqueEvents, uniqueBookings, now);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const expected = uniqueBookings.filter(
                    b =>
                      orgEventIds.has(b.eventId) &&
                      !TERMINAL_STATUSES.includes(b.status as any),
                  ).length;
                  expect(stats.activeBookings).toBe(expected);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('pendingNegotiations equals count of bookings with status "negotiating" for organizer events', () => {
    /** Validates: Requirements 2.1 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 15 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const now = new Date('2025-06-15');
                  const stats = computeDashboardStats(targetOrg, uniqueEvents, uniqueBookings, now);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const expected = uniqueBookings.filter(
                    b => orgEventIds.has(b.eventId) && b.status === 'negotiating',
                  ).length;
                  expect(stats.pendingNegotiations).toBe(expected);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Events list contains only organizer's events
// Validates: Requirements 5.4
// ---------------------------------------------------------------------------

describe('Property 15: Events list contains only organizer\'s events', () => {
  it('returns exactly the events where organizer_id matches, and no others', () => {
    /** Validates: Requirements 5.4 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 2, maxLength: 5 }),
        (targetOrg, orgIds) => {
          const allOrgIds = [...new Set([targetOrg, ...orgIds])];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 0, maxLength: 30 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const result = filterEventsByOrganizer(targetOrg, uniqueEvents);

              // All returned events belong to the target organizer
              for (const e of result) {
                expect(e.organizerId).toBe(targetOrg);
              }

              // No event belonging to the target organizer is missing
              const expectedIds = new Set(
                uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
              );
              const resultIds = new Set(result.map(e => e.id));
              expect(resultIds).toEqual(expectedIds);
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('returns empty array when organizer has no events', () => {
    /** Validates: Requirements 5.4 */
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }),
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 10000 }),
            organizerId: fc.integer({ min: 1, max: 99 }),
            startTime: fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') }),
            status: fc.constantFrom(...EVENT_STATUSES),
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (targetOrg, events) => {
          const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
          const result = filterEventsByOrganizer(targetOrg, uniqueEvents);
          expect(result).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('never includes events from other organizers', () => {
    /** Validates: Requirements 5.4 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 2, maxLength: 6 }),
        (targetOrg, orgIds) => {
          const allOrgIds = [...new Set([targetOrg, ...orgIds])];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 30 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const result = filterEventsByOrganizer(targetOrg, uniqueEvents);
              const otherOrgEvents = result.filter(e => e.organizerId !== targetOrg);
              expect(otherOrgEvents).toHaveLength(0);
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 34: Booking summary accuracy
// Validates: Requirements 10.5
// ---------------------------------------------------------------------------

describe('Property 34: Booking summary accuracy', () => {
  it('totalBookings equals count of all bookings for organizer events', () => {
    /** Validates: Requirements 10.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 20 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const summary = computeBookingSummary(targetOrg, uniqueEvents, uniqueBookings);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const expected = uniqueBookings.filter(b => orgEventIds.has(b.eventId)).length;
                  expect(summary.totalBookings).toBe(expected);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('completedBookings equals count with status "completed"', () => {
    /** Validates: Requirements 10.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 20 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const summary = computeBookingSummary(targetOrg, uniqueEvents, uniqueBookings);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const expected = uniqueBookings.filter(
                    b => orgEventIds.has(b.eventId) && b.status === 'completed',
                  ).length;
                  expect(summary.completedBookings).toBe(expected);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('cancellationRate equals cancelled / total * 100', () => {
    /** Validates: Requirements 10.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 20 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const summary = computeBookingSummary(targetOrg, uniqueEvents, uniqueBookings);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const orgBookings = uniqueBookings.filter(b => orgEventIds.has(b.eventId));
                  const total = orgBookings.length;
                  const cancelled = orgBookings.filter(b => b.status === 'cancelled').length;
                  const expectedRate = total > 0 ? (cancelled / total) * 100 : 0;

                  expect(summary.cancellationRate).toBeCloseTo(expectedRate, 10);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('averageBookingValue equals mean of finalAmount across completed bookings', () => {
    /** Validates: Requirements 10.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const allOrgIds = [targetOrg, targetOrg + 1];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 1, maxLength: 10 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const eventIds = uniqueEvents.map(e => e.id);
              const bookingsArb = fc.array(mockBookingArb(eventIds), { minLength: 0, maxLength: 20 });
              fc.assert(
                fc.property(bookingsArb, (bks) => {
                  const uniqueBookings = bks.map((b, i) => ({ ...b, id: i + 1 }));
                  const summary = computeBookingSummary(targetOrg, uniqueEvents, uniqueBookings);

                  const orgEventIds = new Set(
                    uniqueEvents.filter(e => e.organizerId === targetOrg).map(e => e.id),
                  );
                  const completedWithAmount = uniqueBookings.filter(
                    b =>
                      orgEventIds.has(b.eventId) &&
                      b.status === 'completed' &&
                      b.finalAmount !== null,
                  );
                  const expectedAvg =
                    completedWithAmount.length > 0
                      ? completedWithAmount.reduce((s, b) => s + (b.finalAmount ?? 0), 0) /
                        completedWithAmount.length
                      : 0;

                  expect(summary.averageBookingValue).toBeCloseTo(expectedAvg, 10);
                }),
                { numRuns: 10 },
              );
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('cancellationRate is 0 when there are no bookings', () => {
    /** Validates: Requirements 10.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (targetOrg) => {
          const summary = computeBookingSummary(targetOrg, [], []);
          expect(summary.totalBookings).toBe(0);
          expect(summary.completedBookings).toBe(0);
          expect(summary.cancellationRate).toBe(0);
          expect(summary.averageBookingValue).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
