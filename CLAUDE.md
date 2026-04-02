# CLAUDE.md — BANDWIDTH Music Booking Platform

## Project Identity

**BANDWIDTH** is a curator-led booking platform for the Indian music industry (Bangalore-first). It connects Artists, Organizers, and Venues through professional workflows: gig discovery → application → negotiation (with tech rider) → contract → payment.

It is NOT a ticketing platform, NOT a classified marketplace. It is a trust-based, data-driven booking system that eliminates WhatsApp chaos.

**Current Phase**: Development & Testing — targeting Q1 2026 Bangalore launch.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server runtime | Node.js + Express 5, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Passport.js (session-based, `connect-pg-simple`) |
| Frontend | React 18, **Wouter** (NOT React Router) |
| Server state | TanStack Query (React Query v5) |
| UI components | Radix UI + shadcn/ui |
| Styling | Tailwind CSS v3 |
| Animations | Framer Motion |
| Forms | React Hook Form + Zod |
| Validation | Zod (shared schemas) |
| Build | Vite (client), tsx (server) |
| Testing | Vitest + fast-check (property-based) |
| PDF | pdfkit |
| WebSockets | ws |

---

## Dev Commands

```bash
npm run dev          # Start dev server (tsx server/index.ts with .env)
npm run build        # Production build
npm run check        # TypeScript check
npm run db:push      # Push schema to DB
npm run db:generate  # Generate migrations
npm run seed         # Seed database
```

---

## File Organization

```
shared/
  schema.ts                    # Drizzle DB schema — ALL tables and enums
  routes.ts                    # API contracts — ALL endpoint definitions + Zod schemas
  negotiation-application.ts   # Negotiation types and snapshot helpers

server/
  index.ts                     # Entry point
  db.ts                        # Drizzle DB connection
  auth.ts                      # Passport.js setup
  storage.ts                   # IStorage interface + DatabaseStorage class (ALL DB queries)
  routes.ts                    # Route registration (imports sub-routers)
  routes/
    organizer.ts               # Organizer-specific routes
    contracts.ts               # Contract routes
    conversations.ts           # Conversations/messaging routes
    opportunities.ts           # Artist opportunity/gig routes
    admin.ts                   # Admin routes
  services/
    negotiation.service.ts     # Negotiation business logic
    contract.service.ts        # Contract generation + management
    booking.service.ts         # Booking state machine
    workflow.ts                # Workflow engine
    commissionPolicy.service.ts
    artistCategory.service.ts
  *-utils.ts                   # Profile builders, helpers

client/src/
  pages/
    artist/                    # ArtistDashboard, FindGigs, ArtistBookings, ArtistProfile, ProfileSetup
    organizer/                 # OrganizerDashboard, OrganizerEvents, OrganizerBookings, OrganizerDiscover, etc.
    venue/                     # VenueDashboard, VenueBookings, VenueProfile, etc.
    admin/                     # AdminDashboard, AdminUsers, AdminBookings, AdminContracts, etc.
    contract/                  # ContractPage (full-page contract viewer/editor)
  components/
    booking/
      NegotiationFlow.tsx      # Main negotiation UI component
      CounterOfferForm.tsx     # Counter-offer form
      ContractViewer.tsx       # Contract viewer
      OfferComparison.tsx      # Side-by-side offer comparison
  hooks/
    use-auth.tsx               # Auth hook
```

---

## Core Architectural Patterns — ALWAYS FOLLOW THESE

### 1. Shared Routes as Single Source of Truth
All API endpoints are defined in `shared/routes.ts` as typed contracts:
```typescript
export const api = {
  organizer: { profile: { complete: { method: 'POST', path: '/api/...', input: schema, responses: {...} } } }
}
```
- **Client** uses `api.xxx.path` and `api.xxx.method` — never hardcode URLs
- **Server** uses `api.xxx.path` as route string and `api.xxx.input.safeParse()` for validation
- New endpoints MUST be added here first

### 2. All DB Queries Through storage.ts
Never query the DB directly from routes. Use `storage.*` methods:
```typescript
const booking = await storage.getBooking(bookingId);
```
Add new methods to the `IStorage` interface + `DatabaseStorage` class.

### 3. Type Inference — Never Duplicate Types
```typescript
// From Zod schemas
type Input = z.infer<typeof someSchema>;
// From Drizzle
type Artist = typeof artists.$inferSelect;
type InsertArtist = typeof artists.$inferInsert;
```

### 4. TanStack Query for All Server State
Custom hooks wrap all fetches. Always invalidate related query keys after mutations.

### 5. Error Handling Pattern (server)
```typescript
const parsed = schema.safeParse(req.body);
if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors });
// then business logic in try/catch → 500 on unexpected errors
```

---

## Domain Knowledge

### User Roles
- `artist` — discovers gigs, applies, negotiates, signs contracts
- `organizer` / `promoter` — creates events, books artists, manages contracts
- `venue_manager` — lists venues, interacts with organizers
- `admin` / `platform_admin` — full system control (username: `musicapp`)
- `curator` — artist-venue matching specialist

### Booking Status Flow
```
inquiry → offered → negotiating → contracting → confirmed → paid_deposit → scheduled → completed
                                                                         ↘ cancelled / disputed / refunded
```

### Negotiation Flow
1. Organizer posts event → Artist applies (submits ApplicationProposal)
2. NegotiationService opens a conversation thread of type `"negotiation"`
3. Proposals tracked in `bookingProposals` table, round-versioned
4. Snapshot stored in `booking.meta.negotiation.currentProposalSnapshot`
5. Snapshot includes: `financial` (fee, currency), `scheduling` (slot, duration), `techRider` (artist requirements + organizer commitments)
6. Both parties must accept + rider must be confirmed → booking moves to `"contracting"`
7. 72-hour deadline enforced via `booking.flowDeadlineAt`

### Contract Edit Workflow (sequential, strict)
1. Contract auto-generated from agreed negotiation snapshot
2. **Organizer edits first** (one time only) — editable fields: date, time slot, accommodations, hospitality
3. **Artist edits second** (one time only)
4. If artist edited: goes back to organizer → organizer can only Accept or Walk Away
5. Both sign → Admin review → PDF generated with "Digitally Signed" watermark

### Contract Status Flow
```
draft → sent → signed_by_promoter → signed_by_artist → admin_review → signed → completed
                                                                               ↘ voided
```

### Key Financial Fields
- `booking.grossBookingValue` — total deal value
- `booking.artistFee` — what artist receives
- `booking.organizerFee` — organizer's additional fee
- `booking.artistCommissionPct` / `organizerCommissionPct` — platform commission %
- `booking.platformRevenue` — platform earnings
- Platform commission: 2-5%, primary currency: INR

### Trust Score System
- Artists scored on: punctuality, quality ratings, contract compliance, communication, cancellation history
- Organizers scored on: payment reliability, contract adherence, cancellation rate, venue accuracy
- Low trust score → harder contract terms (100% advance payment required)
- Stored in `artist.metadata.trustScore` / `promoter.metadata.trustScore`

---

## Current Work Status (as of April 2026)

### Recently Completed
- Negotiation system overhaul (`NegotiationFlow.tsx`, `NegotiationService`)
- Negotiation now uses proposal versioning with `bookingProposals` table
- Tech rider integration in negotiation snapshot

### Active Work / Needs Attention
- **Contracts must be redone** (per latest commit: "contracts needs to be redone")
- The `ContractPage`, `ContractViewer`, and contract routes need redesign to match the sequential edit workflow described in `docs/application-functionality.md`
- Contract status transitions need to be enforced server-side

### Known Patterns to Be Aware Of
- `booking.meta` is a JSONB field used heavily to store negotiation state — treat carefully
- The `conversationWorkflowInstances` table drives the structured chat workflow
- `appSettings` table has global toggles (admin can toggle approval steps on/off)
- `storage.ts` is large — methods are grouped by domain (User, Artist, Organizer, Booking, Contract, etc.)

---

## Testing

- Test runner: `vitest`
- Property-based tests: `fast-check`
- Run: `npx vitest`
- Test files live in `tests/`
- Prefer property-based tests for schema validation
- Integration tests for API endpoints

---

## Important Constraints

- **DO NOT use React Router** — this project uses `wouter`
- **DO NOT write raw SQL** — use Drizzle ORM query builders
- **DO NOT hardcode API paths** — always reference `api.xxx.path` from `shared/routes.ts`
- **DO NOT query DB directly from routes** — go through `storage.ts`
- **Tailwind CSS v3** is used (not v4 syntax — config is at `tailwind.config.ts`)
- Session auth only (no JWT) — use `req.isAuthenticated()` and `req.user` on server
- All monetary values stored as `numeric` strings in DB (use `Number()` to convert)
- Dates stored as `timestamp` — always convert with `.toISOString()` for JSON responses

---

## Admin SuperUser

- Username: `musicapp`
- Has routes under `/api/admin/` and UI at `/admin`
- Can toggle approval steps via `appSettings` table
- Can view/modify all entities across the system
