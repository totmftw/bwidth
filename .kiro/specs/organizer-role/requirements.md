# Requirements Document

## Introduction

This document defines the requirements for implementing the complete Organizer/Promoter role workflow in the BANDWIDTH music booking platform. The Organizer is the demand-side actor who creates events, discovers and books artists, negotiates terms, manages contracts, coordinates logistics, and handles payments. This role bridges Artists and Venues, serving as the primary booking initiator on the platform.

The existing codebase already has a `promoters` table (aliased as `organizers`), basic booking/negotiation/contract flows, and conversation infrastructure. This feature builds the full Organizer experience on top of that foundation — including dedicated pages, profile management, artist/venue discovery, event creation, booking lifecycle management, and a role-specific dashboard.

## Glossary

- **Organizer**: A user with the `promoter` or `organizer` role who creates events and books artists. Backed by the `promoters` table in the database.
- **Platform**: The BANDWIDTH application system as a whole.
- **Dashboard**: The Organizer's home screen showing key metrics, upcoming events, pending actions, and recent activity.
- **Event**: A scheduled occasion created by an Organizer, optionally linked to a Venue, for which Artists are booked. Stored in the `events` table.
- **Booking**: A record linking an Artist to an Event with financial terms and status tracking. Stored in the `bookings` table.
- **Negotiation**: A structured, limited-round (max 3) exchange of counter-offers between Organizer and Artist within a Booking.
- **Contract**: An auto-generated agreement tied to a Booking, requiring digital signatures from both parties within a deadline. Stored in the `contracts` table.
- **Trust_Score**: A numeric reputation value (0–100) for each user, affecting contract terms and platform access.
- **Discovery**: The process of searching, filtering, and evaluating Artists or Venues.
- **Conversation**: A messaging thread between participants, optionally linked to a Booking entity. Stored in the `conversations` table.
- **Slot_Time**: The performance time window within an event (opening, mid, closing).
- **Deposit**: The initial payment milestone (20–50% of booking fee) due upon contract signing.
- **Escrow**: Platform-held funds released to the Artist after event completion confirmation.
- **Onboarding_Wizard**: A multi-step profile setup flow for new Organizer users.
- **Promoter_Profile**: The Organizer's public-facing profile containing organization details, past events, and trust score. Stored in the `promoters` table.

## Requirements

### Requirement 1: Organizer Registration and Onboarding

**User Story:** As a new Organizer, I want to register on the platform and complete my profile setup, so that I can start creating events and booking artists.

#### Acceptance Criteria

1. WHEN a user selects the "organizer" or "promoter" role during registration, THE Platform SHALL create a user record with `metadata.role` set to the selected role and create a corresponding record in the `promoters` table linked via `user_id`.
2. WHEN an Organizer logs in for the first time without a completed profile, THE Platform SHALL redirect the Organizer to the Onboarding_Wizard.
3. THE Onboarding_Wizard SHALL collect the following required fields: organization name, description, contact person details (name, email, phone), and at least one past event reference or company website.
4. WHEN the Organizer submits the Onboarding_Wizard, THE Platform SHALL store the profile data in the `promoters` table (name, description, contact_person in `contact_person` JSONB, remaining fields in `metadata` JSONB) and set `metadata.profileComplete` to true.
5. WHEN the Organizer completes onboarding, THE Platform SHALL initialize the Organizer's Trust_Score to 50 out of 100.
6. IF the Organizer skips the Onboarding_Wizard, THEN THE Platform SHALL allow access to the Dashboard but display a persistent banner prompting profile completion.
7. WHEN the Organizer has a completed profile, THE Platform SHALL display the sidebar navigation with Dashboard, Discover, Events, Bookings, Messages, and Profile links.

### Requirement 2: Organizer Dashboard

**User Story:** As an Organizer, I want a dashboard that shows my key metrics and pending actions at a glance, so that I can efficiently manage my booking activity.

#### Acceptance Criteria

1. THE Dashboard SHALL display the following summary metrics: total events created, upcoming events count, active bookings count, pending negotiations count, total amount spent (sum of completed booking payments), and the Organizer's current Trust_Score.
2. THE Dashboard SHALL display a list of upcoming events sorted by start time ascending, showing event title, date, venue name (if assigned), and count of confirmed artists.
3. THE Dashboard SHALL display a list of pending actions requiring Organizer attention, including: unsigned contracts, unanswered negotiation rounds, unconfirmed event completions, and overdue payments.
4. WHEN the Organizer clicks on any pending action item, THE Platform SHALL navigate to the relevant detail view (booking detail, contract viewer, or conversation).
5. THE Dashboard SHALL display a recent activity feed showing the last 10 actions across bookings, contracts, and conversations, with timestamps.

### Requirement 3: Artist Discovery and Search

**User Story:** As an Organizer, I want to search and filter artists by genre, budget, location, and rating, so that I can find the right talent for my events.

#### Acceptance Criteria

1. THE Discovery page SHALL display a searchable, filterable list of all active Artists on the platform.
2. THE Discovery page SHALL provide filters for: genre (multi-select), budget range (min/max slider), location/city, minimum Trust_Score, and availability date range.
3. WHEN filters are applied, THE Platform SHALL return only Artists matching all active filter criteria.
4. THE Discovery page SHALL display each Artist as a card showing: artist name, primary genre, profile photo placeholder, price range (priceFrom–priceTo), Trust_Score badge, and rating average.
5. WHEN the Organizer clicks on an Artist card, THE Platform SHALL display the Artist's full profile including bio, genres, portfolio links (from metadata: SoundCloud, Instagram), past venue names, and performance history summary.
6. THE Discovery page SHALL support sorting results by: relevance (default), price low-to-high, price high-to-low, rating, and Trust_Score.
7. WHEN the Organizer views an Artist profile, THE Platform SHALL display a "Send Booking Offer" button that initiates the booking creation flow for that Artist.

### Requirement 4: Venue Discovery and Selection

**User Story:** As an Organizer, I want to browse and select venues for my events, so that I can find appropriate spaces that match my event requirements.

#### Acceptance Criteria

1. THE Discovery page SHALL include a toggle or tab to switch between Artist discovery and Venue discovery.
2. THE Venue discovery view SHALL display a filterable list of all Venues on the platform with filters for: capacity range, city/location, and amenities.
3. THE Venue discovery view SHALL display each Venue as a card showing: venue name, city, capacity, rating average, and a description excerpt.
4. WHEN the Organizer clicks on a Venue card, THE Platform SHALL display the Venue's full profile including description, address, capacity details (total, seated, standing), amenities list, and photos (from metadata).
5. WHEN the Organizer views a Venue profile, THE Platform SHALL display a "Create Event at this Venue" button that pre-fills the venue selection in the event creation form.

### Requirement 5: Event Creation and Management

**User Story:** As an Organizer, I want to create and manage events with all necessary details, so that I can publish opportunities for artists to discover and apply to.

#### Acceptance Criteria

1. THE Event creation form SHALL collect: title, description, event date and start time, end time, door time (optional), venue selection (dropdown of existing venues or manual entry), total capacity, currency, and visibility (public or private).
2. THE Event creation form SHALL allow the Organizer to add one or more stages with: stage name, start time, end time, and capacity.
3. WHEN the Organizer submits the event creation form with valid data, THE Platform SHALL create an event record in the `events` table with `organizer_id` set to the Organizer's promoter ID and status set to "draft".
4. THE Platform SHALL provide an Events list page showing all events created by the Organizer, grouped by status (draft, published, completed, cancelled), with event title, date, venue, and booking count.
5. WHEN the Organizer publishes an event (changes status from draft to published), THE Platform SHALL make the event visible in the Artist's "Find Gigs" discovery feed.
6. THE Platform SHALL allow the Organizer to edit event details for events in "draft" or "published" status, except for fields locked by existing confirmed bookings (start time, venue).
7. IF the Organizer attempts to delete an event that has active bookings (status not cancelled or completed), THEN THE Platform SHALL reject the deletion and display a message listing the active bookings that must be resolved first.

### Requirement 6: Booking Creation and Offer Management

**User Story:** As an Organizer, I want to send booking offers to artists and manage incoming applications, so that I can build my event lineup.

#### Acceptance Criteria

1. WHEN the Organizer initiates a booking offer from an Artist profile or event management page, THE Platform SHALL display a booking form collecting: target Artist, linked Event, offer amount, currency, slot time preference (opening/mid/closing), and an optional note.
2. WHEN the Organizer submits a booking offer, THE Platform SHALL create a booking record with status "offered", link it to the event and artist, and record the offer in the booking's `meta.history` array.
3. THE Platform SHALL prevent duplicate active bookings for the same Artist and Event combination by checking existing non-cancelled bookings.
4. WHEN an Artist applies to a published event (status "inquiry"), THE Platform SHALL display the application in the Organizer's booking list with the Artist's proposed fee, message, and profile link.
5. WHEN the Organizer reviews an Artist application, THE Platform SHALL provide three actions: Accept (moves to contracting), Counter-Offer (enters negotiation), or Decline (cancels the booking).
6. THE Bookings list page SHALL display all bookings grouped by status with columns: artist name, event title, amount, status, and last updated date.
7. WHEN the Organizer accepts a booking (either direct offer acceptance or application acceptance), THE Platform SHALL transition the booking status to "contracting" and set the `finalAmount` to the agreed offer amount.

### Requirement 7: Negotiation Workflow

**User Story:** As an Organizer, I want to negotiate booking terms with artists through a structured process, so that we can reach mutually agreeable terms efficiently.

#### Acceptance Criteria

1. WHEN the Organizer sends a counter-offer, THE Platform SHALL create a negotiation round by incrementing `meta.negotiationRound`, recording the counter-offer details (amount, slot time, message) in `meta.history`, and updating the booking status to "negotiating".
2. THE Platform SHALL enforce a maximum of 3 negotiation rounds per booking, after which both parties must accept or decline.
3. WHEN a negotiation round exceeds 24 hours without a response, THE Platform SHALL mark the booking as timed out and transition it to "cancelled" status.
4. THE Negotiation view SHALL display a comparison table showing the original offer terms alongside the current counter-offer terms, highlighting changed fields.
5. WHEN the Organizer receives a counter-offer from an Artist, THE Platform SHALL display the counter-offer with options to: Accept, Counter again (if rounds remain), or Decline.
6. WHEN either party accepts during negotiation, THE Platform SHALL transition the booking to "contracting" status and set the `finalAmount` to the last agreed offer amount.
7. THE Platform SHALL display the current negotiation round number and remaining rounds to both parties.

### Requirement 8: Contract Management

**User Story:** As an Organizer, I want to review, sign, and track contracts for my bookings, so that I have legally binding agreements with artists.

#### Acceptance Criteria

1. WHEN a booking transitions to "contracting" status, THE Platform SHALL auto-generate a contract record in the `contracts` table with status "draft", linked to the booking, and populate `contract_text` with terms derived from the booking's agreed amount, event details, and standard platform clauses.
2. THE Contract viewer SHALL display the contract text with key sections highlighted: party details, performance details, financial terms (amount, deposit percentage, payment schedule), cancellation policy, and slot time protection clause.
3. THE Platform SHALL enforce a 48-hour signing deadline from contract creation, after which unsigned contracts are automatically voided and the booking is cancelled.
4. WHEN the Organizer signs a contract, THE Platform SHALL record the signature in the `contract_signatures` table with the Organizer's user ID, role "promoter", signature data, IP address, and timestamp.
5. WHEN both the Organizer and Artist have signed the contract, THE Platform SHALL update the contract status to "signed", the booking status to "confirmed", and trigger the deposit payment milestone.
6. THE Platform SHALL allow one edit request per party before signing, tracked via the `contract_edit_requests` table, with the other party's approval required before changes are applied.
7. THE Organizer's contract list SHALL display all contracts with columns: booking reference, artist name, event title, contract status, signing deadline, and action buttons.

### Requirement 9: Messaging and Communication

**User Story:** As an Organizer, I want to communicate with artists and venue managers through the platform, so that I can coordinate booking details without relying on external channels.

#### Acceptance Criteria

1. WHEN a booking is created, THE Platform SHALL automatically create a conversation record linked to the booking (entity_type "booking", entity_id set to booking ID) with both the Organizer and Artist as participants.
2. THE Messages page SHALL display a list of all conversations the Organizer participates in, sorted by last message timestamp descending, showing the other participant's name, last message preview, and unread indicator.
3. WHEN the Organizer opens a conversation, THE Platform SHALL display the full message history with sender name, message body, and timestamp for each message.
4. WHEN the Organizer sends a message, THE Platform SHALL create a message record in the `messages` table with the Organizer's user ID as sender, and update the conversation's `last_message_at` timestamp.
5. THE Platform SHALL display unread message count as a badge on the Messages navigation link.
6. WHEN a new message is received in an active conversation, THE Platform SHALL deliver an in-app notification to the Organizer.

### Requirement 10: Organizer Profile Management

**User Story:** As an Organizer, I want to view and edit my profile information, so that artists and venues can learn about my organization and track record.

#### Acceptance Criteria

1. THE Profile page SHALL display the Organizer's current profile information: organization name, description, contact person details, website, past events count, Trust_Score, and account creation date.
2. THE Profile page SHALL provide an edit mode allowing the Organizer to update: organization name, description, contact person details, website, and social media links (stored in `metadata`).
3. WHEN the Organizer saves profile changes, THE Platform SHALL update the `promoters` table record and the `updated_at` timestamp.
4. THE Profile page SHALL display a read-only Trust_Score section showing the current score value and a brief explanation of how the score is calculated.
5. THE Profile page SHALL display a summary of the Organizer's booking history: total bookings, completed bookings, cancellation rate, and average booking value.

### Requirement 11: Payment Tracking

**User Story:** As an Organizer, I want to track payment milestones for my bookings, so that I know what I owe and when payments are due.

#### Acceptance Criteria

1. WHEN a contract is fully signed, THE Platform SHALL create a deposit payment record in the `payments` table with the calculated deposit amount (booking's `deposit_percent` of `final_amount`), status "initiated", and the Organizer's user ID as `payer_id`.
2. THE Booking detail view SHALL display a payment timeline showing all payment milestones: deposit (on signing), pre-event payment (7 days before), and final payment (post-event), with status and due dates for each.
3. WHEN a payment milestone becomes due, THE Platform SHALL display the payment as a pending action on the Organizer's Dashboard.
4. THE Platform SHALL track platform commission (2–5% of booking amount) as a separate line item visible in the payment breakdown.
5. IF a payment is overdue by more than 24 hours, THEN THE Platform SHALL display a warning on the Dashboard and in the booking detail view indicating the overdue status and potential penalties.

### Requirement 12: Event Completion and Feedback

**User Story:** As an Organizer, I want to confirm event completion and provide feedback on artist performance, so that the platform can update trust scores and release payments.

#### Acceptance Criteria

1. WHEN an event's end time has passed, THE Platform SHALL prompt the Organizer to confirm event completion for each booking associated with that event.
2. THE Completion confirmation form SHALL collect: a checkbox confirming the artist performed as per contract, an internal performance rating (1–5 stars), and an optional private note.
3. WHEN the Organizer confirms completion, THE Platform SHALL update the booking status to "completed" (if the Artist has also confirmed) and record the feedback in the booking's `meta` field.
4. IF the Organizer does not confirm completion within 48 hours of the event end time, THEN THE Platform SHALL auto-confirm the event and proceed with payment release.
5. WHEN both parties confirm completion, THE Platform SHALL trigger the final payment milestone and update both parties' Trust_Scores based on the booking outcome.

### Requirement 13: Role-Based Navigation and Routing

**User Story:** As an Organizer, I want the platform navigation and routing to reflect my role, so that I see only relevant pages and features.

#### Acceptance Criteria

1. WHEN an authenticated user has the "organizer" or "promoter" role, THE Platform SHALL display the Organizer-specific sidebar navigation with links to: Dashboard, Discover (artists and venues), Events, Bookings, Messages, and Profile.
2. THE Platform SHALL route `/dashboard` to the Organizer Dashboard component when the user role is "organizer" or "promoter".
3. THE Platform SHALL provide dedicated routes for Organizer pages: `/organizer/events`, `/organizer/events/create`, `/organizer/discover`, `/organizer/messages`, and `/organizer/profile`.
4. WHEN an Organizer navigates to `/organizer/setup`, THE Platform SHALL display the Onboarding_Wizard if the profile is not yet complete.
5. IF an unauthenticated user attempts to access any Organizer route, THEN THE Platform SHALL redirect to the authentication page.

### Requirement 14: Schema and Data Layer Integration

**User Story:** As a developer, I want the Organizer role to integrate cleanly with the existing database schema and data access layer, so that the implementation is consistent and avoids redundant tables or columns.

#### Acceptance Criteria

1. THE Platform SHALL use the existing `promoters` table (aliased as `organizers` in schema.ts) for all Organizer profile data, storing extended fields in the `metadata` JSONB column and contact details in the `contact_person` JSONB column.
2. THE Platform SHALL use the existing `events.organizer_id` foreign key to link events to the Organizer's promoter record.
3. THE Platform SHALL add new storage methods to `server/storage.ts` for Organizer-specific queries: `getOrganizerDashboardStats`, `getEventsByOrganizer`, `updateOrganizer`, and `getOrganizerBookingSummary`.
4. THE Platform SHALL add Organizer-specific API route contracts to `shared/routes.ts` for: organizer profile CRUD, organizer events list, and organizer dashboard stats.
5. THE Platform SHALL reuse existing booking, contract, conversation, and payment infrastructure without creating duplicate tables or columns.
6. WHEN creating Organizer-specific API endpoints, THE Platform SHALL register them in a new `server/routes/organizer.ts` module, imported and mounted in `server/routes.ts`.
