# Database Schema Documentation

**Source of truth**: `shared/schema.ts`
**Last updated**: 2026-04-03
**ORM**: Drizzle ORM with PostgreSQL

---

## Enums

| Enum Name | Values |
|-----------|--------|
| `artist_category` | `budding`, `mid_scale`, `international`, `custom` |
| `artist_category_source` | `auto`, `manual`, `override` |
| `user_status` | `active`, `suspended`, `deleted`, `pending_verification` |
| `role_name` | `artist`, `band_manager`, `promoter`, `organizer`, `venue_manager`, `admin`, `platform_admin`, `staff` |
| `booking_status` | `inquiry`, `offered`, `negotiating`, `contracting`, `confirmed`, `paid_deposit`, `scheduled`, `completed`, `cancelled`, `disputed`, `refunded` |
| `contract_status` | `draft`, `sent`, `signed_by_promoter`, `signed_by_artist`, `admin_review`, `signed`, `voided`, `completed` |
| `contract_edit_status` | `pending`, `approved`, `rejected`, `applied` |
| `dispute_status` | `open`, `investigating`, `resolved_refund`, `resolved_no_refund`, `escalated` |
| `gender` | `male`, `female`, `other`, `prefer_not_say` |
| `gst_registration_type` | `registered`, `unregistered`, `composition`, `none` |
| `invoice_status` | `draft`, `issued`, `paid`, `overdue`, `cancelled`, `refunded` |
| `media_type` | `image`, `audio`, `video`, `document`, `other` |
| `notification_channel` | `in_app`, `email`, `sms`, `push` |
| `notification_priority` | `normal`, `urgent` |
| `payment_status` | `initiated`, `authorized`, `captured`, `failed`, `refunded`, `cancelled` |
| `payout_status` | `queued`, `processing`, `paid`, `failed`, `cancelled` |
| `proposal_status` | `active`, `accepted`, `rejected`, `expired`, `withdrawn` |
| `search_entity` | `artist`, `venue`, `event`, `promoter`, `organizer` |
| `ticket_type` | `general`, `vip`, `reserved`, `earlybird`, `guestlist` |
| `visibility` | `public`, `private` |

---

## Geography and Lookup Tables

These tables store reference data for currencies, locales, timezones, and geographic hierarchy.

### currencies

| Column | Type | Notes |
|--------|------|-------|
| `currency_code` | `char(3)` | **PK**. ISO 4217 code (e.g., `INR`, `USD`) |
| `name` | `text` | NOT NULL |
| `symbol` | `text` | Display symbol (e.g., `INR`) |
| `precision` | `smallint` | Decimal places, default `2` |

### locales

| Column | Type | Notes |
|--------|------|-------|
| `locale_code` | `char(5)` | **PK** (e.g., `en_IN`) |
| `display_name` | `text` | NOT NULL |

### timezones

| Column | Type | Notes |
|--------|------|-------|
| `tz_name` | `text` | **PK**. IANA timezone identifier (e.g., `Asia/Kolkata`) |

### countries

| Column | Type | Notes |
|--------|------|-------|
| `country_id` | `serial` | **PK** |
| `name` | `text` | NOT NULL |
| `iso2` | `char(2)` | ISO 3166-1 alpha-2 |
| `iso3` | `char(3)` | ISO 3166-1 alpha-3 |
| `currency_code` | `char(3)` | FK -> `currencies.currency_code` |

### states

| Column | Type | Notes |
|--------|------|-------|
| `state_id` | `serial` | **PK** |
| `country_id` | `integer` | FK -> `countries.country_id` |
| `name` | `text` | NOT NULL |

### cities

| Column | Type | Notes |
|--------|------|-------|
| `city_id` | `serial` | **PK** |
| `state_id` | `integer` | FK -> `states.state_id` |
| `name` | `text` | NOT NULL |
| `lat` | `numeric` | Latitude |
| `lon` | `numeric` | Longitude |

---

## Auth and Users

### session

Session storage for `connect-pg-simple` (Express session middleware).

| Column | Type | Notes |
|--------|------|-------|
| `sid` | `text` | **PK**. Session ID |
| `sess` | `jsonb` | NOT NULL. Serialized session data |
| `expire` | `timestamp(6)` | NOT NULL. Session expiry time |

### users

Central user account table. All roles (artist, organizer, venue manager, admin) share a single user record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `username` | `text` | UNIQUE |
| `email` | `text` | NOT NULL, UNIQUE |
| `password_hash` | `text` | bcrypt hash |
| `phone` | `text` | |
| `display_name` | `text` | |
| `first_name` | `text` | |
| `last_name` | `text` | |
| `legal_name` | `text` | Full legal name for contracts |
| `permanent_address` | `text` | |
| `pan_number` | `text` | Indian PAN for tax compliance |
| `gstin` | `text` | GST Identification Number |
| `bank_account_number` | `text` | |
| `bank_ifsc` | `text` | |
| `bank_branch` | `text` | |
| `bank_account_holder_name` | `text` | |
| `emergency_contact_name` | `text` | |
| `emergency_contact_phone` | `text` | |
| `gender` | `gender` enum | |
| `date_of_birth` | `date` | |
| `status` | `user_status` enum | Default: `pending_verification` |
| `locale` | `char(5)` | FK -> `locales.locale_code` |
| `currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `timezone` | `text` | Default: `Asia/Kolkata`. FK -> `timezones.tz_name` |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}`. Extensible (e.g., `trustScore`, `profileComplete`) |

### roles

Lookup table of available platform roles.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `name` | `role_name` enum | NOT NULL, UNIQUE |
| `description` | `text` | |

### user_roles

Join table: users can hold multiple roles.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | `integer` | **PK** (composite). FK -> `users.id` (CASCADE) |
| `role_id` | `integer` | **PK** (composite). FK -> `roles.id` (CASCADE) |
| `assigned_at` | `timestamp` | Default: `now()` |

### auth_providers

OAuth / external auth provider links.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `user_id` | `integer` | FK -> `users.id` (CASCADE) |
| `provider` | `text` | NOT NULL (e.g., `google`, `facebook`) |
| `provider_user_id` | `text` | NOT NULL |
| `data` | `jsonb` | Provider-specific data |
| `created_at` | `timestamp` | Default: `now()` |

---

## Organizations

### organizations

Groups of users operating under a shared brand (e.g., a promotions company).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE |
| `description` | `text` | |
| `website` | `text` | |
| `created_by` | `integer` | FK -> `users.id` |
| `created_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}` |

### organization_members

Join table: users belonging to organizations.

| Column | Type | Notes |
|--------|------|-------|
| `org_id` | `integer` | **PK** (composite). FK -> `organizations.id` (CASCADE) |
| `user_id` | `integer` | **PK** (composite). FK -> `users.id` (CASCADE) |
| `role` | `text` | Role within the organization (free-text) |
| `joined_at` | `timestamp` | Default: `now()` |

---

## Profiles

### genres

Music genre taxonomy with optional parent-child hierarchy.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `name` | `text` | NOT NULL, UNIQUE |
| `slug` | `text` | UNIQUE |
| `parent_id` | `integer` | FK -> `genres.id` (self-referencing for sub-genres) |

### artists

Artist or band profile. Linked to a user account and optionally to an organization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `user_id` | `integer` | FK -> `users.id` (SET NULL) |
| `organization_id` | `integer` | FK -> `organizations.id` (SET NULL) |
| `name` | `text` | NOT NULL |
| `is_band` | `boolean` | Default: `false` |
| `members` | `jsonb` | Band member list (if band) |
| `bio` | `text` | |
| `origin_city_id` | `integer` | FK -> `cities.city_id` |
| `base_location` | `jsonb` | Structured location data |
| `price_from` | `numeric(12,2)` | Minimum fee |
| `price_to` | `numeric(12,2)` | Maximum fee |
| `currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `rating_avg` | `numeric(3,2)` | Default: `0` |
| `rating_count` | `integer` | Default: `0` |
| `artist_category` | `artist_category` enum | Tier: budding, mid_scale, international, custom |
| `artist_category_source` | `artist_category_source` enum | How category was assigned |
| `artist_category_locked` | `boolean` | Default: `false`. Prevents auto-recalculation |
| `artist_category_assigned_at` | `timestamp` | |
| `artist_category_assigned_by` | `integer` | FK -> `users.id` (SET NULL) |
| `artist_category_notes` | `text` | |
| `commission_override_artist_pct` | `numeric(5,2)` | Per-artist commission override |
| `commission_override_organizer_pct` | `numeric(5,2)` | Per-artist organizer commission override |
| `minimum_guaranteed_earnings` | `numeric(12,2)` | |
| `category_valid_from` | `timestamp` | |
| `category_valid_to` | `timestamp` | |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}`. Stores `trustScore`, profile images, social links, etc. |

### artist_genres

Join table: artists to genres (many-to-many).

| Column | Type | Notes |
|--------|------|-------|
| `artist_id` | `integer` | **PK** (composite). FK -> `artists.id` (CASCADE) |
| `genre_id` | `integer` | **PK** (composite). FK -> `genres.id` (CASCADE) |

### artist_category_history

Audit trail for artist category changes.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `artist_id` | `integer` | NOT NULL. FK -> `artists.id` (CASCADE) |
| `old_category` | `text` | Previous category |
| `new_category` | `text` | New category |
| `reason` | `text` | |
| `changed_by` | `integer` | FK -> `users.id` (SET NULL) |
| `changed_at` | `timestamp` | Default: `now()` |

### commission_policies

Platform commission rates per artist category tier.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `artist_category` | `artist_category` enum | NOT NULL, UNIQUE |
| `artist_pct` | `numeric(5,2)` | NOT NULL. Commission % charged to artist |
| `organizer_pct` | `numeric(5,2)` | NOT NULL. Commission % charged to organizer |
| `platform_pct_total` | `numeric(5,2)` | NOT NULL. Total platform take |
| `min_artist_guarantee` | `numeric(12,2)` | Minimum guaranteed payout |
| `active` | `boolean` | Default: `true` |
| `effective_from` | `timestamp` | Default: `now()` |
| `effective_to` | `timestamp` | Nullable (open-ended if null) |

### promoters

Organizer / promoter profile. The entity that creates events and books artists.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `user_id` | `integer` | FK -> `users.id` (SET NULL) |
| `organization_id` | `integer` | FK -> `organizations.id` (SET NULL) |
| `name` | `text` | |
| `description` | `text` | |
| `contact_person` | `jsonb` | Structured contact info |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}`. Stores `trustScore`, company details, etc. |

### venues

Venue profile. Physical locations where events are held.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `user_id` | `integer` | FK -> `users.id` (SET NULL) |
| `organization_id` | `integer` | FK -> `organizations.id` (SET NULL) |
| `name` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE |
| `description` | `text` | |
| `address` | `jsonb` | Structured address (street, city, state, zip, coordinates) |
| `city_id` | `integer` | FK -> `cities.city_id` |
| `capacity` | `integer` | Total capacity |
| `capacity_seated` | `integer` | |
| `capacity_standing` | `integer` | |
| `space_dimensions` | `jsonb` | Stage size, ceiling height, etc. |
| `amenities` | `jsonb` | Available amenities list |
| `timezone` | `text` | Default: `Asia/Kolkata`. FK -> `timezones.tz_name` |
| `rating_avg` | `numeric(3,2)` | Default: `0` |
| `rating_count` | `integer` | Default: `0` |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}`. Stores `trustScore`, photos, operating hours, etc. |

---

## Events

### events

Events created by organizers/promoters, optionally linked to a venue.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `organizer_id` | `integer` | FK -> `promoters.id` (SET NULL) |
| `venue_id` | `integer` | FK -> `venues.id` (SET NULL) |
| `title` | `text` | NOT NULL |
| `slug` | `text` | UNIQUE |
| `description` | `text` | |
| `start_time` | `timestamp` | NOT NULL |
| `door_time` | `timestamp` | When doors open |
| `end_time` | `timestamp` | |
| `timezone` | `text` | Default: `Asia/Kolkata`. FK -> `timezones.tz_name` |
| `capacity_total` | `integer` | |
| `capacity_seated` | `integer` | |
| `currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `status` | `text` | Default: `draft` |
| `visibility` | `visibility` enum | Default: `private` |
| `metadata` | `jsonb` | Default: `{}`. Stores budget, genres, requirements, etc. |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |

**Relations**: has many `bookings`, has many `event_stages`, belongs to `promoters`, belongs to `venues`.

### event_stages

Individual stages within a multi-stage event.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `event_id` | `integer` | FK -> `events.id` (CASCADE) |
| `name` | `text` | |
| `order_index` | `integer` | Default: `0` |
| `start_time` | `timestamp` | |
| `end_time` | `timestamp` | |
| `stage_plot` | `text` | Stage layout description or URL |
| `capacity` | `integer` | |
| `created_at` | `timestamp` | Default: `now()` |

### temporary_venues

Ad-hoc or one-off locations used for a specific event (not a registered venue).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `event_id` | `integer` | FK -> `events.id` (CASCADE) |
| `name` | `text` | NOT NULL |
| `location` | `text` | NOT NULL |
| `maps_link` | `text` | Google Maps or similar URL |
| `directions` | `text` | |
| `landmark` | `text` | |
| `contact_name` | `text` | |
| `contact_phone` | `text` | |
| `created_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}` |

---

## Bookings

### bookings

Core booking record linking an artist to an event. Tracks the full lifecycle from inquiry through completion.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `event_id` | `integer` | FK -> `events.id` (CASCADE) |
| `artist_id` | `integer` | FK -> `artists.id` (CASCADE) |
| `stage_id` | `integer` | FK -> `event_stages.id` (SET NULL) |
| `status` | `booking_status` enum | Default: `inquiry` |
| `offer_amount` | `numeric(12,2)` | Initial offer |
| `offer_currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `deposit_percent` | `numeric(5,2)` | Default: `30.00` |
| `deposit_amount` | `numeric(12,2)` | |
| `final_amount` | `numeric(12,2)` | Agreed final amount after negotiation |
| `final_due_at` | `timestamp` | |
| `gross_booking_value` | `numeric(12,2)` | Total deal value |
| `artist_fee` | `numeric(12,2)` | Artist payout amount |
| `organizer_fee` | `numeric(12,2)` | Organizer additional fee |
| `artist_commission_pct` | `numeric(5,2)` | Platform commission % from artist |
| `organizer_commission_pct` | `numeric(5,2)` | Platform commission % from organizer |
| `platform_revenue` | `numeric(12,2)` | Platform earnings from this booking |
| `artist_category_snapshot` | `text` | Artist tier at time of booking |
| `trust_tier_snapshot` | `text` | Trust level at time of booking |
| `contract_id` | `integer` | Link to generated contract |
| `flow_started_at` | `timestamptz` | When the negotiation/contract flow began |
| `flow_deadline_at` | `timestamptz` | 72-hour deadline for current step |
| `flow_expired_at` | `timestamptz` | When the flow expired (if it did) |
| `flow_expired_reason` | `text` | Reason for expiry |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `meta` | `jsonb` | Default: `{}`. Stores `negotiation.currentProposalSnapshot` and other state |

**Relations**: belongs to `artists`, belongs to `events`, has one `contract`.

### booking_proposals

Versioned negotiation proposals. Each round of negotiation creates a new proposal record.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `booking_id` | `integer` | NOT NULL. FK -> `bookings.id` (CASCADE) |
| `created_by` | `integer` | FK -> `users.id` (SET NULL) |
| `round` | `integer` | NOT NULL. Negotiation round number |
| `proposed_terms` | `jsonb` | NOT NULL. Contains `offerAmount`, `currency`, `slotId`, `duration`, etc. |
| `reason_code` | `text` | Standardized reason for counter-offer |
| `note` | `text` | Free-text note from proposer |
| `status` | `proposal_status` enum | Default: `active` |
| `submitted_by_role` | `text` | `artist` or `organizer` |
| `step_number` | `integer` | Step in the 4-step negotiation flow (1-4) |
| `response_action` | `text` | `edit`, `accept`, or `walkaway` |
| `created_at` | `timestamp` | Default: `now()` |

**Relations**: belongs to `bookings`, belongs to `users` (creator).

---

## Contracts

### contracts

The main contract record for a booking. Supports a sequential edit workflow: organizer edits first, then artist, then signing.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `booking_id` | `integer` | FK -> `bookings.id` (CASCADE) |
| `version` | `integer` | Default: `1` |
| `status` | `contract_status` enum | Default: `draft` |
| `contract_pdf` | `text` | Legacy PDF URL |
| `contract_text` | `text` | Full contract text (HTML/Markdown) |
| `signer_sequence` | `jsonb` | Ordered list of required signers |
| `signed_by_promoter` | `boolean` | Default: `false` |
| `signed_by_artist` | `boolean` | Default: `false` |
| `signed_at` | `timestamp` | When both parties signed |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | Default: `{}` |
| `initiated_at` | `timestamptz` | When contract workflow started |
| `deadline_at` | `timestamptz` | Contract completion deadline |
| `finalized_at` | `timestamptz` | When contract was finalized |
| `current_version` | `integer` | Default: `1`. Active version number |
| `artist_edit_used` | `boolean` | Default: `false`. Whether artist has used their one edit |
| `promoter_edit_used` | `boolean` | Default: `false`. Whether organizer has used their one edit |
| `artist_review_done_at` | `timestamptz` | |
| `promoter_review_done_at` | `timestamptz` | |
| `artist_accepted_at` | `timestamptz` | |
| `promoter_accepted_at` | `timestamptz` | |
| `artist_signed_at` | `timestamptz` | |
| `promoter_signed_at` | `timestamptz` | |
| `artist_signature_ip` | `text` | IT Act 2000 compliance |
| `promoter_signature_ip` | `text` | IT Act 2000 compliance |
| `pdf_url` | `text` | Generated PDF location |
| `pdf_generated_at` | `timestamptz` | |
| `admin_reviewed_by` | `integer` | FK -> `users.id` (SET NULL) |
| `admin_reviewed_at` | `timestamptz` | |
| `admin_review_note` | `text` | |
| `admin_review_status` | `text` | `approved` or `rejected` |
| `artist_category_snapshot` | `text` | |
| `trust_score_snapshot` | `text` | |
| `commission_breakdown_json` | `jsonb` | Commission details frozen at signing |
| `negotiated_terms_json` | `jsonb` | Agreed terms frozen at signing |
| `clause_version` | `integer` | |
| `template_version` | `integer` | |
| `organizer_signature_required` | `boolean` | Default: `true` |
| `artist_signature_required` | `boolean` | Default: `true` |
| `cancellation_policy_version` | `integer` | |
| `edit_phase` | `text` | Default: `organizer_review`. Tracks current edit phase |

**Relations**: belongs to `bookings`, has many `contract_versions`, has many `contract_edit_requests`, has many `contract_signatures`.

### contract_versions

Immutable history of contract edits. Each edit by organizer or artist creates a new version.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `contract_id` | `integer` | NOT NULL. FK -> `contracts.id` (CASCADE) |
| `version` | `integer` | NOT NULL |
| `contract_text` | `text` | NOT NULL. Full contract text at this version |
| `terms` | `jsonb` | NOT NULL, default: `{}`. Structured terms at this version |
| `created_by` | `integer` | FK -> `users.id` (SET NULL) |
| `created_at` | `timestamptz` | Default: `now()` |
| `change_summary` | `text` | Description of what changed |

### contract_edit_requests

Tracks each party's one-time edit request during the contract review phase.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `contract_id` | `integer` | NOT NULL. FK -> `contracts.id` (CASCADE) |
| `requested_by` | `integer` | NOT NULL. FK -> `users.id` (CASCADE) |
| `requested_by_role` | `text` | `artist` or `organizer` |
| `changes` | `jsonb` | NOT NULL. Requested changes |
| `note` | `text` | |
| `status` | `contract_edit_status` enum | Default: `pending` |
| `responded_by` | `integer` | FK -> `users.id` (SET NULL) |
| `responded_at` | `timestamptz` | |
| `response_note` | `text` | |
| `resulting_version` | `integer` | Version created from applied edits |
| `created_at` | `timestamptz` | Default: `now()` |
| `updated_at` | `timestamptz` | Default: `now()` |

### contract_signatures

Captures digital signature data for each signer. Includes IT Act 2000 compliance fields.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `contract_id` | `integer` | NOT NULL. FK -> `contracts.id` (CASCADE) |
| `user_id` | `integer` | NOT NULL. FK -> `users.id` (CASCADE) |
| `role` | `text` | NOT NULL. Signer's role |
| `signature_data` | `text` | Base64 drawn signature, typed name, or uploaded image URL |
| `signature_type` | `text` | Default: `typed`. One of: `drawn`, `typed`, `uploaded` |
| `ip_address` | `text` | Signer's IP at time of signing |
| `user_agent` | `text` | Signer's browser user-agent |
| `signed_at` | `timestamptz` | Default: `now()` |

---

## Payments

### payments

Records of payment transactions for bookings.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `booking_id` | `integer` | FK -> `bookings.id` |
| `payer_id` | `integer` | FK -> `users.id` |
| `payee_id` | `integer` | FK -> `users.id` |
| `amount` | `numeric(14,2)` | NOT NULL |
| `currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `payment_type` | `text` | e.g., `deposit`, `final`, `refund` |
| `status` | `payment_status` enum | Default: `initiated` |
| `gateway` | `text` | e.g., `razorpay`, `stripe` |
| `gateway_transaction_id` | `text` | |
| `gateway_response` | `jsonb` | Raw gateway callback data |
| `initiated_at` | `timestamp` | Default: `now()` |
| `completed_at` | `timestamp` | |
| `metadata` | `jsonb` | Default: `{}` |

### payouts

Outgoing payouts to artists or other parties.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `to_user_id` | `integer` | FK -> `users.id` |
| `amount` | `numeric(14,2)` | NOT NULL |
| `currency` | `char(3)` | Default: `INR`. FK -> `currencies.currency_code` |
| `status` | `payout_status` enum | Default: `queued` |
| `provider_response` | `jsonb` | |
| `initiated_at` | `timestamp` | Default: `now()` |
| `paid_at` | `timestamp` | |
| `metadata` | `jsonb` | Default: `{}` |

---

## Messaging

### conversations

A conversation thread, typically linked to an entity (e.g., a booking negotiation).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `subject` | `text` | |
| `entity_type` | `text` | e.g., `booking` |
| `entity_id` | `integer` | ID of the linked entity |
| `conversation_type` | `text` | NOT NULL, default: `direct`. Values: `negotiation`, `direct`, etc. |
| `status` | `text` | NOT NULL, default: `open` |
| `last_message_at` | `timestamp` | |
| `created_at` | `timestamp` | Default: `now()` |
| `metadata` | `jsonb` | |

**Relations**: has many `conversation_participants`, has many `messages`, has one `conversation_workflow_instances`.

### conversation_participants

Join table: users participating in a conversation.

| Column | Type | Notes |
|--------|------|-------|
| `conversation_id` | `integer` | **PK** (composite). FK -> `conversations.id` (CASCADE) |
| `user_id` | `integer` | **PK** (composite). FK -> `users.id` (CASCADE) |
| `joined_at` | `timestamp` | Default: `now()` |

### conversation_workflow_instances

Drives the structured chat state machine for negotiation conversations.

| Column | Type | Notes |
|--------|------|-------|
| `conversation_id` | `integer` | **PK**. FK -> `conversations.id` (CASCADE) |
| `workflow_key` | `text` | NOT NULL, default: `booking_negotiation_v1` |
| `current_node_key` | `text` | NOT NULL. Current state in the workflow graph |
| `awaiting_user_id` | `integer` | FK -> `users.id` (SET NULL). Who needs to act next |
| `awaiting_role` | `role_name` enum | Role expected to act next |
| `round` | `integer` | NOT NULL, default: `0`. Current negotiation round |
| `max_rounds` | `integer` | NOT NULL, default: `3` |
| `deadline_at` | `timestamptz` | 72-hour step deadline |
| `locked` | `boolean` | NOT NULL, default: `false`. Prevents concurrent modifications |
| `context` | `jsonb` | NOT NULL, default: `{}`. Workflow state payload |
| `updated_at` | `timestamp` | Default: `now()` |

### messages

Individual messages within a conversation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `conversation_id` | `integer` | FK -> `conversations.id` (CASCADE) |
| `sender_id` | `integer` | FK -> `users.id` |
| `body` | `text` | Message content |
| `message_type` | `text` | NOT NULL, default: `text`. e.g., `text`, `system`, `proposal`, `action` |
| `payload` | `jsonb` | NOT NULL, default: `{}`. Structured data for non-text messages |
| `client_msg_id` | `text` | Client-side dedup key |
| `workflow_node_key` | `text` | Links message to workflow state |
| `action_key` | `text` | Action taken (e.g., `submit_proposal`, `accept`) |
| `round` | `integer` | Negotiation round this message belongs to |
| `attachments` | `jsonb` | File/media attachments |
| `created_at` | `timestamp` | Default: `now()` |
| `edited_at` | `timestamp` | |

**Relations**: belongs to `conversations`, belongs to `users` (sender), has many `message_reads`.

### message_reads

Read receipts for messages.

| Column | Type | Notes |
|--------|------|-------|
| `message_id` | `integer` | **PK** (composite). FK -> `messages.id` (CASCADE) |
| `user_id` | `integer` | **PK** (composite). FK -> `users.id` (CASCADE) |
| `read_at` | `timestamp` | NOT NULL, default: `now()` |

---

## Media

### media

Centralized file and image storage with polymorphic entity association.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `owner_user_id` | `integer` | FK -> `users.id` (SET NULL) |
| `entity_type` | `text` | Polymorphic: `artist`, `venue`, `event`, etc. |
| `entity_id` | `integer` | ID of the owning entity |
| `media_type` | `media_type` enum | `image`, `audio`, `video`, `document`, `other` |
| `filename` | `text` | |
| `mime_type` | `text` | |
| `file_size` | `integer` | In bytes |
| `data` | `text` | Base64 data URL or external URL |
| `source_url` | `text` | Original URL if fetched from a link |
| `alt_text` | `text` | Accessibility description |
| `metadata` | `jsonb` | Default: `{}` |
| `uploaded_at` | `timestamp` | Default: `now()` |

---

## Notifications

### notification_types

Template definitions for each type of notification the platform can send.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `key` | `text` | NOT NULL, UNIQUE. e.g., `booking.created`, `contract.signed` |
| `category` | `text` | NOT NULL. Grouping category |
| `label` | `text` | NOT NULL. Human-readable label |
| `description` | `text` | |
| `title_template` | `text` | NOT NULL. Mustache/handlebars template for title |
| `body_template` | `text` | NOT NULL. Mustache/handlebars template for body |
| `target_roles` | `jsonb` | NOT NULL. Which roles receive this notification |
| `channels` | `jsonb` | NOT NULL, default: `["in_app"]`. Delivery channels |
| `enabled` | `boolean` | NOT NULL, default: `true` |
| `priority` | `notification_priority` enum | NOT NULL, default: `normal` |
| `metadata` | `jsonb` | Default: `{}` |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |

### notification_channels

Global configuration for each delivery channel.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `channel` | `notification_channel` enum | NOT NULL, UNIQUE |
| `enabled` | `boolean` | NOT NULL, default: `true` |
| `config` | `jsonb` | Default: `{}`. Channel-specific config (API keys, etc.) |
| `rate_limit` | `jsonb` | Default: `{}`. Rate limiting rules |
| `created_at` | `timestamp` | Default: `now()` |
| `updated_at` | `timestamp` | Default: `now()` |

### notifications

Individual notification instances delivered to users.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `user_id` | `integer` | NOT NULL. FK -> `users.id` |
| `notification_type_key` | `text` | NOT NULL. References `notification_types.key` |
| `channel` | `notification_channel` enum | NOT NULL, default: `in_app` |
| `title` | `text` | NOT NULL. Rendered title |
| `body` | `text` | NOT NULL. Rendered body |
| `entity_type` | `text` | Polymorphic entity reference |
| `entity_id` | `integer` | |
| `action_url` | `text` | Deep link URL |
| `data` | `jsonb` | Additional structured data |
| `read` | `boolean` | NOT NULL, default: `false` |
| `read_at` | `timestamp` | |
| `delivered` | `boolean` | Default: `false` |
| `created_at` | `timestamp` | Default: `now()` |
| `delivered_at` | `timestamp` | |

**Relations**: belongs to `users`.

---

## Admin and System

### audit_logs

Immutable log of all significant system actions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `bigserial` | **PK** |
| `occurred_at` | `timestamp` | Default: `now()` |
| `who` | `integer` | FK -> `users.id`. The acting user |
| `action` | `text` | NOT NULL. Action identifier |
| `entity_type` | `text` | Target entity type |
| `entity_id` | `integer` | Target entity ID |
| `diff` | `jsonb` | Before/after diff |
| `context` | `jsonb` | Additional context (IP, user-agent, etc.) |

### system_settings

Global system-level configuration key-value store.

| Column | Type | Notes |
|--------|------|-------|
| `key` | `text` | **PK** |
| `value` | `jsonb` | |
| `description` | `text` | |
| `updated_at` | `timestamp` | Default: `now()` |

### app_settings

Application settings managed by admin users. Used for feature toggles and runtime configuration.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `serial` | **PK** |
| `key` | `text` | NOT NULL, UNIQUE |
| `value` | `jsonb` | NOT NULL |
| `updated_at` | `timestamp` | Default: `now()` |
| `updated_by` | `integer` | FK -> `users.id` |

---

## Entity Relationship Summary

```
users ──< user_roles >── roles
  │
  ├── artists ──< artist_genres >── genres
  │     │
  │     ├── artist_category_history
  │     │
  │     └──< bookings >── events ──< event_stages
  │            │             │
  │            │             ├── temporary_venues
  │            │             │
  │            │             └── venues
  │            │
  │            ├── booking_proposals
  │            │
  │            └── contracts ──< contract_versions
  │                    │
  │                    ├──< contract_edit_requests
  │                    │
  │                    └──< contract_signatures
  │
  ├── promoters
  │
  ├── organizations ──< organization_members
  │
  ├── notifications
  │
  ├── media
  │
  ├── payments / payouts
  │
  └── conversations ──< conversation_participants
         │
         ├── conversation_workflow_instances
         │
         └──< messages ──< message_reads
```

---

## Type Exports

The following TypeScript types are exported from `shared/schema.ts` using Drizzle's `$inferSelect` and `$inferInsert`:

- `User` / `InsertUser`
- `Artist` / `InsertArtist`
- `Venue` / `InsertVenue`
- `Event` / `InsertEvent`
- `TemporaryVenue` / `InsertTemporaryVenue`
- `Booking` / `InsertBooking`
- `Contract` / `InsertContract`
- `ContractVersion` / `InsertContractVersion`
- `ContractEditRequest` / `InsertContractEditRequest`
- `ContractSignature` / `InsertContractSignature`
- `Payment` / `InsertPayment`
- `Promoter` / `InsertPromoter`
- `Organization` / `InsertOrganization`
- `AuditLog` / `InsertAuditLog`
- `Conversation` / `InsertConversation`
- `Message` / `InsertMessage`
- `ConversationWorkflowInstance` / `InsertConversationWorkflowInstance`
- `BookingProposal` / `InsertBookingProposal`
- `MessageRead` / `InsertMessageRead`
- `ArtistCategoryHistory` / `InsertArtistCategoryHistory`
- `CommissionPolicy`
