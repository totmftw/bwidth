# Venue Workflow Reference

This document covers everything specific to the `venue_manager` / `venue` role: what they can do, how the UI is structured, which API endpoints serve them, and how data is stored.

---

## Table of Contents

1. [Venue's Role in the Platform](#venues-role-in-the-platform)
2. [Onboarding Flow](#onboarding-flow)
3. [Navigation Structure](#navigation-structure)
4. [Dashboard](#dashboard)
5. [Application Inbox Workflow](#application-inbox-workflow)
6. [Profile Management](#profile-management)
7. [API Endpoints](#api-endpoints)
8. [Data Storage Reference](#data-storage-reference)

---

## Venue's Role in the Platform

A venue manager represents a physical performance space (club, bar, concert hall, etc.). On the platform their primary jobs are:

1. **Publish events** — create events at their venue so artists can discover and apply.
2. **Review artist applications** — evaluate incoming applications, accept suitable artists, and decline or negotiate with others.
3. **Manage the venue profile** — keep capacity, equipment, photos, operating days, and booking preferences current so artists have accurate information when applying.

Venues do not directly initiate bookings the way organizers do. Instead, artists apply to venue events; the venue manager then responds through the application inbox.

---

## Onboarding Flow

Route: `/venue/setup`  
Component: `client/src/pages/venue/VenueProfileSetup.tsx`  
Auth guard: `VenueSetupRoute` in `client/src/App.tsx` (requires authenticated session; no sidebar rendered)

A new venue manager is automatically redirected to `/venue/setup` on first login if their profile is incomplete (`GET /api/venues/profile/status` returns `{ isComplete: false }`). They can dismiss the redirect for the session by setting `sessionStorage.skippedOnboarding = "true"`, but the prompt returns on next login until setup is complete.

The wizard has 7 sequential steps. Each step has its own Zod schema; navigation is blocked if the current step is invalid.

| Step | Component schema | Key fields collected |
|------|-----------------|---------------------|
| 1 — Basic Info | `basicInfoSchema` | Name, description (min 20 chars), website URL, Instagram handle |
| 2 — Location | `locationSchema` | Full address (required), city (required), state, pincode |
| 3 — Capacity | `capacitySchema` | Total capacity (required), seated, standing, stage width/depth, ceiling height |
| 4 — Music Policy | `musicPolicySchema` | Preferred genres (at least 1 required), target audience, event frequency, booking mode |
| 5 — Amenities | `amenitiesSchema` | Amenity checkboxes, equipment checkboxes |
| 6 — Photos | `photosSchema` | Cover image URL, gallery image URLs (array), virtual tour URL |
| 7 — Preferences | `preferencesSchema` | Monthly budget min/max, operating days (array), booking email, booking phone |

On completion, all collected data is submitted to `POST /api/venues/profile/complete` (or equivalent profile creation endpoint). On success the user is redirected to `/dashboard`.

The legacy `VenueOnboarding.tsx` has been deleted. `VenueProfileSetup.tsx` is the sole canonical onboarding path.

---

## Navigation Structure

File: `client/src/components/Navigation.tsx`

Venue managers (`venue_manager` or `venue` role) receive a dedicated sidebar separate from the organizer sidebar.

```
Sidebar item     Route                  Component rendered
-----------      -----                  ------------------
Dashboard        /dashboard             VenueDashboard (via RoleBasedDashboard)
Applications     /venue/applications    VenueApplications
Find Artists     /explore               Explore
Profile          /profile               VenueProfile (via RoleBasedProfile)
```

The Applications item will display a badge count (wired to pending application count — implementation in progress).

The `/bookings` route also resolves to `VenueApplications` for venue roles via `RoleBasedBookings`, so any legacy link to `/bookings` still works.

---

## Dashboard

Route: `/dashboard` or `/venue/dashboard`  
Component: `client/src/pages/venue/VenueDashboard.tsx`

### Data fetched

| Query key | Endpoint | Purpose |
|-----------|---------|---------|
| `/api/venues/profile` | `GET /api/venues/profile` | Venue name and metadata for the header |
| `/api/venues/dashboard` | `GET /api/venues/dashboard` | Stat cards |
| `/api/venues/events/upcoming` | `GET /api/venues/events/upcoming` | Upcoming events list |

### Stat cards

| Card | Value source | Notes |
|------|-------------|-------|
| Shows Hosted | `totalShowsHosted` from dashboard stats | Count of all events (any status) linked to this venue |
| Artists Booked | `artistsBooked` | Count of distinct artists across confirmed bookings |
| Budget Used | `budgetUtilization` (INR) | SQL SUM of captured payment amounts for bookings in status `confirmed`, `paid_deposit`, or `completed` where the payment `createdAt` falls in the current calendar month |
| Trust Score | `trustScore` | Read from `venue.metadata.trustScore`; defaults to 50 if the field is absent |

### Action buttons

All buttons in the dashboard are wired to live routes:

| Button | Navigates to |
|--------|-------------|
| Find Artists | `/explore` |
| Create Event | `/venue/events/create` |
| View All (applications) | `/venue/applications` |

---

## Application Inbox Workflow

Route: `/venue/applications`  
Component: `client/src/pages/venue/VenueApplications.tsx`

### How applications arrive

An artist discovers a venue's published event (via `/explore` or similar), applies, and a booking record is created with status `inquiry`. That booking then appears in the venue's application inbox.

### Inbox UI

**Stats row** — four count cards at the top:

| Card | Counts bookings in status |
|------|--------------------------|
| Total | all statuses |
| Pending | `inquiry`, `offered`, `negotiating` |
| Accepted | `confirmed`, `paid_deposit`, `scheduled` |
| Completed | `completed` |

**Tabs** — filter the list: All | Pending | Accepted | Completed | Declined

**Search** — filters by artist name or event name (client-side, case-insensitive).

**Application card** fields: artist name, event name, event date, time slot, proposed fee (INR), status badge.

### Actions per booking status

| Status | Available action |
|--------|----------------|
| `inquiry` | Accept (POST to accept endpoint, sets status → `confirmed`) |
| `inquiry` | Decline (POST to decline endpoint, sets status → `cancelled`) |
| `negotiating` | "Continue Negotiation" — opens `NegotiationFlow` sheet (slide-over panel) |
| `contracting` | View only (contract is being processed) |
| `confirmed`, `scheduled`, `completed` | View only |
| `cancelled` | View only (appears in Declined tab) |

**Accept flow:**
1. Venue manager clicks Accept.
2. `POST /api/venue/applications/:id/accept` is called.
3. Server verifies the booking's event belongs to this venue (`booking.event.venueId === venue.id`).
4. Booking status updated to `confirmed`.
5. Audit log entry written: `action: "venue_application_accepted"`.
6. TanStack Query cache for `/api/venue/applications` is invalidated; list refreshes.

**Decline flow:**
1. Venue manager clicks Decline.
2. `POST /api/venue/applications/:id/decline` is called (optionally with `{ reason }` in the body).
3. Same ownership check as accept.
4. Booking status updated to `cancelled`.
5. Audit log entry written: `action: "venue_application_declined"`, including `reason` if provided.
6. Cache invalidated; list refreshes.

**Negotiation flow:**
Applications in `negotiating` status open the shared `NegotiationFlow` component in a Sheet (slide-over). This is the same negotiation UI used elsewhere on the platform — the venue manager can see offer history and respond.

**Artist profile:**
Clicking an artist's name opens `ArtistProfileModal`, a read-only view of the artist's profile and portfolio.

**Empty states:**
Each tab has a contextual empty state. The Pending tab includes a CTA button linking to `/venue/events/create` to encourage publishing events.

---

## Profile Management

Route: `/profile` (venue roles) or `/venue/profile`  
Component: `client/src/pages/venue/VenueProfile.tsx`

Data is fetched from `GET /api/venues/profile` and saved with `PATCH /api/venues/profile`.

### Tab 1 — Basic Info

| Field | DB / metadata location |
|-------|----------------------|
| Venue name | `venues.name` |
| Description | `venues.description` |
| Website | `venues.metadata.website` |
| Instagram handle | `venues.metadata.instagramHandle` |
| Booking email | `venues.metadata.bookingEmail` |
| Booking phone | `venues.metadata.bookingPhone` |
| Operating days | `venues.metadata.bookingPreferences.operatingDays` (array of day names) |

Operating days are displayed as badge-toggles (Monday through Sunday). Clicking a badge adds or removes the day from the array.

### Tab 2 — Location & Space

| Field | DB location |
|-------|-----------|
| Address | `venues.address` |
| City | parsed from address / metadata |
| Total capacity | `venues.capacity` |
| Seated capacity | `venues.capacitySeated` |
| Standing capacity | `venues.capacityStanding` |

### Tab 3 — Music & Equipment

| Field | DB / metadata location |
|-------|----------------------|
| Preferred genres | `venues.metadata.musicPolicy.preferredGenres` (array) |
| Equipment | `venues.metadata.equipment` (array) |
| Amenities | `venues.amenities` (top-level column, array) |

All three are displayed as badge multi-selects from predefined option lists.

### Tab 4 — Photos & Media

| Field | DB / metadata location |
|-------|----------------------|
| Cover image URL | `venues.metadata.photos.coverImageUrl` |
| Gallery URLs | `venues.metadata.photos.galleryUrls` (array; entered as comma-separated string, split on save) |
| Virtual tour URL | `venues.metadata.photos.virtualTourUrl` |

The "Change Photo" button on the profile header opens a URL input field (not a file upload). The entered URL is saved as `metadata.photos.coverImageUrl`.

---

## API Endpoints

### Venue Applications (`server/routes/venue.ts`)

All three endpoints require an authenticated session and the `venue_manager` or `venue` role (enforced by `isVenueManager` middleware).

#### GET /api/venue/applications

Returns all bookings (with artist and event details) for events owned by the authenticated venue.

```
GET /api/venue/applications
Authorization: session cookie

Response 200:
[
  {
    id: number,
    status: string,
    proposedFee: number,
    event: { id, title, date, venueId, ... },
    artist: { id, name, ... },
    ...
  },
  ...
]

Response 401: { message: "Authentication required" }
Response 403: { message: "Venue manager role required" }
Response 404: { message: "Venue profile not found" }
```

#### POST /api/venue/applications/:id/accept

Accepts an artist application. Verifies the booking's event belongs to the authenticated venue before making any changes.

```
POST /api/venue/applications/:id/accept
Authorization: session cookie

Response 200: updated booking object
Response 400: { message: "Invalid booking ID" }
Response 403: { message: "Not authorized to modify this booking" }
Response 404: { message: "Booking not found" } | { message: "Venue profile not found" }
```

Side effects: sets `booking.status = "confirmed"`, writes audit log.

#### POST /api/venue/applications/:id/decline

Declines an artist application.

```
POST /api/venue/applications/:id/decline
Authorization: session cookie
Body (optional): { reason: string }

Response 200: updated booking object
Response 400: { message: "Invalid booking ID" }
Response 403: { message: "Not authorized to modify this booking" }
Response 404: { message: "Booking not found" } | { message: "Venue profile not found" }
```

Side effects: sets `booking.status = "cancelled"`, writes audit log (includes `reason` if provided).

### Venue Profile & Dashboard (`server/routes/venue.ts` or existing venue routes)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/venues/profile` | Fetch venue profile for authenticated venue manager |
| PATCH | `/api/venues/profile` | Update venue profile fields and metadata |
| GET | `/api/venues/profile/status` | Returns `{ isComplete: boolean }` — used by the auth guard to decide whether to redirect to `/venue/setup` |
| GET | `/api/venues/dashboard` | Returns dashboard stat object: `totalShowsHosted`, `upcomingShows`, `artistsBooked`, `budgetUtilization`, `trustScore`, `pendingRequests` |
| GET | `/api/venues/events/upcoming` | Returns upcoming events for this venue |

---

## Data Storage Reference

### `venues` table (top-level columns)

| Column | Type | Notes |
|--------|------|-------|
| `id` | integer | Primary key |
| `name` | text | Venue display name |
| `description` | text | |
| `address` | jsonb or text | Structured or plain address |
| `capacity` | integer | Total |
| `capacitySeated` | integer | |
| `capacityStanding` | integer | |
| `amenities` | text[] | Array of amenity strings |
| `metadata` | jsonb | All other venue data (see below) |

### `venues.metadata` schema

```
metadata: {
  trustScore: number,              // defaults to 50; updated by platform logic
  website: string,
  instagramHandle: string,
  bookingEmail: string,
  bookingPhone: string,

  musicPolicy: {
    preferredGenres: string[],
    targetAudience: string,
    eventFrequency: string,        // "weekly" | "biweekly" | "monthly" | "occasional"
    bookingMode: string,           // "single" | "programming" | "both"
  },

  equipment: string[],             // items from EQUIPMENT_LIST constant

  photos: {
    coverImageUrl: string,
    galleryUrls: string[],
    virtualTourUrl: string,
  },

  bookingPreferences: {
    monthlyBudgetMin: number,
    monthlyBudgetMax: number,
    operatingDays: string[],       // e.g. ["Friday", "Saturday"]
    bookingEmail: string,
    bookingPhone: string,
  },

  profileComplete: boolean,        // set to true after onboarding wizard completes
}
```

### Audit log entries written by venue routes

| Action | Trigger | Context fields |
|--------|---------|---------------|
| `venue_application_accepted` | Accept endpoint | `venueId`, `previousStatus` |
| `venue_application_declined` | Decline endpoint | `venueId`, `previousStatus`, `reason` (optional) |

---

**Last Updated**: April 2, 2026
