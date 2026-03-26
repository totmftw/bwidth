# Artist Categorization and Commission System Plan

## 1. Database Changes & Schema Updates (`shared/schema.ts`)
- **New Enums**:
  - `artist_category`: `budding`, `mid_scale`, `international`, `custom`.
  - `artist_category_source`: `auto`, `manual`, `override`.
- **Extend `artists` Table**:
  - Add `artist_category`, `artist_category_source`, `artist_category_locked`, `artist_category_assigned_at`, `artist_category_assigned_by`, `artist_category_notes`.
  - Add `commission_override_artist_pct`, `commission_override_organizer_pct`, `minimum_guaranteed_earnings`.
  - Add `category_valid_from`, `category_valid_to`.
- **New Table `artist_category_history`**:
  - Fields: `artist_id`, `old_category`, `new_category`, `reason`, `changed_by`, `changed_at`.
- **New Table `commission_policies`**:
  - Fields: `artist_category`, `artist_pct`, `organizer_pct`, `platform_pct_total`, `min_artist_guarantee`, `active`, `effective_from`, `effective_to`.
- **Extend `bookings` Table**:
  - Add snapshot and math fields: `gross_booking_value`, `artist_fee`, `organizer_fee`, `artist_commission_pct`, `organizer_commission_pct`, `platform_revenue`, `artist_category_snapshot`, `trust_tier_snapshot`, `contract_id`.
- **Extend `contracts` Table**:
  - Add `artist_category_snapshot`, `trust_score_snapshot`, `commission_breakdown_json`, `negotiated_terms_json`, `clause_version`, `template_version`, `organizer_signature_required`, `artist_signature_required`, `cancellation_policy_version`.

## 2. Backfill Script
- Create a one-time script (e.g., `server/scripts/backfill-artist-categories.ts`) to assign a default `custom` or `mid_scale` category to all existing artists, ensuring the system works with existing profiles.

## 3. Backend Services Development (`server/services/`)
- **`artistCategory.service.ts`**:
  - Auto-suggest category during onboarding based on fee range, experience, trust score, and portfolio.
  - Implement admin override logic and the ability to lock categories for premium artists.
  - Recalculate categories when an artist updates their profile (every 90 days).
- **`commissionPolicy.service.ts`**:
  - Fetch base commission split based on artist category.
  - Merge trust-tier modifiers (e.g., standard/trusted get flexible rules, critical gets stricter rules).
  - Calculate exact settlement breakdown (double-sided monetization: organizer payable, artist receivable, platform spread).
- **`booking.service.ts`**:
  - Update booking creation/confirmation to **snapshot and freeze** the category, trust tier, and commission math. *Crucial: do not calculate live after confirmation.*
- **`contract.service.ts`**:
  - Load booking snapshots to generate contracts with varying templates/clauses (payment terms, cancellation, slot time) based on the category.
  - Manage signature sequence: Artist signs first, then Organizer.
  - Trigger payment schedule creation upon fully executed status.

## 4. UI Implementation
- **Artist Dashboard & Profile**:
  - Show category and trust tier badges.
  - Display minimum/standard/premium fees and estimated commission.
  - Show clear contract status, signature deadlines, and payment timelines.
- **Organizer Dashboard & Discovery**:
  - Add plain-English explanations of artist categories.
  - Display transparent booking costs: total cost, artist portion, platform fee.
  - Show required deposits, cancellation penalties, and contract signing progress.
- **Admin Dashboard**:
  - Add a view to approve/override pending artist categories.
  - Display overridden categories and contract template versions.
  - Monitor signature progress, highlight delayed signatures, and expired contracts.

## 5. Testing & Verification
- Add unit tests for the double-sided monetization math in `commissionPolicy.service.ts`.
- Add integration tests for the `booking` -> `contract` snapshot flow to ensure numbers do not drift if the artist's profile changes post-booking.
- Test the specific contract generation clauses for different category/trust tier combinations.

## 6. Rollout Plan
1. Add database columns and history tables.
2. Run the backfill script for existing artists.
3. Add admin review for categories.
4. Add category badges in the artist profile UI.
5. Add fee split logic to bookings.
6. Add contract snapshots and PDF clause variations.
7. Add tests.
8. Turn on features behind a feature flag.
9. Migrate existing bookings slowly.
