import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateTurn,
  validateNotLocked,
  validateMaxRounds,
  computeWorkflowTransition,
  type WorkflowInstance,
  type WorkflowAction,
} from '../../server/workflow-utils';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const idArb = fc.integer({ min: 1, max: 100000 });

/** Two distinct user IDs representing the two negotiation participants */
const twoParticipantsArb = fc.tuple(idArb, idArb).filter(([a, b]) => a !== b);

/** A valid non-terminal workflow instance where it's user A's turn */
const activeInstanceArb = (awaitingUserId: number): fc.Arbitrary<WorkflowInstance> =>
  fc.record({
    currentNodeKey: fc.constantFrom('NEGOTIATING', 'AWAITING_ARTIST', 'AWAITING_ORGANIZER'),
    awaitingUserId: fc.constant(awaitingUserId),
    round: fc.integer({ min: 0, max: 2 }),
    maxRounds: fc.constant(3),
    locked: fc.constant(false),
    context: fc.constant({}),
  });

/** A workflow instance that has NOT reached max rounds */
const underMaxRoundsInstanceArb = (awaitingUserId: number): fc.Arbitrary<WorkflowInstance> =>
  fc.record({
    currentNodeKey: fc.constantFrom('NEGOTIATING', 'AWAITING_ARTIST', 'AWAITING_ORGANIZER'),
    awaitingUserId: fc.constant(awaitingUserId),
    round: fc.integer({ min: 0, max: 2 }),
    maxRounds: fc.integer({ min: 3, max: 10 }),
    locked: fc.constant(false),
    context: fc.constant({}),
  }).filter(inst => inst.round < inst.maxRounds);

/** A workflow instance that HAS reached max rounds */
const atMaxRoundsInstanceArb = (awaitingUserId: number): fc.Arbitrary<WorkflowInstance> =>
  fc.integer({ min: 1, max: 10 }).map(maxRounds => ({
    currentNodeKey: 'AWAITING_ARTIST' as const,
    awaitingUserId,
    round: maxRounds,
    maxRounds,
    locked: false,
    context: {},
  }));

/** A locked workflow instance */
const lockedInstanceArb: fc.Arbitrary<WorkflowInstance> = fc.record({
  currentNodeKey: fc.constantFrom('ACCEPTED', 'DECLINED'),
  awaitingUserId: fc.oneof(idArb, fc.constant(null as number | null)),
  round: fc.integer({ min: 0, max: 10 }),
  maxRounds: fc.integer({ min: 1, max: 10 }),
  locked: fc.constant(true),
  context: fc.constant({}),
});

const actionKeyArb = fc.constantFrom('PROPOSE_CHANGE', 'ACCEPT', 'DECLINE') as fc.Arbitrary<'PROPOSE_CHANGE' | 'ACCEPT' | 'DECLINE'>;

const offerAmountArb = fc.double({ min: 100, max: 1000000, noNaN: true, noDefaultInfinity: true });


// ---------------------------------------------------------------------------
// Property 11: Workflow turn-taking enforcement
// Validates: Requirements 5.1
//
// For any workflow instance, only the user whose ID matches awaitingUserId
// can perform an action. All other users are rejected.
// ---------------------------------------------------------------------------
describe('Property 11: Workflow turn-taking enforcement', () => {
  it('action by awaiting user succeeds (no turn error)', () => {
    /** Validates: Requirements 5.1 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, _userB]) => {
          const instance = activeInstanceArb(userA);
          return fc.assert(
            fc.property(instance, (inst) => {
              const turnError = validateTurn(inst, userA);
              expect(turnError).toBeNull();
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('action by non-awaiting user is rejected', () => {
    /** Validates: Requirements 5.1 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instance = activeInstanceArb(userA);
          return fc.assert(
            fc.property(instance, (inst) => {
              const turnError = validateTurn(inst, userB);
              expect(turnError).not.toBeNull();
              expect(turnError).toContain('Not your turn');
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('computeWorkflowTransition rejects wrong-turn user', () => {
    /** Validates: Requirements 5.1 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userB, actionKey };
          const result = computeWorkflowTransition(inst, action, userA);
          expect('error' in result).toBe(true);
          if ('error' in result) {
            expect(result.error).toContain('Not your turn');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 12: PROPOSE_CHANGE increments round and swaps turn
// Validates: Requirements 5.2
//
// For any active workflow instance below max rounds, a PROPOSE_CHANGE action
// by the awaiting user increments the round by 1 and swaps awaitingUserId
// to the other participant.
// ---------------------------------------------------------------------------
describe('Property 12: PROPOSE_CHANGE increments round and swaps turn', () => {
  it('round increments by exactly 1', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = underMaxRoundsInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
              if (!('error' in result)) {
                expect(result.newRound).toBe(inst.round + 1);
              }
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('awaitingUserId swaps to the other participant', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = underMaxRoundsInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
              if (!('error' in result)) {
                expect(result.nextAwaitingUserId).toBe(userB);
              }
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('workflow does not lock after PROPOSE_CHANGE', () => {
    /** Validates: Requirements 5.2 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(false);
          if (!('error' in result)) {
            expect(result.shouldLock).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 13: Max rounds enforcement
// Validates: Requirements 5.3
//
// When round >= maxRounds, PROPOSE_CHANGE is rejected but ACCEPT and
// DECLINE are still allowed.
// ---------------------------------------------------------------------------
describe('Property 13: Max rounds enforcement', () => {
  it('PROPOSE_CHANGE is rejected when round >= maxRounds', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = atMaxRoundsInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(true);
              if ('error' in result) {
                expect(result.error).toContain('Max rounds reached');
              }
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ACCEPT is allowed when round >= maxRounds', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = atMaxRoundsInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'ACCEPT' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('DECLINE is allowed when round >= maxRounds', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = atMaxRoundsInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'DECLINE' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('max rounds check uses instance.maxRounds not a hardcoded value', () => {
    /** Validates: Requirements 5.3 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        fc.integer({ min: 1, max: 10 }),
        ([userA, userB], maxRounds) => {
          // Instance at exactly maxRounds
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: maxRounds,
            maxRounds,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(true);

          // Instance one below maxRounds — should succeed
          const instBelow: WorkflowInstance = { ...inst, round: maxRounds - 1 };
          const resultBelow = computeWorkflowTransition(instBelow, action, userB);
          expect('error' in resultBelow).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Terminal negotiation actions update booking status correctly
// Validates: Requirements 5.4, 5.5
//
// ACCEPT sets booking status to "contracting" and node to "ACCEPTED".
// DECLINE sets booking status to "cancelled" and node to "DECLINED".
// ---------------------------------------------------------------------------
describe('Property 14: Terminal negotiation actions update booking status correctly', () => {
  it('ACCEPT sets bookingStatusUpdate to "contracting" and nextNodeKey to "ACCEPTED"', () => {
    /** Validates: Requirements 5.4 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = activeInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'ACCEPT' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
              if (!('error' in result)) {
                expect(result.bookingStatusUpdate).toBe('contracting');
                expect(result.nextNodeKey).toBe('ACCEPTED');
                expect(result.shouldLock).toBe(true);
                expect(result.nextAwaitingUserId).toBeNull();
              }
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('DECLINE sets bookingStatusUpdate to "cancelled" and nextNodeKey to "DECLINED"', () => {
    /** Validates: Requirements 5.5 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const instArb = activeInstanceArb(userA);
          return fc.assert(
            fc.property(instArb, (inst) => {
              const action: WorkflowAction = { userId: userA, actionKey: 'DECLINE' };
              const result = computeWorkflowTransition(inst, action, userB);
              expect('error' in result).toBe(false);
              if (!('error' in result)) {
                expect(result.bookingStatusUpdate).toBe('cancelled');
                expect(result.nextNodeKey).toBe('DECLINED');
                expect(result.shouldLock).toBe(true);
                expect(result.nextAwaitingUserId).toBeNull();
              }
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ACCEPT never sets booking status to "confirmed"', () => {
    /** Validates: Requirements 5.4 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey: 'ACCEPT' };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.bookingStatusUpdate).not.toBe('confirmed');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ---------------------------------------------------------------------------
// Property 15: Workflow actions produce action messages
// Validates: Requirements 5.6
//
// Every successful workflow action produces a message with
// messageType: "action", the correct actionKey, and the current round.
// ---------------------------------------------------------------------------
describe('Property 15: Workflow actions produce action messages', () => {
  it('every successful action produces a message with messageType "action"', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(false);
          if (!('error' in result)) {
            expect(result.message.messageType).toBe('action');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('message actionKey matches the submitted action', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.message.actionKey).toBe(actionKey);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('message round matches the instance round at time of action', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        fc.integer({ min: 0, max: 2 }),
        ([userA, userB], actionKey, round) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.message.round).toBe(round);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('message senderId matches the acting user', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.message.senderId).toBe(userA);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('terminal actions (ACCEPT/DECLINE) also produce a system message', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        fc.constantFrom('ACCEPT', 'DECLINE') as fc.Arbitrary<'ACCEPT' | 'DECLINE'>,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.systemMessage).not.toBeNull();
            expect(result.systemMessage!.senderId).toBeNull();
            expect(result.systemMessage!.messageType).toBe('system');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('PROPOSE_CHANGE does not produce a system message', () => {
    /** Validates: Requirements 5.6 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey: 'PROPOSE_CHANGE' };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.systemMessage).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Locked workflow rejects all actions
// Validates: Requirements 5.7
//
// When a workflow instance is locked, all actions (PROPOSE_CHANGE, ACCEPT,
// DECLINE) are rejected regardless of who submits them.
// ---------------------------------------------------------------------------
describe('Property 16: Locked workflow rejects all actions', () => {
  it('all actions are rejected on a locked workflow', () => {
    /** Validates: Requirements 5.7 */
    fc.assert(
      fc.property(
        lockedInstanceArb,
        actionKeyArb,
        idArb,
        idArb,
        (inst, actionKey, userId, otherUserId) => {
          const action: WorkflowAction = { userId, actionKey };
          const result = computeWorkflowTransition(inst, action, otherUserId);
          expect('error' in result).toBe(true);
          if ('error' in result) {
            expect(result.error).toBe('Workflow is locked');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('locked check happens before turn validation', () => {
    /** Validates: Requirements 5.7 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        actionKeyArb,
        ([userA, userB], actionKey) => {
          // Locked instance where userA is awaiting — should still reject
          const inst: WorkflowInstance = {
            currentNodeKey: 'ACCEPTED',
            awaitingUserId: userA,
            round: 3,
            maxRounds: 3,
            locked: true,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(true);
          if ('error' in result) {
            expect(result.error).toBe('Workflow is locked');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 17: PROPOSE_CHANGE with offerAmount updates booking
// Validates: Requirements 5.8
//
// When a PROPOSE_CHANGE action includes an offerAmount in the payload,
// the transition result includes a bookingOfferAmountUpdate with that value.
// When no offerAmount is provided, bookingOfferAmountUpdate is null.
// ---------------------------------------------------------------------------
describe('Property 17: PROPOSE_CHANGE with offerAmount updates booking', () => {
  it('offerAmount in payload is reflected in bookingOfferAmountUpdate', () => {
    /** Validates: Requirements 5.8 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        offerAmountArb,
        ([userA, userB], offerAmount) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = {
            userId: userA,
            actionKey: 'PROPOSE_CHANGE',
            payload: { offerAmount },
          };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(false);
          if (!('error' in result)) {
            expect(result.bookingOfferAmountUpdate).toBe(offerAmount);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no offerAmount in payload results in null bookingOfferAmountUpdate', () => {
    /** Validates: Requirements 5.8 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        ([userA, userB]) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = {
            userId: userA,
            actionKey: 'PROPOSE_CHANGE',
            payload: { note: 'some note' },
          };
          const result = computeWorkflowTransition(inst, action, userB);
          expect('error' in result).toBe(false);
          if (!('error' in result)) {
            expect(result.bookingOfferAmountUpdate).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ACCEPT and DECLINE never update offerAmount', () => {
    /** Validates: Requirements 5.8 */
    fc.assert(
      fc.property(
        twoParticipantsArb,
        fc.constantFrom('ACCEPT', 'DECLINE') as fc.Arbitrary<'ACCEPT' | 'DECLINE'>,
        ([userA, userB], actionKey) => {
          const inst: WorkflowInstance = {
            currentNodeKey: 'AWAITING_ARTIST',
            awaitingUserId: userA,
            round: 0,
            maxRounds: 3,
            locked: false,
            context: {},
          };
          const action: WorkflowAction = { userId: userA, actionKey };
          const result = computeWorkflowTransition(inst, action, userB);
          if (!('error' in result)) {
            expect(result.bookingOfferAmountUpdate).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
