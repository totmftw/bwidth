# Platform Functionality Documentation

## 1. Overview
The platform serves as an end-to-end booking, negotiation, and contracting system for Artists, Organizers, and Venues. It is overseen by a powerful App Admin role capable of intervening in any workflow and toggling global approval requirements.

## 2. User Roles
- **Artist**: Can discover gigs, negotiate terms, request specific tech gear, and sign performance contracts.
- **Organizer**: Can book artists, specify provided event equipment, initiate contracts, and manage event lifecycles.
- **Venue**: Can list spaces for events, manage artist applications, configure venue profiles, and review booking negotiations.
- **App Admin / SuperUser**: Has full systemic control, oversight over all entities, and can toggle workflow approvals on or off.

## 3. Negotiation Flow & Tech Rider
Before a contract is generated, the Artist and Organizer enter a negotiation phase.
- **Financials & Scheduling**: Parties negotiate the booking fee and time slot.
- **Tech Rider Integration**: The chat UI allows the Organizer to explicitly list the equipment they will provide for the event. The Artist can counter or request additional gear they need, or clarify what they will bring themselves.
- **Finalization**: Once both parties click "Accept", the agreed-upon fee, slot, and tech rider are snapshotted into the booking.

## 4. Contract Edit Workflow
The platform employs a strict, sequential editing policy to prevent endless revisions:
1. **Full-Page Viewer**: Contracts are viewed in a dedicated, full-screen UI for readability.
2. **Organizer's Turn**: The Organizer is given the first opportunity to review the generated contract. They can make **one** set of edits to specific unlocked fields:
   - Date of the event
   - Time slot
   - Accommodations & Transportation
   - Hospitality (e.g., complementary beers/drinks)
3. **Artist's Turn**: The Artist receives the contract. They can either accept the Organizer's version or make their own **one-time** edit to those same fields.
4. **Final Resolution**: If the Artist made an edit, it goes back to the Organizer. The Organizer now has only two choices:
   - **Accept**: Agree to the Artist's final changes.
   - **Walk Away**: Decline the changes, voiding the contract and cancelling the booking entirely. No further negotiations are permitted.

## 5. Legal Signing Process
Once the contract text is finalized and accepted by both parties, the signing phase begins:
1. **Confirmation Checkpoint**: When a user clicks "Sign Contract", a popup dialog appears.
2. **Legally Binding Agreement**: The user must check a box stating they agree to abide by the contract and acknowledge it is legally binding.
3. **Digital Signature**: The user confirms their signature, which captures their IP address and timestamp.
4. **Admin Review**: After both parties sign, the contract is routed to the App Admin for final approval.
5. **PDF Generation**: Upon Admin approval, a PDF is generated featuring a distinct "Digitally Signed" watermark beneath the Artist and Organizer information, cementing its legal status.

## 6. App Admin Control Panel
The SuperUser (`musicapp`) operates from a dedicated dashboard (`/admin`):
- **Global Transparency**: The Admin can view the status of all events, negotiations, user profiles, and active contracts.
- **Intervention**: The Admin has the authority to manually approve, reject, or modify ongoing workflows.
- **Approval Toggles**: A dedicated control panel allows the Admin to turn mandatory approval steps on or off (e.g., bypassing the Admin Review step for contract signing if desired).

## 7. Venue Workflow

The venue role has a complete, self-contained workflow distinct from the organizer flow. Everything described below is implemented and live as of April 2026.

### 7.1 Onboarding

New venue managers are routed to `/venue/setup` on first login. The setup wizard (`VenueProfileSetup`) is a 7-step guided flow:

| Step | Title | Key fields |
|------|-------|-----------|
| 1 | Basic Info | Venue name, description, website, Instagram handle |
| 2 | Location | Address, city, state, pincode |
| 3 | Capacity | Total, seated, standing capacity; stage dimensions; ceiling height |
| 4 | Music Policy | Preferred genres (multi-select), target audience, event frequency, booking mode |
| 5 | Amenities | Amenity checkboxes (Green Room, Parking, Bar, etc.), equipment list (PA System, DJ Console, etc.) |
| 6 | Photos | Cover image URL, gallery image URLs, virtual tour URL |
| 7 | Preferences | Monthly budget range, operating days, booking contact email/phone |

On completion, the venue profile is marked as set up and the manager is redirected to the dashboard. There is no separate "coming soon" placeholder for the Photos step — it is fully functional.

Note: The legacy `VenueOnboarding.tsx` page has been deleted. `VenueProfileSetup.tsx` is the sole canonical onboarding path.

### 7.2 Sidebar Navigation

Venue managers see a role-specific sidebar with four items:

- **Dashboard** → `/dashboard` (resolves to `VenueDashboard`)
- **Applications** → `/venue/applications` (artist application inbox)
- **Find Artists** → `/explore`
- **Profile** → `/profile` (resolves to `VenueProfile`)

### 7.3 Dashboard

The dashboard (`VenueDashboard`, served at `/dashboard` and `/venue/dashboard`) displays four real-time stat cards sourced from `GET /api/venues/dashboard`:

- **Shows Hosted** — total confirmed/completed events at this venue
- **Artists Booked** — distinct artists across all confirmed bookings
- **Budget Used** — SQL SUM of payment amounts for confirmed/paid/completed bookings in the current calendar month (displayed in INR)
- **Trust Score** — read from `venue.metadata.trustScore`; defaults to 50 if not set

An upcoming events panel lists the next scheduled shows with date, artist, and time slot. All action buttons (Start Programming, Update Availability, View Past Performances, View Calendar, Find Artists, Create Event) are wired to real routes — none are placeholder or disabled.

### 7.4 Application Inbox

Accessed via `/venue/applications` (`VenueApplications`), this is the primary operational screen for venue managers.

**Stats row** at the top shows four counts: Total, Pending (highlighted in yellow when non-zero), Accepted, Completed.

**Status tabs**: All | Pending | Accepted | Completed | Declined

**Search**: Free-text filter across artist name and event name.

**Per-application card** shows: artist name (clickable → `ArtistProfileModal`), event name, date, time slot, proposed fee, and a status badge.

**Actions depend on booking status**:

| Booking status | Available actions |
|---------------|------------------|
| `inquiry` | Accept button, Decline button |
| `negotiating` | "Continue Negotiation" button → opens `NegotiationFlow` sheet |
| `contracting`, `confirmed`, `scheduled`, `completed` | Read-only view |
| `cancelled` | Read-only (shown in Declined tab) |

Accept sets booking status to `confirmed`. Decline sets it to `cancelled`. Both actions write an audit log entry via `storage.createAuditLog()` with `action: "venue_application_accepted"` or `"venue_application_declined"` and record the previous status and venue ID.

The page uses TanStack Query with query key `["/api/venue/applications"]` and invalidates on mutation success.

### 7.5 Profile Management

The venue profile page (`VenueProfile`, served at `/profile` for venue roles) has four tabs:

**Basic Info**
- Venue name, description
- Website, Instagram handle, booking email, booking phone
- Operating days — displayed as badge-toggles (Monday through Sunday); stored in `metadata.bookingPreferences.operatingDays`

**Location & Space**
- Address, city
- Total capacity, seated capacity, standing capacity

**Music & Equipment**
- Preferred genres (badge multi-select); stored in `metadata.musicPolicy.preferredGenres`
- Equipment list (badge multi-select); stored in `metadata.equipment`
- Amenities list (badge multi-select); stored on the `venues` table `amenities` column

**Photos & Media**
- Cover image URL; stored in `metadata.photos.coverImageUrl`
- Gallery URLs (comma-separated input, split on save); stored in `metadata.photos.galleryUrls`
- Virtual tour URL; stored in `metadata.photos.virtualTourUrl`

The "Change Photo" button is functional — it opens a URL input rather than a file picker. All fields submit via `PATCH /api/venues/profile`.

---

## 8. Image Upload Module

A unified image upload component (`ImageUpload.tsx`) is used across all profile and entity pages. It supports three input methods: drag-and-drop, file browser, and URL input.

### 8.1 Input Methods

- **Drag & Drop**: Users can drag image files directly onto the upload zone. The drop zone highlights with a visual indicator during drag-over.
- **Browse**: A "Browse" button opens the native file picker. Multiple files can be selected at once.
- **URL Input**: A toggle reveals a text input where users can paste an image URL. The server attempts to fetch and store the image data; if the fetch fails (timeout, non-image response), it falls back to storing the URL reference.

### 8.2 Validation & Constraints

| Constraint | Value |
|------------|-------|
| Max file size | 20 MB per file |
| Accepted types | JPEG, PNG, GIF, WebP, SVG |
| Max files per upload | 20 |
| Duplicate detection | By filename within the current image set |

Client-side validation runs before upload. Errors are displayed inline below the upload zone.

### 8.3 Per-Entity Image Limits

Each entity type has a maximum number of images. The server enforces these limits and rejects uploads that would exceed them.

| Entity Type | Max Images |
|-------------|-----------|
| `user_avatar` | 1 |
| `artist_profile` | 1 |
| `artist_portfolio` | 20 |
| `venue_cover` | 1 |
| `venue_gallery` | 20 |
| `organizer_logo` | 1 |
| `event_cover` | 3 |
| (default) | 10 |

### 8.4 API Integration

- **Upload from device**: `POST /api/media/upload` (multipart form-data, field name `images`)
- **Upload from URL**: `POST /api/media/url` (JSON body: `{ url, entityType, entityId, altText? }`)
- **Serve image**: `GET /api/media/:id/file` (returns binary with correct MIME type, or 302 redirect for external URLs)
- **List by entity**: `GET /api/media/entity/:entityType/:entityId`
- **Delete**: `DELETE /api/media/:id` (owner or admin only)

Image data is stored as base64 in the database. Public URLs follow the pattern `/api/media/<id>/file` and are cached with `Cache-Control: public, max-age=86400`.

### 8.5 UI Features

- Upload progress bar (simulated stages at 30%, 80%, 100%)
- Image preview thumbnails with delete buttons
- Remaining slots indicator ("X of N images used")
- Error messages per file (type mismatch, size exceeded, limit reached)
- Compact mode for single-image entity types (e.g., avatar, profile picture)

---

## 9. Real-Time WebSocket Chat

The platform uses a WebSocket server (`ws-server.ts`) for real-time messaging and notifications, replacing the previous 5-second polling mechanism.

### 9.1 Architecture

- **Connection endpoint**: `ws://localhost:5000/ws` (or `wss://` in production)
- **Room-based pub/sub**: Each conversation has a room keyed by `conversationId`. Clients subscribe to a room and receive all messages broadcast to it.
- **User-based pub/sub**: Each authenticated user has a connection set keyed by `userId`. Server-side events (e.g., notification creation) broadcast to all of a user's active connections.
- **Automatic cleanup**: Disconnected clients are removed from both room and user maps immediately.

### 9.2 Protocol

**Client sends to server:**

| Message | Fields | Purpose |
|---------|--------|---------|
| `subscribe` | `{ type: "subscribe", conversationId: <number> }` | Join a conversation room |
| `auth` | `{ type: "auth", userId: <number> }` | Authenticate for user-level notifications |

**Server sends to client:**

| Message | Fields | Purpose |
|---------|--------|---------|
| `connected` | `{ type: "connected", conversationId: <number> }` | Confirms room subscription |
| `auth_ok` | `{ type: "auth_ok", userId: <number> }` | Confirms user authentication |
| `message` | `{ type: "message", data: <MessageObject> }` | New message in a subscribed room |
| `notification` | `{ type: "notification", data: <NotificationObject> }` | Notification for the authenticated user |

### 9.3 Client Integration

The `useConversationMessages` hook (`client/src/hooks/use-conversation.ts`) combines HTTP fetching with WebSocket subscriptions:

1. Initial message history is fetched via `GET /api/conversations/:id/messages`.
2. The hook subscribes to the WebSocket room for the conversation.
3. Incoming WebSocket messages are appended directly into the TanStack Query cache (no refetch needed).
4. No `refetchInterval` is configured -- WebSocket handles all live updates.

The `getWebSocket()` helper from `client/src/lib/ws.ts` provides a singleton WebSocket connection shared across hooks.

---

## 10. Genre Filter Pills (Find Gigs)

The Find Gigs page (`artist/FindGigs.tsx`) includes a horizontal scrollable strip of genre filter pills above the opportunity list.

### 10.1 How It Works

- **Preset genres**: Jazz, Rock, EDM, Classical, Bollywood, Hip-Hop, Pop, Indie, Folk.
- **Dynamic genres**: Additional genres are extracted from event metadata (`metadata.genres`, `metadata.tags`) across all loaded opportunities.
- **Merged and sorted**: Preset genres are combined with discovered genres, deduplicated, and sorted alphabetically. An "All" option appears first.
- **Active state**: The selected pill is highlighted with the primary color and foreground text. Inactive pills use a muted background with subtle borders.

### 10.2 Filtering Logic

When a genre is selected (other than "All"), opportunities are filtered by:

1. Exact match against `metadata.genre`, `metadata.primaryGenre`, or `metadata.category`.
2. Inclusion in `metadata.genres[]` or `metadata.tags[]` arrays.
3. Substring match in the event `title` or `description`.

This ensures events are still discoverable even if genre metadata is stored inconsistently across events.

---

## 11. Fee Guidance (Application Modal)

The Gig Application Modal (`GigApplicationModal.tsx`) displays contextual guidance below the "Proposed Fee" input to help artists set appropriate fees.

### 11.1 Guidance Rules

The hint text below the fee input adapts based on available event data:

- **If event has budget range** (`metadata.budgetMin` and `metadata.budgetMax`): Displays "Event budget: INR X -- INR Y".
- **If event has capacity data** (`capacityTotal`): Displays "Venue capacity: N -- factor this into your fee".
- **Fallback**: Displays "Tip: Check the event description for budget expectations".

The default proposed fee is pre-filled at INR 5,000 as a starting point.

---

## 12. Profile Completion Progress Bar

The Artist Profile Setup wizard (`artist/ProfileSetup.tsx`) displays a progress bar and step indicator during onboarding.

### 12.1 Visual Elements

- **Step indicator**: Text showing "Step X of N" (left-aligned) and "Y% Complete" (right-aligned).
- **Progress bar**: A horizontal bar (`shadcn/ui Progress` component) that fills proportionally as the user advances through steps. The percentage is calculated as `(currentStep / totalSteps) * 100`.
- **Step navigation**: Users can advance through each step sequentially. The progress bar updates in real time as the user moves between steps.

The progress bar uses the `Progress` component from shadcn/ui, rendered at `h-2` height for a compact appearance.

---

## 13. KPI Stats Cards (Bookings)

Both the Artist Bookings page (`ArtistBookings.tsx`) and the Organizer Bookings page (`OrganizerBookings.tsx`) display a strip of KPI stats cards at the top of the page.

### 13.1 Organizer Bookings Stats

Five cards are displayed in a responsive grid (`grid-cols-2 md:grid-cols-5`):

| Card | Value | Icon | Highlight Condition |
|------|-------|------|---------------------|
| Total Bookings | Count of all bookings | Calendar | -- |
| Pending | Count of bookings with status `inquiry` | Clock | Highlighted when > 0 |
| Negotiating | Count with status `offered`, `negotiating`, or `contracting` | MessageSquare | Highlighted when > 0 (orange) |
| Confirmed | Count with status `confirmed`, `paid_deposit`, or `scheduled` | CheckCircle | Green text |
| Completed | Count with status `completed` | Check | Violet text |

### 13.2 Artist Bookings Stats

The Artist Bookings page uses the same 5-card layout with identical status groupings and highlight behavior. Each card uses a `StatsCard` component with label, value, icon, optional color, and highlight flag.

### 13.3 Implementation

All stats are computed client-side from the bookings array returned by `GET /api/bookings`. No additional API call is needed. The tab badges (Pending, Negotiating, Confirmed) also display counts inline for quick context.

---

## 14. Contract Scroll Enforcement

The contract viewing UI (in both `ContractViewer.tsx` and `ContractPage.tsx`) enforces that users read the contract before they can accept it.

### 14.1 How It Works

1. A `hasReadContract` state variable starts as `false`.
2. An `onScroll` handler on the contract content container tracks the scroll position.
3. The scroll percentage is calculated as `(scrollTop + clientHeight) / scrollHeight`.
4. When the scroll percentage reaches 90% or higher, `hasReadContract` is set to `true`.

### 14.2 UI Behavior

**Before scrolling to 90%:**
- A banner at the bottom of the contract reads: "Scroll to read full contract before accepting".
- The "Accept As-Is" button is disabled and shows the label "Read Contract First" with a downward arrow.
- Clicking the button scrolls the contract pane to the bottom (`scrollTo({ top: scrollHeight, behavior: 'smooth' })`).

**After scrolling to 90%:**
- The banner disappears.
- The "Accept As-Is" button becomes enabled and shows its normal label.

### 14.3 Missing Legal Details Warning

If the contract text contains placeholder data due to incomplete user legal details (missing PAN, GSTIN, or permanent address), a warning banner is displayed:

> **Legal details incomplete.** The contract contains placeholder text (missing PAN/GSTIN/address). [Complete Legal & Bank profile -->]

The link navigates to `/profile` where the user can fill in their legal and financial information.

---

## 15. Negotiation Timer (72 Hours)

Each negotiation step and booking flow enforces a 72-hour deadline.

### 15.1 Where Deadlines Are Set

- **Booking creation** (direct offer): `flowDeadlineAt` set to `now + 72 hours`.
- **Artist application**: `flowDeadlineAt` set to `now + 72 hours`. The negotiation `stepDeadlineAt` is also set to the same value.
- **Each negotiation action** (counter-proposal): The step deadline is reset to `now + 72 hours` with each new proposal round.

### 15.2 Enforcement

- Before processing any negotiation action, the `NegotiationService` checks whether `flowDeadlineAt` has passed. If expired, it calls `bookingService.expireBookingFlow()` to cancel the booking and throws an error.
- Contract endpoints (`contracts.ts`) also check `flowDeadlineAt` before allowing reviews, acceptances, or signatures.
- A separate endpoint `POST /api/contracts/check-deadlines` can be called (e.g., via cron) to batch-void expired contracts.

### 15.3 Previous Behavior

The deadline was previously set at 24 hours per step. It was increased to 72 hours to give both parties more realistic time to review proposals and contract terms, particularly for the Indian market where communication patterns may involve delays.

---

## 16. Organizer Dashboard Pending Actions

The Organizer Dashboard (`organizer/OrganizerDashboard.tsx`) includes a "Pending Actions" sidebar section that surfaces bookings requiring the organizer's attention.

### 16.1 Data Sources

Pending actions are derived from real booking data (no placeholder or hardcoded items):

- **New applications**: Bookings with status `inquiry` -- the organizer needs to review and respond.
- **Negotiations awaiting response**: Bookings with status `negotiating` where the negotiation `stepState` is `awaiting_org` or `applied` -- it is the organizer's turn to counter or accept.

### 16.2 UI

Each pending action is rendered as a clickable card showing:
- Title (e.g., "New Application" or "Negotiation: Your Turn")
- Description (artist name, event name)
- Action type badge (`application` or `negotiation`)

Clicking an action navigates to `/organizer/bookings?bookingId=<id>`, which opens the booking detail sheet. The list shows at most 5 items, ordered by recency.

When no pending actions exist, a "No pending actions" empty state is displayed.

---

## 17. Username Availability Check

The registration form (`Auth.tsx`) includes real-time username availability checking.

### 17.1 How It Works

1. The `username` field is watched via React Hook Form's `watch()`.
2. On each change, a 500ms debounce timer is set. If the user types again within 500ms, the previous timer is cleared.
3. When the timer fires, a `GET /api/auth/check-username?username=<value>` request is sent.
4. The response `{ available: true | false }` drives the UI state.

### 17.2 States

| State | Visual | Condition |
|-------|--------|-----------|
| `idle` | No indicator | Username is empty or too short |
| `checking` | Spinning loader icon (right side of input) | API request in flight |
| `available` | Green checkmark icon + "Username is available" text | `available: true` from API |
| `taken` | Red X icon + "This username is already taken" text | `available: false` from API |

### 17.3 Edge Cases

- Empty or whitespace-only usernames return `{ available: true }` from the server (no check performed).
- Network errors reset the state to `idle` silently.
- The debounce timer is cleaned up on component unmount to prevent stale requests.
