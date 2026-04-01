# Conversation & Negotiation API

This document describes the updated proposal-based negotiation flow.

## Overview
Negotiation is no longer field-by-field. Instead, it revolves around a `NegotiationSnapshot`. 
Both Artist and Organizer propose full snapshots, replacing the previous round's snapshot.

### Entities
1. **Proposal Snapshot**: A full representation of `financial`, `schedule`, `techRider`, and `logistics` terms.
2. **Rider Confirmation**: The organizer must explicitly confirm the artist's required tech rider items.
3. **Acceptance**: Both parties must accept the *same* proposal version.

## Core Endpoints
All endpoints are scoped under `/api/bookings/:id/negotiation`.

- `GET /api/bookings/:id/negotiation`: Fetch the `NegotiationSummaryResponse`.
- `POST /api/bookings/:id/negotiation/propose`: Submit a new proposal snapshot.
- `POST /api/bookings/:id/negotiation/rider-confirm`: Organizer confirms rider items.
- `POST /api/bookings/:id/negotiation/accept`: Accept the current proposal version.
- `POST /api/bookings/:id/negotiation/walk-away`: Decline and cancel booking.

## Contract Handoff
Once both parties have accepted the current proposal, the booking's `meta.negotiation` is updated with an `agreement` block. The contract generation service reads directly from this block to produce the technical and financial terms of the contract.
