/**
 * Pure utility functions extracted from the conversation route handler
 * for testability. These functions contain no DB or I/O dependencies.
 *
 * Used by: server/routes/conversations.ts
 * Tested by: tests/properties/conversations.prop.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape returned by storage.getBookingWithDetails() */
export interface BookingWithDetails {
  id: number;
  artistId: number | null;
  eventId: number | null;
  artist: { id: number; userId: number; name?: string } | null;
  organizer: { id: number; userId: number; name?: string } | null;
  venue: { id: number; userId: number; name?: string } | null;
  event: { id: number; organizerId?: number | null; venueId?: number | null } | null;
  [key: string]: unknown;
}

export interface ParticipantResolutionResult {
  participantIds: number[];
  artistUserId: number | null;
  subject: string;
  error?: string;
}

export interface WorkflowInitState {
  workflowKey: string;
  currentNodeKey: string;
  round: number;
  maxRounds: number;
  locked: boolean;
  context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Participant Resolution
// ---------------------------------------------------------------------------

/**
 * Resolves participant user IDs from a booking's full detail chain.
 *
 * Resolution rules:
 *   - Artist participant: booking.artist.userId
 *   - Promoter-side participant (priority order):
 *     1. booking.organizer.userId (event's organizer/promoter)
 *     2. booking.venue.userId (fallback for direct venue bookings)
 *   - Participant IDs are deduplicated via Set
 *   - Returns error if booking has no artistId
 */
export function resolveNegotiationParticipants(
  booking: BookingWithDetails,
): ParticipantResolutionResult {
  if (!booking.artistId) {
    return {
      participantIds: [],
      artistUserId: null,
      subject: 'Conversation',
      error: 'Booking has no artist',
    };
  }

  const participantIds: number[] = [];
  let artistUserId: number | null = null;

  // Resolve artist participant
  if (booking.artist?.userId) {
    participantIds.push(booking.artist.userId);
    artistUserId = booking.artist.userId;
  }

  // Resolve promoter-side participant (organizer first, venue fallback)
  if (booking.organizer?.userId) {
    participantIds.push(booking.organizer.userId);
  } else if (booking.venue?.userId) {
    participantIds.push(booking.venue.userId);
  }

  // Deduplicate
  const deduplicated = Array.from(new Set(participantIds));

  const subject = `Negotiation: ${booking.artist?.name || 'Artist'}`;

  return {
    participantIds: deduplicated,
    artistUserId,
    subject,
  };
}

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

/**
 * Determines whether a conversation open request should return an existing
 * conversation or create a new one. Pure decision function — the actual
 * DB lookup is done by the caller.
 *
 * @param existingConversation - The result of looking up (entityType, entityId, conversationType)
 * @returns true if the existing conversation should be returned as-is
 */
export function shouldReturnExisting<T>(existingConversation: T | null | undefined): existingConversation is T {
  return existingConversation != null;
}

// ---------------------------------------------------------------------------
// Workflow Initialization
// ---------------------------------------------------------------------------

/**
 * Builds the initial workflow state for a negotiation conversation.
 * Returns null for non-negotiation conversation types.
 *
 * Initial state:
 *   - currentNodeKey: "WAITING_FIRST_MOVE"
 *   - round: 0
 *   - maxRounds: 3
 *   - locked: false
 */
export function buildInitialWorkflowState(
  conversationType: string,
): WorkflowInitState | null {
  if (conversationType !== 'negotiation') return null;

  return {
    workflowKey: 'booking_negotiation_v1',
    currentNodeKey: 'WAITING_FIRST_MOVE',
    round: 0,
    maxRounds: 3,
    locked: false,
    context: {},
  };
}
