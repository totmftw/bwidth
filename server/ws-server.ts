/**
 * WebSocket server for real-time chat and notifications.
 *
 * Architecture:
 *   - Room-based pub/sub keyed by conversationId (chat messages)
 *   - User-based pub/sub keyed by userId (notifications)
 *
 * Protocol (client → server):
 *   { type: 'subscribe', conversationId: number }
 *   { type: 'auth', userId: number }
 *
 * Protocol (server → client):
 *   { type: 'connected', conversationId: number }
 *   { type: 'auth_ok', userId: number }
 *   { type: 'message', data: MessageObject }
 *   { type: 'notification', data: NotificationObject }
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';

/** Map: conversationId → set of connected WebSocket clients */
const rooms = new Map<number, Set<WebSocket>>();

/** Map: userId → set of connected WebSocket clients */
const userConnections = new Map<number, Set<WebSocket>>();

export function initWebSocketServer(httpServer: Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  // Only handle upgrade requests for our /ws path.
  // Everything else (e.g. Vite HMR at /?token=...) must pass through
  // untouched so Vite's own upgrade listener can handle it.
  httpServer.on('upgrade', (req, socket, head) => {
    const pathname = req.url ? new URL(req.url, 'http://localhost').pathname : '/';
    if (pathname === '/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    }
  });

  wss.on('connection', (ws) => {
    let subscribedRoomId: number | null = null;
    let authenticatedUserId: number | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Conversation room subscription (existing chat functionality)
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

        // User-level authentication for notifications
        if (msg.type === 'auth' && typeof msg.userId === 'number') {
          authenticatedUserId = msg.userId;
          if (!userConnections.has(msg.userId)) {
            userConnections.set(msg.userId, new Set());
          }
          userConnections.get(msg.userId)!.add(ws);
          ws.send(JSON.stringify({ type: 'auth_ok', userId: msg.userId }));
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      if (subscribedRoomId !== null) {
        rooms.get(subscribedRoomId)?.delete(ws);
        if (rooms.get(subscribedRoomId)?.size === 0) {
          rooms.delete(subscribedRoomId);
        }
      }
      if (authenticatedUserId !== null) {
        userConnections.get(authenticatedUserId)?.delete(ws);
        if (userConnections.get(authenticatedUserId)?.size === 0) {
          userConnections.delete(authenticatedUserId);
        }
      }
    });

    ws.on('error', () => {
      if (subscribedRoomId !== null) {
        rooms.get(subscribedRoomId)?.delete(ws);
      }
      if (authenticatedUserId !== null) {
        userConnections.get(authenticatedUserId)?.delete(ws);
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

/** Broadcast a payload to all connections for a specific user (notifications). */
export function broadcastToUser(userId: number, payload: object): void {
  const clients = userConnections.get(userId);
  if (!clients || clients.size === 0) return;

  const msg = JSON.stringify(payload);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}
