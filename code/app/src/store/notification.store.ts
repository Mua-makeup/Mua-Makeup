import { create } from 'zustand';
import { AppState, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { notificationService, NotificationItem } from '@/services/notification.service';
import { websocketService } from '@/services/websocket.service';

// Bộ nhớ đệm chống trùng lặp thông báo realtime (khi Backend gửi qua cả kênh P2P lẫn Topic)
const processedNotificationIds = new Set<number>();

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  currentPage: number;
  hasMore: boolean;
  isModalOpen: boolean;
  filterIsRead?: boolean;
  activeToast: NotificationItem | null;
  isSubscribed: boolean;
  subscribedUserId: number | null;

  // Actions
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: (page?: number, isRefresh?: boolean) => Promise<void>;
  setFilter: (isRead?: boolean) => void;
  markAsRead: (id: number) => Promise<void>;
  toggleRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: number) => Promise<void>;
  clearAll: () => Promise<void>;
  openModal: () => void;
  closeModal: () => void;
  showToast: (item: NotificationItem) => void;
  dismissToast: () => void;
  initWebSocketListener: (userId?: number | null) => void;
  cleanWebSocketListener: (userId?: number | null) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  isRefreshing: false,
  currentPage: 0,
  hasMore: true,
  isModalOpen: false,
  filterIsRead: undefined,
  activeToast: null,
  isSubscribed: false,
  subscribedUserId: null,

  fetchUnreadCount: async () => {
    try {
      const count = await notificationService.getUnreadCount();
      set({ unreadCount: count });
    } catch (err: any) {
      console.warn('[NotificationStore] Không thể tải unreadCount:', err.message);
    }
  },

  fetchNotifications: async (page = 0, isRefresh = false) => {
    if (isRefresh) {
      set({ isRefreshing: true });
    } else {
      set({ isLoading: true });
    }

    try {
      const filter = get().filterIsRead;
      const res = await notificationService.getNotifications(page, 20, filter);
      const newItems = res.content || [];

      set((state) => ({
        notifications: page === 0 ? newItems : [...state.notifications, ...newItems],
        currentPage: page,
        hasMore: !res.last,
        isLoading: false,
        isRefreshing: false,
      }));

      // Cập nhật lại unreadCount đồng thời
      get().fetchUnreadCount();
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi tải danh sách thông báo:', err.message);
      set({ isLoading: false, isRefreshing: false });
    }
  },

  setFilter: (isRead?: boolean) => {
    set({ filterIsRead: isRead, currentPage: 0, notifications: [] });
    get().fetchNotifications(0, false);
  },

  markAsRead: async (id: number) => {
    // Optimistic UI update
    set((state) => {
      const wasUnread = state.notifications.find((n) => n.id === id)?.isRead === false;
      return {
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });

    try {
      await notificationService.markAsRead(id);
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi đánh dấu đã đọc:', err.message);
      get().fetchUnreadCount();
    }
  },

  toggleRead: async (id: number) => {
    try {
      const updated = await notificationService.toggleRead(id);
      if (updated) {
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? updated : n)),
        }));
        get().fetchUnreadCount();
      }
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi đổi trạng thái đã đọc:', err.message);
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    }));

    try {
      await notificationService.markAllAsRead();
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi đánh dấu tất cả đã đọc:', err.message);
      get().fetchUnreadCount();
    }
  },

  deleteNotification: async (id: number) => {
    set((state) => {
      const wasUnread = state.notifications.find((n) => n.id === id)?.isRead === false;
      return {
        notifications: state.notifications.filter((n) => n.id !== id),
        unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
      };
    });

    try {
      await notificationService.deleteNotification(id);
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi xóa thông báo:', err.message);
      get().fetchNotifications(0, true);
    }
  },

  clearAll: async () => {
    set({ notifications: [], unreadCount: 0 });
    try {
      await notificationService.clearAll();
    } catch (err: any) {
      console.warn('[NotificationStore] Lỗi xóa sạch thông báo:', err.message);
    }
  },

  openModal: () => {
    set({ isModalOpen: true });
    get().fetchNotifications(0, true);
  },

  closeModal: () => {
    set({ isModalOpen: false });
  },

  showToast: (item: NotificationItem) => {
    set({ activeToast: item });
  },

  dismissToast: () => {
    set({ activeToast: null });
  },

  initWebSocketListener: (userId?: number | null) => {
    const targetUserId = userId !== undefined ? userId : get().subscribedUserId;
    get().cleanWebSocketListener(targetUserId);
    set({ subscribedUserId: targetUserId ?? null });
    console.log('[NotificationStore] Khởi tạo WebSocket listener cho userId:', targetUserId);

    const handleIncomingNotification = (payload: any) => {
      console.log('[NotificationStore] Realtime notification received:', payload);
      if (!payload || !payload.id) return;

      const incomingItem: NotificationItem = {
        id: payload.id || payload.notificationId,
        type: payload.type || 'NOTIFICATION',
        title: payload.title || 'Thông báo mới',
        content: payload.content || '',
        bookingId: payload.bookingId || payload.referenceId,
        bookingCode: payload.bookingCode || payload.metadata?.bookingCode,
        agencyId: payload.agencyId,
        userId: payload.userId,
        isRead: false,
        createdAt: payload.createdAt || new Date().toISOString(),
        metadata: payload.metadata || {},
      };

      // 0. Chống trùng lặp tuyệt đối (ngăn nhận 2 lần khi Backend bắn cả User Queue lẫn Topic)
      if (processedNotificationIds.has(incomingItem.id)) {
        console.log('[NotificationStore] Bỏ qua thông báo trùng lặp ID:', incomingItem.id);
        return;
      }
      processedNotificationIds.add(incomingItem.id);
      setTimeout(() => {
        processedNotificationIds.delete(incomingItem.id);
      }, 8000);

      // 1. Cập nhật state danh sách và số lượng chưa đọc (chống trùng lặp ID)
      set((state) => {
        const exists = state.notifications.some((n) => n.id === incomingItem.id);
        const updatedList = exists
          ? state.notifications.map((n) => (n.id === incomingItem.id ? incomingItem : n))
          : [incomingItem, ...state.notifications];

        const nextUnread = typeof payload.unreadCount === 'number'
          ? payload.unreadCount
          : (exists ? state.unreadCount : state.unreadCount + 1);

        return {
          notifications: updatedList,
          unreadCount: nextUnread,
        };
      });

      // 2. Rung haptics nhẹ nhàng thông báo có tin mới (chỉ trên thiết bị di động)
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }

      // 3. Hiển thị Banner Toast trượt từ trên xuống bên trong app
      get().showToast(incomingItem);

      // 4. Phát System Notification lên Hệ điều hành & Màn hình khóa (chỉ trên thiết bị di động iOS / Android)
      if (Platform.OS !== 'web') {
        try {
          let cleanBody = incomingItem.content || '';
          if (cleanBody.includes('{0}')) {
            const name = (incomingItem.metadata?.certName as string) || (incomingItem.metadata?.title as string) || '';
            cleanBody = cleanBody.replace(/\{0\}/g, name ? `"${name}"` : '');
          }

          Notifications.scheduleNotificationAsync({
            content: {
              title: incomingItem.title,
              body: cleanBody,
              data: {
                ...(incomingItem.metadata || {}),
                type: incomingItem.type,
                id: incomingItem.id,
                bookingId: incomingItem.bookingId,
              },
              sound: true,
            },
            trigger: null,
          });
        } catch (notifyErr) {
          console.warn('[NotificationStore] Không thể phát System Notification:', notifyErr);
        }
      }
    };

    // 1. Kênh STOMP chuẩn User-Destination
    websocketService.subscribe('/user/queue/notifications', handleIncomingNotification);

    // 2. Kênh Topic dự phòng trực tiếp theo userId
    if (targetUserId) {
      websocketService.subscribe(`/topic/user-notifications/${targetUserId}`, handleIncomingNotification);
    }

    set({ isSubscribed: true });
  },

  cleanWebSocketListener: (userId?: number | null) => {
    websocketService.unsubscribe('/user/queue/notifications');
    const targetUserId = userId !== undefined ? userId : get().subscribedUserId;
    if (targetUserId) {
      websocketService.unsubscribe(`/topic/user-notifications/${targetUserId}`);
    }
    set({ isSubscribed: false, subscribedUserId: null });
  },
}));
