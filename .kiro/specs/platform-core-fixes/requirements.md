# Requirements Document

## Introduction

This document specifies the requirements for fixing three major areas of the music artist management platform: Profile Creation, Chat/Messaging (Negotiation), and Contract Functionality. The platform is a PERN stack application (PostgreSQL, Express, React, Node.js) using Drizzle ORM. Each area has identified bugs and inconsistencies between the frontend, backend, and database schema that prevent correct end-to-end operation.

## Glossary

- **Platform**: The music artist management web application
- **Profile_Wizard**: The multi-step form used by artists or venues to complete their profile setup
- **Auth_System**: The Passport.js-based authentication and session management subsystem
- **Role_Resolver**: The logic that determines a user's role from `user.metadata.role` and maps it to routing and authorization decisions
- **Conversation_System**: The entity-bound conversation subsystem supporting negotiation and direct messaging
- **Workflow_Engine**: The state machine service (`server/services/workflow.ts`) that manages negotiation turn-taking and actions
- **Contract_System**: The contract lifecycle subsystem handling initiation, review, editing, acceptance, signing, and admin review
- **Contract_Text_Generator**: The function that produces contract text from booking terms and editable categories
- **Booking**: A record linking an artist to an event, tracking negotiation status and financial terms
- **Organizer**: A promoter or organizer entity that creates events and books artists (stored in `promoters` table)
- **Venue_Manager**: A user with role `venue_manager` who manages a venue profile
- **Deadline_Enforcer**: The logic that voids contracts and cancels bookings when the 48-hour signing window expires

## Requirements

### Requirement 1: Role Assignment and Resolution Consistency

**User Story:** As a user registering on the platform, I want my role to be consistently stored and resolved, so that I am routed to the correct dashboard and granted appropriate permissions.

#### Acceptance Criteria

1. WHEN a user registers with role "venue", THE Auth_System SHALL store `venue_manager` in `user.metadata.role` to match the `role_name` enum and venue-specific authorization checks
2. WHEN a user registers with role "organizer", THE Auth_System SHALL store "organizer" in `user.metadata.role` and create a corresponding record in the `promoters` table via `storage.createOrganizer`
3. WHEN the Role_Resolver determines a user's role, THE Platform SHALL check `user.metadata.role` first, then fall back to attached profile entities (artist, organizer, venue), producing a single canonical role string
4. WHEN a user with role "venue" or "venue_manager" accesses the platform, THE Role_Resolver SHALL treat both values identically for routing and authorization decisions
5. IF a user registers without specifying a role, THEN THE Auth_System SHALL default to "artist" and store it in `user.metadata.role`
6. WHEN the `useVenueStatus` hook checks profile completion, THE Platform SHALL enable the query for users whose role is either "venue_manager" or "venue"

### Requirement 2: Artist Profile Creation and Setup Wizard

**User Story:** As an artist, I want to complete my profile through the multi-step setup wizard, so that my profile is marked complete and I can access the full platform.

#### Acceptance Criteria

1. WHEN an artist submits the profile setup wizard, THE Platform SHALL send all wizard fields to `POST /api/artists/profile/complete` with the correct field names matching `artistProfileCompleteSchema`
2. WHEN the server receives a valid artist profile completion request, THE Platform SHALL create or update the artist record with `metadata.profileComplete = true`
3. WHEN the artist profile status endpoint is called, THE Platform SHALL return `{ isComplete: true }` only when `artist.metadata.profileComplete === true`
4. WHEN an artist has completed their profile, THE Platform SHALL redirect the artist from `/profile/setup` to `/dashboard` without requiring a page refresh
5. IF the artist profile completion request fails validation, THEN THE Platform SHALL return a 400 response with specific field-level error messages from Zod validation
6. WHEN an artist record already exists for the user, THE Platform SHALL update the existing record rather than creating a duplicate

### Requirement 3: Venue Profile Creation and Setup Wizard

**User Story:** As a venue manager, I want to complete my venue profile through the 7-step setup wizard, so that my venue is listed and I can receive booking requests.

#### Acceptance Criteria

1. WHEN a venue manager submits the venue profile setup wizard, THE Platform SHALL send all 7 steps of data to `POST /api/venues/profile/complete` with fields matching `venueProfileCompleteSchema`
2. WHEN the server receives a valid venue profile completion request, THE Platform SHALL create or update the venue record with `metadata.profileComplete = true`
3. WHEN the venue profile status endpoint is called, THE Platform SHALL return `{ isComplete: true }` only when `venue.metadata.profileComplete === true`
4. WHEN a venue manager has completed their profile, THE Platform SHALL redirect from `/venue/setup` to `/dashboard`
5. WHEN the venue profile completion endpoint receives a request, THE Platform SHALL accept requests from users with role "venue_manager", "venue", or "organizer" without returning a 403 error
6. IF the venue profile completion request fails validation, THEN THE Platform SHALL return a 400 response with specific field-level error messages

### Requirement 4: Conversation Opening and Participant Resolution

**User Story:** As a promoter or artist involved in a booking, I want to open a negotiation conversation, so that I can begin the structured negotiation workflow.

#### Acceptance Criteria

1. WHEN a user opens a negotiation conversation for a booking, THE Conversation_System SHALL resolve both the artist user ID and the organizer user ID from the booking and event records
2. WHEN the booking's event has no organizer (e.g., direct venue booking), THE Conversation_System SHALL fall back to the booking creator or venue manager as the second participant
3. WHEN a conversation already exists for the given entity type, entity ID, and conversation type, THE Conversation_System SHALL return the existing conversation without creating a duplicate
4. WHEN a new negotiation conversation is created, THE Conversation_System SHALL create a workflow instance with `currentNodeKey` set to an initial state and `round` set to 0
5. IF the booking has no artist ID, THEN THE Conversation_System SHALL return a 400 error with message "Booking has no artist"
6. WHEN a conversation is created, THE Conversation_System SHALL add all resolved participant user IDs without duplicates

### Requirement 5: Negotiation Workflow State Machine

**User Story:** As a participant in a booking negotiation, I want the workflow to enforce turn-taking and round limits, so that negotiations proceed in an orderly manner.

#### Acceptance Criteria

1. WHEN a user submits a workflow action, THE Workflow_Engine SHALL verify that the user is the `awaitingUserId` before processing the action
2. WHEN a `PROPOSE_CHANGE` action is submitted, THE Workflow_Engine SHALL increment the round counter and swap `awaitingUserId` to the other participant
3. WHEN the round counter reaches `maxRounds` (default 3), THE Workflow_Engine SHALL reject `PROPOSE_CHANGE` actions and only allow `ACCEPT` or `DECLINE`
4. WHEN an `ACCEPT` action is submitted, THE Workflow_Engine SHALL set the booking status to "contracting" (not "confirmed") and set `currentNodeKey` to "ACCEPTED"
5. WHEN a `DECLINE` action is submitted, THE Workflow_Engine SHALL set the booking status to "cancelled" and set `currentNodeKey` to "DECLINED"
6. WHEN a workflow action is processed, THE Workflow_Engine SHALL insert a message of type "action" with the action key, payload, and current round number
7. WHEN the workflow instance is locked, THE Workflow_Engine SHALL reject all actions with an appropriate error message
8. WHEN a `PROPOSE_CHANGE` action includes an `offerAmount`, THE Workflow_Engine SHALL update the booking's `offerAmount` field to reflect the latest proposal

### Requirement 6: Negotiation Message Display and Polling

**User Story:** As a participant in a negotiation, I want to see all messages in chronological order and receive updates, so that I can follow the conversation flow.

#### Acceptance Criteria

1. WHEN a user requests messages for a conversation, THE Conversation_System SHALL return messages in chronological order (oldest first) with sender information
2. WHEN a user requests messages, THE Conversation_System SHALL verify the user is a participant in the conversation before returning messages
3. WHEN a negotiation conversation is active, THE Platform SHALL reject free-text messages with a 400 error and message "Free text not allowed in this mode. Use actions."
4. WHEN a system event occurs (negotiation accepted, declined, or state change), THE Conversation_System SHALL insert a system message with `senderId` set to null and `messageType` set to "system"

### Requirement 7: Contract Initiation from Negotiation

**User Story:** As a promoter, I want a contract to be generated when a negotiation is accepted, so that both parties can review and sign the agreement.

#### Acceptance Criteria

1. WHEN a booking reaches "contracting" status, THE Contract_System SHALL allow contract initiation via `POST /api/bookings/:bookingId/contract/initiate`
2. WHEN a contract is initiated, THE Contract_Text_Generator SHALL populate core terms (fee, date, venue, artist name) from the booking and event records
3. WHEN a contract is initiated, THE Contract_System SHALL set a 48-hour deadline from the initiation time
4. WHEN a contract is initiated, THE Contract_System SHALL create a version 1 record in `contract_versions` with the generated text and structured terms
5. IF a contract already exists for the booking, THEN THE Contract_System SHALL return the existing contract without creating a duplicate
6. WHEN a contract is initiated, THE Contract_System SHALL post a system message to the contract conversation with the deadline information

### Requirement 8: Contract Review and Edit Workflow

**User Story:** As a party to a contract, I want to review the contract and optionally propose edits, so that both parties can agree on the final terms.

#### Acceptance Criteria

1. WHEN a party reviews the contract with action "ACCEPT_AS_IS", THE Contract_System SHALL mark that party's review as done and record the timestamp
2. WHEN a party reviews the contract with action "PROPOSE_EDITS", THE Contract_System SHALL create an edit request, mark the party's review as done, and set their one-time edit as used
3. WHEN a party has already used their one-time edit, THE Contract_System SHALL reject further edit proposals with a 400 error
4. WHEN an edit request is pending, THE Contract_System SHALL prevent the other party from accepting or signing until the edit is resolved
5. WHEN the responding party approves an edit request, THE Contract_System SHALL deep-merge the changes into current terms, create a new contract version, and regenerate the contract text
6. WHEN the responding party rejects an edit request, THE Contract_System SHALL keep the contract on the current version and post a system message
7. THE Contract_System SHALL reject any changes to locked fields (fee, totalFee, currency, eventDate, eventTime, slotType, venueName, artistName, organizerName, performanceDuration, platformCommission)
8. WHEN validating edit changes, THE Contract_System SHALL verify that payment milestone percentages sum to 100%, cancellation penalties are between 0-100%, and check-in time is before check-out time

### Requirement 9: Contract Acceptance and Signing

**User Story:** As a party to a contract, I want to accept the terms and sign the contract, so that the booking can proceed to the confirmed stage.

#### Acceptance Criteria

1. WHEN a party accepts the contract, THE Contract_System SHALL require that the party has completed their review first
2. WHEN a party signs the contract, THE Contract_System SHALL require that the party has accepted the contract first (EULA checkpoint)
3. WHEN a party signs the contract, THE Contract_System SHALL record the signature data, type (drawn/typed/uploaded), IP address, and user agent
4. WHEN both parties have signed, THE Contract_System SHALL set the contract status to "admin_review" and post a system message
5. WHEN both parties have signed, THE Contract_System SHALL set `signedAt` to the current timestamp
6. IF the 48-hour deadline has passed, THEN THE Contract_System SHALL reject all review, accept, and sign actions with a "deadline passed" error
7. IF there are pending edit requests, THEN THE Contract_System SHALL reject accept and sign actions

### Requirement 10: Contract Deadline Enforcement

**User Story:** As a platform administrator, I want contracts that are not signed within 48 hours to be automatically voided, so that stale bookings do not block the system.

#### Acceptance Criteria

1. WHEN the deadline check runs, THE Deadline_Enforcer SHALL void all contracts with status "sent" whose `deadlineAt` is in the past
2. WHEN a contract is voided due to deadline expiry, THE Deadline_Enforcer SHALL set the associated booking status to "cancelled" with meta indicating "contract_deadline_expired"
3. WHEN a contract is voided, THE Deadline_Enforcer SHALL post a system message to the contract conversation
4. WHEN a voided contract is accessed, THE Contract_System SHALL return the contract data with voided status and reject further actions

### Requirement 11: Booking Status Enum Consistency

**User Story:** As a developer, I want the booking status enum to include the "contracting" status, so that the negotiation-to-contract transition works without database errors.

#### Acceptance Criteria

1. THE Platform SHALL include "contracting" in the `booking_status` PostgreSQL enum type
2. WHEN the Drizzle ORM schema defines `bookingStatusEnum`, THE Platform SHALL include "contracting" in the enum values array
3. WHEN a negotiation is accepted, THE Platform SHALL transition the booking status to "contracting" without triggering a database enum violation error
4. THE Platform SHALL create a database migration to add "contracting" to the existing `booking_status` enum if it is not already present

### Requirement 12: Contract Status Enum Consistency

**User Story:** As a developer, I want the contract status enum to include the "admin_review" status, so that the dual-signature-to-admin-review transition works without database errors.

#### Acceptance Criteria

1. THE Platform SHALL include "admin_review" in the `contract_status` PostgreSQL enum type
2. WHEN the Drizzle ORM schema defines `contractStatusEnum`, THE Platform SHALL include "admin_review" in the enum values array
3. WHEN both parties sign a contract, THE Platform SHALL transition the contract status to "admin_review" without triggering a database enum violation error
4. THE Platform SHALL create a database migration to add "admin_review" to the existing `contract_status` enum if it is not already present
