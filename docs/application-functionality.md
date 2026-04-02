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
