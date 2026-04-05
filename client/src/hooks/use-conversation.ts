/**
 * useConversationMessages — fetches messages via HTTP and subscribes via WebSocket
 * for real-time updates without polling.
 *
 * Usage:
 *   const { data: messages, isLoading } = useConversationMessages(conversationId);
 *
 * The hook:
 *   1. Fetches the initial message history via GET /api/conversations/:id/messages
 *   2. Subscribes to the WebSocket room for the conversation
 *   3. Appends incoming WS messages directly into the TanStack Query cache
 */

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { getWebSocket } from "@/lib/ws";

export function useConversationMessages(conversationId: number | null) {
  const queryClient = useQueryClient();
  const queryKey = ["/api/conversations", conversationId, "messages"];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      if (!conversationId) return [];
      const res = await apiRequest("GET", `/api/conversations/${conversationId}/messages`);
      if (!res.ok) throw new Error("Failed to fetch messages");
      return await res.json();
    },
    enabled: !!conversationId,
    // No refetchInterval — WebSocket handles live updates
    staleTime: 0,
  });

  useEffect(() => {
    if (!conversationId) return;

    let ws: WebSocket;
    try {
      ws = getWebSocket();
    } catch {
      return;
    }

    const subscribe = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "subscribe", conversationId }));
      }
    };

    // Subscribe immediately if already open, or wait for open
    if (ws.readyState === WebSocket.OPEN) {
      subscribe();
    } else {
      ws.addEventListener("open", subscribe, { once: true });
    }

    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        // Handle regular messages, agent messages, and suggestions
        if (
          (msg.type === "message" || msg.type === "agent_message") &&
          msg.data?.conversationId === conversationId
        ) {
          queryClient.setQueryData(queryKey, (old: any[]) => [
            ...(old || []),
            msg.data,
          ]);
        }
      } catch {
        // Ignore malformed WS messages
      }
    };

    ws.addEventListener("message", handler);

    return () => {
      ws.removeEventListener("message", handler);
    };
  }, [conversationId, queryClient]);

  return query;
}
