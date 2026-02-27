# Organizer Messages — Technical & User Documentation

## Overview

The Organizer Messages page (`client/src/pages/organizer/OrganizerMessages.tsx`) provides a real-time messaging interface for organizers to communicate with artists, venues, and other platform users. It implements a two-panel layout with a conversation list and message thread view, similar to modern messaging applications.

## Component Architecture

```
OrganizerMessages (main component)
  ├─ Conversation List Panel (left sidebar)
  │    ├─ Header with conversation count
  │    ├─ Scrollable conversation list
  │    └─ Empty state when no conversations exist
  │
  └─ Message View Panel (right main area)
       ├─ Empty state (no conversation selected)
       ├─ Conversation Header (participants, subject)
       ├─ Message Thread (scrollable, auto-polling)
       └─ Message Input Form (with send button)
```

## Key Features

### 1. Conversation Management
- Lists all conversations the organizer is part of
- Sorts conversations by most recent message (descending)
- Shows conversation subject and last message timestamp
- Displays participant names
- Unread message badge support (placeholder for future implementation)

### 2. Real-Time Messaging
- Auto-polling for new messages every 5 seconds
- Optimistic UI updates on message send
- Message history with sender identification
- Timestamp display for each message
- Visual distinction between own messages and others' messages

### 3. Conversation Types
- **General conversations**: Full messaging capability
- **Negotiation conversations**: Read-only with redirect notice to booking page

### 4. Responsive Layout
- Fixed-height layout (viewport height minus header)
- Scrollable conversation list and message thread
- Two-panel design with 320px left sidebar

---

## Data Layer

### API Endpoints Used

| Endpoint | Method | Purpose | Polling |
|----------|--------|---------|---------|
| `/api/conversations` | GET | Fetch all conversations for current user | No |
| `/api/conversations/:id` | GET | Fetch single conversation details | No |
| `/api/conversations/:id/messages` | GET | Fetch messages for a conversation | Yes (5s) |
| `/api/conversations/:id/messages` | POST | Send a new message | No |

### TanStack Query Hooks

#### Conversations List Query
```typescript
useQuery({
  queryKey: ["/api/conversations"],
  queryFn: async () => { /* fetch logic */ }
})
```
- Fetches all conversations on mount
- No automatic refetching (manual invalidation only)
- Returns array of conversation objects

#### Messages Query
```typescript
useQuery({
  queryKey: ["/api/conversations", selectedConversationId, "messages"],
  queryFn: async () => { /* fetch logic */ },
  enabled: !!selectedConversationId,
  refetchInterval: 5000
})
```
- Only enabled when a conversation is selected
- Auto-refetches every 5 seconds for real-time updates
- Returns array of message objects

#### Conversation Details Query
```typescript
useQuery({
  queryKey: ["/api/conversations", selectedConversationId],
  queryFn: async () => { /* fetch logic */ },
  enabled: !!selectedConversationId
})
```
- Fetches full conversation details including participants
- Used to display conversation header information

#### Send Message Mutation
```typescript
useMutation({
  mutationFn: async (body: string) => { /* send logic */ },
  onSuccess: () => {
    // Clear input field
    // Invalidate messages query to refetch
    // Invalidate conversations list to update lastMessageAt
  }
})
```
- Sends new message to selected conversation
- Automatically invalidates relevant queries on success
- Shows error toast on failure

---

## Data Structures

### Conversation Object
```typescript
{
  id: number;
  subject: string;
  conversationType: "general" | "negotiation";
  lastMessageAt: string; // ISO timestamp
  participants: Array<{
    userId: number;
    user: {
      id: number;
      username: string;
      displayName?: string;
    }
  }>;
}
```

### Message Object
```typescript
{
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  createdAt: string; // ISO timestamp
  sender: {
    id: number;
    username: string;
    displayName?: string;
  }
}
```

---

## Component State

### Local State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `selectedConversationId` | `number \| null` | Currently selected conversation ID |
| `messageBody` | `string` | Current message input value |

### Derived State

| Variable | Source | Purpose |
|----------|--------|---------|
| `sortedConversations` | `conversations` | Conversations sorted by lastMessageAt descending |
| `isOwnMessage` | `message.senderId === user?.id` | Determines message alignment and styling |

---

## Helper Functions

### `getOtherParticipantName(conversation)`
Extracts the name of the other participant in a conversation (not the current user).

**Parameters:**
- `conversation`: Conversation object with participants array

**Returns:** `string`
- Display name if available
- Username as fallback
- "Unknown" if no participant found

**Logic:**
1. Find participant where `userId !== currentUser.id`
2. Return `displayName` or `username` or "Unknown"

### `getLastMessagePreview(conversation)`
**Status:** Placeholder function (not currently used)

**Future purpose:** Extract preview text from the last message in a conversation

**Returns:** `string` - Currently returns placeholder text

### `getUnreadCount(conversation)`
**Status:** Placeholder function

**Future purpose:** Calculate unread message count based on `message_reads` table

**Returns:** `number` - Currently returns 0

**TODO:** Implement integration with `message_reads` table to track read status

---

## UI Behavior

### Conversation Selection
1. User clicks a conversation in the left panel
2. `selectedConversationId` state updates
3. Messages query activates and fetches messages
4. Conversation details query fetches participant info
5. Message thread renders with auto-polling enabled

### Sending Messages
1. User types message in input field
2. User presses Enter or clicks Send button
3. Form submission triggers `handleSendMessage`
4. Validation: empty messages are rejected
5. Mutation sends message to API
6. On success:
   - Input field clears
   - Messages query invalidates and refetches
   - Conversations list invalidates (updates lastMessageAt)
7. On error: Toast notification displays error message

### Message Display
- **Own messages**: Right-aligned, primary color background
- **Other messages**: Left-aligned, muted background
- **Sender name**: Displayed above each message
- **Timestamp**: Displayed next to sender name (format: "MMM d, HH:mm")
- **Message body**: Preserves whitespace and line breaks (`whitespace-pre-wrap`)

### Negotiation Conversations
When `conversationType === "negotiation"`:
- Message input is disabled
- Notice displayed: "This is a negotiation conversation. Use the booking page to send offers."
- Prevents organizers from sending free-form messages in structured negotiation flows

---

## Empty States

### No Conversations
Displayed when `conversations.length === 0`:
- MessageSquare icon (large, faded)
- "No conversations yet"
- Hint: "Messages will appear when you create bookings"

### No Conversation Selected
Displayed when `selectedConversationId === null`:
- MessageSquare icon (extra large, faded)
- "Select a conversation to view messages"

### No Messages in Conversation
Displayed when `messages.length === 0`:
- "No messages yet"
- Hint: "Start the conversation below"

---

## Styling & Layout

### Conversation List Panel
- Width: 320px (w-80)
- Border right separator
- Fixed header with conversation count
- Scrollable body area
- Hover effect on conversation items
- Selected state: muted background

### Message View Panel
- Flex: 1 (takes remaining width)
- Three sections: header, messages, input
- Header: Fixed at top with border bottom
- Messages: Scrollable middle section
- Input: Fixed at bottom with border top

### Message Bubbles
- Max width: 70% of container
- Rounded corners
- Padding: 1rem horizontal, 0.5rem vertical
- Own messages: Primary color
- Other messages: Muted background

---

## Performance Considerations

### Query Optimization
- Conversations list: Fetched once on mount, manually invalidated
- Messages: Auto-polling every 5 seconds (only when conversation selected)
- Conversation details: Fetched once per selection

### Polling Strategy
Current: 5-second interval polling for messages

**Pros:**
- Simple implementation
- Reliable real-time updates
- No WebSocket infrastructure needed

**Cons:**
- Unnecessary requests when no new messages
- 5-second delay for message delivery

**Future improvement:** Consider WebSocket integration for true real-time messaging

### Query Invalidation
- Message send invalidates both messages and conversations queries
- Ensures UI stays in sync after user actions
- Prevents stale data in conversation list

---

## Future Enhancements

### 1. Unread Message Tracking
**Status:** Placeholder implemented

**Implementation plan:**
- Integrate with `message_reads` table
- Track last read message per conversation per user
- Calculate unread count: messages after last read timestamp
- Display badge with unread count in conversation list
- Mark messages as read when conversation is viewed

### 2. Last Message Preview
**Status:** Placeholder implemented

**Implementation plan:**
- Fetch last message body from API
- Truncate to ~50 characters
- Display in conversation list item
- Update on new message

### 3. WebSocket Integration
**Current:** HTTP polling every 5 seconds

**Proposed:**
- WebSocket connection for real-time message delivery
- Server pushes new messages to connected clients
- Eliminates polling overhead
- Instant message delivery

### 4. Message Read Receipts
- Show "Read" indicator on sent messages
- Display timestamp when message was read
- Requires `message_reads` table integration

### 5. Typing Indicators
- Show "User is typing..." indicator
- Requires WebSocket or polling for typing status
- Improves conversational feel

### 6. Message Search
- Search within conversation
- Search across all conversations
- Filter by sender, date range

### 7. Rich Media Support
- Image attachments
- File uploads
- Link previews

---

## User Guide

### Viewing Conversations

1. Navigate to the Messages page from the sidebar
2. All your conversations appear in the left panel
3. Conversations are sorted by most recent activity
4. Each conversation shows:
   - Other participant's name
   - Conversation subject
   - Last message timestamp

### Starting a Conversation

Conversations are automatically created when:
- You create a booking with an artist
- An artist applies to your event
- You initiate contact through the platform

You cannot manually create conversations — they're tied to bookings and platform actions.

### Sending Messages

1. Click a conversation in the left panel
2. Type your message in the input field at the bottom
3. Press Enter or click the Send button
4. Your message appears immediately in the thread

### Reading Messages

- Messages auto-update every 5 seconds
- Your messages appear on the right (blue background)
- Other participants' messages appear on the left (gray background)
- Each message shows the sender's name and timestamp

### Negotiation Conversations

Some conversations are marked as "negotiation" type:
- These are tied to booking negotiations
- You cannot send free-form messages
- Use the Bookings page to send offers and counter-offers
- The conversation shows a notice explaining this restriction

---

## Troubleshooting

### Messages Not Appearing
- Check that you've selected a conversation
- Wait up to 5 seconds for auto-refresh
- Refresh the page if messages still don't appear
- Check browser console for API errors

### Cannot Send Message
- Ensure the message field is not empty
- Check that the conversation is not a "negotiation" type
- Verify you have an active internet connection
- Check for error toast notifications

### Conversation List Empty
- Conversations are created automatically through bookings
- Create a booking or wait for an artist application
- Check that you're logged in as an organizer

---

## Related Documentation

- [Organizer Bookings](./ORGANIZER_BOOKINGS.md) — Booking management and negotiation
- [Organizer API Documentation](./ORGANIZER_API.md) — API endpoint details
- [Conversations API](./CONVERSATIONS_API.md) — Messaging API reference

---

## Technical Notes

### Conversation Auto-Creation
Conversations are automatically created by the platform when:
- An organizer creates a booking offer (POST `/api/bookings`)
- An artist applies to an event (POST `/api/bookings`)
- The booking enters negotiation status

The conversation is linked to the booking via `bookingId` in the conversation metadata.

### Message Ordering
Messages are ordered by `createdAt` timestamp ascending (oldest first) within the thread view. The API returns messages in chronological order.

### Participant Resolution
The component resolves participant names by:
1. Checking `user.displayName` (preferred)
2. Falling back to `user.username`
3. Showing "Unknown" if neither exists

This ensures graceful degradation if user data is incomplete.

### Timestamp Formatting
Uses `date-fns` library for consistent timestamp formatting:
- Conversation list: "MMM d, HH:mm" (e.g., "Jan 15, 14:30")
- Message thread: "MMM d, HH:mm" (same format)

All timestamps are displayed in the user's local timezone.
