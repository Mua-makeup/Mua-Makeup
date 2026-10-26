export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? 'https://mua-makeup.duckdns.org/api/v1'
    : 'http://localhost:8080/api/v1');

export const DEFAULT_PAGE_SIZE = 10;

export const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  try {
    const apiUrl = new URL(API_BASE_URL, typeof window !== 'undefined' ? window.location.origin : undefined);
    // Vercel serverless doesn't host persistent WebSocket, route to VPS domain
    if (apiUrl.hostname.includes('vercel.app')) {
      return 'wss://mua-makeup.duckdns.org/ws-makeup';
    }
    const protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${apiUrl.host}/ws-makeup`;
  } catch {
    if (
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return 'wss://mua-makeup.duckdns.org/ws-makeup';
    }
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    return `${protocol}//${host}:8080/ws-makeup`;
  }
};
