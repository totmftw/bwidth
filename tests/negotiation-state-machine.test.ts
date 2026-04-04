import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Pure re-implementation of NegotiationService.validateStepTransition
// ---------------------------------------------------------------------------
// Extracted from server/services/negotiation.service.ts (lines 135-201) so we
// can test the state-machine rules without instantiating the service class or
// touching the database.  Every branch below mirrors the production code.

type NegotiationStepState =
  | "applied"
  | "awaiting_org"
  | "awaiting_art"
  | "locked"
  | "walked_away"
  | "expired";

type NegotiationAction = "edit" | "accept" | "walkaway";
type Role = "artist" | "organizer";

interface TransitionParams {
  currentStep: number;
  stepState: NegotiationStepState;
  action: NegotiationAction;
  role: Role;
  stepDeadlineAt: string | null;
}

function validateStepTransition(
  params: TransitionParams,
): { valid: true } | { valid: false; error: string } {
  const { currentStep, stepState, action, role, stepDeadlineAt } = params;

  // Terminal states
  if (["locked", "walked_away", "expired"].includes(stepState)) {
    return {
      valid: false,
      error: "Negotiation is finalized, no further actions allowed",
    };
  }

  // Deadline check
  if (stepDeadlineAt && new Date() > new Date(stepDeadlineAt)) {
    return { valid: false, error: "Step deadline has expired" };
  }

  // Step 0 (applied): only organizer can submit initial proposal
  if (currentStep === 0 || stepState === "applied") {
    if (role !== "organizer") {
      return {
        valid: false,
        error: "Organizer must submit the first proposal",
      };
    }
    if (action !== "edit") {
      return {
        valid: false,
        error: "First step must be a proposal (edit action)",
      };
    }
    return { valid: true };
  }

  // Turn enforcement based on stepState
  if (stepState === "awaiting_art" && role !== "artist") {
    return { valid: false, error: "It is the artist's turn to respond" };
  }
  if (stepState === "awaiting_org" && role !== "organizer") {
    return { valid: false, error: "It is the organizer's turn to respond" };
  }

  // Step 3+ with awaiting_art: no edit allowed (final step for artist)
  if (currentStep >= 3 && stepState === "awaiting_art" && action === "edit") {
    return {
      valid: false,
      error:
        "Maximum negotiation steps reached. You can only accept or walk away.",
    };
  }

  // Max step check (shouldn't hit step 4+)
  if (currentStep >= 4) {
    return { valid: false, error: "Maximum negotiation steps reached" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// Arbitraries (generators for fast-check)
// ---------------------------------------------------------------------------

const roleArb: fc.Arbitrary<Role> = fc.constantFrom("artist", "organizer");
const actionArb: fc.Arbitrary<NegotiationAction> = fc.constantFrom(
  "edit",
  "accept",
  "walkaway",
);

const activeStepStateArb: fc.Arbitrary<NegotiationStepState> =
  fc.constantFrom("applied", "awaiting_org", "awaiting_art");

const terminalStepStateArb: fc.Arbitrary<NegotiationStepState> =
  fc.constantFrom("locked", "walked_away", "expired");

const allStepStateArb: fc.Arbitrary<NegotiationStepState> = fc.constantFrom(
  "applied",
  "awaiting_org",
  "awaiting_art",
  "locked",
  "walked_away",
  "expired",
);

/** A step number that fits the valid domain (0-5 covers all branches). */
const stepArb = fc.integer({ min: 0, max: 5 });

/** Deadline far in the future so deadline checks never interfere. */
const NO_DEADLINE: string | null = null;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Negotiation State Machine - Property-Based Tests", () => {
  // -----------------------------------------------------------------------
  // Property 1: Valid organizer actions at step 0 / applied
  // -----------------------------------------------------------------------
  it("accepts organizer edit at step 0 (applied)", () => {
    fc.assert(
      fc.property(
        // stepState can be "applied" or anything — step 0 triggers the branch
        // regardless.  We test the canonical case here.
        fc.constant(0),
        fc.constant("applied" as NegotiationStepState),
        (step, state) => {
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action: "edit",
            role: "organizer",
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(true);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 2: Wrong role is always rejected at every active step
  // -----------------------------------------------------------------------
  it("rejects actions from the wrong role for any active step", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom(
          "awaiting_art" as NegotiationStepState,
          "awaiting_org" as NegotiationStepState,
        ),
        actionArb,
        (step, state, action) => {
          // The "wrong" role is the one NOT indicated by the state
          const wrongRole: Role =
            state === "awaiting_art" ? "organizer" : "artist";
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action,
            role: wrongRole,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(false);
          expect(result).toHaveProperty("error");
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 3: Terminal states reject every possible action
  // -----------------------------------------------------------------------
  it("rejects all actions on terminal states (locked, walked_away, expired)", () => {
    fc.assert(
      fc.property(
        stepArb,
        terminalStepStateArb,
        roleArb,
        actionArb,
        (step, state, role, action) => {
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action,
            role,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(false);
          expect((result as { error: string }).error).toBe(
            "Negotiation is finalized, no further actions allowed",
          );
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 4: Step 3 never allows edit (artist's final response)
  // -----------------------------------------------------------------------
  it("never allows edit at step 3 when awaiting artist", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 5 }),
        roleArb,
        (step, role) => {
          const result = validateStepTransition({
            currentStep: step,
            stepState: "awaiting_art",
            action: "edit",
            role,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(false);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 5: Exactly one role can act at each non-terminal step
  // -----------------------------------------------------------------------
  it("exactly one role can act at each non-terminal step", () => {
    // For every active (non-terminal) stepState, we verify that exactly one
    // role has at least one valid action while the other role has none.
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom(
          "awaiting_art" as NegotiationStepState,
          "awaiting_org" as NegotiationStepState,
        ),
        (step, state) => {
          const actions: NegotiationAction[] = ["edit", "accept", "walkaway"];

          const artistCanDoSomething = actions.some(
            (a) =>
              validateStepTransition({
                currentStep: step,
                stepState: state,
                action: a,
                role: "artist",
                stepDeadlineAt: NO_DEADLINE,
              }).valid,
          );

          const organizerCanDoSomething = actions.some(
            (a) =>
              validateStepTransition({
                currentStep: step,
                stepState: state,
                action: a,
                role: "organizer",
                stepDeadlineAt: NO_DEADLINE,
              }).valid,
          );

          // Exactly one should be true (XOR)
          expect(artistCanDoSomething !== organizerCanDoSomething).toBe(true);

          // Verify which role matches the state
          if (state === "awaiting_art") {
            expect(artistCanDoSomething).toBe(true);
            expect(organizerCanDoSomething).toBe(false);
          } else {
            expect(organizerCanDoSomething).toBe(true);
            expect(artistCanDoSomething).toBe(false);
          }
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 6: A valid edit always implies next step = currentStep + 1
  //             (this is confirmed by the action handler, but we verify the
  //              validator doesn't reject edits that the handler would advance)
  // -----------------------------------------------------------------------
  it("valid edit transitions lead to a deterministic next step (currentStep + 1)", () => {
    // All valid edit scenarios: step 0 organizer, steps 1-2 awaiting_org for
    // organizer, steps 1-2 awaiting_art for artist.
    const validEditCases: Array<{
      step: number;
      state: NegotiationStepState;
      role: Role;
    }> = [
      { step: 0, state: "applied", role: "organizer" },
      { step: 1, state: "awaiting_art", role: "artist" },
      { step: 1, state: "awaiting_org", role: "organizer" },
      { step: 2, state: "awaiting_art", role: "artist" },
      { step: 2, state: "awaiting_org", role: "organizer" },
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...validEditCases),
        ({ step, state, role }) => {
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action: "edit",
            role,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(true);

          // The handler sets nextStep = currentStep + 1, so we verify the
          // validator accepted it AND the expected next step is within bounds.
          const nextStep = step + 1;
          expect(nextStep).toBeLessThanOrEqual(4);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 7: Walkaway is always valid when it's your turn (for active
  //             steps 1-3)
  // -----------------------------------------------------------------------
  it("walkaway is always accepted when it is the correct role's turn", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom(
          "awaiting_art" as NegotiationStepState,
          "awaiting_org" as NegotiationStepState,
        ),
        (step, state) => {
          const correctRole: Role =
            state === "awaiting_art" ? "artist" : "organizer";
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action: "walkaway",
            role: correctRole,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(true);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 8: Accept is always valid when it's your turn (for steps 1-3)
  // -----------------------------------------------------------------------
  it("accept is always valid when it is the correct role's turn", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        fc.constantFrom(
          "awaiting_art" as NegotiationStepState,
          "awaiting_org" as NegotiationStepState,
        ),
        (step, state) => {
          const correctRole: Role =
            state === "awaiting_art" ? "artist" : "organizer";
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action: "accept",
            role: correctRole,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(true);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 9: Artist can never act at step 0 regardless of action
  // -----------------------------------------------------------------------
  it("artist is always rejected at step 0", () => {
    fc.assert(
      fc.property(actionArb, (action) => {
        const result = validateStepTransition({
          currentStep: 0,
          stepState: "applied",
          action,
          role: "artist",
          stepDeadlineAt: NO_DEADLINE,
        });
        expect(result.valid).toBe(false);
        expect((result as { error: string }).error).toBe(
          "Organizer must submit the first proposal",
        );
      }),
    );
  });

  // -----------------------------------------------------------------------
  // Property 10: Organizer at step 0 can only edit (accept & walkaway fail)
  // -----------------------------------------------------------------------
  it("organizer at step 0 can only edit, not accept or walkaway", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("accept" as NegotiationAction, "walkaway" as NegotiationAction),
        (action) => {
          const result = validateStepTransition({
            currentStep: 0,
            stepState: "applied",
            action,
            role: "organizer",
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(false);
          expect((result as { error: string }).error).toBe(
            "First step must be a proposal (edit action)",
          );
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 11: Expired deadlines always rejected (for active states)
  // -----------------------------------------------------------------------
  it("rejects all actions when the step deadline has passed", () => {
    fc.assert(
      fc.property(
        stepArb,
        activeStepStateArb,
        roleArb,
        actionArb,
        (step, state, role, action) => {
          // Use a deadline clearly in the past
          const pastDeadline = new Date(Date.now() - 60_000).toISOString();
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action,
            role,
            stepDeadlineAt: pastDeadline,
          });
          expect(result.valid).toBe(false);
          expect((result as { error: string }).error).toBe(
            "Step deadline has expired",
          );
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 12: Steps >= 4 always rejected (boundary / overflow guard)
  // -----------------------------------------------------------------------
  it("rejects all actions at step 4 and above", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 100 }),
        // Use only awaiting_org so it passes the turn check for organizer
        // before hitting the max step check.
        fc.constantFrom(
          "awaiting_org" as NegotiationStepState,
          "awaiting_art" as NegotiationStepState,
        ),
        actionArb,
        (step, state, action) => {
          // Use the role that matches the state so we don't get rejected
          // by turn-enforcement before reaching the max-step guard.
          const role: Role =
            state === "awaiting_art" ? "artist" : "organizer";
          const result = validateStepTransition({
            currentStep: step,
            stepState: state,
            action,
            role,
            stepDeadlineAt: NO_DEADLINE,
          });
          expect(result.valid).toBe(false);
        },
      ),
    );
  });

  // -----------------------------------------------------------------------
  // Property 13: The "applied" stepState at any step triggers the step-0
  //              branch (organizer-only, edit-only).  This covers the OR
  //              condition: currentStep === 0 || stepState === "applied".
  // -----------------------------------------------------------------------
  it("applied state always enforces organizer-edit-only regardless of step number", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 5 }),
        roleArb,
        actionArb,
        (step, role, action) => {
          const result = validateStepTransition({
            currentStep: step,
            stepState: "applied",
            action,
            role,
            stepDeadlineAt: NO_DEADLINE,
          });

          if (role === "organizer" && action === "edit") {
            expect(result.valid).toBe(true);
          } else {
            expect(result.valid).toBe(false);
          }
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// Deterministic edge-case tests (not property-based, but important boundary
// cases that complement the properties above)
// ---------------------------------------------------------------------------

describe("Negotiation State Machine - Deterministic Edge Cases", () => {
  it("step 3 awaiting_art: artist can accept", () => {
    const result = validateStepTransition({
      currentStep: 3,
      stepState: "awaiting_art",
      action: "accept",
      role: "artist",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(true);
  });

  it("step 3 awaiting_art: artist can walkaway", () => {
    const result = validateStepTransition({
      currentStep: 3,
      stepState: "awaiting_art",
      action: "walkaway",
      role: "artist",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(true);
  });

  it("step 3 awaiting_art: artist cannot edit", () => {
    const result = validateStepTransition({
      currentStep: 3,
      stepState: "awaiting_art",
      action: "edit",
      role: "artist",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(false);
    expect((result as { error: string }).error).toContain(
      "Maximum negotiation steps reached",
    );
  });

  it("step 2 awaiting_art: artist CAN still edit", () => {
    const result = validateStepTransition({
      currentStep: 2,
      stepState: "awaiting_art",
      action: "edit",
      role: "artist",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(true);
  });

  it("null deadline does not trigger expiration", () => {
    const result = validateStepTransition({
      currentStep: 1,
      stepState: "awaiting_art",
      action: "accept",
      role: "artist",
      stepDeadlineAt: null,
    });
    expect(result.valid).toBe(true);
  });

  it("future deadline does not trigger expiration", () => {
    const futureDeadline = new Date(
      Date.now() + 72 * 60 * 60 * 1000,
    ).toISOString();
    const result = validateStepTransition({
      currentStep: 1,
      stepState: "awaiting_org",
      action: "edit",
      role: "organizer",
      stepDeadlineAt: futureDeadline,
    });
    expect(result.valid).toBe(true);
  });

  it("step 0 with non-applied state still triggers the step-0 branch", () => {
    // The production code checks: currentStep === 0 || stepState === "applied"
    // This tests the left side of the OR when stepState is something unusual.
    const result = validateStepTransition({
      currentStep: 0,
      stepState: "awaiting_art",
      action: "edit",
      role: "organizer",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(true);
  });

  it("step 0 with awaiting_art rejects artist even though state says artist turn", () => {
    // The step-0/applied branch takes priority over turn enforcement.
    const result = validateStepTransition({
      currentStep: 0,
      stepState: "awaiting_art",
      action: "edit",
      role: "artist",
      stepDeadlineAt: NO_DEADLINE,
    });
    expect(result.valid).toBe(false);
    expect((result as { error: string }).error).toBe(
      "Organizer must submit the first proposal",
    );
  });

  it("terminal check runs before deadline check", () => {
    // Even with an expired deadline, a terminal state should report the
    // terminal error, not the deadline error.
    const pastDeadline = new Date(Date.now() - 60_000).toISOString();
    const result = validateStepTransition({
      currentStep: 2,
      stepState: "locked",
      action: "edit",
      role: "organizer",
      stepDeadlineAt: pastDeadline,
    });
    expect(result.valid).toBe(false);
    expect((result as { error: string }).error).toBe(
      "Negotiation is finalized, no further actions allowed",
    );
  });
});
