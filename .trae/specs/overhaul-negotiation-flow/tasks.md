# Tasks

- [x] Task 1: Define shared negotiation contracts and snapshot types
  - [x] Add shared request and response schemas for application, proposal submission, rider confirmation, final acceptance, and negotiation summary
  - [x] Standardize the canonical proposal snapshot shape and agreed booking snapshot shape
  - [x] Align shared types with existing booking, conversation, and contract structures
  - [x] Validate schema coverage for all required workflow states and payloads

- [x] Task 2: Capture event-specific technical data during artist application
  - [x] Extend the application UI to collect event-specific rider requirements and artist-brought equipment
  - [x] Prefill technical defaults from artist profile without making them final booking commitments
  - [x] Validate and normalize application technical inputs into structured payloads
  - [x] Create proposal version 1 during application creation

- [x] Task 3: Unify backend negotiation initialization and workflow logic
  - [x] Replace route-local workflow initialization with service-backed negotiation opening
  - [x] Standardize participant resolution to artist and organizer for this flow
  - [x] Replace field-level turn logic with proposal-based status transitions
  - [x] Implement rider confirmation and same-version dual acceptance rules
  - [x] Persist proposal history, activity events, and agreed booking snapshot metadata

- [x] Task 4: Build the structured negotiation workspace
  - [x] Refactor the current negotiation component into a workspace shell
  - [x] Add a current terms board that surfaces the full latest proposal snapshot
  - [x] Add a proposal composer for structured counterproposals
  - [x] Add proposal diff visibility between current and previous versions
  - [x] Add a readable activity timeline for structured negotiation events
  - [x] Add explicit rider resolution UI for organizer confirmation

- [x] Task 5: Update booking surfaces to reflect the new negotiation model
  - [x] Update artist booking actions and labels for the new workflow statuses
  - [x] Update organizer booking actions and labels for the new workflow statuses
  - [x] Remove venue-driven bypass behavior for artist application negotiation flow
  - [x] Ensure booking surfaces route users into the new negotiation workspace and contract handoff correctly

- [x] Task 6: Wire contract generation to the agreed negotiation snapshot
  - [x] Make contract generation read agreed negotiation data from booking metadata first
  - [x] Populate contract technical terms from artist-brought and organizer-confirmed rider data
  - [x] Populate slot and negotiation-driven logistics from the agreed snapshot
  - [x] Block contract initiation when agreement or rider confirmation is incomplete
  - [x] Preserve compatibility metadata as derived mirrors during rollout

- [x] Task 7: Remove legacy negotiation drift and update documentation
  - [x] Deprecate or remove legacy booking negotiation endpoints from the active flow
  - [x] Update conversation and application documentation to reflect the new model
  - [x] Update technical and master docs so they describe the same negotiation source of truth
  - [x] Ensure documentation explains organizer-only counterparty, rider confirmation, and dual acceptance

- [x] Task 8: Verify behavior with targeted tests and regression coverage
  - [x] Add or refactor backend tests for proposal transitions, rider confirmation, and dual acceptance
  - [x] Add tests for negotiation opening and participant resolution under the new rules
  - [x] Add tests for contract initiation guardrails and agreed snapshot persistence
  - [x] Verify UI state rendering for artist and organizer booking flows
  - [x] Run TypeScript and targeted test validation for changed areas

# Task Dependencies

- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1 and Task 3
- Task 5 depends on Task 3 and Task 4
- Task 6 depends on Task 3
- Task 7 depends on Task 3 and Task 6
- Task 8 depends on Tasks 2, 3, 4, 5, 6, and 7

# Parallelization Notes

- Task 2 and Task 3 can begin in parallel once Task 1 is complete, but they must align on the same shared payload shapes
- Task 4 and Task 6 can proceed in parallel after Task 3 stabilizes the backend source of truth
- Task 7 can start once the final API and workflow semantics are stable enough to document accurately
