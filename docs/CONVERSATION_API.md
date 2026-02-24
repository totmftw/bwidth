# Conversation System API

Reference for the conversation and messaging endpoints that power the platform's negotiation and communication features.

## Overview

Conversations are entity-bound communication channels. Every conversation is tied to a domain entity (currently bookings) and a conversation type (currently `negotiation`). The system supports two messaging modes:

- **Action-driven (negotiation)**: Users interact through predefined workflow actions (ACCEPT, DECLINE, PROPOSE_CHANGE). Free-text messages are rejected.
- **Free-text (general)**: Standard text messaging for non-negotiation conversations.

### Key Design Principles

- **Idempotent opening**: Calling the open endpoint multiple times for the same entity returns the existing conversation without creating duplicates.
- **Participant resolution**: Participants are derived from the booking chain (artist, organizer, venue) rather than specified by the caller.
- **Workflow state machine**: Negotiation conversations carry a workflow instance that enforces turn-taking, round limits, and valid state transitions.
- **Chronological message ordering**: Messages are returned oldest-first for natural chat display.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   Client     │────▶│  Conversation    │────▶│  Workflow Service    │
│   (React)    │     │  Routes          │     │  (state machine)    │
└─────────────┘     └──────────────────┘     └─────────────────────┘
                           │                          │
                           ▼                          ▼
                    ┌──────────────┐          ┌──────────────┐
                    │  Storage     │          │  Messages    │
                    │  (booking    │          │  (action     │
                    │   details)   │          │   events)    │
                    └──────────────┘          └──────────────┘
```

### Participant Resolution Flow (Negotiation)

When opening a negotiation conversation for a booking, participants are resolved through the booking chain:

```
booking
  ├── artist.userId          → Artist participant
  ├── organizer.userId       → Organizer participant (preferred)
  └── venue.userId           → Venue manager participant (fallback)
```

The organizer is preferred over the venue manager. If no organizer exists on the booking's event, the venue manager is used as the promoter-side participant. Participant IDs are deduplicated to prevent constraint violations.

## Endpoints

### GET /api/conversations

Lists all conversations the authenticated user participates in.

| Aspect | Detail |
|---|---|
| Auth | Session cookie required (`req.isAuthenticated()`) |
| Success | `200` with `Conversation[]` |
| Ordering | Most recent activity first (`lastMessageAt` DESC) |

#### Response (200)

```json
[
  {
    "id": 1,
    "entityType": "booking",
    "entityId": 42,
    "conversationType": "negotiation",
    "subject": "Negotiation: DJ Example",
    "status": "open",
    "lastMessageAt": "2026-02-24T10:30:00.000Z"
  }
]
```

---

### GET /api/conversations/:id

Returns a single conversation with its workflow instance and participant list.

| Aspect | Detail |
|---|---|
| Auth | Session cookie required |
| Access | Participant-only (403 for non-participants) |
| Success | `200` with conversation + workflow + participants |
| Not found | `404` |

#### Response (200)

```json
{
  "id": 1,
  "entityType": "booking",
  "entityId": 42,
  "conversationType": "negotiation",
  "subject": "Negotiation: DJ Example",
  "status": "open",
  "lastMessageAt": "2026-02-24T10:30:00.000Z",
  "workflowInstance": {
    "id": 1,
    "conversationId": 1,
    "workflowKey": "booking_negotiation_v1",
    "currentNodeKey": "WAITING_FIRST_MOVE",
    "round": 0,
    "maxRounds": 3,
    "locked": false,
    "awaitingUserId": 7,
    "context": {}
  },
  "participants": [
    {
      "conversationId": 1,
      "userId": 7,
      "user": { "id": 7, "displayName": "DJ Example", "email": "..." }
    },
    {
      "conversationId": 1,
      "userId": 12,
      "user": { "id": 12, "displayName": "Club Manager", "email": "..." }
    }
  ]
}
```

---

### GET /api/conversations/:id/messages

Returns the most recent 50 messages in chronological order (oldest first).

| Aspect | Detail |
|---|---|
| Auth | Session cookie required |
| Access | Participant-only (403 for non-participants) |
| Success | `200` with `Message[]` |
| Ordering | Chronological (oldest → newest) |
| Limit | 50 messages per request |

#### Implementation Note

Messages are fetched from the database in `DESC` order (newest first) with `LIMIT 50`, then reversed in-memory before returning. This approach is efficient for cursor-based pagination while delivering the chronological order clients expect.

#### Response (200)

```json
[
  {
    "id": 1,
    "conversationId": 1,
    "senderId": 7,
    "body": null,
    "messageType": "action",
    "actionKey": "PROPOSE_CHANGE",
    "payload": { "offerAmount": 8000 },
    "round": 1,
    "createdAt": "2026-02-24T10:30:00.000Z",
    "sender": { "id": 7, "displayName": "DJ Example" }
  },
  {
    "id": 2,
    "conversationId": 1,
    "senderId": null,
    "body": "Counter-offer submitted. Awaiting response.",
    "messageType": "system",
    "createdAt": "2026-02-24T10:30:01.000Z",
    "sender": null
  }
]
```

---
