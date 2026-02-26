/**
 * Pure utility functions for message system logic, extracted from
 * server/routes/conversations.ts for testability.
 *
 * These functions contain no DB or I/O dependencies.
 *
 * Used by: server/routes/conversations.ts
 * Tested by: tests/properties/messages.prop.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Message {
  id: number;
  conversationId: number;
  senderId: number | null;
  body: string | null;
  messageType: string;
  payload: Record<string, unknown>;
  actionKey: string | null;
  round: number | null;
  createdAt: Date;
  [key: string]: unknown;
}

export interface Conversation {
  id: number;
  conversationType: string;
  status: string;
  [key: string]: unknown;
}

export interface SystemMessageInput {
  conversationId: number;
  body: string;
}

// ---------------------------------------------------------------------------
// Message Sorting
// ---------------------------------------------------------------------------

/**
 * Sorts messages in chronological order (oldest first) by createdAt.
 * This mirrors the route handler logic: messages are fetched DESC then
 * reversed before returning.
 *
 * @param msgs - Array of messages (may be in any order)
 * @returns New array sorted by createdAt ascending (oldest first)
 */
export function sortMessagesChronologically<T extends { createdAt: Date }>(msgs: T[]): T[] {
  return [...msgs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

// ---------------------------------------------------------------------------
// Participant Access Check
// ---------------------------------------------------------------------------

/**
 * Checks whether a user is a participant in a conversation.
 * Returns true if the userId appears in the participantUserIds set.
 *
 * @param userId - The user requesting access
 * @param participantUserIds - Set of user IDs who are participants
 * @returns true if the user is a participant
 */
export function isParticipant(userId: number, participantUserIds: number[]): boolean {
  return participantUserIds.includes(userId);
}

// ---------------------------------------------------------------------------
// Free-Text Rejection Check
// ---------------------------------------------------------------------------

/**
 * Determines whether a free-text message should be rejected for a
 * given conversation. Negotiation conversations are action-only.
 *
 * @param conversationType - The conversation's type (e.g. "negotiation", "direct")
 * @returns An error message string if rejected, or null if allowed
 */
export function checkFreeTextAllowed(conversationType: string): string | null {
  if (conversationType === 'negotiation') {
    return 'Free text not allowed in this mode. Use actions.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// System Message Builder
// ---------------------------------------------------------------------------

/**
 * Builds a system message object with senderId set to null and
 * messageType set to "system". Used for negotiation state changes,
 * contract events, and other platform-generated notifications.
 *
 * @param input - The conversation ID and message body
 * @returns A message-insert-ready object with system properties
 */
export function buildSystemMessage(input: SystemMessageInput): {
  conversationId: number;
  senderId: null;
  body: string;
  messageType: 'system';
} {
  return {
    conversationId: input.conversationId,
    senderId: null,
    body: input.body,
    messageType: 'system',
  };
}
