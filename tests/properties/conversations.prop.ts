import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveNegotiationParticipants,
  shouldReturnExisting,
  buildInitialWorkflowState,
  type BookingWithDetails,
} from '../../server/conversation-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a positive integer suitable for user/entity IDs */
const idArb = fc.integer({ min: 1, max: 100000 });

/** Generates a booking with full detail chain (artist + organizer + venue) */
const bookingWithOrganizerArb: fc.Arbitrary<BookingWithDetails> = fc.record({
  artistUserId: idArb,
  organizerUserId: idArb,
  venueUserId: idArb,
  artistId: idArb,
  artistName: fc.string({ minLength: 1, maxLength: 30 }),
  organizerId: idArb,
  venueId: idArb,
  eventId: idArb,
  bookingId: idArb,
}).map(({ artistUserId, organizerUserId, venueUserId, artistId, artistName, organizerId, venueId, eventId, bookingId }) => ({
  id: bookingId,
  artistId,
  eventId,
  artist: { id: artistId, userId: artistUserId, name: artistName },
  organizer: { id: organizerId, userId: organizerUserId },
  venue: { id: venueId, userId: venueUserId },
  event: { id: eventId, organizerId, venueId },
}));

/** Generates a booking where the event has no organizer (venue-direct booking) */
const bookingWithoutOrganizerArb: fc.Arbitrary<BookingWithDetails> = fc.record({
  artistUserId: idArb,
  venueUserId: idArb,
  artistId: idArb,
  artistName: fc.string({ minLength: 1, maxLength: 30 }),
  venueId: idArb,
  eventId: idArb,
  bookingId: idArb,
}).map(({ artistUserId, venueUserId, artistId, artistName, venueId, eventId, bookingId }) => ({
  id: bookingId,
  artistId,
  eventId,
  artist: { id: artistId, userId: artistUserId, name: artistName },
  organizer: null,
  venue: { id: venueId, userId: venueUserId },
  event: { id: eventId, organizerId: null, venueId },
}));

/** Generates a booking with no artist (error case) */
const bookingWithoutArtistArb: fc.Arbitrary<BookingWithDetails> = fc.record({
  organizerUserId: idArb,
  venueUserId: idArb,
  organizerId: idArb,
  venueId: idArb,
  eventId: idArb,
  bookingId: idArb,
}).map(({ organizerUserId, venueUserId, organizerId, venueId, eventId, bookingId }) => ({
  id: bookingId,
  artistId: null,
  eventId,
  artist: null,
  organizer: { id: organizerId, userId: organizerUserId },
  venue: { id: venueId, userId: venueUserId },
  event: { id: eventId, organizerId, venueId },
}));

// ---------------------------------------------------------------------------
// Property 8: Conversation opening resolves correct participants
// Validates: Requirements 4.1, 4.6
//
// For any booking with an artist and an event with an organizer, opening a
// negotiation conversation should create a conversation with both the
// artist's userId and the organizer's userId as participants, with no
// duplicates.
// ---------------------------------------------------------------------------
describe('Property 8: Conversation opening resolves correct participants', () => {
  it('includes both artist and organizer userIds when organizer exists', () => {
    /** Validates: Requirements 4.1 */
    fc.assert(
      fc.property(bookingWithOrganizerArb, (booking) => {
        const result = resolveNegotiationParticipants(booking);

        expect(result.error).toBeUndefined();
        expect(result.participantIds).toContain(booking.artist!.userId);
        expect(result.participantIds).toContain(booking.organizer!.userId);
      }),
      { numRuns: 100 },
    );
  });

  it('falls back to venue userId when no organizer exists', () => {
    /** Validates: Requirements 4.1 */
    fc.assert(
      fc.property(bookingWithoutOrganizerArb, (booking) => {
        const result = resolveNegotiationParticipants(booking);

        expect(result.error).toBeUndefined();
        expect(result.participantIds).toContain(booking.artist!.userId);
        expect(result.participantIds).toContain(booking.venue!.userId);
      }),
      { numRuns: 100 },
    );
  });

  it('participant list has no duplicates even when artist and organizer are the same user', () => {
    /** Validates: Requirements 4.6 */
    fc.assert(
      fc.property(idArb, idArb, fc.string({ minLength: 1, maxLength: 20 }), (sharedUserId, entityId, name) => {
        const booking: BookingWithDetails = {
          id: entityId,
          artistId: entityId,
          eventId: entityId,
          artist: { id: entityId, userId: sharedUserId, name },
          organizer: { id: entityId, userId: sharedUserId },
          venue: { id: entityId, userId: entityId + 1 },
          event: { id: entityId, organizerId: entityId, venueId: entityId },
        };

        const result = resolveNegotiationParticipants(booking);
        const uniqueIds = new Set(result.participantIds);

        expect(result.participantIds.length).toBe(uniqueIds.size);
      }),
      { numRuns: 100 },
    );
  });

  it('returns error when booking has no artistId', () => {
    /** Validates: Requirements 4.1 */
    fc.assert(
      fc.property(bookingWithoutArtistArb, (booking) => {
        const result = resolveNegotiationParticipants(booking);

        expect(result.error).toBe('Booking has no artist');
        expect(result.participantIds).toEqual([]);
        expect(result.artistUserId).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('artistUserId is set to the artist user ID from the booking', () => {
    /** Validates: Requirements 4.1 */
    fc.assert(
      fc.property(
        fc.oneof(bookingWithOrganizerArb, bookingWithoutOrganizerArb),
        (booking) => {
          const result = resolveNegotiationParticipants(booking);

          expect(result.artistUserId).toBe(booking.artist!.userId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('subject includes artist name when available', () => {
    /** Validates: Requirements 4.1 */
    fc.assert(
      fc.property(bookingWithOrganizerArb, (booking) => {
        const result = resolveNegotiationParticipants(booking);

        expect(result.subject).toContain(booking.artist!.name!);
        expect(result.subject).toMatch(/^Negotiation: /);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 9: Conversation opening is idempotent
// Validates: Requirements 4.3
//
// For any booking, calling the conversation open endpoint multiple times
// with the same entity type, entity ID, and conversation type should
// return the same conversation without creating duplicates.
// ---------------------------------------------------------------------------
describe('Property 9: Conversation opening is idempotent', () => {
  it('shouldReturnExisting returns true for any non-null conversation', () => {
    /** Validates: Requirements 4.3 */
    fc.assert(
      fc.property(
        fc.record({
          id: idArb,
          entityType: fc.constant('booking'),
          entityId: idArb,
          conversationType: fc.constantFrom('negotiation', 'direct'),
          status: fc.constant('open'),
        }),
        (existingConvo) => {
          expect(shouldReturnExisting(existingConvo)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('shouldReturnExisting returns false for null/undefined', () => {
    /** Validates: Requirements 4.3 */
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), fc.constant(undefined)),
        (noConvo) => {
          expect(shouldReturnExisting(noConvo)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('resolving participants multiple times for the same booking yields identical results', () => {
    /** Validates: Requirements 4.3 */
    fc.assert(
      fc.property(
        fc.oneof(bookingWithOrganizerArb, bookingWithoutOrganizerArb),
        (booking) => {
          const result1 = resolveNegotiationParticipants(booking);
          const result2 = resolveNegotiationParticipants(booking);

          expect(result1.participantIds).toEqual(result2.participantIds);
          expect(result1.artistUserId).toBe(result2.artistUserId);
          expect(result1.subject).toBe(result2.subject);
          expect(result1.error).toBe(result2.error);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('workflow state initialization is deterministic for the same conversation type', () => {
    /** Validates: Requirements 4.3 */
    fc.assert(
      fc.property(
        fc.constantFrom('negotiation', 'direct', 'support'),
        (conversationType) => {
          const state1 = buildInitialWorkflowState(conversationType);
          const state2 = buildInitialWorkflowState(conversationType);

          expect(state1).toEqual(state2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10: New negotiation conversations have correct initial workflow state
// Validates: Requirements 4.4, 4.6
//
// For any newly created negotiation conversation, the associated workflow
// instance should have currentNodeKey set to an initial state, round set
// to 0, and locked set to false.
// ---------------------------------------------------------------------------
describe('Property 10: New negotiation conversations have correct initial workflow state', () => {
  it('negotiation type produces a workflow state with correct initial values', () => {
    /** Validates: Requirements 4.4 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (conversationType) => {
        const state = buildInitialWorkflowState(conversationType);

        expect(state).not.toBeNull();
        expect(state!.currentNodeKey).toBe('WAITING_FIRST_MOVE');
        expect(state!.round).toBe(0);
        expect(state!.locked).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('negotiation workflow has maxRounds set to 3', () => {
    /** Validates: Requirements 4.4 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (conversationType) => {
        const state = buildInitialWorkflowState(conversationType);

        expect(state!.maxRounds).toBe(3);
      }),
      { numRuns: 100 },
    );
  });

  it('non-negotiation conversation types produce null workflow state', () => {
    /** Validates: Requirements 4.4 */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(s => s !== 'negotiation'),
        (conversationType) => {
          const state = buildInitialWorkflowState(conversationType);

          expect(state).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('workflow context is an empty object initially', () => {
    /** Validates: Requirements 4.4 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (conversationType) => {
        const state = buildInitialWorkflowState(conversationType);

        expect(state!.context).toEqual({});
      }),
      { numRuns: 100 },
    );
  });

  it('workflow key is booking_negotiation_v1 for negotiation conversations', () => {
    /** Validates: Requirements 4.4 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (conversationType) => {
        const state = buildInitialWorkflowState(conversationType);

        expect(state!.workflowKey).toBe('booking_negotiation_v1');
      }),
      { numRuns: 100 },
    );
  });
});
