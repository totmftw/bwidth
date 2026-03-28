# Negotiation Flow Overhaul Spec

## Why
The current negotiation experience is fragmented across conflicting backend flows, weakly structured UI, and incomplete contract handoff. This overhaul creates a single, proposal-based negotiation system that is easier to understand, captures event-specific technical commitments earlier, and guarantees that the final contract is generated from the exact terms both parties agreed to.

## What Changes
- Replace the current field-by-field negotiation model with a proposal-based workflow built around a latest proposal snapshot.
- Capture event-specific artist tech rider requirements and artist-brought equipment during event application.
- Standardize the negotiation counterparty for event applications as artist ↔ organizer only.
- Redesign negotiation UX into a structured workspace with a visual terms board, proposal history, activity timeline, and clear diff visibility.
- Require organizer-side rider resolution and confirmation before final agreement.
- Require both artist and organizer to accept the same final proposal snapshot before contract generation.
- Persist the agreed negotiation snapshot on the booking and use it to auto-populate contract technical and logistics terms.
- Remove legacy negotiation paths and documentation that conflict with the new model.
- **BREAKING** Remove legacy assumptions that a single accept finalizes a negotiation.
- **BREAKING** Remove legacy assumptions that venue users act as the negotiation counterparty for artist event applications.
- **BREAKING** Remove legacy field-specific cost/slot/rider turn counters as the governing model.

## Impact
- Affected specs: booking application, conversation opening, negotiation workflow, booking lifecycle, contract generation, artist defaults, organizer booking operations, documentation, automated verification
- Affected code:
  - `client/src/components/GigApplicationModal.tsx`
  - `client/src/components/booking/NegotiationFlow.tsx`
  - `client/src/components/booking/*`
  - `client/src/pages/artist/ArtistBookings.tsx`
  - `client/src/pages/organizer/OrganizerBookings.tsx`
  - `client/src/pages/venue/VenueBookings.tsx`
  - `server/routes.ts`
  - `server/routes/conversations.ts`
  - `server/routes/contracts.ts`
  - `server/services/workflow.ts`
  - `server/services/contract.service.ts`
  - `server/contract-utils.ts`
  - `server/storage.ts`
  - `shared/routes.ts`
  - `shared/schema.ts`
  - `docs/CONVERSATION_API.md`
  - `docs/application-functionality.md`
  - `docs/API_DOCUMENTATION.md`
  - `docs/TECHNICAL_SPECIFICATION.md`
  - `docs/master/backend-master.md`
  - `docs/master/frontend-master.md`
  - `docs/master/api-master.md`

## ADDED Requirements

### Requirement: Event-Specific Technical Application Data
The system SHALL collect event-specific negotiation seed data when an artist applies for an event.

#### Scenario: Artist applies with per-event technical requirements
- **WHEN** an artist opens the event application flow
- **THEN** the form SHALL allow the artist to submit proposed fee, optional message, event-specific required tech rider items, and event-specific equipment the artist will bring

#### Scenario: Profile defaults assist but do not override event-specific edits
- **WHEN** the artist has profile-level technical defaults
- **THEN** the application flow SHALL prefill them as editable defaults without treating them as final event commitments

#### Scenario: Initial proposal is created from application
- **WHEN** the artist submits a valid application
- **THEN** the system SHALL create proposal version 1 representing the first negotiation snapshot for that booking

### Requirement: Proposal-Based Negotiation Source of Truth
The system SHALL treat the latest full proposal snapshot as the single source of truth for the current negotiation state.

#### Scenario: New proposal replaces the current draft
- **WHEN** either party submits a negotiation update
- **THEN** the system SHALL create a new versioned proposal snapshot rather than mutating independent field-level negotiation state

#### Scenario: Terms board shows the current proposal
- **WHEN** a participant opens the negotiation workspace
- **THEN** the workspace SHALL render the latest proposal snapshot as the current terms board

#### Scenario: Proposal history remains auditable
- **WHEN** multiple proposal versions exist
- **THEN** the system SHALL preserve ordered proposal history with actor, time, and changed terms

### Requirement: Structured Negotiation Workspace
The system SHALL provide a structured negotiation workspace for artists and organizers.

#### Scenario: Current terms are visible at a glance
- **WHEN** the negotiation workspace loads
- **THEN** the participant SHALL see the current fee, slot/stage details, artist-required rider items, artist-brought equipment, organizer-provided or arranged equipment, and current agreement status without reading raw message history

#### Scenario: Change visibility is explicit
- **WHEN** a new proposal is compared to the previous one
- **THEN** the workspace SHALL visually indicate which terms changed

#### Scenario: Structured activity remains readable
- **WHEN** actions such as proposal submission, rider confirmation, acceptance, or walk-away occur
- **THEN** the workspace SHALL show them in a chronological activity timeline

### Requirement: Organizer-Only Negotiation Counterparty
For event-application negotiations, the system SHALL treat the organizer as the only counterparty on the non-artist side.

#### Scenario: Negotiation participants resolve from booking chain
- **WHEN** a negotiation conversation is opened for an artist event application booking
- **THEN** the conversation SHALL include the artist user and organizer user as the negotiating participants

#### Scenario: Venue remains contextual only
- **WHEN** venue information exists for the event
- **THEN** the system MAY display venue information as context but SHALL NOT treat venue users as the active negotiation counterparty for that flow

### Requirement: Explicit Rider Resolution
The system SHALL require organizer-side resolution of artist-requested rider items before final agreement.

#### Scenario: Rider items require explicit resolution
- **WHEN** the artist requests technical rider items
- **THEN** the organizer SHALL mark each required item as confirmed, alternate_offered, or cannot_provide and MAY attach organizer notes

#### Scenario: Final agreement is blocked by unresolved rider items
- **WHEN** at least one artist-requested rider item is unresolved
- **THEN** the negotiation SHALL NOT become ready for final acceptance

#### Scenario: Rider confirmation is stored as structured data
- **WHEN** the organizer completes rider resolution
- **THEN** the resulting rider state SHALL be stored in the current proposal snapshot and reflected in the booking-level agreed snapshot once finalized

### Requirement: Dual Final Acceptance
The system SHALL require both parties to accept the same final proposal snapshot before contract generation.

#### Scenario: Organizer confirms rider before acceptance stage
- **WHEN** the latest proposal snapshot otherwise appears complete
- **THEN** the system SHALL require organizer rider confirmation before allowing final agreement

#### Scenario: Artist and organizer accept the same version
- **WHEN** the artist and organizer each accept the current final proposal snapshot
- **THEN** the system SHALL record acceptance against the same proposal version

#### Scenario: Booking advances only after both accepts
- **WHEN** organizer rider confirmation is complete and both parties have accepted the same current proposal snapshot
- **THEN** the booking SHALL transition from `negotiating` to `contracting`

### Requirement: Agreed Booking Snapshot for Contract Handoff
The system SHALL persist the final agreed negotiation snapshot on the booking and use it as the canonical contract input.

#### Scenario: Agreed snapshot is stored on booking
- **WHEN** final agreement is reached
- **THEN** the system SHALL store the agreed version number, agreement metadata, and full agreed proposal snapshot under a dedicated booking metadata key

#### Scenario: Backward compatibility mirrors remain derived
- **WHEN** the system writes compatibility metadata such as final slot, tech rider, or terms
- **THEN** those values SHALL be derived from the agreed negotiation snapshot rather than authored independently

#### Scenario: Contract generation reads the agreed snapshot
- **WHEN** contract initiation or generation occurs
- **THEN** the contract service SHALL read technical and logistics terms from the agreed booking negotiation snapshot first

### Requirement: Negotiation Safety and Validation
The system SHALL reject inconsistent finalization states.

#### Scenario: Contract initiation blocked without agreement
- **WHEN** no agreed booking negotiation snapshot exists
- **THEN** contract initiation SHALL fail with a clear validation error

#### Scenario: Contract initiation blocked for incomplete rider confirmation
- **WHEN** rider confirmation is incomplete
- **THEN** contract initiation SHALL fail with a clear validation error

#### Scenario: Legacy UI cannot bypass negotiation rules
- **WHEN** a user reaches booking or venue surfaces that previously bypassed negotiation flow
- **THEN** those surfaces SHALL respect the new negotiation and contract handoff rules

## MODIFIED Requirements

### Requirement: Conversation Opening for Negotiation
The system SHALL open booking negotiation conversations through a single service-backed initialization path that creates state compatible with the active workflow model.

#### Scenario: Conversation opening is idempotent
- **WHEN** a participant opens the same booking negotiation multiple times
- **THEN** the system SHALL return the existing conversation instead of creating duplicates

#### Scenario: Workflow state is initialized by the negotiation service
- **WHEN** a booking negotiation conversation is created
- **THEN** the system SHALL initialize workflow context through the negotiation service rather than creating partial route-local state

### Requirement: Booking Application to Negotiation Handoff
The system SHALL convert event applications into negotiation-ready bookings with structured proposal data.

#### Scenario: Application creates negotiation-ready state
- **WHEN** an artist successfully applies for an event
- **THEN** the booking SHALL be created with enough metadata and proposal history to open the new negotiation workspace without reconstruction from legacy history

### Requirement: Contract Term Extraction
The system SHALL derive contract technical and negotiation-driven terms from the agreed booking snapshot.

#### Scenario: Technical clauses reflect agreed rider details
- **WHEN** the contract terms object is built
- **THEN** technical clauses SHALL include artist-brought equipment and organizer-confirmed or arranged rider commitments from the agreed negotiation snapshot

#### Scenario: Slot and negotiated logistics remain consistent
- **WHEN** the contract is generated
- **THEN** slot and negotiation-driven logistics SHALL reflect the agreed booking snapshot rather than stale booking metadata

### Requirement: Artist Technical Profile Data
The system SHALL treat artist profile technical data as reusable defaults, not as automatic booking truth.

#### Scenario: Booking-specific edits take precedence
- **WHEN** profile defaults differ from event-specific negotiation data
- **THEN** the event-specific data SHALL control the booking and contract output

## REMOVED Requirements

### Requirement: Single-Party Acceptance Finalization
**Reason**: A single accept can finalize terms that the other party did not explicitly confirm under the new operational model.
**Migration**: Replace single finalization with organizer rider confirmation plus same-version dual acceptance.

### Requirement: Field-Specific Round and Lock Model as Primary Negotiation Logic
**Reason**: Independent cost/slot/rider counters hide the actual agreement state and make the workflow hard to understand.
**Migration**: Replace field-specific negotiation control with versioned full proposal snapshots and explicit status transitions.

### Requirement: Venue as Negotiation Counterparty for Artist Event Applications
**Reason**: The target product flow is artist ↔ organizer, with venue remaining contextual rather than contractual in negotiation.
**Migration**: Keep venue data visible where useful, but remove venue participation from the active negotiation counterparty path for artist event application bookings.

### Requirement: Legacy Booking Negotiation Endpoints as Active Source of Truth
**Reason**: Duplicate negotiation APIs create drift in behavior, tests, and documentation.
**Migration**: Deprecate and remove legacy booking negotiation actions after the new shared, conversation-backed negotiation API is in place and adopted by the UI.
