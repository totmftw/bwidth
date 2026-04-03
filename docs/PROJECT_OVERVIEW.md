# 🎵 Music Artist Management Platform - Project Overview

## Vision

A **curator-led booking system** that manages who plays where, when, under what terms, and what amount. Built on trust, data intelligence, and professional workflows to eliminate chaos in the music industry.

## Core Value Proposition

### What It Is
- Curator-led booking and programming system
- Data-driven artist-venue matching platform
- Professional contract and payment automation
- Trust-based ecosystem for music industry

### What It's NOT
- ❌ Not a ticketing platform
- ❌ Not a classified marketplace
- ❌ Not an event promoter

### Key Problems Solved
- Venues don't know how to book effectively
- Inconsistent crowds and treating music as a gamble
- Organizers operate on WhatsApp chaos
- Artists get underpaid or face last-minute cancellations
- Lack of professional systems and data insights
- Time slots changed without notice
- Payment disputes and broken trust

## Technology Stack

### Backend
- **Runtime**: Node.js with Express.js (v5.0.1)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js with session-based auth
- **Session Store**: PostgreSQL via connect-pg-simple

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI + shadcn/ui
- **Styling**: Tailwind CSS v3
- **Animations**: Framer Motion
- **Form Handling**: React Hook Form with Zod validation

### Development Tools
- **Build Tool**: Vite
- **Type Checking**: TypeScript 5.6.3
- **Database Migrations**: Drizzle Kit
- **Package Manager**: npm

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Wouter)                   │
│         Artists UI    │    Organizers UI    │    Admin UI    │
└─────────────────────────────────────────────────────────────┘
                              │ HTTPS │
┌─────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                       │
│              Session Auth │ Request Validation               │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                      │
│            Passport.js │ Role-Based Access                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                    │
│    Users │ Bookings │ Contracts │ Payments │ Trust Score    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                      │
│              Drizzle ORM │ Query Builders                    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL DATABASE                       │
│     Users │ Profiles │ Bookings │ Contracts │ Payments      │
└─────────────────────────────────────────────────────────────┘
```

## Core Features

### 1. User Management
- **Multi-role system**: Artist, Organizer, Venue Manager, Admin, Curator
- **Profile Types**: Each role has specific profile requirements and setup wizards
- **Trust Scoring**: Reputation system for all parties (stored in profile metadata)
- **KYC Verification**: PAN, GSTIN, and bank account fields on user records
- **Profile Completion Tracking**: Progress bar with section-level checklist guiding users through setup
- **Real-time Username Check**: Debounced server-side availability validation during registration
- **Role-aware Auth UI**: Registration role switch preserves common fields; "Already signed in" page shows role badge and avatar

### 2. Booking System

#### Mode A: Single Booking Mode (Implemented)
- One-off gigs or tour-based events
- Curated discovery with genre filter pills and location-aware search
- Artist application with fee guidance hints (suggested range based on event budget)
- 4-step structured negotiation with 72-hour per-step deadlines (max 3 rounds)
- Auto-contract generation from agreed negotiation snapshot
- Booking status flow: inquiry -> offered -> negotiating -> contracting -> confirmed -> paid_deposit -> scheduled -> completed

#### Mode B: Programming Mode (Planned)
- 3-6 month venue calendars
- Curator-led selections
- Monthly retainers
- Consistent programming

### 3. Contract Management (Sequential Edit Workflow)
- Automated contract generation (90% pre-filled from negotiation snapshot)
- **Sequential edit workflow**:
  1. Contract auto-generated from agreed terms
  2. Organizer reviews and optionally edits (one time only)
  3. Artist reviews and optionally edits (one time only)
  4. If artist edited: returns to organizer who can only Accept or Walk Away
  5. Both parties sign digitally
  6. Admin review step (togglable via app_settings)
  7. PDF generated with "Digitally Signed" watermark
- Contract scroll enforcement: users must read the full document before accepting
- PAN/GSTIN warning banner for tax compliance awareness
- IT Act 2000 compliance: IP address and user-agent captured at signing
- Version history with immutable audit trail
- Four contract types based on artist/organizer trust scores and booking type
- Slot time protection clauses and cancellation policies with penalties

### 4. Payment System
- Milestone-based payments (20-50% deposit, staged releases)
- Platform escrow protection
- Commission tracking (2-5%) with category-based commission policies
- Financial breakdown per booking: gross value, artist fee, organizer fee, platform revenue
- Multi-currency support (primary: INR)
- Automated payment schedules (planned)

### 5. Negotiation Engine (Overhauled)
- **4-step proposal system** with versioned `bookingProposals` table
- 72-hour per-step deadlines (enforced via `booking.flowDeadlineAt`)
- Negotiable parameters per round:
  - Artist fee / offer amount
  - Time slot (opening / mid / closing)
  - Performance duration
  - Tech rider (artist requirements and organizer commitments)
- Proposal snapshot stored in `booking.meta.negotiation.currentProposalSnapshot`
- Both parties must accept and tech rider must be confirmed before moving to contracting
- Walk-away option with confirmation dialog at any step

### 6. Trust Score System

**For Artists:**
- Punctuality record
- Performance quality ratings
- Contract compliance
- Communication responsiveness
- Cancellation history

**For Organizers/Venues:**
- Payment reliability
- Contract adherence
- Last-minute cancellation rate
- Venue condition accuracy
- Crowd delivery

**Impact:**
- Low score = harder contract terms (100% advance payment)
- High score = preferential treatment and flexible terms
- Trust tier snapshot frozen on each booking for audit purposes

### 7. Image Upload System
- Drag-and-drop file upload
- File browser selection
- URL input for external images
- Multi-image upload support
- Centralized media table with polymorphic entity association (artist, venue, event)
- Supports image, audio, video, and document media types

### 8. Communication System
- **WebSocket real-time chat** replacing HTTP polling for negotiation conversations
- Flowchart-based structured chat driven by `conversationWorkflowInstances` state machine
- Message types: text, system, proposal, action
- Read receipts via `message_reads` table
- Document and file sharing via attachments

### 9. Notification System
- Event bus infrastructure for dispatching notifications
- Template-based notification types with Mustache/Handlebars rendering
- Multiple channels: in-app, email, SMS, push (configurable per type)
- User-level WebSocket authentication for secure real-time push
- Role-targeted delivery (each notification type specifies which roles receive it)
- Rate limiting per channel
- Admin can enable/disable individual notification types

### 10. Dashboard and Analytics
- **Artist Dashboard**: KPI strip with 5 cards (including negotiating stats), upcoming gigs, profile completion
- **Organizer Dashboard**: Pending actions panel with real booking data, event stats, booking pipeline
- **Venue Dashboard**: Shows hosted, artists booked, monthly budget utilization, trust score
- **Admin Dashboard**: Full system oversight at `/admin`

### 11. Event Execution Workflow
- Pre-event checklist management
- Travel and accommodation tracking
- Technical rider management (integrated into negotiation flow)
- Day-of coordination
- Sound check scheduling
- Guest list management

### 12. Mobile-Responsive UI
- Mobile navigation with role-aware sidebar
- Responsive layouts across all dashboards and forms
- Touch-friendly interaction patterns

## Revenue Model

1. **Booking Commission** (2-5%): Transaction fee on every booking
2. **Monthly Programming Retainers**: Recurring revenue from venues
3. **Featured Artist Placements**: Premium visibility (not ads)
4. **White Label Programming**: Enterprise deals with chains
5. **Premium Artist Services**: Guaranteed bookings, analytics, career coaching
6. **Premium Organizer Services**: Access to exclusive artists, priority support
7. **Additional Services**: Flight/hotel booking commissions, equipment supplier network

## Key Differentiators

### Slot Time Protection
- Committed time slots are LOCKED
- Heavy penalties for organizer changes
- Artist has veto power with compensation structure
- 50% to artist, 30% refund to organizer, 20% to platform if rejected

### Data Intelligence
- Scene intelligence database
- Track availability patterns
- Spot booking trends
- Identify peak seasons
- Genre popularity tracking
- Success pattern recognition

### Professional Workflows
- No WhatsApp chaos
- Structured negotiations
- Automated contracts
- Professional communication
- Audit trails

## User Personas

### 1. Artists/DJs
- **Primary Goal**: Consistent gig bookings with fair pay
- **Pain Points**: Unreliable bookings, payment delays, last-minute cancellations
- **Key Features**: Gig discovery, application management, earning tracking

### 2. Organizers/Promoters
- **Primary Goal**: Book quality artists with minimal hassle
- **Pain Points**: Finding reliable artists, negotiation chaos, budget management
- **Key Features**: Artist search, contract automation, logistics management

### 3. Venues/Clubs
- **Primary Goal**: Consistent programming that attracts crowds
- **Pain Points**: Don't know how to curate, inconsistent quality
- **Implemented Features (as of April 2026)**:
  - 7-step onboarding wizard (`VenueProfileSetup`) — Basic Info, Location, Capacity, Music Policy, Amenities, Photos, Preferences
  - Role-specific sidebar navigation: Dashboard, Applications, Find Artists, Profile
  - Application inbox (`/venue/applications`) — view all artist applications, filter by status, search by artist/event name, Accept/Decline actions with audit logging, NegotiationFlow sheet for in-progress negotiations
  - Dashboard with real-time stats: shows hosted, artists booked, monthly budget utilization (SQL SUM of confirmed/paid/completed bookings), trust score (read from `venue.metadata.trustScore`); all action buttons wired to live routes
  - Profile management with 4 tabs: Basic Info (operating days badge-toggles), Location & Space, Music & Equipment, Photos & Media (cover URL, gallery URLs, virtual tour URL)
- **Planned Features**: Programming packages, curator matching, calendar management

### 4. Curators
- **Primary Goal**: Match artists to venues professionally
- **Pain Points**: Manual coordination, limited tools
- **Key Features**: Scene intelligence, programming tools, artist-venue matching

## Launch Strategy

### Phase 1: Proof of Authority (Current)
- 5-7 trusted venues (Bangalore focus)
- 30-40 reliable artists
- Manual oversight of all transactions
- Perfect core workflows
- Establish trust metrics

### Phase 2: Scene Expansion
- Expand to more venues in same city
- Broader artist roster
- Introduce premium features
- Build network effects
- Refine automation

### Phase 3: Geographic Expansion
- Interstate/intercity bookings
- International flight handling
- Multi-city tour routing
- Regional curators
- Localization

## Security & Compliance

### Data Protection
- Heavy-duty encryption (AES-256, bcrypt, JWT)
- HTTPS everywhere
- Session security with PostgreSQL store
- Password hashing with bcrypt

### Legal Compliance
- GST integration
- TDS handling
- Tax documentation
- Jurisdiction: Indian courts
- Audit logging for all transactions

### Document Management
- KYC document storage
- PAN/Aadhar verification
- Bank account verification
- Contract archival
- Immutable audit trails

## Metrics & KPIs

### Platform Health
- Number of active artists
- Number of active venues/organizers
- Total bookings per month
- Successful booking rate
- Average trust scores

### Financial Metrics
- Gross Merchandise Value (GMV)
- Platform commission revenue
- Average booking value
- Payment success rate
- Chargeback rate

### User Experience
- Time to first booking (artists)
- Application to booking conversion rate
- Contract signing time
- Negotiation completion rate
- User satisfaction scores

### Trust Metrics
- Cancellation rates (by party)
- Payment timeliness
- Contract compliance
- Performance quality ratings
- Communication responsiveness

## Future Roadmap

### Planned Features
1. Mobile applications (iOS/Android)
2. Live streaming integration
3. Ticketing system integration (not ownership)
4. International currency support
5. Multi-language support
6. AI-powered artist-venue matching
7. Predictive analytics for crowd estimation
8. Dynamic pricing recommendations
9. Social media integration
10. Press kit generation
11. Tour routing optimization
12. Equipment marketplace

### Integrations
- Accounting software (QuickBooks, Xero)
- Email platforms (Gmail, Outlook)
- Calendar sync (Google Calendar, iCal)
- Payment gateways (Razorpay, Stripe)
- Social media platforms
- Flight/hotel booking APIs

## Project Status

**Current Phase**: Development and Testing
**Target Launch**: Q1 2026 (Bangalore)
**Database**: Comprehensive schema implemented with 30+ tables across all domains
**Documentation**: Actively maintained

### Recently Completed (April 2026)
- Negotiation system overhaul with 4-step proposal versioning and 72-hour deadlines
- Image upload module (drag-drop, browse, URL input, multi-image)
- WebSocket real-time chat replacing HTTP polling
- Genre filter pills on Find Gigs page
- Fee guidance hints in application modal
- Profile completion progress bar with section checklist
- Contract scroll enforcement and PAN/GSTIN warning banner
- Sequential contract edit workflow (organizer first, then artist)
- Notification system infrastructure (event bus, templates, WebSocket auth)
- Organizer dashboard with real booking data in pending actions
- Comprehensive UI/UX improvements from E2E test report

### Active Work / Needs Attention
- Contract page and routes need redesign to fully match sequential edit workflow
- Contract status transitions need server-side enforcement
- Admin review step in contract flow needs completion
- Payment gateway integration (Razorpay)

---

**Last Updated**: April 3, 2026
**Version**: 1.1.0
**Maintained By**: Development Team
