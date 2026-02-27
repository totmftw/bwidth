# Conversations API Documentation

## Overview

The Conversations API provides endpoints for managing real-time messaging between platform users. Conversations are automatically created when bookings are initiated and support both general messaging and structured negotiation flows.

## Base URL

All endpoints are prefixed with `/api/conversations`

## Authentication

All endpoints require authentication. Users must be logged in with a valid session.

---

## Endpoints

### 1. List Conversations

Fetch all conversations for the authenticated user.

**Endpoint:** `GET /api/conversations`

**Authentication:** Required

**Query Parameters:** None

**Response:** `200 OK`

```json
[
  {
    "id": 123,
    "subject": "Booking #456 - Event Name",
    "conversationType": "general",
    "lastMessageAt": "2026-02-27T10:30:00Z",
    "createdAt": "2026-02-20T14:00:00Z",
    "participants": [
      {
        "id": 1,
        "conversationId": 123,
        "userId": 10,
        "user": {
          "id": 10,
          "username": "artist_user",
          "displayName": "DJ Artist"
        }
      },
      {
        "id": 2,
        "conversationId": 123,
        "userId": 20,
        "user": {
          "id": 20,
          "username": "organizer_user",
          "displayName": "Event Organizer"
        }
      }
    ]
  }
]
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique conversation identifier |
| `subject` | string | Conversation subject/title |
| `conversationType` | string | Type: "general" or "negotiation" |
| `lastMessageAt` | string | ISO timestamp of last message |
| `createdAt` | string | ISO timestamp of conversation creation |
| `participants` | array | Array of participant objects |
| `participants[].userId` | number | User ID of participant |
| `participants[].user` | object | User details (username, displayName) |

**Sorting:** Conversations are returned in no specific order. Client should sort by `lastMessageAt` for most recent first.

**Error Responses:**

- `401 Unauthorized` - User not authenticated
- `500 Internal Server Error` - Database error

---

### 2. Get Conversation Details

Fetch detailed information for a specific conversation.

**Endpoint:** `GET /api/conversations/:id`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Conversation ID |

**Response:** `200 OK`

```json
{
  "id": 123,
  "subject": "Booking #456 - Event Name",
  "conversationType": "general",
  "lastMessageAt": "2026-02-27T10:30:00Z",
  "createdAt": "2026-02-20T14:00:00Z",
  "participants": [
    {
      "id": 1,
      "conversationId": 123,
      "userId": 10,
      "user": {
        "id": 10,
        "username": "artist_user",
        "displayName": "DJ Artist"
      }
    },
    {
      "id": 2,
      "conversationId": 123,
      "userId": 20,
      "user": {
        "id": 20,
        "username": "organizer_user",
        "displayName": "Event Organizer"
      }
    }
  ]
}
```

**Authorization:** User must be a participant in the conversation.

**Error Responses:**

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not a participant in this conversation
- `404 Not Found` - Conversation does not exist
- `500 Internal Server Error` - Database error

---

### 3. List Messages

Fetch all messages in a conversation.

**Endpoint:** `GET /api/conversations/:id/messages`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Conversation ID |

**Query Parameters:** None (future: pagination support)

**Response:** `200 OK`

```json
[
  {
    "id": 1001,
    "conversationId": 123,
    "senderId": 10,
    "body": "Hi, I'm interested in performing at your event.",
    "createdAt": "2026-02-20T14:05:00Z",
    "sender": {
      "id": 10,
      "username": "artist_user",
      "displayName": "DJ Artist"
    }
  },
  {
    "id": 1002,
    "conversationId": 123,
    "senderId": 20,
    "body": "Great! Let's discuss the details.",
    "createdAt": "2026-02-20T14:10:00Z",
    "sender": {
      "id": 20,
      "username": "organizer_user",
      "displayName": "Event Organizer"
    }
  }
]
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Unique message identifier |
| `conversationId` | number | Parent conversation ID |
| `senderId` | number | User ID of message sender |
| `body` | string | Message text content |
| `createdAt` | string | ISO timestamp of message creation |
| `sender` | object | Sender user details |
| `sender.username` | string | Sender's username |
| `sender.displayName` | string | Sender's display name (optional) |

**Sorting:** Messages are returned in chronological order (oldest first).

**Authorization:** User must be a participant in the conversation.

**Error Responses:**

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not a participant in this conversation
- `404 Not Found` - Conversation does not exist
- `500 Internal Server Error` - Database error

---

### 4. Send Message

Send a new message to a conversation.

**Endpoint:** `POST /api/conversations/:id/messages`

**Authentication:** Required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | number | Conversation ID |

**Request Body:**

```json
{
  "body": "This is my message text"
}
```

**Request Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `body` | string | Yes | Min 1 char, max 5000 chars, non-empty after trim |

**Response:** `201 Created`

```json
{
  "id": 1003,
  "conversationId": 123,
  "senderId": 20,
  "body": "This is my message text",
  "createdAt": "2026-02-27T10:30:00Z",
  "sender": {
    "id": 20,
    "username": "organizer_user",
    "displayName": "Event Organizer"
  }
}
```

**Side Effects:**

1. Message is created in the database
2. Conversation's `lastMessageAt` timestamp is updated
3. Message read status is tracked (future: unread count updates)

**Authorization:** User must be a participant in the conversation.

**Conversation Type Restrictions:**

- **General conversations**: No restrictions, all participants can send messages
- **Negotiation conversations**: Messages should be sent through the booking negotiation flow, not this endpoint (enforced at UI level, not API level)

**Error Responses:**

- `400 Bad Request` - Invalid request body (empty message, too long, etc.)
  ```json
  {
    "message": "Message body is required and cannot be empty"
  }
  ```
- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User is not a participant in this conversation
- `404 Not Found` - Conversation does not exist
- `500 Internal Server Error` - Database error

---

## Conversation Types

### General Conversations

**Purpose:** Free-form messaging between users

**Creation:** Automatically created when:
- An organizer creates a booking offer
- An artist applies to an event
- Platform initiates contact between users

**Behavior:**
- All participants can send messages freely
- No message restrictions
- Used for coordination, questions, and general communication

### Negotiation Conversations

**Purpose:** Structured negotiation flows for booking terms

**Creation:** Automatically created when a booking enters negotiation status

**Behavior:**
- Messages are sent through the booking negotiation API, not the general messaging API
- UI prevents free-form messaging (shows notice to use booking page)
- Negotiation history is stored in booking metadata, not as regular messages
- Conversation serves as a record of negotiation actions

---

## Data Model

### Conversations Table

```sql
CREATE TABLE conversations (
  id SERIAL PRIMARY KEY,
  subject VARCHAR(255),
  conversation_type VARCHAR(50) DEFAULT 'general',
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Conversation Participants Table

```sql
CREATE TABLE conversation_participants (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
```

### Messages Table

```sql
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER REFERENCES conversations(id),
  sender_id INTEGER REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Message Reads Table (Future)

```sql
CREATE TABLE message_reads (
  id SERIAL PRIMARY KEY,
  message_id INTEGER REFERENCES messages(id),
  user_id INTEGER REFERENCES users(id),
  read_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

---

## Real-Time Updates

### Current Implementation: HTTP Polling

The client polls `GET /api/conversations/:id/messages` every 5 seconds when a conversation is selected.

**Pros:**
- Simple implementation
- No additional infrastructure
- Reliable

**Cons:**
- 5-second delay for new messages
- Unnecessary requests when no new messages
- Higher server load with many active users

### Future Implementation: WebSocket

**Proposed architecture:**
- WebSocket connection per authenticated user
- Server pushes new messages to connected clients
- Client subscribes to specific conversation channels
- Instant message delivery
- Reduced server load

**WebSocket Events:**

```typescript
// Client → Server
{
  "type": "subscribe",
  "conversationId": 123
}

// Server → Client
{
  "type": "new_message",
  "conversationId": 123,
  "message": { /* message object */ }
}

// Server → Client
{
  "type": "conversation_updated",
  "conversationId": 123,
  "lastMessageAt": "2026-02-27T10:30:00Z"
}
```

---

## Rate Limiting

**Current:** No rate limiting implemented

**Recommended:**
- 60 messages per minute per user
- 10 conversations created per hour per user
- 100 message list requests per minute per user

---

## Security Considerations

### Authorization

- All endpoints verify user is a participant in the conversation
- Conversation participants are immutable after creation
- Users cannot add themselves to conversations

### Input Validation

- Message body is sanitized to prevent XSS
- Maximum message length: 5000 characters
- Empty messages (after trim) are rejected

### Privacy

- Users can only see conversations they're part of
- Message history is not deletable (audit trail)
- No public conversation listing

---

## Usage Examples

### Fetch and Display Conversations

```typescript
// Fetch conversations
const response = await fetch('/api/conversations', {
  credentials: 'include'
});
const conversations = await response.json();

// Sort by most recent
const sorted = conversations.sort((a, b) => 
  new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
);

// Display in UI
sorted.forEach(conv => {
  console.log(`${conv.subject} - ${conv.lastMessageAt}`);
});
```

### Send a Message

```typescript
const response = await fetch('/api/conversations/123/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    body: 'Hello, this is my message'
  })
});

if (response.ok) {
  const message = await response.json();
  console.log('Message sent:', message.id);
} else {
  const error = await response.json();
  console.error('Failed to send:', error.message);
}
```

### Poll for New Messages

```typescript
let lastMessageId = 0;

setInterval(async () => {
  const response = await fetch('/api/conversations/123/messages', {
    credentials: 'include'
  });
  const messages = await response.json();
  
  // Filter for new messages
  const newMessages = messages.filter(m => m.id > lastMessageId);
  
  if (newMessages.length > 0) {
    console.log(`${newMessages.length} new messages`);
    lastMessageId = Math.max(...messages.map(m => m.id));
  }
}, 5000); // Poll every 5 seconds
```

---

## Related Documentation

- [Organizer Messages UI](./ORGANIZER_MESSAGES.md) - Frontend implementation
- [Organizer Bookings](./ORGANIZER_BOOKINGS.md) - Booking negotiation flow
- [Platform Architecture](./CODE_ARCHITECTURE.md) - System overview
