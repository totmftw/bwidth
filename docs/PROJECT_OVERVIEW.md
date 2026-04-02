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
- **Styling**: Tailwind CSS v4
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
- **Profile Types**: Each role has specific profile requirements
- **Trust Scoring**: Reputation system for all parties
- **KYC Verification**: Document verification for artists and organizers

### 2. Booking System

#### Mode A: Single Booking Mode
- One-off gigs or tour-based events
- Curated discovery with filters
- Intent verification
- Structured negotiation (max 2-3 rounds)
- Auto-contract generation

#### Mode B: Programming Mode
- 3-6 month venue calendars
- Curator-led selections
- Monthly retainers
- Consistent programming

### 3. Contract Management
- Automated contract generation (90% pre-filled templates)
- Four contract types based on:
  - Artist/Organizer trust scores
  - Booking type (local/interstate/international)
- Digital signature workflow
- Slot time protection clauses
- Cancellation policies with penalties

### 4. Payment System
- Milestone-based payments (20-50% deposit, staged releases)
- Platform escrow protection
- Automated payment schedules
- Commission tracking (2-5%)
- Multi-currency support (primary: INR)

### 5. Negotiation Engine
- Limited round negotiation (max 3 rounds)
- Time-bound responses (24-48 hours)
- Pre-defined negotiable parameters:
  - Slot time (opening/mid/closing)
  - Performance duration
  - Budget (±20% from original)
- Automatic mediation offers

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

### 7. Event Execution Workflow
- Pre-event checklist management
- Travel and accommodation tracking
- Technical rider management
- Day-of coordination
- Sound check scheduling
- Guest list management

### 8. Communication System
- Flowchart-based chat (structured, not free-form)
- Document sharing
- Notification system (email, SMS, in-app, push)
- Automated reminders

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

**Current Phase**: Development & Testing  
**Target Launch**: Q1 2026 (Bangalore)  
**Database**: Migration to comprehensive schema in progress  
**Documentation**: In development

---

**Last Updated**: April 2, 2026  
**Version**: 1.0.0  
**Maintained By**: Development Team
