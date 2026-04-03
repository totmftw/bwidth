/**
 * Singleton WebSocket connection for real-time chat.
 * Reconnects automatically if the connection drops.
 */

let socket: WebSocket | null = null;

export function getWebSocket(): WebSocket {
  if (!socket || socket.readyState > WebSocket.OPEN) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${location.host}/ws`);
  }
  return socket;
}
