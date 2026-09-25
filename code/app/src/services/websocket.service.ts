import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AppState, AppStateStatus } from 'react-native';
import { getAccessToken } from '@/utils/storage';
import { BASE_URL } from './api';

export const getWebSocketUrl = (): string => {
  return BASE_URL.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '/ws-makeup');
};

class WebSocketService {
  private client: Client | null = null;
  private isConnecting: boolean = false;
  private subscriptions: Map<string, StompSubscription> = new Map();
  // Danh sách topic đăng ký thường trực: Tự động đăng ký lại khi socket kết nối lại (reconnect)
  private registeredHandlers: Map<string, (payload: any) => void> = new Map();
  private appStateSubscription: any = null;

  constructor() {
    // Tự động khôi phục kết nối WebSocket khi app từ nền (Background) quay lại Foreground
    if (typeof AppState !== 'undefined' && AppState.addEventListener) {
      this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          if (!this.isConnected() && !this.isConnecting) {
            console.log('[WebSocket-STOMP] App đã quay lại Foreground, kiểm tra tái kết nối...');
            this.connect();
          }
        }
      });
    }
  }

  /**
   * Khởi tạo và kích hoạt kết nối WebSocket STOMP với Spring Boot Backend
   */
  async connect(): Promise<void> {
    if (this.client?.active || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const token = await getAccessToken();
    const brokerURL = getWebSocketUrl();
    console.log('[WebSocket-STOMP] Đang kết nối tới:', brokerURL);

    this.client = new Client({
      webSocketFactory: () => {
        // Tương thích chuẩn React Native iOS / Hermes / Android: Khởi tạo WebSocket thuần
        const ws = new WebSocket(brokerURL, ['v12.stomp', 'v11.stomp', 'v10.stomp']);
        ws.onopen = () => console.log('[RAW-WS] ✅ Native WebSocket OPENED to:', brokerURL);
        ws.onerror = (e: any) => console.warn('[RAW-WS] ❌ Native WebSocket ERROR:', e?.message || e);
        ws.onclose = (e: any) => console.log('[RAW-WS] ⚠️ Native WebSocket CLOSED:', e?.code, e?.reason);
        return ws;
      },
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        if (__DEV__) {
          console.log('[WebSocket-STOMP Debug]:', str);
        }
      },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      appendMissingNULLonIncoming: true, // Fix lỗi Null-chopping trên React Native iOS
      forceBinaryWSFrames: true, // Ép dùng binary frame để không bị iOS cắt cụt ký tự null \0
    });

    this.client.onConnect = () => {
      this.isConnecting = false;
      console.log('[WebSocket-STOMP] Đã kết nối thành công tới:', brokerURL);

      // Đăng ký lại tất cả các topic đã được lưu thường trực (kể cả sau khi reconnect)
      this.registeredHandlers.forEach((callback, topic) => {
        this.doSubscribe(topic, callback);
      });
    };

    this.client.onDisconnect = () => {
      this.isConnecting = false;
      this.subscriptions.clear();
      console.log('[WebSocket-STOMP] Đã ngắt kết nối (giữ handler chờ reconnect)');
    };

    this.client.onStompError = (frame) => {
      this.isConnecting = false;
      console.warn('[WebSocket-STOMP] Lỗi STOMP Broker:', frame.headers['message'], frame.body);
    };

    this.client.onWebSocketError = (event) => {
      this.isConnecting = false;
      console.warn('[WebSocket-STOMP] Lỗi tầng Socket:', event);
    };

    this.client.activate();
  }

  /**
   * Ngắt kết nối WebSocket
   */
  disconnect(): void {
    if (this.client) {
      this.subscriptions.forEach((sub) => {
        try {
          sub.unsubscribe();
        } catch { }
      });
      this.subscriptions.clear();
      this.client.deactivate();
      this.client = null;
      this.isConnecting = false;
    }
  }

  /**
   * Đăng ký lắng nghe (Subscribe) 1 topic cụ thể
   */
  subscribe(topic: string, callback: (payload: any) => void): () => void {
    // Lưu callback vào danh sách thường trực
    this.registeredHandlers.set(topic, callback);

    if (this.client?.connected) {
      this.doSubscribe(topic, callback);
    } else {
      this.connect();
    }

    // Trả về hàm hủy đăng ký (unsubscribe)
    return () => {
      this.unsubscribe(topic);
    };
  }

  private doSubscribe(topic: string, callback: (payload: any) => void) {
    if (!this.client?.connected) return;

    // Hủy đăng ký cũ nếu trùng topic
    if (this.subscriptions.has(topic)) {
      try {
        this.subscriptions.get(topic)?.unsubscribe();
      } catch { }
      this.subscriptions.delete(topic);
    }

    const sub = this.client.subscribe(topic, (msg: IMessage) => {
      try {
        const body = JSON.parse(msg.body);
        callback(body);
      } catch (e) {
        callback(msg.body);
      }
    });

    this.subscriptions.set(topic, sub);
    console.log('[WebSocket-STOMP] Subscribed topic:', topic);
  }

  /**
   * Hủy đăng ký (Unsubscribe) 1 topic
   */
  unsubscribe(topic: string): void {
    this.registeredHandlers.delete(topic);
    const sub = this.subscriptions.get(topic);
    if (sub) {
      try {
        sub.unsubscribe();
      } catch { }
      this.subscriptions.delete(topic);
      console.log('[WebSocket-STOMP] Unsubscribed topic:', topic);
    }
  }

  /**
   * Bắn tin nhắn lên Server qua kênh Inbound (/app/...)
   */
  send(destination: string, payload: any): void {
    if (!this.client?.connected) {
      console.warn('[WebSocket-STOMP] Chưa kết nối, không thể gửi tới:', destination);
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(payload),
    });
  }

  isConnected(): boolean {
    return Boolean(this.client?.connected);
  }
}

export const websocketService = new WebSocketService();
