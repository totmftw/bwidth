# Negotiation Overhaul Plan

## Summary

This overhaul will replace the current fragmented negotiation logic with a single structured negotiation workspace centered on one source of truth: the latest proposal snapshot for a booking. The new flow will standardize the counterparty as **artist ↔ organizer**, capture **event-specific tech rider requirements and artist-brought equipment at application time**, require the **organizer to explicitly confirm rider arrangements**, and persist an **agreed negotiation snapshot** that can be auto-populated into the contract.

The implementation will keep the existing stack and database patterns where they already fit:

- React + TanStack Query on the client
- Express + service/storage patterns on the server
- PostgreSQL/Drizzle with existing `bookings.meta`, `booking_proposals.proposed_terms`, `messages.payload`, and contract snapshot fields

This plan is intentionally opinionated to remove the current ambiguity and avoid reintroducing the same complexity in a different form.

## Current State Analysis

### Documentation and architecture sources reviewed

Primary reliable references:

- `docs/CONVERSATION_API.md`
- `docs/CODE_ARCHITECTURE.md`
- `docs/application-functionality.md`
- `docs/database/current-schema.md`
- `shared/schema.ts`

Primary implementation files reviewed:

- `client/src/components/GigApplicationModal.tsx`
- `client/src/components/booking/NegotiationFlow.tsx`
- `client/src/pages/artist/ArtistBookings.tsx`
- `client/src/pages/organizer/OrganizerBookings.tsx`
- `client/src/pages/venue/VenueBookings.tsx`
- `server/routes/conversations.ts`
- `server/services/workflow.ts`
- `server/routes.ts`
- `server/services/contract.service.ts`
- `server/contract-utils.ts`
- `shared/schema.ts`
- `tests/properties/workflow.prop.ts`
- `tests/properties/conversations.prop.ts`

### What is broken today

1. **There are two negotiation systems at once**
   - `server/routes/conversations.ts` opens conversation-driven negotiations.
   - `server/routes.ts` still exposes legacy `/api/bookings/:id/negotiate|accept|decline`.
   - This creates duplicate state paths, duplicate semantics, and stale documentation.

2. **Conversation initialization and workflow execution do not agree on state shape**
   - `server/routes/conversations.ts` creates `booking_negotiation_v1` with `WAITING_FIRST_MOVE` and empty `context`.
   - `server/services/workflow.ts` expects a much richer `negotiation-v2` context with `artistUserId`, `organizerUserId`, `costAwaitingUserId`, `slotAwaitingUserId`, lock flags, and rider state.
   - `client/src/components/booking/NegotiationFlow.tsx` depends on those richer fields, so the live UI and the created workflow instance can drift immediately.

3. **The current logic is field-by-field rather than proposal-by-proposal**
   - Cost, slot, and rider each have separate local rules.
   - The user has to mentally reconstruct “what is actually agreed right now” from a message thread.
   - This is the core reason the experience feels garbled.

4. **Acceptance is semantically wrong for the desired product**
   - Current code finalizes on a single `ACCEPT` in `server/services/workflow.ts`.
   - Existing documentation says both parties accept.
   - Your requested redesign explicitly needs **both accept + organizer rider confirmation**.

5. **Tech rider data is incomplete and stored too late**
   - `client/src/components/GigApplicationModal.tsx` only collects fee and message.
   - Event-specific artist requirements are not captured at application time.
   - Artist-brought equipment is currently profile-level (`client/src/pages/artist/ArtistProfile.tsx`) rather than event-level.
   - Organizer confirmation of arrangements is not modeled as a first-class negotiation step.

6. **Contract auto-population is only partially wired**
   - The current workflow stores `booking.meta.techRider` and `booking.meta.terms`.
   - `server/contract-utils.ts` still builds technical terms from unrelated top-level `meta.equipmentList`, `meta.backlineProvided`, etc.
   - That means the negotiated rider is not yet the canonical contract input.

7. **Tests and docs are aligned to old abstractions**
   - Property tests currently target `server/workflow-utils.ts` and `server/conversation-utils.ts`, not the real negotiation rules in `server/services/workflow.ts`.
   - Several docs still describe endpoints and UI that are no longer the live source of truth.

## Product Decisions Locked For This Overhaul

These decisions are now fixed for implementation:

- Counterparty after application is **Organizer only**
- Negotiation experience is **Structured + chat**
- Finalization is **Both accept + organizer rider confirm**
- The **latest proposal snapshot** is the source of truth, not individual message fragments
- Artist profile rider/equipment remains only a **reference/default**, not the final booking truth
- Booking-level event-specific negotiation data is what powers the contract

## Internet Inspiration Applied

The redesign is informed by three practical principles:

1. **One workflow source of truth**
   - Asana’s workflow guidance emphasizes that workflows work best when the right people see the right data in one shared place, with approvals and progress tracked in the same system.
   - Source: https://asana.com/resources/workflow-examples

2. **Keep steps small and intentional**
   - Asana’s workflow builder guidance recommends a clear outcome, a short set of core steps, and light automation instead of layered complexity.
   - Source: https://forum.asana.com/t/5-step-method-anyone-can-to-build-workflows-in-asana/1110523

3. **A technical rider must clearly separate what the artist brings vs what the organizer must arrange, and should become binding once approved**
   - The SystemOne article is especially relevant here because it stresses visual clarity, separating backline responsibilities, and merging the approved rider into the signed agreement.
   - Source: https://www.systemonesoftware.com/blog/technical-rider

These principles directly support the target design: a small number of clear negotiation states, a visual terms board, and a rider structure that is explicit and contract-ready.

## Proposed Target Logic

### The new booking negotiation model

The new logic should be **proposal-based**, not **field-turn-based**.

Each negotiation revolves around a **current proposal snapshot**. A proposal snapshot contains the full currently proposed state of all negotiable terms. Each new proposal replaces the current draft and is stored as a versioned history record.

### New end-to-end flow

#### Step 1 — Artist application creates the first negotiation snapshot

When an artist applies for an event, the application must capture:

- proposed fee
- optional application note
- selected event/stage context
- event-specific required tech rider items
- event-specific equipment the artist will bring

This becomes proposal version 1.

#### Step 2 — Organizer reviews a visual terms board

The organizer sees:

- current proposed fee
- selected slot/stage
- artist-required rider items
- artist-brought equipment
- organizer-provided / organizer-arranged equipment
- proposal activity timeline
- what changed since the last proposal

The organizer can:

- accept current draft
- counter with a new full snapshot
- update organizer arrangement details for rider items
- walk away

#### Step 3 — Artist reviews the updated snapshot

The artist sees the same terms board and can:

- accept the latest snapshot
- counter with another full snapshot
- request rider adjustments
- walk away

#### Step 4 — Organizer confirms rider arrangements

Before final agreement, every rider requirement must be explicitly resolved by the organizer.

Each artist-requested rider item must have one of these statuses:

- `confirmed`
- `alternate_offered`
- `cannot_provide`

Each resolved item must also allow organizer notes so the final contract has enough operational clarity.

The flow cannot move to final agreement while any required rider item is unresolved.

#### Step 5 — Final agreement on one identical snapshot

Once the latest snapshot is complete:

- organizer confirms rider arrangements
- artist accepts the exact same snapshot
- organizer accepts the exact same snapshot

Only then does the booking move to `contracting`.

#### Step 6 — Contract is generated from the agreed negotiation snapshot

The agreed snapshot is persisted onto the booking and then used by contract generation to populate:

- fee
- slot / performance timing
- technical rider requirements
- artist-brought equipment
- organizer-arranged / confirmed equipment
- any logistics terms captured during negotiation

## Data Model Decisions

### Guiding decision

Do **not** introduce a large new negotiation table set unless implementation uncovers a hard blocker. The existing database already has the right primitives:

- `booking_proposals` for version history
- `messages` for timeline/audit events
- `conversation_workflow_instances` for lightweight workflow state
- `bookings.meta` for the final agreed snapshot
- `contracts.negotiatedTermsJson` for contract snapshot persistence

This keeps the overhaul robust while avoiding unnecessary schema sprawl.

### Canonical JSON shapes

#### `booking_proposals.proposed_terms`

From this overhaul onward, `proposed_terms` should store a full structured snapshot like:

```json
{
  "financial": {
    "offerAmount": 50000,
    "currency": "INR"
  },
  "schedule": {
    "stageId": 12,
    "slotLabel": "8:00 PM - 9:30 PM",
    "soundCheckLabel": "6:30 PM"
  },
  "techRider": {
    "artistRequirements": [
      {
        "item": "2 x Pioneer CDJ-3000",
        "category": "backline",
        "quantity": 2,
        "notes": "",
        "status": "confirmed",
        "organizerNotes": "Venue vendor confirmed rental"
      }
    ],
    "artistBrings": [
      {
        "item": "USB media + headphones",
        "quantity": 1,
        "notes": ""
      }
    ],
    "organizerProvides": [
      "PA system",
      "DJ booth monitors"
    ]
  },
  "logistics": {
    "travel": {},
    "accommodation": {},
    "hospitality": {}
  },
  "notes": {
    "artist": "",
    "organizer": ""
  }
}
```

#### `bookings.meta.negotiation`

Persist the final source of truth under a dedicated key:

```json
{
  "version": 4,
  "agreedAt": "ISO_TIMESTAMP",
  "agreedBy": {
    "artistUserId": 10,
    "organizerUserId": 25
  },
  "snapshot": { "...same shape as proposed_terms..." }
}
```

For backward compatibility during rollout, the implementation should also continue writing:

- `meta.finalSlot`
- `meta.techRider`
- `meta.terms`

But those should be derived from `meta.negotiation.snapshot`, not authored separately.

### Workflow instance state

`conversation_workflow_instances.context` should become lightweight and declarative:

```json
{
  "artistUserId": 10,
  "organizerUserId": 25,
  "artistName": "Artist",
  "organizerName": "Organizer",
  "currentProposalRound": 4,
  "currentProposalStatus": "pending_artist",
  "currentProposalId": 88,
  "riderConfirmationComplete": false,
  "finalAcceptance": {
    "artistAcceptedAt": null,
    "organizerAcceptedAt": null
  }
}
```

This deliberately removes separate cost-turn, slot-turn, and rider-lock state.

## Proposed Changes By Area

### 1. Shared contracts and schemas

#### `shared/routes.ts`

Add formal route contracts and validation schemas for the negotiation system so the API matches the architecture documentation:

- application submission payload
- negotiation summary fetch payload/response
- proposal submit payload
- rider confirmation payload
- final acceptance payload
- walk-away payload

Why:

- negotiation endpoints currently operate outside the documented route-contract pattern
- this area needs a strongly typed source of truth more than almost any other feature

#### `shared/schema.ts`

Update schema definitions and inferred types to support the new canonical JSON shapes while reusing existing tables:

- keep `booking_proposals` table, but standardize `proposedTerms` as full-snapshot JSON
- keep `bookings.meta`, but reserve `meta.negotiation` for agreed snapshot persistence
- keep `conversation_workflow_instances.context`, but simplify the state contract

If a migration is needed, it should be minimal and only for indexes/defaults, not a full table redesign.

### 2. Booking application capture

#### `client/src/components/GigApplicationModal.tsx`

Redesign the application modal so the artist submits:

- fee
- message
- event-specific tech rider requirements
- event-specific equipment the artist will bring

Implementation detail:

- allow multi-line item entry and normalize into arrays/objects before submit
- prefill from profile defaults if available, but clearly label them as editable for this event

#### `server/routes.ts`

Replace the current bare `/api/bookings/apply` logic with a richer application payload handler that:

- validates event-specific rider data
- stores initial negotiation snapshot in booking/application data
- creates proposal version 1 in `booking_proposals`
- writes initial booking meta needed by negotiation workspace

Longer-term cleanup:

- if feasible within the overhaul, move application logic out of `server/routes.ts` into a domain route file aligned with the architecture rule set

#### `server/storage.ts`

Add / update storage methods to support:

- creating the initial proposal snapshot on application
- fetching latest proposal for a booking
- fetching proposal history ordered by round/version

### 3. Conversation opening and workflow unification

#### `server/routes/conversations.ts`

Refactor conversation opening so it delegates negotiation initialization to the service layer instead of locally building a conflicting workflow instance.

The route should:

- remain idempotent
- enforce organizer-only counterparty resolution for negotiation
- call a single workflow/service initializer
- stop creating ad hoc workflow state inline

#### `server/services/workflow.ts`

This file becomes the canonical negotiation orchestrator and must be simplified around the new snapshot-based model.

Replace the current logic with:

- `openNegotiation(bookingId, initiatorId)` that creates compatible context
- `submitProposal(conversationId, userId, snapshotPatch)`
- `confirmRider(conversationId, organizerUserId, riderResolution)`
- `acceptCurrentProposal(conversationId, userId)`
- `walkAway(conversationId, userId, note)`

The workflow states should be reduced to a small set:

- `pending_organizer`
- `pending_artist`
- `rider_confirmation_required`
- `ready_for_final_acceptance`
- `agreed`
- `walked_away`

No per-field counters. No separate cost-vs-slot turns. No invisible lock rules.

### 4. Negotiation UI redesign

#### `client/src/components/booking/NegotiationFlow.tsx`

Rebuild this component from a chat-with-sheets tool into a workspace shell that loads:

- negotiation summary
- latest proposal snapshot
- proposal history
- lightweight activity thread

This file should become orchestration and layout, not the place where business rules are hidden.

#### New client components under `client/src/components/booking/`

Create focused components such as:

- `NegotiationTermsBoard.tsx`
- `NegotiationProposalComposer.tsx`
- `NegotiationActivityTimeline.tsx`
- `NegotiationRiderPanel.tsx`
- `NegotiationDiffCard.tsx`

Purpose of each:

- **Terms board**: always-visible current truth
- **Proposal composer**: guided edit surface for the next version
- **Activity timeline**: human-readable audit trail
- **Rider panel**: explicit artist requires / artist brings / organizer arranges sections
- **Diff card**: show what changed between the current and previous version

### 5. Booking entry points and status UX

#### `client/src/pages/artist/ArtistBookings.tsx`
#### `client/src/pages/organizer/OrganizerBookings.tsx`
#### `client/src/pages/venue/VenueBookings.tsx`

Update entry points so booking cards reflect the new negotiation state clearly:

- `Awaiting Organizer`
- `Awaiting Artist`
- `Organizer confirming rider`
- `Ready for final acceptance`
- `Contract ready`

The venue page requires special handling:

- remove venue as a first-class negotiation counterparty for this workflow
- if venue data is still relevant operationally, surface it as event context only
- prevent direct venue actions from bypassing negotiation → contract flow for artist event applications

### 6. Contract population alignment

#### `server/services/contract.service.ts`

Change contract generation so it reads the new agreed negotiation snapshot from the booking first.

#### `server/contract-utils.ts`

Refactor term extraction so technical and logistics terms come from:

- `booking.meta.negotiation.snapshot`

instead of relying on loosely related top-level metadata keys.

Specific contract outputs to populate:

- slot/performance timing
- equipment the artist brings
- equipment the organizer provides or arranges
- unresolved rider items must be blocked before generation
- optional negotiation logistics terms if captured

#### `server/routes/contracts.ts`

Add guardrails so contract initiation fails with a useful error if:

- no agreed snapshot exists
- rider confirmation is incomplete
- both parties have not accepted the same snapshot

### 7. Documentation cleanup

Update the docs that are currently stale so future work does not drift again:

- `docs/CONVERSATION_API.md`
- `docs/application-functionality.md`
- `docs/API_DOCUMENTATION.md`
- `docs/TECHNICAL_SPECIFICATION.md`
- `docs/master/backend-master.md`
- `docs/master/frontend-master.md`
- `docs/master/api-master.md`

The docs must reflect:

- organizer-only counterparty for event applications
- structured + chat negotiation workspace
- snapshot-based proposals
- organizer rider confirmation
- both-party final acceptance
- contract auto-population from agreed booking snapshot

## Detailed Execution Plan

### Phase A — Define data contracts first

1. Add negotiation request/response schemas in `shared/routes.ts`
2. Lock the canonical JSON shape for proposal snapshots and agreed booking snapshots
3. Update any shared client/server types derived from those schemas

### Phase B — Fix backend source of truth

1. Refactor conversation open flow in `server/routes/conversations.ts`
2. Rewrite `server/services/workflow.ts` around proposal snapshots
3. Add storage helpers in `server/storage.ts`
4. Remove or deprecate legacy negotiation endpoints in `server/routes.ts`

### Phase C — Capture event-specific tech rider at application time

1. Upgrade `client/src/components/GigApplicationModal.tsx`
2. Upgrade `/api/bookings/apply` handling
3. Create proposal version 1 as part of application creation

### Phase D — Ship the new negotiation workspace

1. Split `client/src/components/booking/NegotiationFlow.tsx` into focused components
2. Add the always-visible terms board and diff display
3. Replace the current bottom-sheet action model with guided proposal editing and acceptance actions
4. Update artist/organizer booking pages to surface the new statuses

### Phase E — Wire contract generation to the agreed snapshot

1. Update `server/services/contract.service.ts`
2. Update `server/contract-utils.ts`
3. Add server-side guards in `server/routes/contracts.ts`
4. Validate contract display for technical/logistics carry-over

### Phase F — Retire old assumptions

1. Remove obsolete per-field round logic
2. Remove legacy UI labels that imply fragmented negotiation
3. Update docs and tests so new logic is the only documented logic

## Assumptions & Decisions

- Existing profile-level rider/equipment fields in `client/src/pages/artist/ArtistProfile.tsx` remain as reusable defaults only.
- This overhaul does **not** require free-text negotiation messages inside the negotiation thread; the “chat” portion is an activity feed of structured proposals, confirmations, and notes.
- The organizer is the only decision-making counterparty for artist event applications.
- Venue information can still be displayed, but venue users should not be able to short-circuit this negotiation workflow.
- The contract must not be initiable until the same final snapshot has been accepted by both parties.
- The agreed booking snapshot is the canonical contract input; any legacy fields become compatibility mirrors only.
- Prefer reusing existing tables and JSONB fields over creating a new negotiation subsystem.

## Verification Steps

### Functional verification

1. Artist application creates booking + proposal version 1 with event-specific rider data
2. Organizer sees visual terms board immediately after opening negotiation
3. Organizer submits counterproposal and artist sees a correct diff
4. Rider items cannot remain unresolved before final agreement
5. Artist and organizer must both accept the same snapshot
6. Booking moves to `contracting` only after both accepts + rider confirmation
7. Contract generation reads the agreed snapshot and auto-populates technical details

### Backend verification

- Add or refactor service-level tests for proposal transitions and acceptance rules
- Add tests that opening a negotiation creates a compatible workflow context
- Add tests that unresolved rider items block contract initiation
- Add tests that `bookings.meta.negotiation.snapshot` mirrors the accepted proposal version

### Frontend verification

- Verify artist and organizer dashboards render the correct negotiation status labels
- Verify visual terms board always matches the latest backend snapshot
- Verify proposal diffs highlight changed sections clearly
- Verify application modal prefill-from-profile works without overwriting event-specific edits

### Regression verification

- Ensure contract flow still respects the existing sequential edit/sign workflow after negotiation completes
- Ensure booking commission/trust snapshotting still happens after agreement
- Ensure old legacy negotiation actions are no longer reachable from the active UI

## Success Criteria

The overhaul is successful when:

- the negotiation state is understandable without reading raw message history
- every proposed/agreed term is visible in one place
- event-specific rider requirements and artist-brought equipment are captured before negotiation begins
- the organizer explicitly confirms rider arrangements
- the contract is populated from the same agreed snapshot both parties accepted
- there is only one active negotiation model in the codebase, docs, and tests
