# Organizer API Documentation

## Overview

The Organizer (Promoter) API provides endpoints for event organizers to manage their profiles, create and publish events, handle bookings, and track activity on the BANDWIDTH platform. Organizers are the demand-side actors who discover artists, negotiate terms, and coordinate bookings.

All endpoints require session-based authentication and an `organizer` or `promoter` role. Requests without a valid session receive `401 Unauthorized`. Requests from users with a different role receive `403 Forbidden`.

Route contracts and Zod validation schemas are defined in `shared/routes.ts`. Server implementation lives in `server/routes/organizer.ts`.

---

## Table of Contents

1. [Profile Management](#1-profile-management)
2. [Dashboard](#2-dashboard)
3. [Events](#3-events)
4. [Bookings](#4-bookings)
5. [Activity Feed](#5-activity-feed)
6. [Validation Schemas](#6-validation-schemas)
7. [Error Responses](#7-error-responses)

---

## 1. Profile Management

### 1.1 Get Organizer Profile

Retrieve the authenticated organizer's profile joined with user data.

**Endpoint**: `GET /api/organizer/profile`
**Auth**: Required (organizer/promoter role)

**Response** (200):
```json
{
  "id": 1,
  "userId": 42,
  "name": "Sunrise Events",
  "description": "Bangalore-based event management company",
  "contactPerson": {
    "name": "Rahul Kumar",
    "email": "rahul@sunrise.events",
    "phone": "+919876543210"
  },
  "metadata": {
    "profileComplete": true,
    "trustScore": 50,
    "website": "https://sunrise.events",
    "socialLinks": { "instagram": "@sunriseevents" }
  },
  "user": {
    "id": 42,
    "username": "rahul_sunrise",
    "email": "rahul@sunrise.events"
  }
}
```

---

### 1.2 Update Organizer Profile

Partially update profile fields. Only provided fields are changed.

**Endpoint**: `PUT /api/organizer/profile`
**Auth**: Required (organizer/promoter role)

**Request Body** (all fields optional):
```json
{
  "name": "Sunrise Events Pvt Ltd",
  "description": "Updated company description",
  "contactPerson": {
    "name": "Rahul Kumar",
    "email": "rahul@sunrise.events",
    "phone": "+919876543210"
  },
  "website": "https://sunrise.events",
  "socialLinks": {
    "instagram": "@sunriseevents",
    "twitter": "@sunrise_events",
    "linkedin": "sunrise-events"
  }
}
```

**Response** (200): Updated promoter record.

**Errors**:
- `400`: Validation failure (e.g. name too short, invalid URL)

---

### 1.3 Complete Onboarding

Submit the onboarding wizard. Sets `metadata.profileComplete = true` and initializes `metadata.trustScore = 50`. After completion the user is no longer redirected to `/organizer/setup`.

**Endpoint**: `POST /api/organizer/profile/complete`
**Auth**: Required (organizer/promoter role)

**Request Body**:
```json
{
  "organizationName": "Sunrise Events",
  "description": "Bangalore-based event management company specializing in electronic music",
  "contactPerson": {
    "name": "Rahul Kumar",
    "email": "rahul@sunrise.events",
    "phone": "+919876543210"
  },
  "website": "https://sunrise.events",
  "pastEventReferences": ["https://instagram.com/p/sunrisefest2025"]
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| organizationName | string | Yes | 2–200 characters |
| description | string | Yes | 10–2000 characters |
| contactPerson.name | string | Yes | Min 2 characters |
| contactPerson.email | string | Yes | Valid email |
| contactPerson.phone | string | Yes | Min 10 characters |
| website | string | No | Valid URL |
| pastEventReferences | string[] | No | Min 1 item if provided |

**Response** (200):
```json
{
  "message": "Profile completed successfully",
  "organizer": { /* promoter record with metadata.profileComplete = true */ }
}
```

---

### 1.4 Check Profile Status

Quick check whether the organizer has completed onboarding. Used by the client to drive the setup redirect.

**Endpoint**: `GET /api/organizer/profile/status`
**Auth**: Required (organizer/promoter role)

**Response** (200):
```json
{
  "isComplete": true
}
```

---

## 2. Dashboard

### 2.1 Get Dashboard Stats

Aggregated metrics for the organizer's dashboard home screen.

**Endpoint**: `GET /api/organizer/dashboard`
**Auth**: Required (organizer/promoter role)

**Response** (200):
```json
{
  "totalEvents": 12,
  "upcomingEvents": 3,
  "activeBookings": 5,
  "pendingNegotiations": 2,
  "totalSpent": 450000,
  "trustScore": 72
}
```

| Field | Description |
|-------|-------------|
| totalEvents | Count of all events where `organizer_id` matches |
| upcomingEvents | Events with `start_time` in the future |
| activeBookings | Bookings in non-terminal statuses (not cancelled/completed/refunded) |
| pendingNegotiations | Bookings with status "negotiating" |
| totalSpent | Sum of completed payment amounts (in smallest currency unit) |
| trustScore | Current trust score from organizer metadata (0–100) |

---

## 3. Events

### 3.1 List Events

List all events owned by the authenticated organizer.

**Endpoint**: `GET /api/organizer/events`
**Auth**: Required (organizer/promoter role)

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status: `draft`, `published`, `completed`, `cancelled` |

**Response** (200): Array of event records sorted by start time ascending.

---

### 3.2 Create Event

Create a new event in "draft" status. The `organizer_id` is set automatically from the authenticated user's promoter record.

**Endpoint**: `POST /api/organizer/events`
**Auth**: Required (organizer/promoter role)

**Request Body**:
```json
{
  "title": "Friday Night Techno",
  "description": "Weekly techno night at High Ultra Lounge",
  "startTime": "2026-04-15T22:00:00Z",
  "endTime": "2026-04-16T04:00:00Z",
  "doorTime": "2026-04-15T21:00:00Z",
  "venueId": 42,
  "capacityTotal": 800,
  "currency": "INR",
  "visibility": "public",
  "stages": [
    {
      "name": "Main Stage",
      "startTime": "2026-04-15T22:00:00Z",
      "endTime": "2026-04-16T04:00:00Z",
      "capacity": 600
    },
    {
      "name": "Terrace",
      "startTime": "2026-04-15T23:00:00Z",
      "endTime": "2026-04-16T03:00:00Z",
      "capacity": 200
    }
  ]
}
```

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| title | string | Yes | — | 3–200 characters |
| description | string | No | — | |
| startTime | string | Yes | — | ISO 8601 datetime |
| endTime | string | No | — | ISO 8601 datetime |
| doorTime | string | No | — | ISO 8601 datetime |
| venueId | number | No | — | FK to venues table |
| capacityTotal | number | No | — | Positive integer |
| currency | string | No | "INR" | ISO 4217, exactly 3 chars |
| visibility | string | No | "private" | "public" or "private" |
| stages | array | No | — | See stage fields below |

Stage fields: `name` (required string), `startTime`, `endTime`, `capacity` (all optional).

**Response** (201): Created event record with `status = "draft"`.

---

### 3.3 Update Event

Update an existing event. Only events in "draft" or "published" status can be edited. If the event has confirmed bookings, `startTime` and `venueId` are locked and cannot be changed.

**Endpoint**: `PUT /api/organizer/events/:id`
**Auth**: Required (organizer/promoter role, must own the event)

**Request Body**: Partial `createEventSchema` — only include fields to update.

**Errors**:
- `400`: Attempted to change locked fields (startTime/venueId with confirmed bookings)
- `404`: Event not found or not owned by this organizer

---

### 3.4 Delete Event

Delete an event. Fails if the event has active (non-terminal) bookings.

**Endpoint**: `DELETE /api/organizer/events/:id`
**Auth**: Required (organizer/promoter role, must own the event)

**Response** (200):
```json
{ "message": "Event deleted successfully" }
```

**Errors**:
- `404`: Event not found
- `409`: Event has active bookings that must be resolved first

---

### 3.5 Publish Event

Transition an event from "draft" to "published", making it visible in the artist discovery feed.

**Endpoint**: `PUT /api/organizer/events/:id/publish`
**Auth**: Required (organizer/promoter role, must own the event)

**Response** (200): Updated event record with `status = "published"`.

**Errors**:
- `400`: Event is not in "draft" status
- `404`: Event not found

---

## 4. Bookings

### 4.1 List Bookings

List all bookings for the organizer's events.

**Endpoint**: `GET /api/organizer/bookings`
**Auth**: Required (organizer/promoter role)

**Query Parameters**:
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by booking status |

**Response** (200): Array of booking records.

---

### 4.2 Get Booking Detail

Get a single booking's full details. Verifies the booking belongs to one of the organizer's events.

**Endpoint**: `GET /api/organizer/bookings/:id`
**Auth**: Required (organizer/promoter role)

**Response** (200): Booking record with related data.

**Errors**:
- `404`: Booking not found or not owned by this organizer

---

### 4.3 Confirm Event Completion

Submit completion confirmation after an event's end time has passed. Records feedback in `booking.meta.completionFeedback`. If both the organizer and artist confirm, the booking transitions to "completed" and the final payment milestone is triggered.

If the organizer does not confirm within 48 hours of event end, the platform auto-confirms.

**Endpoint**: `POST /api/organizer/bookings/:id/complete`
**Auth**: Required (organizer/promoter role)

**Request Body**:
```json
{
  "confirmed": true,
  "rating": 4,
  "note": "Great set, crowd loved it"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| confirmed | boolean | Yes | Whether artist performed as per contract |
| rating | integer | Yes | 1–5 stars (internal, not public) |
| note | string | No | Max 1000 characters |

**Response** (200): Updated booking record.

---

## 5. Activity Feed

### 5.1 Get Recent Activity

Returns the most recent activity entries from audit logs for the organizer's dashboard.

**Endpoint**: `GET /api/organizer/activity`
**Auth**: Required (organizer/promoter role)

**Query Parameters**:
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| limit | number | 10 | Number of entries to return (positive integer) |

**Response** (200): Array of audit log entries sorted by `occurred_at` descending (newest first).

---

## 6. Validation Schemas

All input validation uses Zod schemas exported from `shared/routes.ts`:

| Schema | Used By | Purpose |
|--------|---------|---------|
| `organizerOnboardingSchema` | POST /api/organizer/profile/complete | Onboarding wizard submission |
| `organizerProfileUpdateSchema` | PUT /api/organizer/profile | Partial profile updates |
| `createEventSchema` | POST /api/organizer/events | Event creation |
| `completionConfirmSchema` | POST /api/organizer/bookings/:id/complete | Event completion confirmation |

These schemas are shared between client and server for consistent validation.

### Reusable Schema Components

The organizer validation schemas are built from reusable components defined in `shared/routes.ts`:

**`contactPersonSchema`** — Validates contact person details:
```typescript
{
  name: string (min 2 chars),
  email: string (valid email format),
  phone: string (min 10 chars)
}
```

**`socialLinksSchema`** — Validates social media handles:
```typescript
{
  instagram?: string (format: @username or username),
  twitter?: string (format: @handle or handle),
  linkedin?: string (non-empty profile identifier)
}
```

**`eventStageSchema`** — Validates event stage configuration:
```typescript
{
  name: string (required),
  startTime?: string (ISO 8601 datetime),
  endTime?: string (ISO 8601 datetime),
  capacity?: number (positive integer)
}
```

These reusable components ensure consistent validation across all organizer-related endpoints and reduce code duplication.

---

## 7. Error Responses

All organizer endpoints use a consistent error format:

| Status | Schema | When |
|--------|--------|------|
| 400 | `{ message, field? }` | Validation failure, invalid state transition |
| 401 | `{ message }` | Not authenticated |
| 403 | `{ message }` | Wrong role or not authorized for resource |
| 404 | `{ message }` | Entity not found (event, booking, contract) |
| 409 | `{ message }` | Conflict (e.g. event deletion blocked by active bookings) |

---

## Data Storage Notes

- Organizer profiles are stored in the `promoters` table (aliased as `organizers` in `shared/schema.ts`)
- Extended profile fields (website, social links, trust score, profileComplete flag) are stored in the `metadata` JSONB column
- Contact person details are stored in the `contact_person` JSONB column
- Events link to organizers via `events.organizer_id` → `promoters.id`
- No new database tables are created — all data fits into existing tables
