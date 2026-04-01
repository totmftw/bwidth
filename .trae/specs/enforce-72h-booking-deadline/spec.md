# Enforce 72h Booking Deadline Spec

## Why
The platform needs to ensure that the entire booking lifecycle—from initial inquiry or application to final contract signing—is completed within a strict 72-hour window. This prevents bookings from lingering in a "negotiating" or "contracting" state indefinitely and provides a clear SLA for both artists and organizers.

## What Changes
- Add `flow_started_at`, `flow_deadline_at`, `flow_expired_at`, and `flow_expired_reason` to the `bookings` table.
- Set `flow_started_at` to the current time and `flow_deadline_at` to 72 hours later whenever a new booking is created (both organizer-initiated and artist-applied).
- Add a centralized `expireBookingFlow` method in the booking service to handle the cancellation logic when a booking expires.
- Intercept all negotiation actions (`propose`, `confirmRider`, `finalAccept`, `walkAway`) to block them if the current time exceeds `flow_deadline_at` and automatically mark the booking as expired.
- Intercept contract actions (`initiate`, `sign`, edit requests) to enforce the same 72-hour deadline.
- Update the frontend UI (Negotiation Workspace and Contract Viewer) to display the remaining time or a deadline indicator.

## Impact
- Affected specs: Booking creation, Negotiation workflow, Contract workflow.
- Affected code:
  - `shared/schema.ts`
  - Database Migrations
  - `server/routes.ts`
  - `server/services/booking.service.ts` (new expire logic)
  - `server/services/negotiation.service.ts`
  - `server/routes/contracts.ts`
  - `client/src/components/booking/NegotiationFlow.tsx`

## ADDED Requirements
### Requirement: 72-Hour Deadline Enforcement
The system SHALL strictly enforce a 72-hour deadline from the moment a booking is created until the final contract is signed.

#### Scenario: Action attempted after deadline
- **WHEN** a user attempts to propose, accept, or sign a contract after `flow_deadline_at` has passed
- **THEN** the system blocks the action, returns a 400 error, and automatically marks the booking as expired/cancelled with an audit log.

## MODIFIED Requirements
### Requirement: Booking Creation
- The system SHALL automatically populate `flow_started_at` and `flow_deadline_at` (72 hours from creation) for every new booking.

## REMOVED Requirements
None.
