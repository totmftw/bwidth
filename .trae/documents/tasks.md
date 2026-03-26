# Implementation Tasks

## Task 1: Database Schema & Migrations
- [ ] Update `shared/schema.ts` with new enums (`artist_category`, `artist_category_source`).
- [ ] Add new fields to `artists` table in schema.
- [ ] Create `artist_category_history` table in schema.
- [ ] Create `commission_policies` table in schema.
- [ ] Add snapshot and financial fields to `bookings` table in schema.
- [ ] Add snapshot, JSON, and version fields to `contracts` table in schema.
- [ ] Generate and run database migrations (`drizzle-kit generate` and `drizzle-kit push`/migrate).

## Task 2: Data Backfill Script
- [ ] Write `server/scripts/backfill-artist-categories.ts` to assign `custom` or `mid_scale` to existing artists.
- [ ] Run the script on the database.

## Task 3: Backend Services - Category & Commission
- [ ] Create `server/services/artistCategory.service.ts`.
  - [ ] Implement `suggestCategory` logic based on onboarding data.
  - [ ] Implement `saveCategory` and `overrideCategory` logic with history tracking.
- [ ] Create `server/services/commissionPolicy.service.ts`.
  - [ ] Implement `getCommissionSplit` based on category.
  - [ ] Implement `applyTrustTierModifier` for adjustments.
  - [ ] Implement `calculateBookingMath` for double-sided monetization breakdown.

## Task 4: Backend Services - Bookings & Contracts
- [ ] Refactor booking confirmation logic in `server/services/booking.service.ts` (or equivalent utility).
  - [ ] Calculate and freeze financial numbers and categories into the booking record.
- [ ] Refactor contract generation in `server/services/contract.service.ts` (or `server/contract-utils.ts`).
  - [ ] Use booking snapshots to populate contract fields.
  - [ ] Dynamically load contract clauses based on category/trust tier.
  - [ ] Implement logic for the two-step signing process (Artist first, Organizer second).

## Task 5: UI - Artist
- [ ] Update `client/src/pages/artist/ArtistProfile.tsx` and `ArtistDashboard.tsx`.
  - [ ] Add category badge and trust tier badge.
  - [ ] Display minimum/standard/premium fee fields and estimated commission.
  - [ ] Update contract status to show signature deadlines and payment timelines.

## Task 6: UI - Organizer
- [ ] Update `client/src/pages/organizer/OrganizerDashboard.tsx` and related booking pages.
  - [ ] Show plain-English explanations of artist categories.
  - [ ] Display breakdown of booking costs (organizer payable, artist receivable, platform fee).
  - [ ] Display deposit requirements and cancellation penalties.
  - [ ] Show contract signing progress.

## Task 7: UI - Admin
- [ ] Update `client/src/pages/admin/AdminDashboard.tsx` and `AdminUsers.tsx`.
  - [ ] Add view for "Pending Category Approvals" and "Overridden Categories".
  - [ ] Add view for "Contract Template Versions", "Signature Progress", and "Expired Contracts".

## Task 8: Testing & Verification
- [ ] Write unit tests for `commissionPolicy.service.ts` (double-sided math).
- [ ] Write unit tests for `artistCategory.service.ts` (auto-suggestion rules).
- [ ] Write integration tests for the Booking -> Contract snapshotting flow.

## Task 9: Rollout
- [ ] Wrap new logic behind a feature flag if possible.
- [ ] Verify functionality on a staging environment.
- [ ] Finalize production rollout.
