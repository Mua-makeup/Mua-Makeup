import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { getAccessToken } from '@/utils/storage';
import { BASE_URL, getActiveBaseUrl } from './api';

export const getWebSocketUrl = async (): Promise<string> => {
  const activeUrl = await getActiveBaseUrl();
  return activeUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '/ws-makeup');
};

class WebSocketService {
  private client: Client | null = null;
  private isConnecting: boolean = false;
  private subscriptions: Map<string, StompSubscription> = new Map();
  // Hỗ trợ NHIỀU subscriber cùng lắng nghe 1 topic (Fan-out Pattern):
  private registeredHandlers: Map<string, Set<(payload: any) => void>> = new Map();
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
    if (!token) {
      this.isConnecting = false;
      return;
    }
    const brokerURL = await getWebSocketUrl();
    console.log('[WebSocket-STOMP] Đang kết nối tới:', brokerURL);

    const isWeb = Platform.OS === 'web';

    this.client = new Client({
      brokerURL: isWeb ? brokerURL : undefined,
      webSocketFactory: isWeb
        ? undefined
        : () => {
            // Tương thích chuẩn React Native iOS / Hermes / Android: Khởi tạo WebSocket thuần
            const ws = new WebSocket(brokerURL, ['v12.stomp', 'v11.stomp', 'v10.stomp']);
            ws.onopen = () => console.log('[RAW-WS] ✅ Native WebSocket OPENED to:', brokerURL);
            ws.onerror = (e: any) => console.warn('[RAW-WS] ❌ Native WebSocket ERROR:', e?.message || e);
            ws.onclose = (e: any) => console.log('[RAW-WS] ⚠️ Native WebSocket CLOSED:', e?.code, e?.reason);
            return ws;
          },
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: () => {},
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      appendMissingNULLonIncoming: true, // Fix lỗi Null-chopping trên React Native iOS
      forceBinaryWSFrames: !isWeb, // Ép dùng binary frame để không bị iOS cắt cụt ký tự null \0 (chỉ dùng trên native mobile)
    });

    const activeClient = this.client;
    activeClient.beforeConnect = async () => {
      const currentToken = await getAccessToken();
      if (!currentToken || this.client !== activeClient) {
        this.isConnecting = false;
        void activeClient.deactivate();
        return;
      }
      activeClient.connectHeaders = { Authorization: `Bearer ${currentToken}` };
    };

    this.client.onConnect = () => {
      this.isConnecting = false;
      console.log('[WebSocket-STOMP] Đã kết nối thành công tới:', brokerURL);

      // Đăng ký lại tất cả các topic đã được lưu thường trực (kể cả sau khi reconnect)
      this.registeredHandlers.forEach((handlers, topic) => {
        if (handlers && handlers.size > 0) {
          this.doSubscribe(topic);
        }
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
   * Ngắt kết nối HOÀN TOÀN khi người dùng Đăng Xuất.
   * Xóa sạch TẤT CẢ registeredHandlers để WebSocket không tự reconnect
   * và re-subscribe lại các topic của phiên thợ cũ sau khi đổi tài khoản.
   */
  disconnectAll(): void {
    console.log('[WebSocket-STOMP] Đang ngắt kết nối HOÀN TOÀN (logout)...');
    this.registeredHandlers.clear();
    this.disconnect();
  }

  /**
   * Đăng ký lắng nghe (Subscribe) 1 topic cụ thể. Hỗ trợ nhiều components cùng subscribe 1 topic.
   */
  subscribe(topic: string, callback: (payload: any) => void): () => void {
    if (!this.registeredHandlers.has(topic)) {
      this.registeredHandlers.set(topic, new Set());
    }
    this.registeredHandlers.get(topic)!.add(callback);

    if (this.isConnected()) {
      this.doSubscribe(topic);
    } else {
      this.connect();
    }

    // Trả về hàm hủy đăng ký (unsubscribe) riêng cho listener này
    return () => {
      this.unsubscribe(topic, callback);
    };
  }

  private doSubscribe(topic: string) {
    if (!this.client?.connected) return;

    // Nếu đã có STOMP subscription cho topic này rồi thì không cần đăng ký lặp
    if (this.subscriptions.has(topic)) {
      return;
    }

    const sub = this.client.subscribe(topic, (msg: IMessage) => {
      let body: any;
      try {
        body = JSON.parse(msg.body);
      } catch (e) {
        body = msg.body;
      }
      // Broadcast tới TẤT CẢ các component đang lắng nghe topic này
      const handlers = this.registeredHandlers.get(topic);
      if (handlers) {
        handlers.forEach((callback) => {
          try {
            callback(body);
          } catch (err) {
            console.error('[WebSocket-STOMP] Lỗi callback topic', topic, err);
          }
        });
      }
    });

    this.subscriptions.set(topic, sub);
  }

  /**
   * Hủy đăng ký (Unsubscribe) 1 callback cụ thể hoặc toàn bộ topic
   */
  unsubscribe(topic: string, callback?: (payload: any) => void): void {
    if (callback) {
      const handlers = this.registeredHandlers.get(topic);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size > 0) {
          // Vẫn còn component khác đang cần topic này -> Giữ nguyên STOMP subscription
          return;
        }
      }
    }

    this.registeredHandlers.delete(topic);
    const sub = this.subscriptions.get(topic);
    if (sub) {
      try {
        sub.unsubscribe();
      } catch { }
      this.subscriptions.delete(topic);
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
