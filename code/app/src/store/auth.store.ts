import { create } from 'zustand';
import { authService, LoginReq, RegisterReq, UserInfo, UserRegisterRes } from '@/services/auth.service';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from '@/utils/storage';

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
      const roles = res.userInfo?.roles || [];
      const isAdminRole = roles.includes('ROLE_SUPER_ADMIN') || roles.includes('ROLE_AGENCY_ADMIN');
      if (isAdminRole) {
        throw new Error(
          'Tài khoản Quản trị viên không hỗ trợ trên ứng dụng di động. Vui lòng đăng nhập tại Cổng Quản Trị Web Portal trên máy tính!'
        );
      }

      await saveTokens(res.accessToken, res.refreshToken);
      set({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        userInfo: res.userInfo,
        isAuthenticated: true,
      });
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
