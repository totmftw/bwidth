import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  sortMessagesChronologically,
  isParticipant,
  checkFreeTextAllowed,
  buildSystemMessage,
} from '../../server/message-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });

/** Generates a Date within a reasonable range */
const dateArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') });

/** Generates a minimal message-like object with an id and createdAt */
const messageArb = fc.record({
  id: idArb,
  conversationId: idArb,
  senderId: fc.oneof(idArb, fc.constant(null as number | null)),
  body: fc.oneof(fc.string({ minLength: 1, maxLength: 200 }), fc.constant(null as string | null)),
  messageType: fc.constantFrom('text', 'action', 'system'),
  payload: fc.constant({} as Record<string, unknown>),
  actionKey: fc.oneof(fc.constantFrom('ACCEPT', 'DECLINE', 'PROPOSE_CHANGE'), fc.constant(null as string | null)),
  round: fc.oneof(fc.integer({ min: 0, max: 10 }), fc.constant(null as number | null)),
  createdAt: dateArb,
});

/** Generates a list of messages with distinct createdAt timestamps */
const distinctMessagesArb = fc.array(messageArb, { minLength: 2, maxLength: 50 })
  .map(msgs => {
    // Ensure distinct createdAt by offsetting each by index milliseconds
    const base = new Date('2024-06-01').getTime();
    return msgs.map((m, i) => ({ ...m, createdAt: new Date(base + i * 1000 + Math.random() * 500) }));
  });

/** Generates a non-empty list of participant user IDs */
const participantIdsArb = fc.array(idArb, { minLength: 1, maxLength: 10 })
  .map(ids => [...new Set(ids)]);

/** Conversation type arbitrary */
const conversationTypeArb = fc.constantFrom('negotiation', 'direct', 'support', 'contract');

// ---------------------------------------------------------------------------
// Property 18: Messages returned in chronological order
// Validates: Requirements 6.1
//
// For any conversation, the messages endpoint should return messages sorted
// by createdAt in ascending order (oldest first).
// ---------------------------------------------------------------------------
describe('Property 18: Messages returned in chronological order', () => {
  it('sorted messages are in ascending createdAt order', () => {
    /** Validates: Requirements 6.1 */
    fc.assert(
      fc.property(distinctMessagesArb, (msgs) => {
        const sorted = sortMessagesChronologically(msgs);

        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].createdAt.getTime()).toBeGreaterThanOrEqual(
            sorted[i - 1].createdAt.getTime(),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('sorting preserves all original messages (no loss or duplication)', () => {
    /** Validates: Requirements 6.1 */
    fc.assert(
      fc.property(distinctMessagesArb, (msgs) => {
        const sorted = sortMessagesChronologically(msgs);

        expect(sorted.length).toBe(msgs.length);
        // Every original message ID should appear in sorted output
        const originalIds = msgs.map(m => m.id);
        const sortedIds = sorted.map(m => m.id);
        expect(sortedIds.sort()).toEqual(originalIds.sort());
      }),
      { numRuns: 100 },
    );
  });

  it('sorting does not mutate the original array', () => {
    /** Validates: Requirements 6.1 */
    fc.assert(
      fc.property(distinctMessagesArb, (msgs) => {
        const originalOrder = msgs.map(m => m.id);
        sortMessagesChronologically(msgs);
        const afterOrder = msgs.map(m => m.id);

        expect(afterOrder).toEqual(originalOrder);
      }),
      { numRuns: 100 },
    );
  });

  it('sorting an already-sorted array is idempotent', () => {
    /** Validates: Requirements 6.1 */
    fc.assert(
      fc.property(distinctMessagesArb, (msgs) => {
        const sorted1 = sortMessagesChronologically(msgs);
        const sorted2 = sortMessagesChronologically(sorted1);

        expect(sorted2.map(m => m.id)).toEqual(sorted1.map(m => m.id));
      }),
      { numRuns: 100 },
    );
  });

  it('single message array is returned as-is', () => {
    /** Validates: Requirements 6.1 */
    fc.assert(
      fc.property(messageArb, (msg) => {
        const sorted = sortMessagesChronologically([msg]);
        expect(sorted.length).toBe(1);
        expect(sorted[0].id).toBe(msg.id);
      }),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 19: Non-participants cannot access messages
// Validates: Requirements 6.2
//
// For any user who is not a participant in a conversation, requesting
// messages for that conversation should return a 403 error.
// ---------------------------------------------------------------------------
describe('Property 19: Non-participants cannot access messages', () => {
  it('participant user returns true from isParticipant', () => {
    /** Validates: Requirements 6.2 */
    fc.assert(
      fc.property(participantIdsArb, (participantIds) => {
        // Pick any participant from the list
        for (const uid of participantIds) {
          expect(isParticipant(uid, participantIds)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('non-participant user returns false from isParticipant', () => {
    /** Validates: Requirements 6.2 */
    fc.assert(
      fc.property(
        participantIdsArb,
        idArb,
        (participantIds, outsiderId) => {
          // Only test when outsiderId is genuinely not in the list
          fc.pre(!participantIds.includes(outsiderId));
          expect(isParticipant(outsiderId, participantIds)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('empty participant list rejects all users', () => {
    /** Validates: Requirements 6.2 */
    fc.assert(
      fc.property(idArb, (userId) => {
        expect(isParticipant(userId, [])).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('isParticipant is consistent across repeated calls', () => {
    /** Validates: Requirements 6.2 */
    fc.assert(
      fc.property(
        participantIdsArb,
        idArb,
        (participantIds, userId) => {
          const result1 = isParticipant(userId, participantIds);
          const result2 = isParticipant(userId, participantIds);
          expect(result1).toBe(result2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 20: Negotiation conversations reject free-text messages
// Validates: Requirements 6.3
//
// For any conversation with conversationType === "negotiation", posting a
// free-text message should return a 400 error with the message
// "Free text not allowed in this mode. Use actions."
// ---------------------------------------------------------------------------
describe('Property 20: Negotiation conversations reject free-text messages', () => {
  it('negotiation type always returns rejection message', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (convType) => {
        const error = checkFreeTextAllowed(convType);
        expect(error).toBe('Free text not allowed in this mode. Use actions.');
      }),
      { numRuns: 100 },
    );
  });

  it('non-negotiation types allow free text (return null)', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        fc.constantFrom('direct', 'support', 'contract', 'general'),
        (convType) => {
          const error = checkFreeTextAllowed(convType);
          expect(error).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('arbitrary non-negotiation strings allow free text', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => s !== 'negotiation'),
        (convType) => {
          const error = checkFreeTextAllowed(convType);
          expect(error).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejection message matches the exact expected string', () => {
    /** Validates: Requirements 6.3 */
    fc.assert(
      fc.property(fc.constant('negotiation'), (_) => {
        const error = checkFreeTextAllowed('negotiation');
        expect(error).not.toBeNull();
        expect(error).toContain('Free text not allowed');
        expect(error).toContain('Use actions');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 21: System messages have null sender and system type
// Validates: Requirements 6.4
//
// For any system event (negotiation accepted, declined, contract state
// change), the inserted message should have senderId set to null and
// messageType set to "system".
// ---------------------------------------------------------------------------
describe('Property 21: System messages have null sender and system type', () => {
  it('system message always has senderId === null', () => {
    /** Validates: Requirements 6.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (conversationId, body) => {
          const msg = buildSystemMessage({ conversationId, body });
          expect(msg.senderId).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('system message always has messageType === "system"', () => {
    /** Validates: Requirements 6.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (conversationId, body) => {
          const msg = buildSystemMessage({ conversationId, body });
          expect(msg.messageType).toBe('system');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('system message preserves the conversation ID from input', () => {
    /** Validates: Requirements 6.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (conversationId, body) => {
          const msg = buildSystemMessage({ conversationId, body });
          expect(msg.conversationId).toBe(conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('system message preserves the body text from input', () => {
    /** Validates: Requirements 6.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.string({ minLength: 1, maxLength: 200 }),
        (conversationId, body) => {
          const msg = buildSystemMessage({ conversationId, body });
          expect(msg.body).toBe(body);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('system message for various event types always has correct shape', () => {
    /** Validates: Requirements 6.4 */
    fc.assert(
      fc.property(
        idArb,
        fc.constantFrom(
          'Negotiation accepted',
          'Negotiation declined',
          'Contract signed by both parties',
          'Contract voided — deadline expired',
          'Edit request approved',
          'Edit request rejected',
        ),
        (conversationId, eventBody) => {
          const msg = buildSystemMessage({ conversationId, body: eventBody });
          expect(msg.senderId).toBeNull();
          expect(msg.messageType).toBe('system');
          expect(msg.body).toBe(eventBody);
          expect(msg.conversationId).toBe(conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
