import { create } from 'zustand';
import { USER_ROLES } from '../constants/roles.constant';
import { authService } from '../services/auth.service';
import { useI18nStore } from './useI18nStore';

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoading: false,

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await authService.login(credentials);
      // res = { success: true, data: { accessToken, refreshToken, userInfo... } }
      const authData = res.data || res;
      const { userInfo } = authData;
      const primaryRole = userInfo?.role || userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;

      set({
        user: userInfo,
        role: primaryRole,
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
      });

      localStorage.setItem('mua_logged_in', 'true');

      if (userInfo?.language && (userInfo.language === 'vi' || userInfo.language === 'en')) {
        useI18nStore.getState().setLanguage(userInfo.language);
      }

      return { success: true, role: primaryRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // Ignored if server error
    } finally {
      localStorage.removeItem('mua_logged_in');
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isCheckingAuth: false,
        isLoading: false,
      });
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await authService.getCurrentUser();
      const userInfo = res.data || res;
      if (userInfo && (userInfo.id || userInfo.email || userInfo.phoneNumber)) {
        const primaryRole = userInfo?.role || userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;

        if (userInfo?.language && (userInfo.language === 'vi' || userInfo.language === 'en')) {
          useI18nStore.getState().setLanguage(userInfo.language);
        }

        set({
          user: userInfo,
          role: primaryRole,
          isAuthenticated: true,
          isCheckingAuth: false,
        });
        return true;
      }

      localStorage.removeItem('mua_logged_in');
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    } catch {
      localStorage.removeItem('mua_logged_in');
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    }
  },

  setUser: (user) => {
    if (!user) {
      set({ user: null, role: null, isAuthenticated: false });
      return;
    }
    const primaryRole = user?.role || user?.roles?.[0] || null;
    if (user?.language && (user.language === 'vi' || user.language === 'en')) {
      useI18nStore.getState().setLanguage(user.language);
    }
    set({
      user,
      role: primaryRole,
      isAuthenticated: true,
    });
  },

  // Đánh dấu kiểm tra xong mà không có session
  setCheckingDone: () => set({ isCheckingAuth: false }),
}));
