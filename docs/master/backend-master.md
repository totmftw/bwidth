# Backend Master Documentation

## Overview
This document covers the backend architecture. Operating on an Express.js Node runtime, the backend manages REST API routes, integrated database services with Drizzle ORM, and domain-specific utility functions.

## Architectural Layers
### 1. Routes (`server/routes/`)
Houses modularized route definitions partitioned by functionality:
- `admin.ts`: Overseeing users, contract approvals, role modifications, and global chat surveillance.
- `organizer.ts`: Management of organizer profiles, events, bookings, and reporting activities.
- `contracts.ts`: Management endpoints for creating and updating lifecycle conditions of contracts.
- **Global Routes**: Handled in `server/routes.ts` connecting main entities like `artists` and generic user interactions. Includes complex integrations such as `/api/bookings/:id/negotiate`.

### 2. Services (`server/services/`)
Separated logic layers for workflows and specific heavy-lifting operations. Key service files include:
- `workflow.ts`: Contains state machine operations, especially for `conversation_workflow_instances` handling step-by-step negotiations, locking active chats, and coordinating terms.
- Utilities: Helper modules including `artist-profile-utils.ts`, `contract-utils.ts`, `conversation-utils.ts`, `message-utils.ts`, `role-resolver.ts`, `role-utils.ts`, `venue-profile-utils.ts`, `workflow-utils.ts`.

### 3. Authentication (`server/auth.ts`)
Express-session and Passport-based authentication handling login, logout, registration, and user session resolution (`/api/user`). Includes production-ready secure cookie management.

### 4. Database Access (`server/db.ts` & `server/storage.ts`)
Drizzle ORM is utilized. `storage.ts` historically encompasses direct database interactions mimicking a storage abstraction, though `schema.ts` explicitly controls the PG table layouts.

## Implementation Details
- Extensive usage of JSON payloads allows metadata extensibility (e.g. `conversation_workflow_instances.context` or `messages.payload`).
- Handlers in `routes.ts` like `handleNegotiation` heavily depend on `workflow.ts` to coordinate valid actions like accept, decline, negotiate against the constraints provided via the workflow configuration.
