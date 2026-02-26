/**
 * Pure utility functions extracted from the workflow engine
 * for testability. These functions contain no DB or I/O dependencies.
 *
 * Used by: server/services/workflow.ts
 * Tested by: tests/properties/workflow.prop.ts
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowInstance {
  currentNodeKey: string;
  awaitingUserId: number | null;
  round: number;
  maxRounds: number;
  locked: boolean;
  context: Record<string, unknown>;
}

export interface WorkflowAction {
  userId: number;
  actionKey: 'PROPOSE_CHANGE' | 'ACCEPT' | 'DECLINE';
  payload?: { offerAmount?: number; [key: string]: unknown };
}

export interface WorkflowParticipant {
  userId: number;
}

export interface WorkflowTransitionResult {
  nextNodeKey: string;
  nextAwaitingUserId: number | null;
  newRound: number;
  shouldLock: boolean;
  bookingStatusUpdate: string | null;
  bookingOfferAmountUpdate: number | null;
  message: {
    senderId: number;
    messageType: 'action';
    actionKey: string;
    payload: Record<string, unknown>;
    round: number;
    workflowNodeKey: string;
  };
  systemMessage: {
    senderId: null;
    messageType: 'system';
    body: string;
    workflowNodeKey: string;
  } | null;
  error?: undefined;
}

export interface WorkflowError {
  error: string;
}

export type WorkflowActionResult = WorkflowTransitionResult | WorkflowError;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const VALID_ACTIONS = ['ACCEPT', 'DECLINE', 'PROPOSE_CHANGE'] as const;
const TERMINAL_STATES = ['ACCEPTED', 'DECLINED'] as const;

/**
 * Validates that the given user is the one whose turn it is.
 * Returns an error string if validation fails, null if valid.
 */
export function validateTurn(
  instance: WorkflowInstance,
  userId: number,
): string | null {
  if (instance.awaitingUserId !== userId) {
    return `Not your turn. Awaiting user ${instance.awaitingUserId}`;
  }
  return null;
}

/**
 * Checks if a workflow instance is locked (terminal state).
 * Returns an error string if locked, null if not.
 */
export function validateNotLocked(instance: WorkflowInstance): string | null {
  if (instance.locked) {
    return 'Workflow is locked';
  }
  return null;
}

/**
 * Checks if the action is valid.
 */
export function validateAction(actionKey: string): string | null {
  if (!VALID_ACTIONS.includes(actionKey as any)) {
    return 'Invalid action';
  }
  return null;
}

/**
 * Checks if PROPOSE_CHANGE is allowed given the current round and max rounds.
 * Returns an error string if max rounds reached, null if allowed.
 */
export function validateMaxRounds(instance: WorkflowInstance): string | null {
  const maxRounds = instance.maxRounds ?? 3;
  if (instance.round >= maxRounds) {
    return 'Max rounds reached. Must Accept or Decline.';
  }
  return null;
}

// ---------------------------------------------------------------------------
// State Transitions
// ---------------------------------------------------------------------------

/**
 * Computes the full workflow state transition for a given action.
 * Pure function — no DB or I/O.
 *
 * @param instance - Current workflow instance state
 * @param action - The action being performed
 * @param otherParticipantUserId - The other participant's userId (for turn swapping)
 * @returns The transition result or an error
 */
export function computeWorkflowTransition(
  instance: WorkflowInstance,
  action: WorkflowAction,
  otherParticipantUserId: number,
): WorkflowActionResult {
  // 1. Check locked
  const lockedError = validateNotLocked(instance);
  if (lockedError) return { error: lockedError };

  // 2. Validate turn
  const turnError = validateTurn(instance, action.userId);
  if (turnError) return { error: turnError };

  // 3. Validate action key
  const actionError = validateAction(action.actionKey);
  if (actionError) return { error: actionError };

  // 4. Process action
  switch (action.actionKey) {
    case 'PROPOSE_CHANGE': {
      const maxRoundsError = validateMaxRounds(instance);
      if (maxRoundsError) return { error: maxRoundsError };

      const newRound = instance.round + 1;
      const offerAmount = action.payload?.offerAmount ?? null;

      return {
        nextNodeKey: instance.currentNodeKey === 'AWAITING_ARTIST'
          ? 'AWAITING_ORGANIZER'
          : 'AWAITING_ARTIST',
        nextAwaitingUserId: otherParticipantUserId,
        newRound,
        shouldLock: false,
        bookingStatusUpdate: null,
        bookingOfferAmountUpdate: offerAmount,
        message: {
          senderId: action.userId,
          messageType: 'action',
          actionKey: action.actionKey,
          payload: { ...action.payload, proposalId: null },
          round: instance.round,
          workflowNodeKey: instance.currentNodeKey,
        },
        systemMessage: null,
      };
    }

    case 'ACCEPT': {
      return {
        nextNodeKey: 'ACCEPTED',
        nextAwaitingUserId: null,
        newRound: instance.round,
        shouldLock: true,
        bookingStatusUpdate: 'contracting',
        bookingOfferAmountUpdate: null,
        message: {
          senderId: action.userId,
          messageType: 'action',
          actionKey: action.actionKey,
          payload: { ...action.payload, proposalId: null },
          round: instance.round,
          workflowNodeKey: instance.currentNodeKey,
        },
        systemMessage: {
          senderId: null,
          messageType: 'system',
          body: 'Negotiation accepted.',
          workflowNodeKey: 'ACCEPTED',
        },
      };
    }

    case 'DECLINE': {
      return {
        nextNodeKey: 'DECLINED',
        nextAwaitingUserId: null,
        newRound: instance.round,
        shouldLock: true,
        bookingStatusUpdate: 'cancelled',
        bookingOfferAmountUpdate: null,
        message: {
          senderId: action.userId,
          messageType: 'action',
          actionKey: action.actionKey,
          payload: { ...action.payload, proposalId: null },
          round: instance.round,
          workflowNodeKey: instance.currentNodeKey,
        },
        systemMessage: {
          senderId: null,
          messageType: 'system',
          body: 'Negotiation declined.',
          workflowNodeKey: 'DECLINED',
        },
      };
    }

    default:
      return { error: 'Invalid action' };
  }
}
