# WebSocket Real-Time Communication

## Overview

BANDWIDTH uses a room-based WebSocket system for real-time chat messaging and user-level notification delivery. The system operates alongside the standard HTTP API -- initial data is fetched via REST, and live updates are pushed via WebSocket, eliminating the need for polling.

**Key files**:
- Server: `server/ws-server.ts`
- Client: `client/src/lib/ws.ts`
- React hook: `client/src/hooks/use-conversation.ts`
- Notification hook: `client/src/hooks/use-notifications.ts`
- Broadcast call site: `server/routes/conversations.ts`
- Notification push: `server/services/notification.service.ts`

---

## Server Architecture

### ws-server.ts

The WebSocket server is initialized from `server/index.ts` by passing the existing HTTP server instance:

```typescript
import { initWebSocketServer } from "./ws-server";
const wss = initWebSocketServer(httpServer);
```

The server listens on the `/ws` path using the `ws` library (`WebSocketServer`).

### State Management

Two in-memory maps track active connections:

| Map | Key | Value | Purpose |
|-----|-----|-------|---------|
| `rooms` | `conversationId` (number) | `Set<WebSocket>` | Chat room subscriptions |
| `userConnections` | `userId` (number) | `Set<WebSocket>` | User-level notification delivery |

A single WebSocket client can be in one conversation room and one user connection simultaneously.

### Protocol

#### Client -> Server Messages

| Message | Fields | Behavior |
|---------|--------|----------|
| Subscribe to room | `{ type: "subscribe", conversationId: number }` | Leaves previous room (if any), joins the new room, server responds with `connected` ack. |
| Authenticate user | `{ type: "auth", userId: number }` | Registers the connection for user-level notifications, server responds with `auth_ok` ack. |

#### Server -> Client Messages

| Message | Fields | Trigger |
|---------|--------|---------|
| Room connected | `{ type: "connected", conversationId: number }` | Sent after successful room subscription. |
| Auth confirmed | `{ type: "auth_ok", userId: number }` | Sent after successful user authentication. |
| New message | `{ type: "message", data: MessageObject }` | Broadcast to room when a new message is inserted. |
| Notification | `{ type: "notification", data: NotificationObject }` | Broadcast to user when a notification is created. |

### Broadcast Functions

The server exports two functions for broadcasting from route handlers and services:

**`broadcastToRoom(conversationId: number, payload: object): void`**
- Sends the JSON-serialized payload to all WebSocket clients in the specified room
- Skips clients whose `readyState` is not `OPEN`
- Called from `server/routes/conversations.ts` after inserting a message

**`broadcastToUser(userId: number, payload: object): void`**
- Sends the JSON-serialized payload to all WebSocket connections for the specified user
- Supports multiple tabs/devices per user
- Called from `server/services/notification.service.ts` after persisting an in-app notification

### Connection Lifecycle

1. Client opens a WebSocket connection to `ws(s)://<host>/ws`
2. Client sends `subscribe` (for chat) or `auth` (for notifications), or both
3. Server adds the socket to the appropriate map(s)
4. On `close` or `error`, the server removes the socket from all maps
5. Empty rooms and user entries are garbage-collected (deleted from the map when their set becomes empty)

---

## Client Architecture

### Singleton WebSocket (`client/src/lib/ws.ts`)

The client maintains a single WebSocket connection shared across all components:

**`getWebSocket(): WebSocket`**
- Returns the existing connection if it is open
- Creates a new connection to `ws(s)://<host>/ws` if needed (protocol derived from `location.protocol`)
- Attaches a `message` event listener that dispatches to registered type-based listeners

**`onWsMessage(type: string, listener: (data: any) => void): () => void`**
- Registers a listener for a specific message type (e.g. `"message"`, `"notification"`)
- Ensures the WebSocket connection exists
- Returns an unsubscribe function for cleanup in `useEffect`

**`authenticateWs(userId: number): void`**
- Sends `{ type: "auth", userId }` to the server
- Handles the case where the socket is still connecting (defers until `open` event)
- Called once after login by the `use-notifications.ts` hook

### Typed Message Dispatcher

When the socket receives a message, the dispatcher:

1. Parses the JSON payload
2. Extracts the `type` field
3. Looks up all registered listeners for that type
4. Calls each listener with `msg.data` (or the full `msg` object if `data` is absent)

This means components subscribe to specific event types without needing to parse raw WebSocket frames.

---

## React Hooks

### useConversationMessages

**File**: `client/src/hooks/use-conversation.ts`

Combines HTTP history loading with WebSocket live updates for a conversation:

```typescript
const { data: messages, isLoading } = useConversationMessages(conversationId);
```

**Behavior**:

1. **HTTP fetch**: Uses TanStack Query to fetch messages via `GET /api/conversations/:id/messages`. The query key is `["/api/conversations", conversationId, "messages"]`. No `refetchInterval` is set.

2. **WebSocket subscription**: A `useEffect` opens the WebSocket and sends `{ type: "subscribe", conversationId }`. If the socket is still connecting, subscription is deferred until the `open` event.

3. **Live message injection**: The `message` event handler on the WebSocket checks if the incoming message belongs to the current conversation (`msg.data.conversationId === conversationId`). If so, it appends the message directly to the TanStack Query cache via `queryClient.setQueryData`.

4. **Cleanup**: When the component unmounts or `conversationId` changes, the WebSocket `message` listener is removed.

### useNotifications (use-notifications.ts)

Handles real-time notification delivery:

1. On mount (when user is available), calls `authenticateWs(userId)`
2. Subscribes to the `"notification"` message type via `onWsMessage`
3. When a notification arrives, updates the TanStack Query cache for unread counts
4. Returns an unsubscribe function for cleanup

---

## Integration Points

### NegotiationFlow Chat Panel

**File**: `client/src/components/booking/NegotiationFlow.tsx`

- Calls `useConversationMessages(conversationId)` to display the negotiation message history
- Messages include both free-text (for non-negotiation conversations) and workflow action messages (proposals, accepts, declines)
- The conversation ID is obtained from the booking's associated negotiation conversation

### OrganizerMessages

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

- Lists all conversations the organizer participates in
- Uses `useConversationMessages(selectedConversationId)` for the active conversation
- Real-time updates replace the previous polling approach

### Notification Delivery

**File**: `client/src/hooks/use-notifications.ts`

- Authenticates the WebSocket connection with the current user's ID
- Receives push notifications via the `"notification"` message type
- Updates the notification badge count in real time without polling

### Server-Side Broadcast Sites

| File | Function Called | Trigger |
|------|----------------|---------|
| `server/routes/conversations.ts` | `broadcastToRoom(conversationId, { type: "message", data: msg })` | After `POST /api/conversations/:id/messages` inserts a new message |
| `server/services/notification.service.ts` | `broadcastToUser(userId, { type: "notification", data: { ...notification, priority } })` | After persisting an in-app notification via the event bus |

---

## Message Flow

### Chat Message Flow

```
1. User types a message in the NegotiationFlow or OrganizerMessages UI
2. Client sends HTTP POST to /api/conversations/:id/messages
   Body: { body: "message text", clientMsgId?: "uuid" }
3. Server inserts the message into the `messages` table
4. Server updates `conversations.lastMessageAt` for sort ordering
5. Server calls broadcastToRoom(conversationId, { type: "message", data: msg })
6. All WebSocket clients subscribed to that conversation room receive the message
7. Each client's useConversationMessages hook appends the message to the TanStack Query cache
8. The chat UI re-renders with the new message (no polling, no refetch)
```

### Notification Flow

```
1. A business service completes an operation (e.g. booking status change)
2. Service calls emitDomainEvent("booking.status_changed", payload, actorUserId)
3. The event bus dispatches to the NotificationService via the "*" wildcard
4. NotificationService looks up the notification type definition
5. Target users are resolved (artist, organizer, venue manager, admins)
6. For each target user (excluding the actor):
   a. Notification is persisted to the `notifications` table
   b. broadcastToUser(userId, { type: "notification", data: notification }) is called
7. Connected clients receive the notification via their authenticated WebSocket
8. The use-notifications hook updates the badge count and notification list
```

### Negotiation Action Flow

```
1. User clicks an action button (Accept, Counter-Offer, Walk Away) in NegotiationFlow
2. Client sends HTTP POST to /api/conversations/:id/actions
   Body: { actionKey: "ACCEPT", inputs?: { ... } }
3. Server dispatches to the workflow service
4. Workflow service validates turn-taking, round limits, and state
5. Workflow service persists an action message and updates the workflow instance
6. The action message is broadcast to the conversation room via broadcastToRoom
7. The workflow may also emit domain events that trigger notifications
8. Both parties see the action message appear in real time
```

---

## Error Handling

- **Malformed WebSocket messages**: Silently ignored (try/catch around JSON.parse on both server and client)
- **Connection drops**: Client's `getWebSocket()` creates a new connection on next access
- **Room/user cleanup**: Server removes sockets from maps on `close` and `error` events
- **Non-negotiation restriction**: `POST /api/conversations/:id/messages` blocks free-text for negotiation-type conversations (must use `/actions` endpoint)

---

## Scaling Considerations

The current implementation uses in-memory maps (`rooms`, `userConnections`) on a single server process. For horizontal scaling:

- **WebSocket sessions**: Use a shared backing store (Redis pub/sub) so broadcasts reach clients on any server instance
- **Event bus**: Swap the in-process `EventEmitter` in `event-bus.ts` for Redis pub/sub
- **Sticky sessions**: Alternatively, use sticky sessions at the load balancer level to keep WebSocket connections on the same server

These changes are designed to be non-breaking -- the `broadcastToRoom` and `broadcastToUser` function signatures remain the same.

---

**Last Updated**: April 3, 2026
