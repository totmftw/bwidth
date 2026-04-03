# BANDWIDTH API Documentation

Complete REST API reference for the BANDWIDTH music booking platform.

## Base URL

All endpoints are prefixed with `/api` unless otherwise noted. In local development the server runs at `http://localhost:5000`.

## Authentication

Session-based authentication via Passport.js. All protected endpoints require an active session cookie (`connect.sid`). Sessions are stored in PostgreSQL using `connect-pg-simple` with a 24-hour TTL.

Unauthenticated requests to protected endpoints receive `401 Unauthorized`.

---

## Auth Endpoints

### POST /api/register

Register a new user account and establish a session.

- **Auth required**: No
- **Request body**:
  - `username` (string, required) -- unique username
  - `password` (string, required)
  - `email` (string, optional) -- defaults to `<username>@example.com`
  - `name` (string, optional) -- display name
  - `phone` (string, optional)
  - `role` (string, optional) -- `"artist"`, `"organizer"`, `"venue"` (normalized to `"venue_manager"`); defaults to `"artist"`
  - `roleData` (object, optional) -- role-specific profile fields created alongside the user
- **Response** (201): User object with role-specific profile data (`artist`, `organizer`, `venue` fields when applicable). Session cookie is set.
- **Errors**: `409` if username already exists.

### POST /api/login

Authenticate an existing user and create a session.

- **Auth required**: No
- **Request body**:
  - `username` (string, required)
  - `password` (string, required)
- **Response** (200): User object with hydrated profiles (`artist`, `organizer`, `venue`).
- **Errors**: `401` invalid credentials.

### POST /api/logout

Destroy the current session.

- **Auth required**: Yes
- **Response**: `200 OK`

### GET /api/user

Return the currently authenticated user, or `null` if not logged in.

- **Auth required**: No (returns `null` for unauthenticated requests)
- **Response** (200): User object with hydrated role profiles, or `null`.

### GET /api/auth/check-username

Check whether a username is available for registration.

- **Auth required**: No
- **Query params**:
  - `username` (string, required)
- **Response** (200): `{ "available": true | false }`

---

## User Endpoints

### PATCH /api/users/me

Update the current user's legal and financial details.

- **Auth required**: Yes
- **Allowed fields**: `legalName`, `permanentAddress`, `panNumber`, `gstin`, `bankAccountNumber`, `bankIfsc`, `bankBranch`, `bankAccountHolderName`, `emergencyContactName`, `emergencyContactPhone`
- **Response** (200): Updated user object.
- **Errors**: `400` validation error, `401` not authenticated.

---

## Artist Endpoints

### GET /api/artists

List all artist profiles.

- **Auth required**: No
- **Response** (200): Array of artist objects.

### GET /api/artists/:id

Get a single artist profile by ID.

- **Auth required**: No
- **Response** (200): Artist object.
- **Errors**: `400` invalid ID, `404` not found.

### PUT /api/artists/:id

Update an artist profile. Only the owning user can update.

- **Auth required**: Yes
- **Request body**: Any combination of `stageName`, `feeMin`, `feeMax`, `location`, `bio`, `name`, `isBand`, `members`, `priceFrom`, `priceTo`, `currency`, `metadata`, plus arbitrary metadata keys.
- **Response** (200): Updated artist object.
- **Errors**: `403` not the owner.

### POST /api/artists/profile/complete

Complete (or update) the artist profile onboarding wizard.

- **Auth required**: Yes (artist role only)
- **Request body**: Validated against `artistProfileCompleteSchema` -- includes `stageName`, `bio`, `primaryGenre`, `priceFrom`, `priceTo`, and other onboarding fields.
- **Response** (200): `{ "message": "Profile completed successfully", "artist": {...} }`
- **Errors**: `403` non-artist role, `400` validation failure.

### GET /api/artists/profile/status

Check whether the current user's artist profile is complete.

- **Auth required**: Yes
- **Response** (200): `{ "isComplete": true | false }`

---

## Organizer Endpoints

All organizer routes require an active session with `organizer` or `promoter` role.

### GET /api/organizer/profile

Return the current user's organizer profile with user data.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Organizer object.

### PUT /api/organizer/profile

Update the organizer profile.

- **Auth required**: Yes (organizer/promoter)
- **Request body**: Validated against `organizerProfileUpdateSchema` -- `name`, `description`, `contactPerson`, `website`, `socialLinks`.
- **Response** (200): Updated organizer object.

### POST /api/organizer/profile/complete

Complete organizer onboarding.

- **Auth required**: Yes (organizer/promoter)
- **Request body**: Validated against `organizerOnboardingSchema` -- `organizationName`, `description`, `contactPerson`, `website`, `pastEventReferences`.
- **Response** (200): Updated organizer object.

### GET /api/organizer/profile/status

Check organizer profile completion status.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): `{ "isComplete": true | false }`

### GET /api/organizer/dashboard

Get organizer dashboard data (pending actions, stats).

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Dashboard data object.

### GET /api/organizer/activity

Get recent organizer activity feed.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Array of activity entries.

### GET /api/organizer/events

List all events belonging to the current organizer.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Array of event objects.

### POST /api/organizer/events

Create a new event.

- **Auth required**: Yes (organizer/promoter)
- **Request body**: Validated against `createEventSchema`.
- **Response** (201): Created event object.

### GET /api/organizer/events/:id

Get a single event by ID.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Event object with details.

### PUT /api/organizer/events/:id

Update an event.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Updated event object.

### DELETE /api/organizer/events/:id

Delete an event.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Success message.

### PUT /api/organizer/events/:id/publish

Publish an event (makes it visible to artists on Find Gigs).

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Updated event with `status: "published"`.

### GET /api/organizer/bookings

List all bookings for the current organizer.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Array of booking objects with details.

### GET /api/organizer/bookings/:id

Get a single organizer booking by ID.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Booking object with full details.

### POST /api/organizer/bookings/:id/complete

Mark a booking as completed.

- **Auth required**: Yes (organizer/promoter)
- **Response** (200): Updated booking object.

---

## Venue Endpoints

### POST /api/venues/profile/complete

Complete the venue profile onboarding (7-step wizard).

- **Auth required**: Yes (venue_manager or organizer role)
- **Request body**: Validated against `venueProfileCompleteSchema` -- venue name, description, address, city, capacity fields, amenities, metadata (music policy, photos, booking preferences).
- **Response** (200): `{ "message": "Venue profile completed successfully", "venue": {...} }`

### GET /api/venues/profile/status

Check whether the venue profile is complete.

- **Auth required**: Yes
- **Response** (200): `{ "isComplete": true | false }`

### GET /api/venues/profile

Get the current user's venue profile.

- **Auth required**: Yes
- **Response** (200): `{ "venue": {...} }` or `{ "venue": null }`.

### PATCH /api/venues/profile

Update the venue profile. Merges metadata.

- **Auth required**: Yes
- **Allowed top-level fields**: `name`, `description`, `address`, `capacity`, `capacitySeated`, `capacityStanding`, `amenities`, `metadata`.
- **Response** (200): `{ "venue": {...} }`

### GET /api/venues/dashboard

Get venue dashboard stats.

- **Auth required**: Yes
- **Response** (200): `{ "totalShowsHosted", "upcomingShows", "artistsBooked", "budgetUtilization", "trustScore", "pendingRequests" }`

### GET /api/venues/events/upcoming

List upcoming events at the current user's venue.

- **Auth required**: Yes
- **Response** (200): Array of event objects.

### GET /api/venues

List all venues (public).

- **Auth required**: No
- **Response** (200): Array of venue objects.

### GET /api/venues/:id

Get a single venue by ID (public).

- **Auth required**: No
- **Response** (200): Venue object.

### GET /api/venue/applications

List artist applications to the venue (used in the venue application inbox).

- **Auth required**: Yes (venue_manager)
- **Response** (200): Array of application/booking objects with artist and event details.

### POST /api/venue/applications/:id/accept

Accept a venue application (sets booking status to `confirmed`).

- **Auth required**: Yes (venue_manager)
- **Response** (200): Updated booking object.

### POST /api/venue/applications/:id/decline

Decline a venue application (sets booking status to `cancelled`).

- **Auth required**: Yes (venue_manager)
- **Response** (200): Updated booking object.

---

## Opportunity (Event Discovery) Endpoints

### POST /api/opportunities

Create a new event/opportunity (for venues and organizers).

- **Auth required**: Yes (venue_manager or organizer)
- **Request body**:
  - `title` (string, required)
  - `description` (string, optional)
  - `startTime` (ISO datetime string, required)
  - `endTime` (ISO datetime string, optional)
  - `capacityTotal` (number, optional)
  - `visibility` (`"public"` | `"private"`, default `"private"`)
  - `stages` (array of stage objects, optional)
  - `metadata` (object, optional)
- **Response** (201): Created event object.

### GET /api/opportunities

List published opportunities. Supports filtering.

- **Auth required**: No
- **Query params**:
  - `genre` (string, optional) -- filter by genre
  - `minBudget` (number, optional) -- minimum budget filter
  - `maxBudget` (number, optional) -- maximum budget filter
  - `location` (string, optional) -- location filter
- **Response** (200): Array of opportunity objects.

### GET /api/opportunities/:id

Get a single opportunity by ID.

- **Auth required**: No
- **Response** (200): Opportunity/event object with venue and organizer details.

---

## Booking & Negotiation Endpoints

### GET /api/bookings

List bookings for the current user (filtered by role: artist, organizer, or venue).

- **Auth required**: Yes
- **Response** (200): Array of booking objects with details.

### POST /api/bookings

Create a new booking (direct offer from organizer/venue to artist).

- **Auth required**: Yes
- **Request body**:
  - `artistId` (number, required)
  - `eventId` (number, optional) -- auto-created if `eventDate` is provided
  - `eventDate` (ISO date string, optional)
  - `offerAmount` (number, optional)
  - `currency` (string, default `"INR"`)
  - `notes` (string, optional)
  - `slotTime` (string, optional)
  - `organizerId` (number, optional) -- auto-resolved from session
- **Response** (201): Booking object with status `"offered"` and a 72-hour deadline.
- **Errors**: `409` if duplicate active booking exists for the same artist/date.

### PUT /api/bookings/:id

Update a booking (general-purpose update).

- **Auth required**: Yes
- **Response** (200): Updated booking object.

### POST /api/bookings/apply

Artist applies to a published event. Creates a booking with status `"inquiry"`, an initial proposal in `bookingProposals`, and sets a 72-hour deadline.

- **Auth required**: Yes (artist role only)
- **Request body**: Validated against `api.bookings.apply.input` -- includes `eventId`, `proposal` (financial, scheduling, tech rider), and optional `message`.
- **Response** (201): `{ "booking": {...}, "proposal": {...}, "summary": {...} }`
- **Errors**: `409` if already applied to this event, `404` if event not published.

### GET /api/bookings/:id/negotiation

Get the negotiation summary for a booking. Returns the current proposal, history, acceptance status, rider confirmation, and activity timeline.

- **Auth required**: Yes
- **Response** (200): Negotiation summary object.

### POST /api/bookings/:id/negotiation/action

Unified negotiation action endpoint (preferred over legacy endpoints).

- **Auth required**: Yes
- **Request body**: Validated against `api.bookings.negotiationAction.input`:
  - `action` (`"edit"` | `"accept"` | `"walkaway"`)
  - `snapshot` (proposal snapshot object, required for `"edit"`)
  - `note` (string, optional)
  - `reason` (string, optional, for `"walkaway"`)
- **Response** (200): `{ "success": true, "summary": {...} }`
- **Errors**: `403` not a participant or wrong turn, `400` validation or business logic errors.

### POST /api/bookings/:id/negotiation/propose (deprecated)

Submit a counter-proposal. Delegates to the unified action endpoint. Returns `X-Deprecated` header.

- **Auth required**: Yes
- **Request body**: `{ "snapshot": {...}, "note": "..." }`

### POST /api/bookings/:id/negotiation/rider-confirm (deprecated)

Rider confirmation is now part of the proposal snapshot. Returns `410 Gone`.

### POST /api/bookings/:id/negotiation/accept (deprecated)

Accept the current negotiation terms. Delegates to the unified action endpoint. Returns `X-Deprecated` header.

- **Auth required**: Yes

### POST /api/bookings/:id/negotiation/walk-away (deprecated)

Walk away from the negotiation. Delegates to the unified action endpoint. Returns `X-Deprecated` header.

- **Auth required**: Yes
- **Request body**: `{ "reason": "..." }`

---

## Contract Endpoints

### POST /api/bookings/:bookingId/contract/initiate

Initiate the contract stage for a booking. Auto-generates the contract text from the agreed negotiation snapshot. Sets a 48-hour deadline.

- **Auth required**: Yes
- **Preconditions**: Booking must be in `"contracting"` status or negotiation must be `"agreed"`.
- **Response** (201): `{ "contract": {...}, "message": "Contract initiated..." }`
- **Idempotent**: Returns existing contract if already initiated.

### GET /api/bookings/:bookingId/contract

Get the contract for a booking, with user-specific context.

- **Auth required**: Yes
- **Response** (200): Contract object with additional fields:
  - `userRole` -- the requesting user's contract role (`"artist"` or `"promoter"`)
  - `userCanEdit` -- whether the user still has their one-time edit
  - `userHasAccepted` -- whether the user has accepted the terms
  - `userHasSigned` -- whether the user has signed
  - `timeRemaining` -- seconds until contract deadline, or `null`

### POST /api/contracts/:id/review

Review a contract: accept as-is or propose edits (one edit per party, organizer first).

- **Auth required**: Yes
- **Request body**:
  - `action` (`"ACCEPT_AS_IS"` | `"PROPOSE_EDITS"`)
  - `changes` (object, required for `"PROPOSE_EDITS"`) -- editable fields: date, time slot, accommodations, hospitality
  - `note` (string, optional)
- **Sequential rule**: Organizer must review first. Artist cannot review until organizer has completed their review.
- **One-edit rule**: Each party can propose edits exactly once.
- **Response** (200): `{ "success": true, "contract": {...} }`

### POST /api/contracts/:id/edit-requests/:reqId/respond

Respond to an edit request (approve or reject).

- **Auth required**: Yes
- **Request body**:
  - `decision` (`"APPROVE"` | `"REJECT"`)
  - `responseNote` (string, optional)
- **Response** (200): Updated contract details.

### POST /api/contracts/:id/accept

Accept the finalized contract terms (EULA checkpoint). Must have completed review first.

- **Auth required**: Yes
- **Request body**: `{ "agreed": true }`
- **Response** (200): `{ "success": true, "message": "Contract accepted...", "contract": {...} }`

### POST /api/contracts/:id/sign

Sign the contract. Captures IP address and timestamp. Requires prior acceptance.

- **Auth required**: Yes
- **Request body**:
  - `signatureData` (string, optional) -- signature content
  - `signatureMethod` (`"draw"` | `"type"` | `"upload"`, default `"type"`)
- **Preconditions**: Must have accepted first, no pending edit requests, deadline not passed.
- **Response** (200): Updated contract with signature details. When both parties have signed, contract status advances to `"admin_review"`.

### POST /api/contracts/check-deadlines

Check all contracts for expired deadlines and void them.

- **Auth required**: No (system/cron endpoint)
- **Response** (200): `{ "message": "...", "voided": <count> }`

### POST /api/bookings/:id/contract/generate (legacy)

Legacy alias for contract initiation. Generates a contract from booking terms.

- **Auth required**: Yes
- **Response** (201): Contract object.

### GET /api/contracts/:id/pdf

Generate and download a PDF of the contract. Includes "DIGITALLY SIGNED" watermark for signed contracts or "DRAFT" watermark otherwise.

- **Auth required**: Yes
- **Response**: PDF file download (`application/pdf`).

---

## Conversation & Messaging Endpoints

### GET /api/conversations

List all conversations the authenticated user participates in, ordered by most recent activity.

- **Auth required**: Yes
- **Response** (200): Array of conversation objects.

### GET /api/conversations/:id

Get a single conversation with workflow instance and participant list.

- **Auth required**: Yes
- **Access control**: Only participants can view (403 for non-participants).
- **Response** (200): Conversation with `workflowInstance` and `participants[]`.

### GET /api/conversations/:id/messages

Get messages for a conversation, returned in chronological order.

- **Auth required**: Yes
- **Response** (200): Array of message objects (oldest first).

### POST /api/entities/:entityType/:entityId/conversation/:conversationType/open

Open (or return existing) a conversation for a domain entity. Idempotent -- if a conversation already exists for the given entity and type, it is returned without creating a duplicate.

- **Auth required**: Yes
- **Path params**:
  - `entityType` -- e.g. `"booking"`
  - `entityId` -- integer ID of the entity
  - `conversationType` -- e.g. `"negotiation"`, `"general"`
- **Response** (200): Conversation object.

### POST /api/conversations/:id/actions

Dispatch a workflow action (e.g. ACCEPT, DECLINE, PROPOSE_CHANGE) within a conversation.

- **Auth required**: Yes
- **Request body**:
  - `actionKey` (string, required) -- the workflow action name
  - `inputs` (object, optional) -- action-specific payload
  - `clientMsgId` (string, optional) -- client-generated dedup ID
- **Response** (200): The action message created by the workflow service.
- **Errors**: `400` for workflow logic errors (wrong turn, locked, max rounds).

### POST /api/conversations/:id/messages

Send a free-text message in a conversation. Blocked for negotiation-type conversations (use `/actions` instead).

- **Auth required**: Yes
- **Request body**:
  - `body` (string, required) -- message text
  - `clientMsgId` (string, optional) -- client-generated dedup ID
- **Response** (200): Created message object.
- **Errors**: `400` if conversation is a negotiation (free text not allowed).

---

## Notification Endpoints

### GET /api/notifications

List notifications for the authenticated user.

- **Auth required**: Yes
- **Query params**:
  - `limit` (number, default 20, max 50)
  - `offset` (number, default 0)
  - `unreadOnly` (`"true"` | `"false"`)
- **Response** (200): `{ "notifications": [...], "unreadCount": <number>, "total": <number> }`

### GET /api/notifications/unread-count

Get a lightweight unread notification count (for badge display).

- **Auth required**: Yes
- **Response** (200): `{ "count": <number> }`

### POST /api/notifications/:id/read

Mark a single notification as read.

- **Auth required**: Yes
- **Response** (200): `{ "success": true }`

### POST /api/notifications/read-all

Mark all notifications as read for the authenticated user.

- **Auth required**: Yes
- **Response** (200): `{ "success": true, "count": <number> }`

---

## Media Endpoints

### POST /api/media/upload

Upload images from device (multipart form-data).

- **Auth required**: Yes
- **Content-Type**: `multipart/form-data`
- **Form fields**:
  - `images` (file, up to 20 files) -- image files to upload
  - `entityType` (string, optional) -- e.g. `"artist_profile"`, `"venue_gallery"`
  - `entityId` (number, optional) -- ID of the associated entity
  - `altText` (string, optional)
- **File constraints**: Max 20 MB per file. Allowed MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`.
- **Per-entity limits**: `user_avatar` (1), `artist_profile` (1), `artist_portfolio` (20), `venue_cover` (1), `venue_gallery` (20), `organizer_logo` (1), `event_cover` (3). Default limit is 10.
- **Response** (201): Array of media record objects with `url` field (e.g. `/api/media/<id>/file`).

### POST /api/media/url

Upload an image from a URL. Attempts to fetch and store the image data; falls back to storing the URL reference if the fetch fails.

- **Auth required**: Yes
- **Request body**:
  - `url` (string, valid URL, required)
  - `entityType` (string, required)
  - `entityId` (number, required)
  - `altText` (string, optional)
- **Response** (201): Media record object with `url` field.

### GET /api/media/:id/file

Serve an image file. Returns binary image data with proper MIME type headers for stored images, or redirects (302) for external URL references.

- **Auth required**: No (public)
- **Response**: Image binary with `Content-Type` header, or 302 redirect.
- **Caching**: `Cache-Control: public, max-age=86400` (24 hours).

### GET /api/media/entity/:entityType/:entityId

List all images for a given entity.

- **Auth required**: No (public)
- **Response** (200): Array of media record objects with `url` fields.

### DELETE /api/media/:id

Delete a media record. Owner or admin only.

- **Auth required**: Yes
- **Response** (200): `{ "message": "Media deleted" }`
- **Errors**: `403` not authorized, `404` not found.

---

## Admin Endpoints

All admin endpoints are mounted under `/api/admin` and require `admin` or `platform_admin` role. Unauthorized requests receive `401` or `403`.

### Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/stats` | Platform-wide statistics |

### User Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/users` | Create a new user with profile (requires `email`, `password`, `role`) |
| GET | `/api/admin/users/:id` | Get user by ID |
| PATCH | `/api/admin/users/:id` | Update user fields |
| PATCH | `/api/admin/users/:id/status` | Change user status (active, suspended, etc.) |
| PATCH | `/api/admin/users/:id/role` | Change user role |
| DELETE | `/api/admin/users/:id` | Delete a user |

### Artist Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/artists` | List all artists |
| GET | `/api/admin/artists/:id` | Get artist by ID |
| PATCH | `/api/admin/artists/:id` | Update artist fields |

### Organizer Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/organizers` | List all organizers |
| GET | `/api/admin/organizers/:id` | Get organizer by ID |
| PATCH | `/api/admin/organizers/:id` | Update organizer fields |

### Venue Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/venues` | List all venues |
| GET | `/api/admin/venues/:id` | Get venue by ID |
| PATCH | `/api/admin/venues/:id` | Update venue fields |

### Event Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/events` | List all events |
| GET | `/api/admin/events/:id` | Get event by ID |
| PATCH | `/api/admin/events/:id` | Update event fields |
| DELETE | `/api/admin/events/:id` | Delete an event |

### Booking Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/bookings` | List all bookings |
| GET | `/api/admin/bookings/:id` | Get booking by ID |
| PATCH | `/api/admin/bookings/:id/status` | Change booking status |

### Contract Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/contracts/pending` | List contracts pending admin review |
| GET | `/api/admin/contracts` | List all contracts |
| GET | `/api/admin/contracts/:id` | Get contract by ID |
| PATCH | `/api/admin/contracts/:id` | Update contract fields |
| POST | `/api/admin/contracts/:id/review` | Admin review action on a contract (approve/reject) |

### Conversations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/conversations` | List all conversations |
| GET | `/api/admin/conversations/:id/messages` | Get messages for a conversation |

### Settings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/settings` | Get app settings (approval toggles) |
| POST | `/api/admin/settings` | Update app settings |
| GET | `/api/admin/settings/system` | Get system settings |
| POST | `/api/admin/settings/system` | Update system settings |

### Audit Log

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/audit` | List audit log entries |

### Notification Management

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/notification-types` | List notification types |
| POST | `/api/admin/notification-types` | Create a notification type |
| PUT | `/api/admin/notification-types/:id` | Update a notification type |
| DELETE | `/api/admin/notification-types/:id` | Delete a notification type |
| GET | `/api/admin/notification-channels` | List notification channels |
| PUT | `/api/admin/notification-channels/:id` | Update a notification channel |
| POST | `/api/admin/notifications/test` | Send a test notification |

---

## WebSocket

Real-time messaging and notifications via WebSocket.

- **Path**: `/ws`
- **Protocol**: JSON messages over WebSocket

### Client-to-Server Messages

**Subscribe to a conversation room:**
```json
{ "type": "subscribe", "conversationId": 42 }
```

**Authenticate for user-level notifications:**
```json
{ "type": "auth", "userId": 7 }
```

### Server-to-Client Messages

**Subscription confirmed:**
```json
{ "type": "connected", "conversationId": 42 }
```

**Auth confirmed:**
```json
{ "type": "auth_ok", "userId": 7 }
```

**New message in a subscribed conversation:**
```json
{ "type": "message", "data": { "id": 123, "conversationId": 42, "senderId": 7, "body": "...", ... } }
```

**Notification for an authenticated user:**
```json
{ "type": "notification", "data": { "id": 99, "title": "...", "body": "...", ... } }
```

### Architecture

- **Room-based pub/sub**: Each conversation ID maps to a set of connected clients. Messages are broadcast to all clients in the room.
- **User-based pub/sub**: Each authenticated user ID maps to a set of connections. Notifications are delivered to all of a user's active connections.
- Clients that disconnect are automatically cleaned up from both room and user maps.

---

## Common Error Response Format

All error responses follow this structure:

```json
{
  "message": "Human-readable error description",
  "errors": []
}
```

The `errors` array is present for validation failures (Zod) and contains individual field-level error details. For non-validation errors, only `message` is returned.

## HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request / validation error |
| 401 | Not authenticated |
| 403 | Not authorized (wrong role or not owner) |
| 404 | Resource not found |
| 409 | Conflict (duplicate) |
| 410 | Gone (deprecated endpoint removed) |
| 500 | Internal server error |
