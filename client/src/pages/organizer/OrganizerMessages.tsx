import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

/**
 * OrganizerMessages — Real-time messaging interface for organizers.
 *
 * Provides a two-panel layout for managing conversations with artists, venues,
 * and other platform users. Features include:
 *   - Conversation list sorted by most recent activity
 *   - Real-time message updates via polling (5-second interval)
 *   - Message sending with optimistic UI updates
 *   - Support for general and negotiation conversation types
 *   - Unread message badge support (placeholder for future implementation)
 *
 * Architecture:
 *   - Left panel: Scrollable conversation list with selection state
 *   - Right panel: Message thread view with input form
 *   - Three TanStack Query hooks for data fetching
 *   - One mutation hook for sending messages
 *
 * Data flow:
 *   1. Fetch all conversations on mount
 *   2. User selects conversation → fetch messages + details
 *   3. Messages auto-poll every 5 seconds for updates
 *   4. User sends message → mutation → invalidate queries → UI updates
 *
 * Related requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 * Related tasks: Task 12.1, 12.2
 */
export default function OrganizerMessages() {
  // ─── Hooks & Context ───────────────────────────────────────────────────────
  
  const { user } = useAuth(); // Current authenticated user
  const { toast } = useToast(); // Toast notification system
  const queryClient = useQueryClient(); // TanStack Query client for cache invalidation
  
  // ─── Local State ───────────────────────────────────────────────────────────
  
  /**
   * Currently selected conversation ID.
   * When null, the right panel shows an empty state prompting user to select.
   * When set, triggers queries for messages and conversation details.
   */
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  
  /**
   * Current message input value.
   * Cleared automatically after successful message send.
   */
  const [messageBody, setMessageBody] = useState("");

  // ─── Data Queries ──────────────────────────────────────────────────────────

  /**
   * Fetch all conversations for the current organizer.
   * 
   * Query behavior:
   *   - Runs once on component mount
   *   - No automatic refetching (manual invalidation only)
   *   - Returns array of conversation objects with participants and metadata
   * 
   * API endpoint: GET /api/conversations
   * Response: Array<{ id, subject, conversationType, lastMessageAt, participants }>
   */
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: ["/api/conversations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/conversations");
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return await res.json();
    },
  });

  /**
   * Fetch messages for the selected conversation.
   * 
   * Query behavior:
   *   - Only enabled when a conversation is selected
   *   - Auto-refetches every 5 seconds for real-time updates
   *   - Returns array of message objects in chronological order
   * 
   * API endpoint: GET /api/conversations/:id/messages
   * Response: Array<{ id, senderId, body, createdAt, sender }>
   * 
   * Performance note: 5-second polling is a simple real-time solution.
   * Consider WebSocket integration for production to reduce server load.
   */
  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/conversations", selectedConversationId, "messages"],
    queryFn: async () => {
      if (!selectedConversationId) return [];
      const res = await apiRequest("GET", `/api/conversations/${selectedConversationId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return await res.json();
    },
    enabled: !!selectedConversationId,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
  });

  /**
   * Fetch detailed information for the selected conversation.
   * 
   * Query behavior:
   *   - Only enabled when a conversation is selected
   *   - Used to display conversation header (subject, participants)
   *   - No automatic refetching
   * 
   * API endpoint: GET /api/conversations/:id
   * Response: { id, subject, conversationType, participants }
   */
  const { data: selectedConversation } = useQuery({
    queryKey: ["/api/conversations", selectedConversationId],
    queryFn: async () => {
      if (!selectedConversationId) return null;
      const res = await apiRequest("GET", `/api/conversations/${selectedConversationId}`);
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return await res.json();
    },
    enabled: !!selectedConversationId,
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  /**
   * Send a new message to the selected conversation.
   * 
   * Mutation behavior:
   *   - Validates that a conversation is selected
   *   - Sends message body to API
   *   - On success: clears input, invalidates messages and conversations queries
   *   - On error: displays toast notification with error message
   * 
   * API endpoint: POST /api/conversations/:id/messages
   * Request body: { body: string }
   * Response: { id, conversationId, senderId, body, createdAt }
   * 
   * Query invalidation:
   *   - Messages query: Refetches to show new message immediately
   *   - Conversations query: Updates lastMessageAt timestamp in list
   */
  const sendMessageMutation = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedConversationId) throw new Error("No conversation selected");
      const res = await apiRequest("POST", `/api/conversations/${selectedConversationId}/messages`, {
        body,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send message");
      }
      return await res.json();
    },
    onSuccess: () => {
      // Clear the input field
      setMessageBody("");
      // Refetch messages to show the new message
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversationId, "messages"] });
      // Refetch conversations list to update lastMessageAt timestamp
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

  // ─── Event Handlers ────────────────────────────────────────────────────────

  /**
   * Handle message form submission.
   * 
   * Validates that the message is not empty (after trimming whitespace),
   * then triggers the send message mutation.
   * 
   * @param e - Form submit event
   */
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim()) return; // Reject empty messages
    sendMessageMutation.mutate(messageBody);
  };

  // ─── Helper Functions ──────────────────────────────────────────────────────

  /**
   * Extract the name of the other participant in a conversation.
   * 
   * Finds the participant who is NOT the current user and returns their
   * display name or username. Used in the conversation list to show who
   * the organizer is talking to.
   * 
   * @param conversation - Conversation object with participants array
   * @returns Display name, username, or "Unknown" if not found
   * 
   * Fallback chain:
   *   1. user.displayName (preferred)
   *   2. user.username (fallback)
   *   3. "Unknown" (if participant not found or no user data)
   */
  const getOtherParticipantName = (conversation: any) => {
    if (!conversation.participants || !user) return "Unknown";
    const otherParticipant = conversation.participants.find(
      (p: any) => p.userId !== user.id
    );
    return otherParticipant?.user?.displayName || otherParticipant?.user?.username || "Unknown";
  };

  /**
   * Calculate unread message count for a conversation.
   * 
   * PLACEHOLDER FUNCTION - Currently returns 0.
   * 
   * Future implementation:
   *   - Query message_reads table for last read message timestamp
   *   - Count messages created after that timestamp
   *   - Return count for badge display
   * 
   * @param _conversation - Conversation object (unused in placeholder)
   * @returns Number of unread messages (currently always 0)
   * 
   * TODO: Implement integration with message_reads table
   * Related requirement: 9.5 (unread message count)
   */
  const getUnreadCount = (_conversation: any) => {
    // TODO: Implement unread count based on message_reads table
    return 0;
  };

  /**
   * Sort conversations by most recent activity.
   * 
   * Sorts conversations in descending order by lastMessageAt timestamp,
   * so the most recently active conversations appear at the top of the list.
   * 
   * Conversations without a lastMessageAt timestamp are sorted to the bottom
   * (treated as timestamp 0).
   * 
   * @returns Sorted array of conversation objects
   */
  const sortedConversations = [...conversations].sort((a, b) => {
    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return bTime - aTime; // Descending order (most recent first)
  });

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* ═══════════════════════════════════════════════════════════════════
          LEFT PANEL: Conversation List
          
          Fixed-width sidebar (320px) showing all conversations sorted by
          most recent activity. Includes header with count, scrollable list,
          and empty state when no conversations exist.
          
          Features:
            - Click to select conversation
            - Visual indicator for selected conversation
            - Unread badge (placeholder for future implementation)
            - Conversation subject and last message timestamp
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="w-80 border-r flex flex-col">
        {/* Conversation list header */}
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold">Messages</h2>
          <p className="text-sm text-muted-foreground">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
          </p>
        </div>

        <ScrollArea className="flex-1">
          {conversationsLoading ? (
            // Loading state: spinner
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sortedConversations.length === 0 ? (
            // Empty state: no conversations yet
            <div className="p-4 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-xs mt-1">Messages will appear when you create bookings</p>
            </div>
          ) : (
            // Conversation list: clickable items
            <div className="divide-y">
              {sortedConversations.map((conversation: any) => {
                const unreadCount = getUnreadCount(conversation);
                const isSelected = selectedConversationId === conversation.id;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-muted/50 transition-colors ${
                      isSelected ? "bg-muted" : ""
                    }`}
                  >
                    {/* Participant name and unread badge */}
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium truncate">
                        {getOtherParticipantName(conversation)}
                      </span>
                      {unreadCount > 0 && (
                        <Badge variant="default" className="ml-2 h-5 min-w-5 px-1.5">
                          {unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Conversation subject */}
                    <p className="text-sm text-muted-foreground truncate mb-1">
                      {conversation.subject || "Conversation"}
                    </p>
                    
                    {/* Last message timestamp */}
                    <p className="text-xs text-muted-foreground">
                      {conversation.lastMessageAt
                        ? format(new Date(conversation.lastMessageAt), "MMM d, HH:mm")
                        : "No messages"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          RIGHT PANEL: Message View
          
          Main content area showing the selected conversation's messages
          and input form. Three states:
            1. No conversation selected: empty state
            2. Conversation selected: header + messages + input
            3. Negotiation conversation: read-only with notice
          
          Features:
            - Auto-polling for new messages (5-second interval)
            - Message bubbles with sender identification
            - Timestamp display
            - Visual distinction between own and other messages
            - Message input with send button
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col">
        {!selectedConversationId ? (
          // Empty state: no conversation selected
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Conversation header: subject and participants */}
            <div className="p-4 border-b">
              <h3 className="font-semibold">
                {selectedConversation?.subject || "Conversation"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedConversation?.participants
                  ?.map((p: any) => p.user?.displayName || p.user?.username)
                  .join(", ")}
              </p>
            </div>

            {/* Message thread: scrollable list of messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                // Loading state: spinner
                <div className="flex justify-center items-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                // Empty state: no messages in conversation
                <div className="text-center text-muted-foreground py-8">
                  <p>No messages yet</p>
                  <p className="text-sm mt-1">Start the conversation below</p>
                </div>
              ) : (
                // Message list: chronological order
                <div className="space-y-4">
                  {messages.map((message: any) => {
                    // Determine if this message was sent by the current user
                    const isOwnMessage = message.senderId === user?.id;
                    
                    return (
                      <div
                        key={message.id}
                        className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"}`}
                      >
                        {/* Message metadata: sender name and timestamp */}
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender?.displayName || message.sender?.username || "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(message.createdAt), "MMM d, HH:mm")}
                          </span>
                        </div>
                        
                        {/* Message bubble: styled based on sender */}
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOwnMessage
                              ? "bg-primary text-primary-foreground" // Own messages: primary color
                              : "bg-muted" // Other messages: muted background
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>

            {/* Message input form */}
            <div className="p-4 border-t">
              {selectedConversation?.conversationType === "negotiation" ? (
                // Negotiation conversations: read-only with notice
                // Prevents free-form messaging in structured negotiation flows
                <div className="text-center text-sm text-muted-foreground py-2">
                  This is a negotiation conversation. Use the booking page to send offers.
                </div>
              ) : (
                // General conversations: message input form
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    placeholder="Type your message..."
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!messageBody.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
