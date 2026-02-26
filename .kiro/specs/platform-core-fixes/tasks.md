# Implementation Plan: Platform Core Fixes

## Overview

Incremental fixes to the existing PERN stack codebase, organized by subsystem. Each task builds on previous tasks. Schema/enum fixes come first since other fixes depend on correct enum values. Then auth/profile, then conversations/workflow, then contracts.

## Tasks

- [x] 1. Schema enum consistency and migration
  - [x] 1.1 Verify `bookingStatusEnum` and `contractStatusEnum` in `shared/schema.ts` include "contracting" and "admin_review" respectively
    - Confirm the Drizzle enum arrays already contain these values (they should based on current schema)
    - If missing, add them to the enum value arrays
    - _Requirements: 11.1, 11.2, 12.1, 12.2_
  - [x] 1.2 Create SQL migration to add enum values to live PostgreSQL
    - Create a new migration file in `migrations/` with `ALTER TYPE` statements
    - Use conditional `DO $$ BEGIN ... END $$` blocks to avoid errors if values already exist
    - Add "contracting" to `booking_status` enum and "admin_review" to `contract_status` enum
    - _Requirements: 11.4, 12.4_

- [x] 2. Auth system — registration role mapping
  - [x] 2.1 Fix role normalization in `POST /api/register` handler in `server/auth.ts`
    - Map `role: "venue"` to store `metadata.role = "venue_manager"`
    - Default to "artist" when no role is specified
    - Ensure organizer registration always creates a promoter record via `storage.createOrganizer()` even without `roleData`
    - Update the role-specific data creation block to use the normalized role for venue creation
    - _Requirements: 1.1, 1.2, 1.5_
  - [x] 2.2 Write property tests for role registration mapping
    - **Property 1: Role registration mapping preserves consistency**
    - **Validates: Requirements 1.1, 1.2, 1.5**

- [x] 3. Role resolver consistency
  - [x] 3.1 Fix `getUserRole` function in `client/src/App.tsx`
    - Check `metadata.role` first, normalize "venue" to "venue_manager"
    - Fall back to profile entities (venue, organizer, artist)
    - Default to "artist"
    - _Requirements: 1.3, 1.4_
  - [x] 3.2 Fix `useVenueStatus` hook in `client/src/App.tsx`
    - Ensure `enabled` flag checks for both "venue_manager" and "venue" roles (already correct, verify)
    - _Requirements: 1.6_
  - [x] 3.3 Fix `getUserRole` in `server/routes/contracts.ts`
    - Ensure "venue_manager" and "organizer" both map to "promoter" side
    - _Requirements: 1.4_
  - [x] 3.4 Write property tests for role resolver
    - **Property 2: Role resolver treats venue and venue_manager identically**
    - **Validates: Requirements 1.3, 1.4**

- [x] 4. Checkpoint — Verify auth and role fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Artist profile completion fixes
  - [x] 5.1 Fix `POST /api/artists/profile/complete` in `server/routes.ts`
    - Verify Zod schema `artistProfileCompleteSchema` field names match what the frontend wizard sends
    - Ensure upsert logic: check `getArtistByUserId` first, update if exists, create if not
    - Ensure `metadata.profileComplete = true` is set on both create and update paths
    - Verify role check uses `user.role` or `user.metadata?.role`
    - _Requirements: 2.1, 2.2, 2.6_
  - [x] 5.2 Verify `GET /api/artists/profile/status` in `server/routes.ts`
    - Ensure it returns `{ isComplete: true }` only when `artist.metadata.profileComplete === true`
    - _Requirements: 2.3_
  - [x] 5.3 Write property tests for artist profile completion
    - **Property 3: Artist profile completion round-trip**
    - **Property 4: Artist profile upsert idempotence**
    - **Property 5: Invalid artist profile data returns field-level errors**
    - **Validates: Requirements 2.2, 2.3, 2.5, 2.6**

- [x] 6. Venue profile completion fixes
  - [x] 6.1 Fix `POST /api/venues/profile/complete` in `server/routes.ts`
    - Add explicit role authorization check: allow "venue_manager", "venue", and "organizer"
    - Verify Zod schema `venueProfileCompleteSchema` field names match the 7-step wizard
    - Ensure upsert logic: check `getVenueByUserId` first, update if exists, create if not
    - Ensure `metadata.profileComplete = true` is set on both paths
    - _Requirements: 3.1, 3.2, 3.5_
  - [x] 6.2 Verify `GET /api/venues/profile/status` in `server/routes.ts`
    - Ensure it returns `{ isComplete: true }` only when `venue.metadata.profileComplete === true`
    - _Requirements: 3.3_
  - [x] 6.3 Write property tests for venue profile completion
    - **Property 6: Venue profile completion round-trip**
    - **Property 7: Invalid venue profile data returns field-level errors**
    - **Validates: Requirements 3.2, 3.3, 3.5, 3.6**

- [x] 7. Checkpoint — Verify profile fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Conversation system — participant resolution
  - [x] 8.1 Fix conversation open endpoint in `server/routes/conversations.ts`
    - Use `storage.getBookingWithDetails()` to get full booking chain (artist, event, organizer, venue)
    - Resolve artist userId from `booking.artist.userId`
    - Resolve organizer userId from `booking.organizer.userId` (via event.organizerId → promoter)
    - Add fallback: if no organizer, use `booking.venue.userId` (venue manager)
    - Deduplicate participant IDs with `new Set()`
    - Return 400 if booking has no artistId
    - _Requirements: 4.1, 4.2, 4.5, 4.6_
  - [x] 8.2 Fix conversation idempotency and workflow initialization
    - Ensure existing conversation is returned without creating duplicate
    - Create workflow instance with `currentNodeKey` = initial state, `round` = 0, `locked` = false
    - Set `awaitingUserId` to the artist (artist acts first in negotiation)
    - _Requirements: 4.3, 4.4_
  - [x] 8.3 Write property tests for conversation system
    - **Property 8: Conversation opening resolves correct participants**
    - **Property 9: Conversation opening is idempotent**
    - **Property 10: New negotiation conversations have correct initial workflow state**
    - **Validates: Requirements 4.1, 4.3, 4.4, 4.6**

- [x] 9. Negotiation workflow state machine fixes
  - [x] 9.1 Fix `handleAction` in `server/services/workflow.ts`
    - Use `wfInstance.round` and `wfInstance.maxRounds` from table columns instead of `context.rounds` / `context.maxRounds`
    - Fix ACCEPT to set booking status to "contracting" instead of "confirmed"
    - Fix PROPOSE_CHANGE to update `booking.offerAmount` when payload includes `offerAmount`
    - Ensure locked workflow check rejects all actions
    - Ensure each action inserts message with `messageType: "action"`, `actionKey`, `payload`, `round`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_
  - [x] 9.2 Write property tests for workflow state machine
    - **Property 11: Workflow turn-taking enforcement**
    - **Property 12: PROPOSE_CHANGE increments round and swaps turn**
    - **Property 13: Max rounds enforcement**
    - **Property 14: Terminal negotiation actions update booking status correctly**
    - **Property 15: Workflow actions produce action messages**
    - **Property 16: Locked workflow rejects all actions**
    - **Property 17: PROPOSE_CHANGE with offerAmount updates booking**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8**

- [x] 10. Message display and negotiation mode enforcement
  - [x] 10.1 Fix message ordering and access control in `server/routes/conversations.ts`
    - Verify messages are returned in chronological order (oldest first) — currently uses `desc` then `.reverse()`, confirm this works correctly
    - Verify participant check returns 403 for non-participants
    - Verify negotiation mode rejects free-text messages with 400
    - Verify system messages have `senderId: null` and `messageType: "system"`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 10.2 Write property tests for message system
    - **Property 18: Messages returned in chronological order**
    - **Property 19: Non-participants cannot access messages**
    - **Property 20: Negotiation conversations reject free-text messages**
    - **Property 21: System messages have null sender and system type**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4**

- [x] 11. Checkpoint — Verify conversation and workflow fixes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Contract initiation fixes
  - [x] 12.1 Verify contract initiation endpoint in `server/routes/contracts.ts`
    - Confirm `POST /api/bookings/:bookingId/contract/initiate` generates contract text with core terms from booking
    - Confirm 48-hour deadline is set correctly (`deadlineAt = initiatedAt + 48h`)
    - Confirm version 1 record is created in `contract_versions`
    - Confirm idempotency: existing contract returned without duplicate
    - Confirm system message posted with deadline info
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  - [x] 12.2 Write property tests for contract initiation
    - **Property 22: Contract text contains core terms from booking**
    - **Property 23: Contract initiation sets 48-hour deadline**
    - **Property 24: Contract initiation creates version 1**
    - **Property 25: Contract initiation is idempotent**
    - **Validates: Requirements 7.2, 7.3, 7.4, 7.5**

- [x] 13. Contract review and edit workflow fixes
  - [x] 13.1 Verify contract review endpoint in `server/routes/contracts.ts`
    - Confirm ACCEPT_AS_IS marks review done with timestamp
    - Confirm PROPOSE_EDITS creates edit request, marks review done, sets edit used flag
    - Confirm one-time edit enforcement (reject if already used)
    - Confirm pending edit blocks accept/sign
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 13.2 Verify edit response endpoint in `server/routes/contracts.ts`
    - Confirm APPROVE deep-merges changes, creates new version, regenerates text
    - Confirm REJECT keeps current version, posts system message
    - _Requirements: 8.5, 8.6_
  - [x] 13.3 Verify contract validation logic in `server/routes/contracts.ts`
    - Confirm locked fields are rejected
    - Confirm payment milestone percentages must sum to 100%
    - Confirm cancellation penalties must be 0-100%
    - Confirm check-in time must be before check-out time
    - _Requirements: 8.7, 8.8_
  - [x] 13.4 Write property tests for contract review and edit
    - **Property 26: One-time edit enforcement**
    - **Property 27: Pending edits block accept and sign**
    - **Property 28: Edit approval creates new version with merged terms**
    - **Property 29: Edit rejection preserves current version**
    - **Property 30: Locked fields cannot be modified**
    - **Property 31: Contract edit validation rules**
    - **Validates: Requirements 8.3, 8.4, 8.5, 8.6, 8.7, 8.8**

- [x] 14. Contract acceptance and signing fixes
  - [x] 14.1 Verify contract accept and sign endpoints in `server/routes/contracts.ts`
    - Confirm review-before-accept enforcement
    - Confirm accept-before-sign enforcement (EULA checkpoint)
    - Confirm signature data recorded (data, type, IP, user agent)
    - Confirm dual signature sets status to "admin_review" and `signedAt`
    - Confirm deadline check rejects all actions after expiry
    - Confirm pending edits block accept and sign
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - [x] 14.2 Write property tests for contract acceptance and signing
    - **Property 32: Contract lifecycle ordering enforcement**
    - **Property 33: Signature data completeness**
    - **Property 34: Dual signature triggers admin_review and sets signedAt**
    - **Property 35: Expired deadline rejects all contract actions**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**

- [x] 15. Contract deadline enforcement fixes
  - [x] 15.1 Verify deadline enforcement endpoint in `server/routes/contracts.ts`
    - Confirm `POST /api/contracts/check-deadlines` voids expired contracts
    - Confirm associated bookings are cancelled with `meta.cancelReason = "contract_deadline_expired"`
    - Confirm system message posted for voided contracts
    - Confirm voided contracts reject all further actions
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 15.2 Write property tests for deadline enforcement
    - **Property 36: Deadline enforcement voids contracts and cancels bookings**
    - **Property 37: Voided contracts reject further actions**
    - **Validates: Requirements 10.1, 10.2, 10.4**

- [x] 16. Final checkpoint — Verify all fixes
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases using Vitest
- The schema enums are already correct in Drizzle — the migration handles the live database
