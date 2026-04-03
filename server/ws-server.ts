/**
 * WebSocket server for real-time chat in negotiation workspaces and messaging.
 *
 * Architecture: room-based pub/sub keyed by conversationId.
 * Each client subscribes to one room and receives messages broadcast to that room.
 *
 * Protocol (client → server):
 *   { type: 'subscribe', conversationId: number }
 *
 * Protocol (server → client):
 *   { type: 'connected', conversationId: number }
 *   { type: 'message', data: MessageObject }
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

/** Map: conversationId → set of connected WebSocket clients */
const rooms = new Map<number, Set<WebSocket>>();

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    let subscribedRoomId: number | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === 'subscribe' && typeof msg.conversationId === 'number') {
          const roomId: number = msg.conversationId;
          // Leave previous room if switching
          if (subscribedRoomId !== null) {
            rooms.get(subscribedRoomId)?.delete(ws);
          }

          subscribedRoomId = roomId;
          if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
          }
          rooms.get(roomId)!.add(ws);

          ws.send(JSON.stringify({ type: 'connected', conversationId: roomId }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (subscribedRoomId !== null) {
        rooms.get(subscribedRoomId)?.delete(ws);
        // Clean up empty rooms
        if (rooms.get(subscribedRoomId)?.size === 0) {
          rooms.delete(subscribedRoomId);
        }
      }
    });

    ws.on('error', () => {
      if (subscribedRoomId !== null) {
        rooms.get(subscribedRoomId)?.delete(ws);
      }
    });
  });

  return wss;
}

/** Broadcast a payload to all clients subscribed to a conversation room. */
export function broadcastToRoom(conversationId: number, payload: object): void {
  const clients = rooms.get(conversationId);
  if (!clients || clients.size === 0) return;

  const msg = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
