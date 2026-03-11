# OrganizerMessages.tsx — Improvement Backlog

Identified during code review of the newly created messaging interface.

## 1. Replace `any` types with proper TypeScript interfaces

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: The component uses `any` types throughout for conversation and message objects, reducing type safety and IDE support.

**Recommendation**: Create shared TypeScript interfaces for the API response shapes:

```ts
// shared/types.ts or client/src/types/messaging.ts
interface User {
  id: number;
  username: string;
  displayName?: string;
}

interface ConversationParticipant {
  id: number;
  conversationId: number;
  userId: number;
  user: User;
}

interface Conversation {
  id: number;
  subject: string;
  conversationType: "general" | "negotiation";
  lastMessageAt: string | null;
  createdAt: string;
  participants: ConversationParticipant[];
}

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  body: string;
  createdAt: string;
  sender: User;
}
```

**Impact**: High - Improves type safety, catches bugs at compile time, better IDE autocomplete

---

## 2. Extract custom hooks for messaging logic

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: All query and mutation logic is inline in the component, making it harder to test and reuse.

**Recommendation**: Create a custom hook file `client/src/hooks/use-conversations.ts`:

```ts
// client/src/hooks/use-conversations.ts
export function useConversations() {
  return useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return await res.json() as Conversation[];
    },
  });
}

export function useConversationMessages(conversationId: number | null) {
  return useQuery({
    queryKey: ["/api/conversations", conversationId, "messages"],
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return await res.json() as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: 5000,
  });
}

export function useConversationDetails(conversationId: number | null) {
  return useQuery({
    queryKey: ["/api/conversations", conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      const res = await apiRequest("GET", `/api/conversations/${conversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return await res.json() as Conversation;
    },
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ conversationId, body }: { conversationId: number; body: string }) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { body });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return await res.json() as Message;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ["/api/conversations", variables.conversationId, "messages"] 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

**Impact**: High - Improves testability, reusability, and separation of concerns

---

## 3. Extract sub-components for better modularity

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: The component is 277 lines with multiple responsibilities (conversation list, message thread, input form).

**Recommendation**: Extract into smaller components:

```tsx
// client/src/components/messaging/ConversationList.tsx
interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  isLoading: boolean;
}

export function ConversationList({ conversations, selectedId, onSelect, isLoading }: ConversationListProps) {
  // ... conversation list rendering logic
}

// client/src/components/messaging/MessageThread.tsx
interface MessageThreadProps {
  messages: Message[];
  currentUserId: number;
  isLoading: boolean;
}

export function MessageThread({ messages, currentUserId, isLoading }: MessageThreadProps) {
  // ... message thread rendering logic
}

// client/src/components/messaging/MessageInput.tsx
interface MessageInputProps {
  onSend: (body: string) => void;
  disabled: boolean;
  isNegotiation: boolean;
}

export function MessageInput({ onSend, disabled, isNegotiation }: MessageInputProps) {
  // ... message input form logic
}
```

**Impact**: Medium - Improves maintainability and testability

---

## 4. Memoize sorted conversations

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`, line 258

**Issue**: `sortedConversations` is recalculated on every render, even when `conversations` hasn't changed.

**Recommendation**: Use `useMemo`:

```ts
const sortedConversations = useMemo(() => 
  [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime;
  }),
  [conversations]
);
```

**Impact**: Low - Minor performance improvement, but good practice

**Status**: ✅ IMPLEMENTED

---

## 5. Remove unused helper function

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`, line 234

**Issue**: `getLastMessagePreview` function is defined but never used.

**Recommendation**: Remove the function entirely or implement it if needed for future features.

**Impact**: Low - Code cleanliness

**Status**: ✅ IMPLEMENTED

---

## 6. Add auto-scroll to latest message

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: When new messages arrive or a conversation is opened, the user must manually scroll to see the latest message.

**Recommendation**: Add a ref and useEffect to auto-scroll:

```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
}, [messages]);

// In the message list JSX:
<div className="space-y-4">
  {messages.map((message) => (
    // ... message rendering
  ))}
  <div ref={messagesEndRef} />
</div>
```

**Impact**: Medium - Improves UX significantly

---

## 7. Add keyboard shortcut for sending messages

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: Users must click the Send button; Enter key submits but Shift+Enter for new lines isn't supported.

**Recommendation**: Add keyboard event handler:

```tsx
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSendMessage(e as any);
  }
};

<Input
  onKeyDown={handleKeyDown}
  // ... other props
/>
```

**Impact**: Low - Nice-to-have UX improvement

---

## 8. Add error boundaries for query failures

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: Query errors are not displayed to the user; the component just shows loading or empty states.

**Recommendation**: Add error state handling:

```tsx
const { data: conversations = [], isLoading, error } = useConversations();

if (error) {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
        <p className="text-lg font-semibold">Failed to load conversations</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <Button onClick={() => queryClient.invalidateQueries()} className="mt-4">
          Retry
        </Button>
      </div>
    </div>
  );
}
```

**Impact**: Medium - Better error handling and user feedback

---

## 9. Extract magic numbers to constants

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: Magic numbers like `5000` (polling interval), `320` (sidebar width) are hardcoded.

**Recommendation**: Define constants at the top of the file:

```ts
const POLLING_INTERVAL_MS = 5000;
const CONVERSATION_LIST_WIDTH = 320; // 80 * 4 (w-80 in Tailwind)
const MAX_MESSAGE_WIDTH_PERCENT = 70;
```

**Impact**: Low - Improves maintainability

**Status**: ✅ IMPLEMENTED

---

## 10. Add optimistic updates for message sending

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: After sending a message, there's a delay before it appears (waiting for invalidation + refetch).

**Recommendation**: Use TanStack Query's optimistic updates:

```ts
const sendMessageMutation = useMutation({
  mutationFn: async (body: string) => {
    // ... existing logic
  },
  onMutate: async (body) => {
    await queryClient.cancelQueries({ 
      queryKey: ["/api/conversations", selectedConversationId, "messages"] 
    });

    const previousMessages = queryClient.getQueryData([
      "/api/conversations", 
      selectedConversationId, 
      "messages"
    ]);

    queryClient.setQueryData(
      ["/api/conversations", selectedConversationId, "messages"],
      (old: Message[]) => [
        ...old,
        {
          id: Date.now(), // Temporary ID
          conversationId: selectedConversationId!,
          senderId: user!.id,
          body,
          createdAt: new Date().toISOString(),
          sender: { id: user!.id, username: user!.username, displayName: user!.displayName },
        },
      ]
    );

    return { previousMessages };
  },
  onError: (err, body, context) => {
    queryClient.setQueryData(
      ["/api/conversations", selectedConversationId, "messages"],
      context?.previousMessages
    );
  },
  // ... rest of mutation config
});
```

**Impact**: High - Significantly improves perceived performance

---

## 11. Add message timestamp grouping

**File**: `client/src/pages/organizer/OrganizerMessages.tsx`

**Issue**: Every message shows a timestamp, which can be repetitive for messages sent close together.

**Recommendation**: Group messages by date and show timestamps only when there's a significant gap:

```tsx
function shouldShowTimestamp(currentMsg: Message, previousMsg: Message | null): boolean {
  if (!previousMsg) return true;
  const timeDiff = new Date(currentMsg.createdAt).getTime() - new Date(previousMsg.createdAt).getTime();
  return timeDiff > 5 * 60 * 1000; // 5 minutes
}
```

**Impact**: Low - UX polish

---

## Summary

**Critical (Implement Now)**:
- ✅ #4: Memoize sorted conversations
- ✅ #5: Remove unused helper function
- ✅ #9: Extract magic numbers to constants

**High Priority (Next Sprint)**:
- #1: Add TypeScript interfaces
- #2: Extract custom hooks
- #10: Add optimistic updates

**Medium Priority (Backlog)**:
- #3: Extract sub-components
- #6: Auto-scroll to latest message
- #8: Add error boundaries

**Low Priority (Nice-to-Have)**:
- #7: Keyboard shortcuts
- #11: Message timestamp grouping
