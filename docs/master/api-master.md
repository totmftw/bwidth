# API Master Documentation

## Overview
This document catalogs the structure and primary features of the platform's API architecture. The application serves primarily REST-based JSON endpoints for its React front-end. Endpoints are strictly protected, utilizing session-based cookie authentication.

## Authentication
- `POST /api/register`: Creates a new user conditionally linked to an organization profile.
- `POST /api/login`: Establishes a session for a user.
- `POST /api/logout`: Destroys the current user session.
- `GET /api/user`: Returns the currently authenticated user details.

## Profile Endpoints
- `/api/artists/*`: Supports artist discovery (`list`, `get`), and specific profile interaction endpoints (`profile/complete`, `profile/status`) which drive UI completion states.
- `/api/venues/*`: Exposes comprehensive venue management and catalog queries (`dashboard`, `events/upcoming`, `profile/complete`).
- `/organizer/*`: Custom subset providing a centralized dashboard endpoint mapped exclusively to promoter/organizer roles. Includes event manipulation and booking visibility.

## Bookings and Negotiation
- `POST /api/bookings/apply`: Endpoint for artists applying directly to an available slot.
- `POST /api/bookings/:id/negotiate`: Core workflow step. Progresses the attached negotiation rounds by posting proposed amounts, limits, or configurations.
- `POST /api/bookings/:id/accept` / `decline`: State machine transitioning the current phase of a `booking` inquiry against `conversation_workflow_instances`.
- `POST /bookings/:bookingId/contract/initiate`: Spins up a new document version sequence, initiating PDF generation routines.

## Administration
- `/admin/users`: Listing and status modifications (`/status`, `/role`).
- `/admin/contracts/*`: Manages the overarching administrator review constraints. Review triggers occur at endpoints like `/admin/contracts/:id/review`.
- `/admin/conversations`: Unbiased overview access to system chats and histories.

## Technical Details
Responses consistently map to generalized payloads matching Drizzle insert schemas with HTTP standard codes (401, 403, 404, 500, 200). Complex endpoints encapsulate database transactions directly or via services (`workflow.ts`).
