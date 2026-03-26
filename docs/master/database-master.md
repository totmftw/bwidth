# Database Master Documentation

## Overview
This document serves as the master source of truth for the database architecture of the platform. The platform uses PostgreSQL, heavily structured around event management and negotiation, and utilizes Drizzle ORM for schema definitions and queries.

## Entities
### User Management
- **users**: Central table for all platform users. Supports dynamic status and references locals/currencies.
- **roles** & **user_roles**: RBAC implementation for roles like artist, promoter, organizer, venue_manager, admin, etc.
- **authProviders**: External authentication providers mapping to users.
- **organizations** & **organization_members**: Groups representation.

### Geography and Lookups
- **currencies**, **locales**, **timezones**, **countries**, **states**, **cities**: Tables managing standard geographic and localization constants.

### Profiles
- **artists**: Detailed artist profiles (solo & bands) linked to users/orgs.
- **promoters**: Event promoter and organizer profiles.
- **venues**: Venue details including addresses, capacity, stages, etc.
- **artist_genres**: Join table mapping styles and genres.

### Events & Bookings
- **events**: Core table spanning physical performances. Supports statuses and stage timelines.
- **temporary_venues**: Custom venues defined for specific one-off events.
- **bookings**: Connects artists to events. Highly vital table for the negotiation lifecycle. 

### Contracts
- **contracts**: Captures the final outcome of bookings. Tracks PDFs, signatures, versions, etc.
- **contract_versions**: Tracks historical contract edits.
- **contract_edit_requests**: Manages specific requested changes between artists and promoters.
- **contract_signatures**: Maintains e-signatures and audit IP logs.

### Communications Lifecycle
- **conversations**: Ties directly to negotiation workflows or direct messaging logic.
- **messages**: Contains chat bodies and metadata payload.
- **conversation_workflow_instances**: Specifically traces multi-party negotiation across defined steps to prevent overlapping edits.
- **booking_proposals**: Used during active messaging for proposing different constraints during an active booking query.

### Payments
- **payments**: General payment transactions linked to bookings.
- **payouts**: Distributing pooled funds to appropriate end-users.

## Migrations Strategy
Migrations are tracked within standard processes or `migration-history.md`. When schema changes are required (via Drizzle), index strategies and rollback paths must be included.
