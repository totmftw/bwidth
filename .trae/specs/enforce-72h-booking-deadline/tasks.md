# Tasks

- [x] Task 1: Database Schema Updates
  - [x] SubTask 1.1: Update `shared/schema.ts` to add `flowStartedAt`, `flowDeadlineAt`, `flowExpiredAt`, and `flowExpiredReason` to the `bookings` table.
  - [x] SubTask 1.2: Generate and apply the Drizzle migration for the new booking fields.

- [x] Task 2: Booking Creation Logic
  - [x] SubTask 2.1: Update `server/routes.ts` organizer booking creation to set `flowStartedAt` and `flowDeadlineAt` (+72h).
  - [x] SubTask 2.2: Update `server/routes.ts` artist application flow to set `flowStartedAt` and `flowDeadlineAt` (+72h).

- [x] Task 3: Centralized Expiration Logic
  - [x] SubTask 3.1: Implement `expireBookingFlow(bookingId, reason)` in `server/services/booking.service.ts` that sets the status to cancelled, records the expiration timestamps, and creates an audit log.

- [x] Task 4: Enforce Deadline in Negotiation
  - [x] SubTask 4.1: Add a deadline check at the beginning of `submitProposal`, `confirmRider`, `finalAccept`, and `walkAway` in `server/services/negotiation.service.ts`.
  - [x] SubTask 4.2: If the deadline has passed, invoke `expireBookingFlow` and throw a clear error message.

- [x] Task 5: Enforce Deadline in Contracts
  - [x] SubTask 5.1: Add a deadline check in `server/routes/contracts.ts` for contract initiation (`/bookings/:bookingId/contract/initiate`).
  - [x] SubTask 5.2: Add a deadline check in contract signing and editing endpoints. If expired, invoke `expireBookingFlow`.

- [x] Task 6: UI Updates (Optional but recommended)
  - [x] SubTask 6.1: Expose `flowDeadlineAt` in the booking API payload.
  - [x] SubTask 6.2: Display the remaining time or deadline in `client/src/components/booking/NegotiationFlow.tsx`.

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 3
- Task 5 depends on Task 3
- Task 6 depends on Task 1