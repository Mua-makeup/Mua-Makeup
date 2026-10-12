import { create } from 'zustand';
import { authService, LoginReq, RegisterReq, UserInfo, UserRegisterRes } from '@/services/auth.service';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/utils/storage';
import { useWorkstationStore } from '@/store/workstation.store';
import { useBookingStore } from '@/store/booking.store';
import { websocketService } from '@/services/websocket.service';
import { registerForPushNotificationsAsync } from '@/services/push-notification.service';
import { useNotificationStore } from '@/store/notification.store';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  userInfo: UserInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initializeAuth: () => Promise<void>;
  login: (credentials: LoginReq) => Promise<void>;
  register: (data: RegisterReq) => Promise<UserRegisterRes>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  refreshToken: null,
  userInfo: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,

  /**
   * Khởi tạo phiên làm việc khi app khởi động (Cold Boot)
   * Tự động đọc Keychain / Keystore phần cứng
   */
  initializeAuth: async () => {
    try {
      set({ isLoading: true });
      const accessToken = await getAccessToken();
      const refreshToken = await getRefreshToken();

      if (accessToken) {
        set({ accessToken, refreshToken });
        // Tải thông tin user mới nhất từ server
        try {
          const user = await authService.getCurrentUser();
          set({ userInfo: user, isAuthenticated: true });
        } catch (err) {
          console.warn('Token hết hạn hoặc lỗi mạng khi lấy hồ sơ:', err);
          // Nếu lỗi do token hết hạn thì interceptor sẽ tự refresh, nếu vẫn hỏng thì logout
          if (!get().isAuthenticated) {
            await clearTokens();
            set({ accessToken: null, refreshToken: null, userInfo: null, isAuthenticated: false });
          }
        }
      } else {
        set({ isAuthenticated: false });
      }
    } catch (e) {
      console.error('Lỗi khởi tạo Auth State:', e);
    } finally {
      set({ isInitialized: true, isLoading: false });
    }
  },

  /**
   * Xử lý Đăng nhập - Giới hạn nghiêm ngặt 3 vai trò: Khách hàng, Thợ MUA, Agency Staff
   */
  login: async (credentials: LoginReq) => {
    set({ isLoading: true });
    try {
      const res = await authService.login(credentials);

      // Nếu tài khoản Admin / Agency yêu cầu xác thực 2FA
      if ((res as any).requires2fa) {
        throw new Error(
          'Tài khoản Quản trị viên yêu cầu xác thực 2FA. Vui lòng đăng nhập tại Cổng Quản Trị Web Portal trên máy tính!'
        );
      }

      const roles = res.userInfo?.roles || [];
      const isAdminRole = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_AGENCY_ADMIN');
      if (isAdminRole) {
        throw new Error(
          'Tài khoản Quản trị viên không hỗ trợ trên ứng dụng di động. Vui lòng đăng nhập tại Cổng Quản Trị Web Portal trên máy tính!'
        );
      }

      if (!res.accessToken || !res.refreshToken) {
        throw new Error('Đăng nhập thất bại: Máy chủ không trả về mã token hợp lệ.');
      }

      await saveTokens(res.accessToken, res.refreshToken);
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        userInfo: res.userInfo,
        isAuthenticated: true,
      });

      // Đăng ký push token lên server
      registerForPushNotificationsAsync();

      // Kích hoạt notification store & websocket listener cho phiên đăng nhập mới
      const loggedInUserId = res.userInfo?.id;
      useNotificationStore.getState().cleanWebSocketListener(loggedInUserId);
      useNotificationStore.getState().fetchUnreadCount();
      useNotificationStore.getState().initWebSocketListener(loggedInUserId);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Xử lý Đăng ký (Khách hoặc MUA)
   */
  register: async (data: RegisterReq) => {
    set({ isLoading: true });
    try {
      return await authService.register(data);
    } finally {
      set({ isLoading: false });
    }
  },

  /**
   * Tải lại thông tin User
   */
  refreshCurrentUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ userInfo: user });
    } catch (e) {
      console.warn('Không thể refresh user info:', e);
    }
  },

  /**
   * Đăng xuất: Xóa sạch cả RAM lẫn phần cứng SecureStore
   */
  logout: async () => {
    set({ isLoading: true });
    try {
      const refreshToken = await getRefreshToken();
      await authService.logout(refreshToken);
    } finally {
      await clearTokens();

      // 1. Ngắt WebSocket HOÀN TOÀN: Xóa sạch registeredHandlers + deactivate client
      //    Ngăn WebSocket tự reconnect và re-subscribe topic thợ cũ sau khi đổi tài khoản
      websocketService.disconnectAll();

      // 2. Dọn dẹp Notification listener & state
      useNotificationStore.getState().cleanWebSocketListener();
      useNotificationStore.setState({
        notifications: [],
        unreadCount: 0,
        isSubscribed: false,
        subscribedUserId: null,
        activeToast: null,
      });

      // Reset toàn bộ workstation state để tránh lộ dữ liệu thợ sang tài khoản khác
      useWorkstationStore.setState({
        isOnline: false,
        isLoading: false,
        currentCoords: null,
        profile: null,
        todayBookings: [],
        activeOffer: null,
        isAcceptModalVisible: false,
        stats: { completedToday: 0, ratingAverage: 5.0, totalReviews: 0, dailyEarnings: 0 },
      });

      // Reset booking store của khách hàng
      useBookingStore.setState({
        upcomingBookings: [],
        historyBookings: [],
      });

      set({
        accessToken: null,
        refreshToken: null,
        userInfo: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
