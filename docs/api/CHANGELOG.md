# API Changelog

## [Unreleased] --- 2026-04-03

### Added
- Image upload module with drag-drop, file browse, and URL input supporting multi-image uploads
- WebSocket real-time chat replacing HTTP polling for negotiation conversations
- Genre filter pills on the Find Gigs page for quick event filtering by music genre
- Fee guidance hints displayed in the artist application modal (suggested range based on event budget)
- Profile completion progress bar with section-level checklist for artists and organizers
- Negotiating stats card added as 5th card in the artist KPI strip on Dashboard
- Contract scroll enforcement requiring users to read the full contract before accepting
- PAN/GSTIN warning banner on contract pages for tax compliance awareness
- Real-time username availability check during registration (debounced server lookup)
- Organizer dashboard pending actions panel populated with real booking data
- Notification system infrastructure including event bus, notification types table, and templates
- User-level WebSocket authentication for secure push notifications
- Booking proposals table (`booking_proposals`) for versioned negotiation tracking
- Conversation workflow instances table for structured chat state machines
- Contract version history table (`contract_versions`) for edit audit trails
- Contract edit requests table (`contract_edit_requests`) for sequential edit workflow
- Contract signatures table (`contract_signatures`) with IT Act 2000 compliance logging
- Artist category system with history tracking and commission policies
- Media table for centralized file/image storage with entity association
- Message reads table for read-receipt tracking

### Changed
- Negotiation step deadline extended from 24 hours to 72 hours
- Contract "Accept As-Is" button split into two-step flow: "Scroll to Read" then "Accept As-Is"
- Registration role switch now preserves common fields (email, name, phone) when toggling roles
- Auth "Already signed in" page now shows role badge and user avatar
- Negotiation system overhauled to use proposal versioning with `bookingProposals` table and round tracking
- Contract schema expanded with sequential edit workflow fields (`editPhase`, `artistEditUsed`, `promoterEditUsed`, signature timestamps, admin review fields)
- Booking schema expanded with financial breakdown fields (`grossBookingValue`, `artistFee`, `organizerFee`, commission percentages, `platformRevenue`)
- Booking flow deadline tracking added (`flowStartedAt`, `flowDeadlineAt`, `flowExpiredAt`, `flowExpiredReason`)

### Fixed
- Event card location showing "TBD" instead of actual venue address (now extracts from venue JSONB address field)
- Organizer setup wizard skipping Step 3 (now properly shows completion screen)
- Tech rider badges showing "pending" after rider lock (now correctly display "confirmed")
- Booking card displaying stale offer amount (resolved via TanStack Query cache invalidation)
- Profile setup re-prompting users who had already completed their profiles
- Navigation and mobile nav layout issues across all role dashboards
- Currency display inconsistencies on booking and event cards
- Contract signing flow errors and state transition bugs
- Bookings tab filtering and sorting for artist and organizer views

## [1.0.1] --- 2026-04-01
### Changed
- Migrated Admin APIs from `/admin/*` to `/api/admin/*` to remove frontend route collisions on `/admin`.
- Updated admin user management endpoints to `/api/admin/users`, `/api/admin/users/:id/status`, and `/api/admin/users/:id/role`.
- Updated admin contract endpoints to `/api/admin/contracts/pending` and `/api/admin/contracts/:id/review`.
- Updated admin conversation endpoints to `/api/admin/conversations` and `/api/admin/conversations/:id/messages`.
- Updated admin settings endpoints to `/api/admin/settings`.

## [1.0.0]
### Added
- Created comprehensive API footprint mapping Artists, Promoters, Events, and Bookings.
- Defined base endpoints for authentication (`/api/login`, `/api/register`, `/api/user`, `/api/logout`).
- Implemented `/admin` tier for universal oversight.
- Implemented state-managed workflow execution steps mapped to `/api/bookings/:id/negotiate`.
- Established `/organizer` dashboard data routes.
- Initial API release.
