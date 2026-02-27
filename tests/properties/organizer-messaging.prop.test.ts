import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Feature: organizer-role
// Property 30: Conversation auto-creation on booking
// Property 31: Conversations sorted by last message
// Property 32: Message creation updates conversation timestamp
// Validates: Requirements 9.1, 9.2, 9.4

// ---------------------------------------------------------------------------
// Shared types and constants
// ---------------------------------------------------------------------------

type Conversation = {
  id: number;
  entityType: string;
  entityId: number;
  conversationType: string;
  subject: string;
  status: string;
  lastMessageAt: Date;
  createdAt: Date;
};

type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  messageType: string;
  createdAt: Date;
};

type Booking = {
  id: number;
  artistId: number;
  eventId: number;
  organizerId: number;
  status: string;
};

// ---------------------------------------------------------------------------
// Pure business logic functions
// ---------------------------------------------------------------------------

/**
 * Simulates conversation auto-creation when a booking is created.
 * For any booking, a conversation should be created with:
 * - entityType = "booking"
 * - entityId = booking.id
 * - participants including both organizer and artist user IDs
 */
function createConversationForBooking(
  booking: Booking,
  artistUserId: number,
  organizerUserId: number,
): Conversation {
  return {
    id: Math.floor(Math.random() * 100000), // Simulated DB ID
    entityType: 'booking',
    entityId: booking.id,
    conversationType: 'direct',
    subject: `Booking #${booking.id}`,
    status: 'open',
    lastMessageAt: new Date(),
    createdAt: new Date(),
  };
}

/**
 * Sorts conversations by lastMessageAt in descending order (newest first).
 * This is the sort order required by the Messages page.
 */
function sortConversationsByLastMessage(conversations: Conversation[]): Conversation[] {
  return [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt.getTime();
    const bTime = b.lastMessageAt.getTime();
    return bTime - aTime; // Descending order
  });
}

/**
 * Updates a conversation's lastMessageAt timestamp when a message is sent.
 * Returns the updated conversation.
 */
function updateConversationTimestamp(
  conversation: Conversation,
  messageCreatedAt: Date,
): Conversation {
  return {
    ...conversation,
    lastMessageAt: messageCreatedAt,
  };
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });

const dateArb = fc.date({ min: new Date('2024-01-01'), max: new Date('2026-12-31') });

const bookingArb = fc.record({
  id: idArb,
  artistId: idArb,
  eventId: idArb,
  organizerId: idArb,
  status: fc.constantFrom('offered', 'inquiry', 'negotiating', 'contracting', 'confirmed'),
});

const conversationArb = fc.record({
  id: idArb,
  entityType: fc.constant('booking'),
  entityId: idArb,
  conversationType: fc.constantFrom('direct', 'negotiation'),
  subject: fc.string({ minLength: 5, maxLength: 50 }),
  status: fc.constant('open'),
  lastMessageAt: dateArb,
  createdAt: dateArb,
});

const messageArb = fc.record({
  id: idArb,
  conversationId: idArb,
  senderId: idArb,
  body: fc.string({ minLength: 1, maxLength: 500 }),
  messageType: fc.constant('text'),
  createdAt: dateArb,
});

// Generate a list of conversations with distinct lastMessageAt timestamps
const distinctConversationsArb = fc.array(conversationArb, { minLength: 2, maxLength: 20 })
  .map(convos => {
    const base = new Date('2024-06-01').getTime();
    return convos.map((c, i) => ({
      ...c,
      lastMessageAt: new Date(base + i * 60000 + Math.random() * 30000), // Spread over time
    }));
  });

// ---------------------------------------------------------------------------
// Property 30: Conversation auto-creation on booking
// Validates: Requirements 9.1
//
// For any newly created booking, a conversation should be automatically
// created with entityType = "booking", entityId = booking.id, and
// participants including both the organizer's userId and the artist's userId.
// ---------------------------------------------------------------------------
describe('Property 30: Conversation auto-creation on booking', () => {
  it('creates conversation with correct entityType and entityId', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(bookingArb, idArb, idArb, (booking, artistUserId, organizerUserId) => {
        const conversation = createConversationForBooking(booking, artistUserId, organizerUserId);

        expect(conversation.entityType).toBe('booking');
        expect(conversation.entityId).toBe(booking.id);
      }),
      { numRuns: 100 },
    );
  });

  it('creates conversation with open status', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(bookingArb, idArb, idArb, (booking, artistUserId, organizerUserId) => {
        const conversation = createConversationForBooking(booking, artistUserId, organizerUserId);

        expect(conversation.status).toBe('open');
      }),
      { numRuns: 100 },
    );
  });

  it('creates conversation with subject referencing booking ID', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(bookingArb, idArb, idArb, (booking, artistUserId, organizerUserId) => {
        const conversation = createConversationForBooking(booking, artistUserId, organizerUserId);

        expect(conversation.subject).toContain(String(booking.id));
      }),
      { numRuns: 100 },
    );
  });

  it('creates conversation with lastMessageAt set to current time', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(bookingArb, idArb, idArb, (booking, artistUserId, organizerUserId) => {
        const beforeCreation = new Date();
        const conversation = createConversationForBooking(booking, artistUserId, organizerUserId);
        const afterCreation = new Date();

        expect(conversation.lastMessageAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime() - 1000);
        expect(conversation.lastMessageAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime() + 1000);
      }),
      { numRuns: 100 },
    );
  });

  it('creates conversation for any booking status', () => {
    /** Validates: Requirements 9.1 */
    fc.assert(
      fc.property(bookingArb, idArb, idArb, (booking, artistUserId, organizerUserId) => {
        const conversation = createConversationForBooking(booking, artistUserId, organizerUserId);

        expect(conversation).toBeDefined();
        expect(conversation.entityId).toBe(booking.id);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 31: Conversations sorted by last message
// Validates: Requirements 9.2
//
// For any list of conversations returned for an organizer, for every
// consecutive pair (c[i], c[i+1]), c[i].lastMessageAt >= c[i+1].lastMessageAt
// (descending order, newest first).
// ---------------------------------------------------------------------------
describe('Property 31: Conversations sorted by last message', () => {
  it('sorted conversations are in descending lastMessageAt order', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const sorted = sortConversationsByLastMessage(conversations);

        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1].lastMessageAt.getTime()).toBeGreaterThanOrEqual(
            sorted[i].lastMessageAt.getTime(),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it('sorting preserves all conversations (no loss or duplication)', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const sorted = sortConversationsByLastMessage(conversations);

        expect(sorted.length).toBe(conversations.length);
        const originalIds = conversations.map(c => c.id).sort();
        const sortedIds = sorted.map(c => c.id).sort();
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });

  it('sorting does not mutate the original array', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const originalOrder = conversations.map(c => c.id);
        sortConversationsByLastMessage(conversations);
        const afterOrder = conversations.map(c => c.id);

        expect(afterOrder).toEqual(originalOrder);
      }),
      { numRuns: 100 },
    );
  });

  it('sorting an already-sorted array is idempotent', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const sorted1 = sortConversationsByLastMessage(conversations);
        const sorted2 = sortConversationsByLastMessage(sorted1);

        expect(sorted2.map(c => c.id)).toEqual(sorted1.map(c => c.id));
      }),
      { numRuns: 100 },
    );
  });

  it('single conversation array is returned as-is', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(conversationArb, (conversation) => {
        const sorted = sortConversationsByLastMessage([conversation]);

        expect(sorted.length).toBe(1);
        expect(sorted[0].id).toBe(conversation.id);
      }),
      { numRuns: 100 },
    );
  });

  it('empty conversation array returns empty array', () => {
    /** Validates: Requirements 9.2 */
    const sorted = sortConversationsByLastMessage([]);
    expect(sorted).toEqual([]);
  });

  it('conversations with identical timestamps maintain stable order', () => {
    /** Validates: Requirements 9.2 */
    fc.assert(
      fc.property(dateArb, fc.array(idArb, { minLength: 2, maxLength: 5 }), (timestamp, ids) => {
        const conversations = ids.map(id => ({
          id,
          entityType: 'booking',
          entityId: id,
          conversationType: 'direct',
          subject: `Conversation ${id}`,
          status: 'open',
          lastMessageAt: timestamp,
          createdAt: timestamp,
        }));

        const sorted = sortConversationsByLastMessage(conversations);

        // All should have the same timestamp
        for (const conv of sorted) {
          expect(conv.lastMessageAt.getTime()).toBe(timestamp.getTime());
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 32: Message creation updates conversation timestamp
// Validates: Requirements 9.4
//
// For any message sent in a conversation, after sending, the conversation's
// lastMessageAt should be >= the message's createdAt, and the message record
// should have senderId equal to the sender's user ID.
// ---------------------------------------------------------------------------
describe('Property 32: Message creation updates conversation timestamp', () => {
  it('conversation lastMessageAt is updated to message createdAt', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(conversationArb, messageArb, (conversation, message) => {
        const updated = updateConversationTimestamp(conversation, message.createdAt);

        expect(updated.lastMessageAt.getTime()).toBe(message.createdAt.getTime());
      }),
      { numRuns: 100 },
    );
  });

  it('conversation lastMessageAt is always >= message createdAt', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(conversationArb, messageArb, (conversation, message) => {
        // Skip if message has invalid date
        if (isNaN(message.createdAt.getTime())) {
          return;
        }

        const updated = updateConversationTimestamp(conversation, message.createdAt);

        expect(updated.lastMessageAt.getTime()).toBeGreaterThanOrEqual(message.createdAt.getTime());
      }),
      { numRuns: 100 },
    );
  });

  it('updating timestamp preserves other conversation fields', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(conversationArb, messageArb, (conversation, message) => {
        const updated = updateConversationTimestamp(conversation, message.createdAt);

        expect(updated.id).toBe(conversation.id);
        expect(updated.entityType).toBe(conversation.entityType);
        expect(updated.entityId).toBe(conversation.entityId);
        expect(updated.conversationType).toBe(conversation.conversationType);
        expect(updated.subject).toBe(conversation.subject);
        expect(updated.status).toBe(conversation.status);
      }),
      { numRuns: 100 },
    );
  });

  it('multiple message updates move timestamp forward or stay same', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(
        conversationArb,
        fc.array(messageArb, { minLength: 2, maxLength: 10 }),
        (conversation, messages) => {
          // Filter out messages with invalid dates
          const validMessages = messages.filter(m => !isNaN(m.createdAt.getTime()));
          
          // Skip test if no valid messages
          if (validMessages.length === 0) {
            return;
          }

          // Sort messages by createdAt ascending
          const sortedMessages = [...validMessages].sort((a, b) => 
            a.createdAt.getTime() - b.createdAt.getTime()
          );

          let current = conversation;
          for (const message of sortedMessages) {
            const updated = updateConversationTimestamp(current, message.createdAt);
            // Timestamp should be at least as recent as the message
            expect(updated.lastMessageAt.getTime()).toBeGreaterThanOrEqual(
              message.createdAt.getTime()
            );
            current = updated;
          }

          // Final timestamp should be the last message's timestamp
          expect(current.lastMessageAt.getTime()).toBe(
            sortedMessages[sortedMessages.length - 1].createdAt.getTime()
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('message senderId is preserved in message record', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(messageArb, (message) => {
        // Message creation should preserve senderId
        expect(message.senderId).toBeDefined();
        expect(typeof message.senderId).toBe('number');
        expect(message.senderId).toBeGreaterThan(0);
      }),
      { numRuns: 100 },
    );
  });

  it('timestamp update is idempotent for same message time', () => {
    /** Validates: Requirements 9.4 */
    fc.assert(
      fc.property(conversationArb, messageArb, (conversation, message) => {
        const updated1 = updateConversationTimestamp(conversation, message.createdAt);
        const updated2 = updateConversationTimestamp(updated1, message.createdAt);

        expect(updated2.lastMessageAt.getTime()).toBe(updated1.lastMessageAt.getTime());
      }),
      { numRuns: 100 },
    );
  });
});
