import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role, Property 7: Upcoming events sorted ascending
// Feature: organizer-role, Property 8: Pending actions completeness
// Feature: organizer-role, Property 9: Activity feed ordering and limit

// ---------------------------------------------------------------------------
// Shared types mirroring the dashboard data structures
// ---------------------------------------------------------------------------

interface MockEvent {
  id: number;
  organizerId: number;
  startTime: Date;
  status: string;
  title: string;
  venueId?: number | null;
}

interface MockBooking {
  id: number;
  eventId: number;
  artistId: number;
  status: string;
  finalAmount: number | null;
  meta: {
    negotiationRound?: number;
    history?: Array<{
      action: string;
      by: string;
      at: string;
    }>;
    completionFeedback?: {
      confirmedBy: string;
      rating: number;
      note?: string;
      confirmedAt: string;
    };
  };
}

interface MockContract {
  id: number;
  bookingId: number;
  status: string;
  artistSignedAt: Date | null;
  promoterSignedAt: Date | null;
  deadlineAt: Date;
}

interface MockPayment {
  id: number;
  bookingId: number;
  amount: number;
  status: string;
  dueDate: Date;
}

interface MockAuditLog {
  id: number;
  occurredAt: Date;
  who: number;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
}

interface PendingAction {
  type: 'unsigned_contract' | 'unanswered_negotiation' | 'unconfirmed_completion' | 'overdue_payment';
  bookingId: number;
  description: string;
}

// ---------------------------------------------------------------------------
// Event statuses
// ---------------------------------------------------------------------------

const EVENT_STATUSES = ['draft', 'published', 'completed', 'cancelled'] as const;
const BOOKING_STATUSES = [
  'inquiry', 'offered', 'negotiating', 'contracting',
  'confirmed', 'paid_deposit', 'scheduled',
  'completed', 'cancelled', 'disputed', 'refunded',
] as const;
const CONTRACT_STATUSES = ['draft', 'signed', 'voided'] as const;
const PAYMENT_STATUSES = ['initiated', 'pending', 'completed', 'failed', 'refunded'] as const;

// ---------------------------------------------------------------------------
// Pure computation functions (extracted dashboard logic)
// ---------------------------------------------------------------------------

/**
 * Filters and sorts upcoming events by start time ascending.
 * Property 7: For any list of upcoming events, consecutive pairs should be
 * sorted by startTime ascending.
 */
function getUpcomingEventsSorted(
  events: MockEvent[],
  now: Date,
): MockEvent[] {
  return events
    .filter(e => e.startTime > now && (e.status === 'published' || e.status === 'confirmed'))
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
}

/**
 * Computes pending actions for an organizer.
 * Property 8: Pending actions should include every booking where:
 * - Contract exists but is unsigned by the organizer
 * - Booking status is "negotiating" and last history entry is not by organizer
 * - Booking is "completed" but organizer has not confirmed completion
 * - Payment is overdue
 */
function computePendingActions(
  organizerId: number,
  events: MockEvent[],
  bookings: MockBooking[],
  contracts: MockContract[],
  payments: MockPayment[],
  now: Date,
): PendingAction[] {
  const actions: PendingAction[] = [];
  const orgEventIds = new Set(events.filter(e => e.organizerId === organizerId).map(e => e.id));
  const orgBookings = bookings.filter(b => orgEventIds.has(b.eventId));

  for (const booking of orgBookings) {
    // Check for unsigned contracts
    const contract = contracts.find(c => c.bookingId === booking.id);
    if (contract && contract.status === 'draft' && !contract.promoterSignedAt) {
      actions.push({
        type: 'unsigned_contract',
        bookingId: booking.id,
        description: `Contract for booking ${booking.id} needs signature`,
      });
    }

    // Check for unanswered negotiations
    if (booking.status === 'negotiating' && booking.meta.history && booking.meta.history.length > 0) {
      const lastEntry = booking.meta.history[booking.meta.history.length - 1];
      if (lastEntry.by !== 'organizer' && lastEntry.by !== 'promoter') {
        actions.push({
          type: 'unanswered_negotiation',
          bookingId: booking.id,
          description: `Negotiation for booking ${booking.id} awaiting response`,
        });
      }
    }

    // Check for unconfirmed completions
    if (booking.status === 'completed' && booking.meta.completionFeedback) {
      const feedback = booking.meta.completionFeedback;
      if (feedback.confirmedBy !== 'organizer' && feedback.confirmedBy !== 'promoter') {
        actions.push({
          type: 'unconfirmed_completion',
          bookingId: booking.id,
          description: `Event completion for booking ${booking.id} needs confirmation`,
        });
      }
    }

    // Check for overdue payments
    const bookingPayments = payments.filter(p => p.bookingId === booking.id);
    for (const payment of bookingPayments) {
      if (payment.status !== 'completed' && payment.dueDate < now) {
        actions.push({
          type: 'overdue_payment',
          bookingId: booking.id,
          description: `Payment ${payment.id} for booking ${booking.id} is overdue`,
        });
      }
    }
  }

  return actions;
}

/**
 * Filters and sorts activity feed by occurredAt descending, limited to N entries.
 * Property 9: For any activity feed with limit N, the returned list should contain
 * at most N entries, sorted by occurredAt descending (newest first).
 */
function getActivityFeedSorted(
  logs: MockAuditLog[],
  userId: number,
  limit: number,
): MockAuditLog[] {
  return logs
    .filter(log => log.who === userId)
    .filter(log => !isNaN(log.occurredAt.getTime())) // Filter out invalid dates
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const mockEventArb = (organizerIds: number[]): fc.Arbitrary<MockEvent> =>
  fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    organizerId: fc.constantFrom(...organizerIds),
    startTime: fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2026-12-31'),
    }),
    status: fc.constantFrom(...EVENT_STATUSES),
    title: fc.string({ minLength: 5, maxLength: 50 }),
    venueId: fc.option(fc.integer({ min: 1, max: 100 }), { nil: null }),
  });

const mockBookingArb = (eventIds: number[]): fc.Arbitrary<MockBooking> =>
  eventIds.length === 0
    ? fc.constant({
        id: 1,
        eventId: -1,
        artistId: 1,
        status: 'inquiry',
        finalAmount: null,
        meta: {},
      })
    : fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        eventId: fc.constantFrom(...eventIds),
        artistId: fc.integer({ min: 1, max: 100 }),
        status: fc.constantFrom(...BOOKING_STATUSES),
        finalAmount: fc.option(
          fc.double({ min: 1000, max: 500000, noNaN: true }),
          { nil: null },
        ),
        meta: fc.record({
          negotiationRound: fc.option(fc.integer({ min: 0, max: 3 })),
          history: fc.option(
            fc.array(
              fc.record({
                action: fc.constantFrom('offered', 'countered', 'accepted', 'declined'),
                by: fc.constantFrom('artist', 'organizer', 'promoter'),
                at: fc.date({
                  min: new Date('2024-01-01'),
                  max: new Date('2026-12-31'),
                }).map(d => d.toISOString()),
              }),
              { minLength: 0, maxLength: 5 },
            ),
          ),
          completionFeedback: fc.option(
            fc.record({
              confirmedBy: fc.constantFrom('artist', 'organizer', 'promoter', 'both'),
              rating: fc.integer({ min: 1, max: 5 }),
              note: fc.option(fc.string({ maxLength: 100 })),
              confirmedAt: fc.date({
                min: new Date('2024-01-01'),
                max: new Date('2026-12-31'),
              }).map(d => d.toISOString()),
            }),
          ),
        }),
      });

const mockContractArb = (bookingIds: number[]): fc.Arbitrary<MockContract> =>
  bookingIds.length === 0
    ? fc.constant({
        id: 1,
        bookingId: -1,
        status: 'draft',
        artistSignedAt: null,
        promoterSignedAt: null,
        deadlineAt: new Date(),
      })
    : fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        bookingId: fc.constantFrom(...bookingIds),
        status: fc.constantFrom(...CONTRACT_STATUSES),
        artistSignedAt: fc.option(fc.date(), { nil: null }),
        promoterSignedAt: fc.option(fc.date(), { nil: null }),
        deadlineAt: fc.date({
          min: new Date('2025-01-01'),
          max: new Date('2026-12-31'),
        }),
      });

const mockPaymentArb = (bookingIds: number[]): fc.Arbitrary<MockPayment> =>
  bookingIds.length === 0
    ? fc.constant({
        id: 1,
        bookingId: -1,
        amount: 1000,
        status: 'initiated',
        dueDate: new Date(),
      })
    : fc.record({
        id: fc.integer({ min: 1, max: 10000 }),
        bookingId: fc.constantFrom(...bookingIds),
        amount: fc.double({ min: 1000, max: 500000, noNaN: true }),
        status: fc.constantFrom(...PAYMENT_STATUSES),
        dueDate: fc.date({
          min: new Date('2024-01-01'),
          max: new Date('2026-12-31'),
        }),
      });

const mockAuditLogArb = (userIds: number[]): fc.Arbitrary<MockAuditLog> =>
  fc.record({
    id: fc.integer({ min: 1, max: 100000 }),
    occurredAt: fc.date({
      min: new Date('2024-01-01'),
      max: new Date('2026-12-31'),
    }),
    who: fc.constantFrom(...userIds),
    action: fc.constantFrom(
      'event_created',
      'booking_offered',
      'contract_signed',
      'payment_completed',
      'negotiation_started',
      'event_published',
    ),
    entityType: fc.option(fc.constantFrom('event', 'booking', 'contract', 'payment'), { nil: null }),
    entityId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
  });

// ---------------------------------------------------------------------------
// Property 7: Upcoming events sorted ascending
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------

describe('Property 7: Upcoming events sorted ascending', () => {
  it('for every consecutive pair of events, e[i].startTime <= e[i+1].startTime', () => {
    /** Validates: Requirements 2.2 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.date({ min: new Date('2025-06-01'), max: new Date('2025-06-30') }),
        (targetOrg, now) => {
          const allOrgIds = [targetOrg, targetOrg + 1, targetOrg + 2];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 0, maxLength: 30 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const upcomingEvents = getUpcomingEventsSorted(uniqueEvents, now);

              // Check sorting: each consecutive pair should be in ascending order
              for (let i = 0; i < upcomingEvents.length - 1; i++) {
                expect(upcomingEvents[i].startTime.getTime()).toBeLessThanOrEqual(
                  upcomingEvents[i + 1].startTime.getTime(),
                );
              }
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('only includes events with startTime > now and status published or confirmed', () => {
    /** Validates: Requirements 2.2 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.date({ min: new Date('2025-06-01'), max: new Date('2025-06-30') }),
        (targetOrg, now) => {
          const allOrgIds = [targetOrg];
          const eventsArb = fc.array(mockEventArb(allOrgIds), { minLength: 0, maxLength: 30 });
          fc.assert(
            fc.property(eventsArb, (events) => {
              const uniqueEvents = events.map((e, i) => ({ ...e, id: i + 1 }));
              const upcomingEvents = getUpcomingEventsSorted(uniqueEvents, now);

              // All returned events must be in the future
              for (const event of upcomingEvents) {
                expect(event.startTime.getTime()).toBeGreaterThan(now.getTime());
                expect(['published', 'confirmed']).toContain(event.status);
              }
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('returns empty array when no upcoming events exist', () => {
    /** Validates: Requirements 2.2 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (targetOrg) => {
          // All events in the past
          const pastEvents: MockEvent[] = [
            {
              id: 1,
              organizerId: targetOrg,
              startTime: new Date('2020-01-01'),
              status: 'published',
              title: 'Past Event',
              venueId: 1,
            },
            {
              id: 2,
              organizerId: targetOrg,
              startTime: new Date('2021-01-01'),
              status: 'completed',
              title: 'Completed Event',
              venueId: 2,
            },
          ];
          const now = new Date('2025-06-15');
          const upcomingEvents = getUpcomingEventsSorted(pastEvents, now);
          expect(upcomingEvents).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 8: Pending actions completeness
// Validates: Requirements 2.3
// ---------------------------------------------------------------------------

describe('Property 8: Pending actions completeness', () => {
  it('includes bookings with unsigned contracts by organizer', () => {
    /** Validates: Requirements 2.3 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const event: MockEvent = {
            id: 1,
            organizerId: targetOrg,
            startTime: new Date('2026-01-01'),
            status: 'published',
            title: 'Test Event',
            venueId: 1,
          };

          const booking: MockBooking = {
            id: 1,
            eventId: 1,
            artistId: 1,
            status: 'contracting',
            finalAmount: 10000,
            meta: {},
          };

          // Create a contract that is unsigned by promoter
          const contract: MockContract = {
            id: 1,
            bookingId: 1,
            status: 'draft',
            artistSignedAt: new Date(),
            promoterSignedAt: null, // Unsigned by organizer
            deadlineAt: new Date('2026-01-01'),
          };

          const now = new Date('2025-06-15');
          const actions = computePendingActions(
            targetOrg,
            [event],
            [booking],
            [contract],
            [],
            now,
          );

          // Should include unsigned contract action
          const unsignedAction = actions.find(
            a => a.type === 'unsigned_contract' && a.bookingId === booking.id,
          );
          expect(unsignedAction).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes bookings with unanswered negotiations', () => {
    /** Validates: Requirements 2.3 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const event: MockEvent = {
            id: 1,
            organizerId: targetOrg,
            startTime: new Date('2026-01-01'),
            status: 'published',
            title: 'Test Event',
            venueId: 1,
          };

          const booking: MockBooking = {
            id: 1,
            eventId: 1,
            artistId: 1,
            status: 'negotiating',
            finalAmount: 10000,
            meta: {
              negotiationRound: 1,
              history: [
                {
                  action: 'countered',
                  by: 'artist', // Last action by artist, not organizer
                  at: new Date().toISOString(),
                },
              ],
            },
          };

          const now = new Date('2025-06-15');
          const actions = computePendingActions(targetOrg, [event], [booking], [], [], now);

          const negotiationAction = actions.find(
            a => a.type === 'unanswered_negotiation' && a.bookingId === booking.id,
          );
          expect(negotiationAction).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes bookings with unconfirmed completions', () => {
    /** Validates: Requirements 2.3 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const event: MockEvent = {
            id: 1,
            organizerId: targetOrg,
            startTime: new Date('2025-01-01'),
            status: 'completed',
            title: 'Test Event',
            venueId: 1,
          };

          const booking: MockBooking = {
            id: 1,
            eventId: 1,
            artistId: 1,
            status: 'completed',
            finalAmount: 10000,
            meta: {
              completionFeedback: {
                confirmedBy: 'artist', // Only artist confirmed, not organizer
                rating: 5,
                confirmedAt: new Date().toISOString(),
              },
            },
          };

          const now = new Date('2025-06-15');
          const actions = computePendingActions(targetOrg, [event], [booking], [], [], now);

          const completionAction = actions.find(
            a => a.type === 'unconfirmed_completion' && a.bookingId === booking.id,
          );
          expect(completionAction).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('includes bookings with overdue payments', () => {
    /** Validates: Requirements 2.3 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (targetOrg) => {
          const event: MockEvent = {
            id: 1,
            organizerId: targetOrg,
            startTime: new Date('2026-01-01'),
            status: 'published',
            title: 'Test Event',
            venueId: 1,
          };

          const booking: MockBooking = {
            id: 1,
            eventId: 1,
            artistId: 1,
            status: 'confirmed',
            finalAmount: 10000,
            meta: {},
          };

          const payment: MockPayment = {
            id: 1,
            bookingId: 1,
            amount: 5000,
            status: 'pending',
            dueDate: new Date('2025-01-01'), // Overdue
          };

          const now = new Date('2025-06-15');
          const actions = computePendingActions(targetOrg, [event], [booking], [], [payment], now);

          const paymentAction = actions.find(
            a => a.type === 'overdue_payment' && a.bookingId === booking.id,
          );
          expect(paymentAction).toBeDefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when no pending actions exist', () => {
    /** Validates: Requirements 2.3 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (targetOrg) => {
          const now = new Date('2025-06-15');
          const actions = computePendingActions(targetOrg, [], [], [], [], now);
          expect(actions).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Activity feed ordering and limit
// Validates: Requirements 2.5
// ---------------------------------------------------------------------------

describe('Property 9: Activity feed ordering and limit', () => {
  it('returns at most N entries when limit is N', () => {
    /** Validates: Requirements 2.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 10 }),
        (userId, limit) => {
          const userIds = [userId, userId + 1, userId + 2];
          const logsArb = fc.array(mockAuditLogArb(userIds), { minLength: 0, maxLength: 50 });
          fc.assert(
            fc.property(logsArb, (logs) => {
              const uniqueLogs = logs.map((log, i) => ({ ...log, id: i + 1 }));
              const activityFeed = getActivityFeedSorted(uniqueLogs, userId, limit);

              expect(activityFeed.length).toBeLessThanOrEqual(limit);
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('for every consecutive pair, a[i].occurredAt >= a[i+1].occurredAt (newest first)', () => {
    /** Validates: Requirements 2.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 5, max: 15 }),
        (userId, limit) => {
          const userIds = [userId];
          const logsArb = fc.array(mockAuditLogArb(userIds), { minLength: 10, maxLength: 50 });
          fc.assert(
            fc.property(logsArb, (logs) => {
              const uniqueLogs = logs.map((log, i) => ({ ...log, id: i + 1 }));
              const activityFeed = getActivityFeedSorted(uniqueLogs, userId, limit);

              // Check descending order (newest first)
              for (let i = 0; i < activityFeed.length - 1; i++) {
                expect(activityFeed[i].occurredAt.getTime()).toBeGreaterThanOrEqual(
                  activityFeed[i + 1].occurredAt.getTime(),
                );
              }
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('only includes logs where who matches userId', () => {
    /** Validates: Requirements 2.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 5, max: 15 }),
        (userId, limit) => {
          const userIds = [userId, userId + 1, userId + 2, userId + 3];
          const logsArb = fc.array(mockAuditLogArb(userIds), { minLength: 10, maxLength: 50 });
          fc.assert(
            fc.property(logsArb, (logs) => {
              const uniqueLogs = logs.map((log, i) => ({ ...log, id: i + 1 }));
              const activityFeed = getActivityFeedSorted(uniqueLogs, userId, limit);

              // All returned logs must belong to the target user
              for (const log of activityFeed) {
                expect(log.who).toBe(userId);
              }
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('returns empty array when user has no activity', () => {
    /** Validates: Requirements 2.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 200 }),
        fc.integer({ min: 5, max: 15 }),
        (userId, limit) => {
          // Create logs for other users only
          const otherUserIds = [1, 2, 3, 4, 5];
          const logsArb = fc.array(mockAuditLogArb(otherUserIds), { minLength: 10, maxLength: 30 });
          fc.assert(
            fc.property(logsArb, (logs) => {
              const uniqueLogs = logs.map((log, i) => ({ ...log, id: i + 1 }));
              const activityFeed = getActivityFeedSorted(uniqueLogs, userId, limit);

              expect(activityFeed).toHaveLength(0);
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });

  it('respects limit even when more logs are available', () => {
    /** Validates: Requirements 2.5 */
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 3, max: 8 }),
        (userId, limit) => {
          // Create more logs than the limit
          const userIds = [userId];
          const logsArb = fc.array(mockAuditLogArb(userIds), {
            minLength: limit + 5,
            maxLength: limit + 20,
          });
          fc.assert(
            fc.property(logsArb, (logs) => {
              const uniqueLogs = logs.map((log, i) => ({ ...log, id: i + 1, who: userId }));
              const activityFeed = getActivityFeedSorted(uniqueLogs, userId, limit);

              expect(activityFeed.length).toBe(limit);
            }),
            { numRuns: 100 },
          );
        },
      ),
      { numRuns: 5 },
    );
  });
});
