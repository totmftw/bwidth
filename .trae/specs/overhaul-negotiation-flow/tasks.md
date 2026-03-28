# Tasks

- [ ] Task 1: Define shared negotiation contracts and snapshot types
  - [ ] Add shared request and response schemas for application, proposal submission, rider confirmation, final acceptance, and negotiation summary
  - [ ] Standardize the canonical proposal snapshot shape and agreed booking snapshot shape
  - [ ] Align shared types with existing booking, conversation, and contract structures
  - [ ] Validate schema coverage for all required workflow states and payloads

- [ ] Task 2: Capture event-specific technical data during artist application
  - [ ] Extend the application UI to collect event-specific rider requirements and artist-brought equipment
  - [ ] Prefill technical defaults from artist profile without making them final booking commitments
  - [ ] Validate and normalize application technical inputs into structured payloads
  - [ ] Create proposal version 1 during application creation

- [ ] Task 3: Unify backend negotiation initialization and workflow logic
  - [ ] Replace route-local workflow initialization with service-backed negotiation opening
  - [ ] Standardize participant resolution to artist and organizer for this flow
  - [ ] Replace field-level turn logic with proposal-based status transitions
  - [ ] Implement rider confirmation and same-version dual acceptance rules
  - [ ] Persist proposal history, activity events, and agreed booking snapshot metadata

- [ ] Task 4: Build the structured negotiation workspace
  - [ ] Refactor the current negotiation component into a workspace shell
  - [ ] Add a current terms board that surfaces the full latest proposal snapshot
  - [ ] Add a proposal composer for structured counterproposals
  - [ ] Add proposal diff visibility between current and previous versions
  - [ ] Add a readable activity timeline for structured negotiation events
  - [ ] Add explicit rider resolution UI for organizer confirmation

- [ ] Task 5: Update booking surfaces to reflect the new negotiation model
  - [ ] Update artist booking actions and labels for the new workflow statuses
  - [ ] Update organizer booking actions and labels for the new workflow statuses
  - [ ] Remove venue-driven bypass behavior for artist application negotiation flow
  - [ ] Ensure booking surfaces route users into the new negotiation workspace and contract handoff correctly

- [ ] Task 6: Wire contract generation to the agreed negotiation snapshot
  - [ ] Make contract generation read agreed negotiation data from booking metadata first
  - [ ] Populate contract technical terms from artist-brought and organizer-confirmed rider data
  - [ ] Populate slot and negotiation-driven logistics from the agreed snapshot
  - [ ] Block contract initiation when agreement or rider confirmation is incomplete
  - [ ] Preserve compatibility metadata as derived mirrors during rollout

- [ ] Task 7: Remove legacy negotiation drift and update documentation
  - [ ] Deprecate or remove legacy booking negotiation endpoints from the active flow
  - [ ] Update conversation and application documentation to reflect the new model
  - [ ] Update technical and master docs so they describe the same negotiation source of truth
  - [ ] Ensure documentation explains organizer-only counterparty, rider confirmation, and dual acceptance

- [ ] Task 8: Verify behavior with targeted tests and regression coverage
  - [ ] Add or refactor backend tests for proposal transitions, rider confirmation, and dual acceptance
  - [ ] Add tests for negotiation opening and participant resolution under the new rules
  - [ ] Add tests for contract initiation guardrails and agreed snapshot persistence
  - [ ] Verify UI state rendering for artist and organizer booking flows
  - [ ] Run TypeScript and targeted test validation for changed areas

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
