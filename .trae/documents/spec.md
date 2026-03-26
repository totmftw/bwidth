# Artist Categorization and Commission System Specification

## 1. Overview
The platform connects artists and organizers. This specification outlines the implementation of an artist categorization system, a robust commission rule engine, and an enhanced contract template system. The goal is to accurately group artists into market-facing categories (`budding`, `mid-scale`, `international`), separate this from their platform trust tier, and use both to drive financial splits and contract clauses.

## 2. Core Concepts
*   **Artist Category:** Represents the artist's market position (e.g., `budding`, `mid-scale`, `international`). Determines the base commission split and contract clauses.
*   **Trust Score Tier:** Represents the artist's platform reliability (e.g., `critical`, `high risk`, `standard`, `trusted`, `premium`). Acts as a modifier for payment flexibility and deposits.
*   **Snapshotting:** Financial math and categorizations are calculated at the time of booking confirmation and frozen (snapshotted) into the booking and contract records. This ensures historical contracts do not drift when artist profiles change later.
*   **Double-Sided Monetization:** The platform charges both the artist and the organizer, keeping the spread. 

## 3. Database Schema Updates (`shared/schema.ts`)
*   **New Enums:**
    *   `artist_category`: `budding`, `mid_scale`, `international`, `custom`.
    *   `artist_category_source`: `auto`, `manual`, `override`.
*   **`artists` Table Extensions:**
    *   `artist_category` (Enum)
    *   `artist_category_source` (Enum)
    *   `artist_category_locked` (Boolean)
    *   `artist_category_assigned_at` (Timestamp)
    *   `artist_category_assigned_by` (Integer, references users)
    *   `artist_category_notes` (Text)
    *   `commission_override_artist_pct` (Numeric)
    *   `commission_override_organizer_pct` (Numeric)
    *   `minimum_guaranteed_earnings` (Numeric)
    *   `category_valid_from` (Timestamp)
    *   `category_valid_to` (Timestamp)
*   **New Tables:**
    *   `artist_category_history`: `id`, `artist_id`, `old_category`, `new_category`, `reason`, `changed_by`, `changed_at`.
    *   `commission_policies`: `id`, `artist_category`, `artist_pct`, `organizer_pct`, `platform_pct_total`, `min_artist_guarantee`, `active`, `effective_from`, `effective_to`.
*   **`bookings` Table Extensions:**
    *   `gross_booking_value` (Numeric)
    *   `artist_fee` (Numeric)
    *   `organizer_fee` (Numeric)
    *   `artist_commission_pct` (Numeric)
    *   `organizer_commission_pct` (Numeric)
    *   `platform_revenue` (Numeric)
    *   `artist_category_snapshot` (Text)
    *   `trust_tier_snapshot` (Text)
    *   `contract_id` (Integer)
*   **`contracts` Table Extensions:**
    *   `artist_category_snapshot` (Text)
    *   `trust_score_snapshot` (Text)
    *   `commission_breakdown_json` (Jsonb)
    *   `negotiated_terms_json` (Jsonb)
    *   `clause_version` (Integer)
    *   `template_version` (Integer)
    *   `organizer_signature_required` (Boolean)
    *   `artist_signature_required` (Boolean)
    *   `cancellation_policy_version` (Integer)

## 4. Backend Services (`server/services/`)
*   **`artistCategory.service.ts`:**
    *   **Phase 1 (Auto-suggest):** Evaluate fee range, experience, trust score, and portfolio completeness during onboarding to suggest a category.
    *   **Phase 2 (Admin Review):** Allow admins to confirm, override, and lock categories (specifically for premium/international talent). Enforce 90-day review cycles.
*   **`commissionPolicy.service.ts`:**
    *   Determine the base split using the artist's category (e.g., `budding` has a higher platform share but protected minimums; `international` has lower percentages but higher absolute fees).
    *   Apply trust-score modifiers (e.g., standard/trusted allow flexible deposits; critical requires stricter terms).
    *   Calculate exact settlement breakdown (Organizer Payable, Artist Receivable, Platform Fee).
*   **`booking.service.ts`:**
    *   On booking confirmation, calculate and snapshot all financial numbers and categories.
    *   Move booking state to `contract_sent`, and later to `confirmed` once signatures and deposits are complete.
*   **`contract.service.ts`:**
    *   Generate contracts using the snapshotted data from the booking.
    *   Select clauses based on category and trust tier. Ensure required clauses (performance date, fee, travel, technical rider, hospitality, branding, cancellation, slot protection, confidentiality, dispute) are included.
    *   Manage the signing sequence: Artist signs first, Organizer signs second.
    *   Initialize payment schedules based on the finalized contract terms.

## 5. UI Requirements
*   **Artist Interface:** Display category and trust badges. Show minimum/standard/premium fees, estimated commission, contract status, signature deadlines, and payment timelines.
*   **Organizer Interface:** Provide plain-English category explanations. Show transparent breakdown of total cost, artist share, and platform share. Display required deposits, cancellation penalties, and contract signing progress.
*   **Admin Interface:** Dashboard for pending category approvals, overridden categories, contract template version management, and monitoring of signature progress/delays.

## 6. Rollout Plan
1.  Apply DB migrations and create history/policy tables.
2.  Run one-time script to backfill existing artists as `custom` or `mid_scale`.
3.  Deploy Admin review interfaces for categorization.
4.  Introduce category badges and basic UI elements to the Artist/Organizer dashboards.
5.  Implement and integrate the fee split and snapshot logic in the booking flow.
6.  Deploy updated contract PDF generation using clause variations.
7.  Verify through comprehensive testing.
8.  Enable fully behind a feature flag and migrate existing active bookings incrementally.
