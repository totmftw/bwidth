/**
 * Singleton WebSocket connection for real-time chat and notifications.
 * Reconnects automatically if the connection drops.
 *
 * Supports:
 *   - Conversation room subscriptions (chat)
 *   - User-level auth for notifications
 *   - Typed message dispatcher for listeners
 */

let socket: WebSocket | null = null;

type WsListener = (data: any) => void;
const listeners = new Map<string, Set<WsListener>>();

export function getWebSocket(): WebSocket {
  if (!socket || socket.readyState > WebSocket.OPEN) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}/ws`);

    // Set up the dispatcher on every new connection
    socket.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type && listeners.has(msg.type)) {
          listeners.get(msg.type)!.forEach((fn) => fn(msg.data ?? msg));
        }
      } catch {
        // Ignore malformed messages
      }
    });
  }
  return socket;
}

/**
 * Subscribe to a specific WebSocket message type.
 * Returns an unsubscribe function.
 */
export function onWsMessage(type: string, listener: WsListener): () => void {
  if (!listeners.has(type)) {
    listeners.set(type, new Set());
  }
  listeners.get(type)!.add(listener);

  // Ensure socket is connected
  getWebSocket();

  return () => {
    listeners.get(type)?.delete(listener);
  };
}

/**
 * Authenticate the WebSocket connection for user-level notifications.
 * Call after login when the user ID is known.
 */
export function authenticateWs(userId: number): void {
  const ws = getWebSocket();
  const doAuth = () => {
    ws.send(JSON.stringify({ type: 'auth', userId }));
  };
  if (ws.readyState === WebSocket.OPEN) {
    doAuth();
  } else {
    ws.addEventListener('open', doAuth, { once: true });
  }
}
