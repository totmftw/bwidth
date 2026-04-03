# Technical Specification - BANDWIDTH Music Booking Platform

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Database Schema](#database-schema)
3. [API Design](#api-design)
4. [Authentication & Authorization](#authentication--authorization)
5. [Security Measures](#security-measures)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Data Flow](#data-flow)
9. [WebSocket Architecture](#websocket-architecture)
10. [Notification System](#notification-system)
11. [Media & Image Storage](#media--image-storage)
12. [Third-Party Integrations](#third-party-integrations)
13. [Deployment Architecture](#deployment-architecture)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
+--------------------------------------------------------------+
|                         CLIENT LAYER                          |
+--------------------------------------------------------------+
|  React SPA (Vite + TypeScript)                               |
|  - Component Library: Radix UI + shadcn/ui                   |
|  - State Management: TanStack Query                          |
|  - Form Validation: React Hook Form + Zod                   |
|  - Routing: Wouter                                           |
|  - Styling: Tailwind CSS v3                                  |
|  - Real-time: WebSocket singleton (client/src/lib/ws.ts)     |
+--------------------------------------------------------------+
                       | HTTPS + WSS |
+--------------------------------------------------------------+
|                        SERVER LAYER                           |
+--------------------------------------------------------------+
|  Express.js v5 (Node.js + TypeScript)                       |
|  - Session Management: express-session                       |
|  - Authentication: Passport.js (local strategy)              |
|  - ORM: Drizzle                                              |
|  - Schema Validation: Zod                                    |
|  - WebSocket: ws (room-based + user-level pub/sub)           |
|  - Event Bus: In-process EventEmitter (domain events)        |
+--------------------------------------------------------------+
                         | TCP |
+--------------------------------------------------------------+
|                      PERSISTENCE LAYER                        |
+--------------------------------------------------------------+
|  PostgreSQL 14+                                              |
|  - Session Store: connect-pg-simple                          |
|  - Connection Pooling: pg                                    |
|  - Migrations: Drizzle Kit                                   |
|  - Media: base64 data URLs stored in `media.data` column     |
+--------------------------------------------------------------+
```

### 1.2 Tech Stack Details

#### Frontend Stack
```typescript
{
  "framework": "React 18.3.1",
  "language": "TypeScript 5.6.3",
  "buildTool": "Vite 7.3.0",
  "routing": "Wouter 3.3.5",
  "stateManagement": "TanStack Query 5.60.5",
  "forms": "React Hook Form 7.55.0",
  "validation": "Zod 3.24.2",
  "ui": {
    "components": "Radix UI",
    "styling": "Tailwind CSS v3",
    "animations": "Framer Motion 11.18.2",
    "icons": "Lucide React 0.453.0"
  }
}
```

#### Backend Stack
```typescript
{
  "runtime": "Node.js",
  "framework": "Express 5.0.1",
  "language": "TypeScript 5.6.3",
  "orm": "Drizzle ORM 0.39.3",
  "database": "PostgreSQL",
  "authentication": {
    "strategy": "Passport.js 0.7.0",
    "method": "passport-local 1.0.0",
    "sessions": "express-session 1.18.1",
    "sessionStore": "connect-pg-simple 10.0.0"
  },
  "validation": "Zod 3.24.2 + drizzle-zod 0.7.0",
  "realtime": "ws 8.18.0",
  "pdf": "pdfkit"
}
```

### 1.3 Module Structure

```
shared/
  schema.ts                    # Drizzle DB schema (ALL tables, enums, relations)
  routes.ts                    # API contracts (all endpoint definitions + Zod schemas)
  negotiation-application.ts   # Negotiation types and snapshot helpers

server/
  index.ts                     # Entry point
  db.ts                        # Drizzle DB connection
  auth.ts                      # Passport.js setup
  storage.ts                   # IStorage interface + DatabaseStorage class (ALL DB queries)
  routes.ts                    # Route registration (imports sub-routers)
  ws-server.ts                 # WebSocket server (room-based + user-level pub/sub)
  routes/
    organizer.ts               # Organizer-specific routes
    contracts.ts               # Contract routes
    conversations.ts           # Conversations/messaging routes
    opportunities.ts           # Artist opportunity/gig routes
    media.ts                   # Image upload/serve/delete routes
    notifications.ts           # Notification list/read routes
    admin.ts                   # Admin routes
  services/
    negotiation.service.ts     # Negotiation business logic
    contract.service.ts        # Contract generation + management
    booking.service.ts         # Booking state machine
    workflow.ts                # Workflow engine (action dispatch, turn-taking)
    notification.service.ts    # Notification rendering + delivery
    notification-resolvers.ts  # Target user resolution for notifications
    event-bus.ts               # In-process domain event bus
    commissionPolicy.service.ts
    artistCategory.service.ts
  *-utils.ts                   # Profile builders, helpers

client/src/
  pages/
    artist/                    # ArtistDashboard, FindGigs, ArtistBookings, ProfileSetup
    organizer/                 # OrganizerDashboard, OrganizerEvents, OrganizerBookings, etc.
    venue/                     # VenueDashboard, VenueBookings, VenueProfile, etc.
    admin/                     # AdminDashboard, AdminUsers, AdminBookings, etc.
    contract/                  # ContractPage (full-page contract viewer/editor)
  components/
    booking/
      NegotiationFlow.tsx      # Main negotiation UI component
      CounterOfferForm.tsx     # Counter-offer form
      ContractViewer.tsx       # Contract viewer
      OfferComparison.tsx      # Side-by-side offer comparison
    ImageUpload.tsx            # Reusable image upload (drag-drop, URL, compact mode)
    ImageGallery.tsx           # Responsive image gallery with lightbox
  hooks/
    use-auth.tsx               # Auth hook
    use-conversation.ts        # HTTP history + WS live updates for chat
    use-notifications.ts       # Notification polling + WS push
  lib/
    ws.ts                      # Singleton WebSocket connection + typed dispatcher
    queryClient.ts             # TanStack Query client + apiRequest helper
```

---

## 2. Database Schema

### 2.1 Schema Overview

The database is designed with PostgreSQL and follows a relational model with strong data integrity. All tables and enums are defined in `shared/schema.ts` using Drizzle ORM. Type exports and Zod validation schemas are generated from the Drizzle definitions.

### 2.2 Enums

The schema defines the following PostgreSQL enums:

| Enum | Values |
|------|--------|
| `artist_category` | `budding`, `mid_scale`, `international`, `custom` |
| `artist_category_source` | `auto`, `manual`, `override` |
| `user_status` | `active`, `suspended`, `deleted`, `pending_verification` |
| `role_name` | `artist`, `band_manager`, `promoter`, `organizer`, `venue_manager`, `admin`, `platform_admin`, `staff` |
| `booking_status` | `inquiry`, `offered`, `negotiating`, `contracting`, `confirmed`, `paid_deposit`, `scheduled`, `completed`, `cancelled`, `disputed`, `refunded` |
| `contract_status` | `draft`, `sent`, `signed_by_promoter`, `signed_by_artist`, `admin_review`, `signed`, `voided`, `completed` |
| `contract_edit_status` | `pending`, `approved`, `rejected`, `applied` |
| `proposal_status` | `active`, `accepted`, `rejected`, `expired`, `withdrawn` |
| `dispute_status` | `open`, `investigating`, `resolved_refund`, `resolved_no_refund`, `escalated` |
| `gender` | `male`, `female`, `other`, `prefer_not_say` |
| `gst_registration_type` | `registered`, `unregistered`, `composition`, `none` |
| `invoice_status` | `draft`, `issued`, `paid`, `overdue`, `cancelled`, `refunded` |
| `media_type` | `image`, `audio`, `video`, `document`, `other` |
| `notification_channel` | `in_app`, `email`, `sms`, `push` |
| `notification_priority` | `normal`, `urgent` |
| `payment_status` | `initiated`, `authorized`, `captured`, `failed`, `refunded`, `cancelled` |
| `payout_status` | `queued`, `processing`, `paid`, `failed`, `cancelled` |
| `search_entity` | `artist`, `venue`, `event`, `promoter`, `organizer` |
| `ticket_type` | `general`, `vip`, `reserved`, `earlybird`, `guestlist` |
| `visibility` | `public`, `private` |

### 2.3 Tables by Domain

#### Auth and Users

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `session` | `sid` (PK, text), `sess` (JSONB), `expire` (timestamp) | Session store for `connect-pg-simple`. |
| `users` | `id` (serial PK), `username` (unique), `email` (unique), `passwordHash`, `phone`, `displayName`, `firstName`, `lastName`, `legalName`, `panNumber`, `gstin`, `bankAccountNumber`, `bankIfsc`, `gender`, `dateOfBirth`, `status` (user_status), `locale`, `currency`, `timezone`, `metadata` (JSONB) | Core user table. `metadata.role` stores the primary role. Financial/legal fields for KYC. |
| `roles` | `id` (serial PK), `name` (role_name, unique), `description` | Role lookup table. |
| `user_roles` | `userId` + `roleId` (composite PK), `assignedAt` | Many-to-many user-role assignments. |
| `auth_providers` | `id` (serial PK), `userId`, `provider`, `providerUserId`, `data` (JSONB) | OAuth/social login provider records. |

#### Geography and Lookups

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `currencies` | `currencyCode` (char(3) PK), `name`, `symbol`, `precision` | Currency reference table. |
| `locales` | `localeCode` (char(5) PK), `displayName` | Locale reference table. |
| `timezones` | `tzName` (text PK) | Timezone reference table. |
| `countries` | `countryId` (serial PK), `name`, `iso2`, `iso3`, `currencyCode` (FK) | Country reference. |
| `states` | `stateId` (serial PK), `countryId` (FK), `name` | State/province reference. |
| `cities` | `cityId` (serial PK), `stateId` (FK), `name`, `lat`, `lon` | City reference with coordinates. |

#### Organizations and Genres

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `organizations` | `id` (serial PK), `name`, `slug` (unique), `description`, `website`, `createdBy` (FK users), `metadata` (JSONB) | Organization entity (label, agency, etc.). |
| `organization_members` | `orgId` + `userId` (composite PK), `role`, `joinedAt` | Organization membership. |
| `genres` | `id` (serial PK), `name` (unique), `slug` (unique), `parentId` (self-referencing FK) | Hierarchical genre taxonomy. |

#### Profiles: Artists

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `artists` | `id` (serial PK), `userId` (FK), `organizationId` (FK), `name`, `isBand`, `members` (JSONB), `bio`, `originCityId` (FK), `baseLocation` (JSONB), `priceFrom`, `priceTo`, `currency`, `ratingAvg`, `ratingCount`, `artistCategory`, `artistCategorySource`, `artistCategoryLocked`, `commissionOverrideArtistPct`, `commissionOverrideOrganizerPct`, `minimumGuaranteedEarnings`, `metadata` (JSONB) | Artist profile with pricing, category, and commission overrides. |
| `artist_genres` | `artistId` + `genreId` (composite PK) | Many-to-many artist-genre association. |
| `artist_category_history` | `id` (serial PK), `artistId` (FK), `oldCategory`, `newCategory`, `reason`, `changedBy` (FK), `changedAt` | Audit trail for artist category changes. |
| `commission_policies` | `id` (serial PK), `artistCategory` (unique), `artistPct`, `organizerPct`, `platformPctTotal`, `minArtistGuarantee`, `active`, `effectiveFrom`, `effectiveTo` | Commission rates by artist category. |

#### Profiles: Promoters/Organizers

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `promoters` | `id` (serial PK), `userId` (FK), `organizationId` (FK), `name`, `description`, `contactPerson` (JSONB), `metadata` (JSONB) | Promoter/organizer profile. Aliased as `organizers` in schema exports. |

#### Profiles: Venues

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `venues` | `id` (serial PK), `userId` (FK), `organizationId` (FK), `name`, `slug` (unique), `description`, `address` (JSONB), `cityId` (FK), `capacity`, `capacitySeated`, `capacityStanding`, `spaceDimensions` (JSONB), `amenities` (JSONB), `timezone`, `ratingAvg`, `ratingCount`, `metadata` (JSONB) | Venue profile with capacity and technical specifications. |

#### Events

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `events` | `id` (serial PK), `organizerId` (FK promoters), `venueId` (FK venues), `title`, `slug` (unique), `description`, `startTime`, `doorTime`, `endTime`, `timezone`, `capacityTotal`, `capacitySeated`, `currency`, `status`, `visibility` (public/private), `metadata` (JSONB) | Event definition. |
| `event_stages` | `id` (serial PK), `eventId` (FK), `name`, `orderIndex`, `startTime`, `endTime`, `stagePlot` (text), `capacity` | Stages within a multi-stage event. |
| `temporary_venues` | `id` (serial PK), `eventId` (FK), `name`, `location`, `mapsLink`, `directions`, `landmark`, `contactName`, `contactPhone`, `metadata` (JSONB) | Ad-hoc venue for a specific event (festival, outdoor, etc.). |

#### Bookings and Proposals

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `bookings` | `id` (serial PK), `eventId` (FK), `artistId` (FK), `stageId` (FK), `status` (booking_status), `offerAmount`, `offerCurrency`, `depositPercent`, `depositAmount`, `finalAmount`, `grossBookingValue`, `artistFee`, `organizerFee`, `artistCommissionPct`, `organizerCommissionPct`, `platformRevenue`, `artistCategorySnapshot`, `trustTierSnapshot`, `contractId`, `flowStartedAt`, `flowDeadlineAt`, `flowExpiredAt`, `flowExpiredReason`, `meta` (JSONB) | Core booking record. `meta` stores negotiation state including `currentProposalSnapshot`. Financial fields track fee breakdown. Flow timestamps enforce 72-hour negotiation deadline. |
| `booking_proposals` | `id` (serial PK), `bookingId` (FK), `createdBy` (FK users), `round`, `proposedTerms` (JSONB), `reasonCode`, `note`, `status` (proposal_status), `submittedByRole`, `stepNumber`, `responseAction` | Versioned proposal history for negotiations. `proposedTerms` contains `{offerAmount, currency, slotId, duration}`. |

#### Contracts

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `contracts` | `id` (serial PK), `bookingId` (FK), `version`, `status` (contract_status), `contractPdf`, `contractText`, `signerSequence` (JSONB), `signedByPromoter`, `signedByArtist`, `editPhase` (text, default `"organizer_review"`), `artistEditUsed`, `promoterEditUsed`, `artistReviewDoneAt`, `promoterReviewDoneAt`, `artistAcceptedAt`, `promoterAcceptedAt`, `artistSignedAt`, `promoterSignedAt`, `artistSignatureIp`, `promoterSignatureIp`, `pdfUrl`, `pdfGeneratedAt`, `adminReviewedBy` (FK), `adminReviewedAt`, `adminReviewNote`, `adminReviewStatus`, `artistCategorySnapshot`, `trustScoreSnapshot`, `commissionBreakdownJson` (JSONB), `negotiatedTermsJson` (JSONB), `metadata` (JSONB) | Full contract record with sequential edit workflow tracking, IT Act 2000 compliance logging (IP addresses), admin review fields, and negotiation snapshot. |
| `contract_versions` | `id` (serial PK), `contractId` (FK), `version`, `contractText`, `terms` (JSONB), `createdBy` (FK), `changeSummary` | Immutable version history. Each edit creates a new row. |
| `contract_edit_requests` | `id` (serial PK), `contractId` (FK), `requestedBy` (FK), `requestedByRole`, `changes` (JSONB), `note`, `status` (contract_edit_status), `respondedBy` (FK), `respondedAt`, `responseNote`, `resultingVersion` | One edit request per party max. Tracks organizer-first, artist-second edit workflow. |
| `contract_signatures` | `id` (serial PK), `contractId` (FK), `userId` (FK), `role`, `signatureData` (text), `signatureType` (`drawn`/`typed`/`uploaded`), `ipAddress`, `userAgent`, `signedAt` | Captures actual signature data and metadata for legal compliance. |

#### Payments

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `payments` | `id` (serial PK), `bookingId` (FK), `payerId` (FK users), `payeeId` (FK users), `amount`, `currency`, `paymentType` (`deposit`/`milestone`/`final`), `status` (payment_status), `gateway`, `gatewayTransactionId`, `gatewayResponse` (JSONB), `initiatedAt`, `completedAt`, `metadata` (JSONB) | Payment records with gateway integration fields. |
| `payouts` | `id` (serial PK), `toUserId` (FK), `amount`, `currency`, `status` (payout_status), `providerResponse` (JSONB), `initiatedAt`, `paidAt`, `metadata` (JSONB) | Artist/organizer payout records. |

#### Messaging and Conversations

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `conversations` | `id` (serial PK), `subject`, `entityType` (e.g. `"booking"`), `entityId`, `conversationType` (`negotiation`/`direct`), `status`, `lastMessageAt`, `metadata` (JSONB) | Conversation threads, bound to domain entities. Idempotent creation via (entityType, entityId, conversationType) triple. |
| `conversation_workflow_instances` | `conversationId` (PK, FK), `workflowKey` (default `"booking_negotiation_v1"`), `currentNodeKey`, `awaitingUserId` (FK), `awaitingRole`, `round`, `maxRounds` (default 3), `deadlineAt`, `locked`, `context` (JSONB) | State machine for negotiation conversations. One-to-one with conversation. Enforces turn-taking and round limits. |
| `conversation_participants` | `conversationId` + `userId` (composite PK), `joinedAt` | Many-to-many conversation membership. |
| `messages` | `id` (serial PK), `conversationId` (FK), `senderId` (FK), `body`, `messageType` (default `"text"`), `payload` (JSONB), `clientMsgId`, `workflowNodeKey`, `actionKey`, `round`, `attachments` (JSONB) | Chat messages. Workflow messages carry `actionKey` and `round` for negotiation tracking. `clientMsgId` supports deduplication. |
| `booking_proposals` | (see Bookings section above) | Versioned negotiation proposals linked to bookings. |
| `message_reads` | `messageId` + `userId` (composite PK), `readAt` | Read receipts per message per user. |

#### Media

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `media` | `id` (serial PK), `ownerUserId` (FK), `entityType`, `entityId`, `mediaType` (media_type), `filename`, `mimeType`, `fileSize`, `data` (text -- base64 data URL or external URL), `sourceUrl`, `altText`, `metadata` (JSONB), `uploadedAt` | Image and file storage. Images stored as base64 data URLs in the `data` column. See [Media & Image Storage](#media--image-storage) for details. |

#### Notifications

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `notification_types` | `id` (serial PK), `key` (unique), `category`, `label`, `description`, `titleTemplate`, `bodyTemplate`, `targetRoles` (JSONB), `channels` (JSONB, default `["in_app"]`), `enabled`, `priority` (notification_priority), `metadata` (JSONB) | Notification type definitions with template strings (supports `{{variable}}` interpolation). Admin-configurable. |
| `notification_channels` | `id` (serial PK), `channel` (notification_channel, unique), `enabled`, `config` (JSONB), `rateLimit` (JSONB) | Channel-level enable/disable and rate limiting configuration. |
| `notifications` | `id` (serial PK), `userId` (FK), `notificationTypeKey`, `channel` (notification_channel), `title`, `body`, `entityType`, `entityId`, `actionUrl`, `data` (JSONB), `read`, `readAt`, `delivered`, `deliveredAt` | Per-user notification delivery records. |

#### Audit and System

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `audit_logs` | `id` (bigserial PK), `occurredAt`, `who` (FK users), `action`, `entityType`, `entityId`, `diff` (JSONB), `context` (JSONB) | System-wide audit trail. Logged via triggers or application code. |
| `system_settings` | `key` (text PK), `value` (JSONB), `description`, `updatedAt` | Key-value system configuration. |
| `app_settings` | `id` (serial PK), `key` (unique), `value` (JSONB), `updatedAt`, `updatedBy` (FK users) | Admin-managed application toggles (e.g. approval step flags). |

### 2.4 Key Relations

The schema defines the following Drizzle ORM relations:

- **users** -> has many `userRoles`, one `artist`, many `notifications`
- **artists** -> belongs to `users`, has many `artistGenres`, has many `bookings`
- **bookings** -> belongs to `artists`, belongs to `events`, has one `contract`
- **contracts** -> belongs to `bookings`, has many `contractVersions`, `contractEditRequests`, `contractSignatures`
- **events** -> belongs to `venues`, belongs to `promoters` (organizer), has many `bookings`, has many `eventStages`
- **conversations** -> has many `conversationParticipants`, has many `messages`, has one `conversationWorkflowInstance`
- **messages** -> belongs to `conversations`, belongs to `users` (sender), has many `messageReads`
- **bookingProposals** -> belongs to `bookings`, belongs to `users` (creator)

### 2.5 Type Exports

All table types are exported from `shared/schema.ts` using Drizzle's inference:

```typescript
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
// ... same pattern for Artist, Venue, Event, Booking, Contract,
//     ContractVersion, ContractEditRequest, ContractSignature,
//     Payment, Promoter, Organization, AuditLog, Conversation,
//     Message, ConversationWorkflowInstance, BookingProposal,
//     MessageRead, ArtistCategoryHistory, CommissionPolicy,
//     AppSetting, Notification, NotificationType, NotificationChannel
```

Zod schemas are generated using `drizzle-zod`:

```typescript
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
// ... same for all major tables
```

The `promoters` table is also exported under the alias `organizers` for code readability:

```typescript
export { promoters as organizers };
export type Organizer = Promoter;
```

---

## 3. API Design

### 3.1 API Architecture

**Style**: RESTful API with JSON
**Base URL**: `/api`
**Authentication**: Session-based with cookies
**Contract Source**: All endpoints are defined in `shared/routes.ts` as typed contracts

### 3.2 API Endpoints

#### Authentication Endpoints

```typescript
POST   /api/register             // Register new user
POST   /api/login                // Login
POST   /api/logout               // Logout
GET    /api/user                 // Get current user
```

#### Artist Profile

```typescript
GET    /api/artists              // List artists (with filters)
POST   /api/artists/profile/complete  // Complete artist profile setup
GET    /api/artists/:id          // Get artist profile
PATCH  /api/artists/:id          // Update artist profile
GET    /api/artists/:id/bookings // Get artist bookings
```

#### Venue Management

```typescript
GET    /api/venues               // List venues
POST   /api/venues               // Create venue
GET    /api/venues/:id           // Get venue details
PATCH  /api/venues/:id           // Update venue
```

#### Booking Workflow

```typescript
GET    /api/opportunities        // Browse available opportunities
POST   /api/opportunities        // Create opportunity (organizer)
GET    /api/opportunities/:id    // Get opportunity details
POST   /api/bookings             // Create booking
GET    /api/bookings/:id         // Get booking details
PATCH  /api/bookings/:id         // Update booking
```

#### Negotiation

```typescript
POST   /api/entities/:entityType/:entityId/conversation/:conversationType/open  // Open/retrieve negotiation
POST   /api/conversations/:id/actions   // Dispatch workflow action
POST   /api/conversations/:id/messages  // Send free-text message (non-negotiation only)
```

#### Contracts

```typescript
POST   /api/contracts            // Generate contract
GET    /api/contracts/:id        // Get contract
POST   /api/contracts/:id/sign   // Sign contract
GET    /api/contracts/:id/pdf    // Download PDF
POST   /api/contracts/:id/void   // Void contract
```

#### Media

```typescript
POST   /api/media/upload                        // Upload images (multipart)
POST   /api/media/url                           // Upload image from URL
GET    /api/media/:id/file                      // Serve image binary
GET    /api/media/entity/:entityType/:entityId  // List images for entity
DELETE /api/media/:id                           // Delete media record
```

#### Notifications

```typescript
GET    /api/notifications            // List notifications (paginated)
GET    /api/notifications/unread-count // Get unread badge count
POST   /api/notifications/:id/read   // Mark single notification as read
POST   /api/notifications/read-all   // Mark all as read
```

#### Conversations

```typescript
GET    /api/conversations            // List user's conversations
GET    /api/conversations/:id        // Get conversation with workflow + participants
GET    /api/conversations/:id/messages // Get messages (newest 50, chronological)
```

### 3.3 Request/Response Format

#### Standard Success Response
```json
{
  "success": true,
  "data": {},
  "message": "Operation successful"
}
```

#### Standard Error Response
```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### 3.4 Status Codes

```
200 - OK                    // Success
201 - Created               // Resource created
400 - Bad Request           // Invalid input / workflow error
401 - Unauthorized          // Not authenticated
403 - Forbidden             // Not authorized (e.g. not a conversation participant)
404 - Not Found             // Resource does not exist
500 - Internal Server Error // Server error
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Strategy

**Method**: Session-based authentication using Passport.js
**Session Store**: PostgreSQL via connect-pg-simple
**Password Hashing**: Node.js `crypto.scrypt` (64-byte key, random 16-byte salt)

### 4.2 Authentication Flow

```
Registration:
1. User submits email, password, phone, role
2. Server validates input (Zod schema)
3. Check if email/phone already exists
4. Hash password with crypto.scrypt
5. Create user record with status='pending_verification'
6. normalizeRegistrationRole() ensures valid role_name enum value
7. Return success

Login:
1. User submits email/username and password
2. Passport.js local strategy authenticates
3. Check password hash with crypto.timingSafeEqual
4. Create session in PostgreSQL
5. Set session cookie (httpOnly, secure, sameSite)
6. Return user profile with role data

Logout:
1. Client sends logout request
2. Destroy session from PostgreSQL
3. Clear session cookie
4. Return success
```

### 4.3 Session Configuration

```typescript
{
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: new PGStore({
    pool: pgPool,
    tableName: 'sessions',
    pruneSessionInterval: 60 * 15 // 15 minutes
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
  }
}
```

### 4.4 Role-Based Access Control (RBAC)

```typescript
enum Role {
  ARTIST = 'artist',
  BAND_MANAGER = 'band_manager',
  PROMOTER = 'promoter',
  ORGANIZER = 'organizer',
  VENUE_MANAGER = 'venue_manager',
  ADMIN = 'admin',
  PLATFORM_ADMIN = 'platform_admin',
  STAFF = 'staff'
}
```

### 4.5 Role Normalisation & Resolution

Roles are stored in `users.metadata.role` as a JSON field. The registration UI uses simplified labels (e.g. `"venue"`) while the database enum uses canonical values (e.g. `"venue_manager"`), so a normalisation layer exists on both server and client.

**Server-side** (`server/role-utils.ts`):

| Input | Output | Side-effect |
|---|---|---|
| `"venue"` | `"venue_manager"` | -- |
| `"organizer"` | `"organizer"` | Creates a `promoters` record |
| `undefined` / `null` / `""` | `"artist"` | -- |
| Any other valid role | Pass-through | -- |

**Client-side** (`client/src/App.tsx`): Mirrors the same normalisation when reading the user object, using a fallback chain: `user.metadata.role` -> profile entities -> `"artist"` default.

**Route-handler role checks**: Protected endpoints read the role with the fallback chain:
```typescript
const userRole = user.role || (user.metadata as any)?.role || 'artist';
```

---

## 5. Security Measures

### 5.1 Password Security
- **Hashing**: Node.js `crypto.scrypt` with 64-byte derived key and random 16-byte hex salt
- **Storage format**: `<salt>.<hex-hash>` in `users.passwordHash`
- **Comparison**: `crypto.timingSafeEqual` to prevent timing attacks
- **Minimum length**: 8 characters

### 5.2 Session Security
- **HttpOnly cookies**: Prevent XSS access to cookies
- **Secure flag**: HTTPS only in production
- **SameSite=lax**: CSRF protection
- **Absolute timeout**: 7 days

### 5.3 Input Validation
- **All inputs validated**: Using Zod schemas from `shared/routes.ts`
- **SQL injection prevention**: Parameterized queries via Drizzle ORM
- **File upload validation**: MIME type whitelist, 20 MB size limit

### 5.4 Contract Compliance
- **IT Act 2000**: Contract signatures record IP address and user agent
- **Signature types**: Drawn (base64 canvas data), typed (name string), uploaded (image)
- **Audit trail**: `contract_signatures` table with `signedAt` timestamp

---

## 6. Performance Optimization

### 6.1 Database Optimization
- **Connection pooling**: pg pool with configurable connection limits
- **Indexes**: Strategic indexes on frequently queried fields
- **Query optimization**: Drizzle query builder with relation loading

### 6.2 Frontend Optimization
- **Code splitting**: Lazy loading with React.lazy()
- **Bundle size**: Tree shaking via Vite, minification
- **Image serving**: Base64 images served with `Cache-Control: public, max-age=86400` (24 hours)
- **Real-time**: WebSocket replaces polling for chat and notifications

### 6.3 API Response Optimization
- **Media responses**: `toPublicRecord()` strips base64 data from list responses, replacing with serve URLs
- **Message pagination**: Latest 50 messages fetched in DESC order, reversed for chronological display

---

## 7. Error Handling

### 7.1 Server-Side Pattern

```typescript
// Zod validation
const parsed = schema.safeParse(req.body);
if (!parsed.success) {
  return res.status(400).json({
    message: "Validation failed",
    errors: parsed.error.errors,
  });
}

// Business logic in try/catch
try {
  const result = await someOperation();
  res.json(result);
} catch (error) {
  console.error("Context:", error);
  res.status(500).json({ message: "Operation failed" });
}
```

### 7.2 Workflow Errors

Negotiation and contract workflow errors (wrong turn, locked conversation, max rounds exceeded) are returned as 400 status with descriptive messages:

```typescript
router.post("/conversations/:id/actions", async (req, res) => {
  try {
    const msg = await workflow.handleAction(conversationId, userId, actionKey, inputs);
    res.json(msg);
  } catch (error: any) {
    res.status(400).json({ message: error.message || "Action failed" });
  }
});
```

---

## 8. Data Flow

### 8.1 Booking Workflow Data Flow

```
1. Organizer creates Event with venue and stage details
2. Event published -> appears in artist opportunity feed
3. Artist browses /api/opportunities, applies to event
4. Application creates a Booking (status: "inquiry")
5. NegotiationService opens a conversation (type: "negotiation")
6. Workflow instance initialized (WAITING_FIRST_MOVE, round 0)
7. Parties exchange proposals via /conversations/:id/actions
8. Proposals tracked in booking_proposals, snapshot in booking.meta
9. Both accept + tech rider confirmed -> booking status: "contracting"
10. Contract auto-generated from negotiation snapshot
11. Sequential edit: organizer edits -> artist edits -> final review
12. Both sign -> admin review -> PDF generated
13. Booking status: "confirmed" -> "paid_deposit" -> "scheduled" -> "completed"
```

---

## 9. WebSocket Architecture

### 9.1 Overview

The platform uses a WebSocket server for real-time communication, supporting two pub/sub patterns:

- **Room-based**: Keyed by `conversationId` for chat message delivery
- **User-based**: Keyed by `userId` for notification delivery

### 9.2 Server (`server/ws-server.ts`)

The WebSocket server is initialized alongside the HTTP server on the `/ws` path:

```typescript
const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
```

**State management**:
- `rooms: Map<number, Set<WebSocket>>` -- conversation rooms
- `userConnections: Map<number, Set<WebSocket>>` -- user-level connections

**Protocol (client -> server)**:

| Message | Purpose |
|---------|---------|
| `{ type: "subscribe", conversationId: number }` | Join a conversation room. Leaves previous room if switching. |
| `{ type: "auth", userId: number }` | Authenticate for user-level notifications. |

**Protocol (server -> client)**:

| Message | Purpose |
|---------|---------|
| `{ type: "connected", conversationId: number }` | Acknowledgment of room subscription. |
| `{ type: "auth_ok", userId: number }` | Acknowledgment of user authentication. |
| `{ type: "message", data: MessageObject }` | New chat message in subscribed room. |
| `{ type: "notification", data: NotificationObject }` | User notification pushed in real time. |

**Exported broadcast functions**:
- `broadcastToRoom(conversationId, payload)` -- sends to all clients in a conversation room
- `broadcastToUser(userId, payload)` -- sends to all connections for a specific user

**Cleanup**: On `close` or `error`, the client is removed from its room and user connection set. Empty rooms and user entries are garbage-collected.

### 9.3 Client (`client/src/lib/ws.ts`)

A singleton WebSocket connection that auto-reconnects:

- `getWebSocket()` -- returns (or creates) the singleton connection
- `onWsMessage(type, listener)` -- subscribe to a message type; returns an unsubscribe function
- `authenticateWs(userId)` -- sends the `auth` message for notification delivery

The module maintains a typed dispatcher: incoming messages are parsed as JSON, and listeners registered for `msg.type` are called with `msg.data` (or the full message if `data` is absent).

### 9.4 React Hook (`client/src/hooks/use-conversation.ts`)

`useConversationMessages(conversationId)` combines HTTP and WebSocket:

1. Fetches initial message history via `GET /api/conversations/:id/messages`
2. Opens a WebSocket subscription to the conversation room
3. Incoming WS messages are appended directly into the TanStack Query cache
4. No `refetchInterval` -- WebSocket handles all live updates

### 9.5 Integration Points

| Consumer | Usage |
|----------|-------|
| `NegotiationFlow.tsx` | Chat panel uses `useConversationMessages` for real-time negotiation messages. |
| `OrganizerMessages.tsx` | Conversation list + message view uses `useConversationMessages`. |
| `use-notifications.ts` | Calls `authenticateWs(userId)` on mount; subscribes to `"notification"` type via `onWsMessage` to update the TanStack Query cache for unread counts. |
| `conversations.ts` (server) | Calls `broadcastToRoom()` after inserting a new message. |
| `notification.service.ts` (server) | Calls `broadcastToUser()` after persisting an in-app notification. |

---

## 10. Notification System

### 10.1 Overview

The notification system uses an event-driven architecture with three components:

1. **Domain Event Bus** (`server/services/event-bus.ts`) -- in-process event emitter
2. **Notification Service** (`server/services/notification.service.ts`) -- event handler that renders and delivers notifications
3. **Target Resolvers** (`server/services/notification-resolvers.ts`) -- determines which users receive each notification

### 10.2 Domain Event Bus

An extended `EventEmitter` that emits events on both the specific type channel and a `"*"` wildcard channel:

```typescript
interface DomainEvent {
  type: string;
  payload: Record<string, any>;
  actorUserId: number | null;
  timestamp: string;
}

// Usage in business services:
emitDomainEvent("booking.status_changed", { bookingId: 123, ... }, userId);
```

Business services call `emitDomainEvent()` after successful operations. The event bus is purely in-process; for horizontal scaling, it can be swapped to Redis pub/sub without changing call sites.

### 10.3 Notification Service Lifecycle

1. **`init()`** -- loads notification type definitions from `notification_types` table into an in-memory cache, subscribes to the `"*"` wildcard on the event bus
2. **`handleEvent(event)`** -- for each incoming domain event:
   - Looks up the notification type by `event.type` key
   - If type is not found or disabled, the event is silently ignored
   - Resolves target users via the resolver
   - Renders title and body templates using `{{variable}}` interpolation against the event payload
   - Filters channels against the channel-enabled cache
   - For each target user (excluding the actor), persists an in-app notification and pushes it via WebSocket
3. **`refreshTypeCache()`** -- reloads type definitions after admin updates

### 10.4 Target User Resolution

The resolver (`notification-resolvers.ts`) determines notification recipients based on the event payload and the notification type's `targetRoles` configuration:

| Resolution Strategy | Trigger | How Users Are Found |
|---------------------|---------|---------------------|
| Booking-based | `payload.bookingId` present | Loads booking with details; maps `targetRoles` to `artist.userId`, `organizer.userId`, `venue.userId` |
| Contract-based | `payload.contractId` present (no bookingId) | Loads contract -> booking -> details chain |
| Direct targeting | `payload.targetUserId` present | Adds the specific user ID |
| Admin targeting | `targetRoles` includes `"admin"` or `"platform_admin"` | Loads all admin user IDs from storage |

Results are deduplicated. The actor who triggered the event is always excluded from notification delivery.

### 10.5 Notification API Routes

| Endpoint | Description |
|----------|-------------|
| `GET /api/notifications` | List notifications (paginated, optional `unreadOnly` filter) |
| `GET /api/notifications/unread-count` | Lightweight badge count |
| `POST /api/notifications/:id/read` | Mark single notification as read |
| `POST /api/notifications/read-all` | Mark all notifications as read |

### 10.6 Real-Time Delivery

Notifications are pushed to connected clients via WebSocket (`broadcastToUser`). The client-side `use-notifications.ts` hook:

1. Calls `authenticateWs(userId)` when the user logs in
2. Subscribes to `"notification"` WS message type via `onWsMessage`
3. Appends incoming notifications to the TanStack Query cache
4. Updates the unread badge count in real time

---

## 11. Media & Image Storage

### 11.1 Overview

Images are stored as **base64 data URLs** directly in the PostgreSQL `media` table's `data` column. There is no external file storage (S3, Cloudinary, etc.) in the current implementation. This simplifies deployment but means the database grows with media uploads.

### 11.2 Storage Strategy

- **Device uploads**: File buffer is converted to `data:<mimeType>;base64,<encoded>` and stored in the `data` column
- **URL uploads**: The server attempts to fetch the image (10-second timeout, 20 MB cap). If successful, the image is stored as base64. If the fetch fails, only the URL string is stored as a fallback
- **Serving**: `GET /api/media/:id/file` decodes base64 and serves raw binary with appropriate `Content-Type`, or redirects to external URL. Responses include `Cache-Control: public, max-age=86400`

### 11.3 Per-Entity Limits

| Entity Type | Maximum Images |
|-------------|----------------|
| `user_avatar` | 1 |
| `artist_profile` | 1 |
| `artist_portfolio` | 20 |
| `venue_cover` | 1 |
| `venue_gallery` | 20 |
| `organizer_logo` | 1 |
| `event_cover` | 3 |
| (other) | 10 (default) |

### 11.4 Allowed MIME Types

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`
- `image/svg+xml`

Maximum file size: **20 MB** per file.

For full API and component documentation, see [IMAGE_UPLOAD.md](./IMAGE_UPLOAD.md).

---

## 12. Third-Party Integrations

### 12.1 Payment Gateway Integration
- **Provider**: Razorpay (primary), Stripe (international) -- planned
- **Webhooks**: Listen for payment events
- **Reconciliation**: Daily automated reconciliation

### 12.2 Email Service
- **Provider**: SendGrid or AWS SES -- planned
- **Templates**: HTML email templates

### 12.3 File Storage
- **Current**: Base64 data URLs in PostgreSQL (no external storage)
- **Planned**: AWS S3 or Cloudinary for production at scale

---

## 13. Deployment Architecture

### 13.1 Environment Configuration
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/db
SESSION_SECRET=<secure-random-string>
```

### 13.2 Dev Commands
```bash
npm run dev          # Start dev server (tsx server/index.ts with .env)
npm run build        # Production build
npm run check        # TypeScript check
npm run db:push      # Push schema to DB
npm run db:generate  # Generate migrations
npm run seed         # Seed database
```

### 13.3 CI/CD Pipeline
1. Code push to main branch
2. Run unit tests and integration tests
3. TypeScript compilation + Vite build
4. Deploy to staging environment
5. Smoke tests
6. Production deploy (manual approval)

---

**Last Updated**: April 3, 2026
**Document Version**: 2.0.0
**Author**: Development Team
