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
   * Tải lại thông tin User và cấp lại Token mới nhất nếu có cập nhật vai trò (VD: Studio duyệt thợ)
   */
  refreshCurrentUser: async () => {
    try {
      const currentRefreshToken = await getRefreshToken();
      const currentAccessToken = await getAccessToken();

      if (currentRefreshToken) {
        try {
          const res = await authService.refreshToken(currentRefreshToken, currentAccessToken);
          if (res?.accessToken && res?.refreshToken) {
            await saveTokens(res.accessToken, res.refreshToken);
            set({
              accessToken: res.accessToken,
              refreshToken: res.refreshToken,
              userInfo: res.userInfo,
            });
            return;
          }
        } catch (refreshErr) {
          console.warn('[authStore] Lỗi refresh token mới, thử lấy hồ sơ trực tiếp:', refreshErr);
        }
      }

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
    } catch (err) {
      console.warn('Lỗi khi gọi API logout từ máy chủ:', err);
    } finally {
      await clearTokens();

      // Cập nhật trạng thái Đăng Xuất NGAY LẬP TỨC để UI phản hồi tức thì
      set({
        accessToken: null,
        refreshToken: null,
        userInfo: null,
        isAuthenticated: false,
        isLoading: false,
      });

      // 1. Ngắt WebSocket HOÀN TOÀN
      try {
        websocketService.disconnectAll();
      } catch (e) {
        console.warn('Lỗi ngắt kết nối WebSocket khi logout:', e);
      }

      // 2. Dọn dẹp Notification listener & state
      try {
        useNotificationStore.getState().cleanWebSocketListener();
        useNotificationStore.setState({
          notifications: [],
          unreadCount: 0,
          isSubscribed: false,
          subscribedUserId: null,
          activeToast: null,
        });
      } catch (e) {
        console.warn('Lỗi dọn dẹp NotificationStore khi logout:', e);
      }

      // 3. Reset workstation state (bọc an toàn tránh lỗi circular dependency trên web)
      try {
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
      } catch (e) {
        console.warn('Lỗi dọn dẹp WorkstationStore khi logout:', e);
      }

      // 4. Reset booking store của khách hàng
      try {
        useBookingStore.setState({
          upcomingBookings: [],
          historyBookings: [],
        });
      } catch (e) {
        console.warn('Lỗi dọn dẹp BookingStore khi logout:', e);
      }
    }
  },
}));
