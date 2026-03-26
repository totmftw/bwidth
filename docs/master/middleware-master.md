# Middleware Master Documentation

## Overview
This document covers the middleware layer within the application backend. Middleware operations run universally prior to targeted route resolving, functioning to catch errors, implement session validations, and orchestrate parsing requests.

## Authentication and Sessions
- **express-session**: Establishes session structures locally (or configured PG-simple caching natively). Generates encrypted browser cookies tied specifically to verified logins.
- **Passport.js**: Commonly employed here within `auth.ts` mapping native User session serialization over PostgreSQL via Drizzle. Includes localized login strategies.

## Global Request Parsing
Standard Express components are uniformly applied across all primary routes:
- `express.json()`: Handles payload ingestion across dynamic body POST/PUT endpoints.
- `express.urlencoded()`

## Custom Route Validators
The application makes prevalent use of specific inline middleware for:
- **Role Verification**: Rejecting unauthorized scopes (e.g., blocking an 'artist' from interacting with `/organizer/` specific mutations). Returns standard `403 Forbidden` messages natively.
- **State Workflow Verification**: Intercepting negotiation operations where the current `workflow_instances` lock state does not match the requester.

## Error Handling
A finalized universal error handler parses standard JS `.catch()` errors cascading down from route executions. Primarily mapping explicit Zod schema validation errors directly to `400 Bad Request` states, and capturing unexpected systemic errors mapped directly back to standard 500 statuses.
