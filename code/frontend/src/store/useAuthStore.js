import { create } from 'zustand';
import { USER_ROLES, STORAGE_KEYS } from '../constants/roles.constant';
import { authService } from '../services/auth.service';
import { useI18nStore } from './useI18nStore';
import { useToastStore } from './useToastStore';

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

      if (authData.requires2fa) {
        set({ isLoading: false });
        return {
          requires2fa: true,
          tempToken: authData.tempToken,
          emailMasked: authData.emailMasked,
        };
      }

      const { userInfo } = authData;
      const primaryRole = userInfo?.role || userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;

      if (authData.accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authData.accessToken);
      }
      if (authData.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');

      set({
        user: userInfo,
        role: primaryRole,
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
      });

      if (userInfo?.language && (userInfo.language === 'vi' || userInfo.language === 'en')) {
        useI18nStore.getState().setLanguage(userInfo.language);
      }

      return { success: true, role: primaryRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  verify2Fa: async (payload) => {
    set({ isLoading: true });
    try {
      const res = await authService.verify2Fa(payload);
      const authData = res.data || res;
      const { userInfo } = authData;
      const primaryRole = userInfo?.role || userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;

      if (authData.accessToken) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, authData.accessToken);
      }
      if (authData.refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, authData.refreshToken);
      }
      localStorage.setItem(STORAGE_KEYS.LOGGED_IN, 'true');

      set({
        user: userInfo,
        role: primaryRole,
        isAuthenticated: true,
        isCheckingAuth: false,
        isLoading: false,
      });

      if (userInfo?.language && (userInfo.language === 'vi' || userInfo.language === 'en')) {
        useI18nStore.getState().setLanguage(userInfo.language);
      }

      return { success: true, role: primaryRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  resend2Fa: async (payload) => {
    const res = await authService.resend2Fa(payload);
    return res.data || res;
  },

  logout: async () => {
    sessionStorage.setItem('is_logging_out', 'true');
    sessionStorage.removeItem('auth_redirect_toast');
    useToastStore.getState().hideToast();
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    try {
      await authService.logout(refreshToken);
    } catch {
      // Ignored if server error
    } finally {
      localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem('ai_chat_session_code');
      localStorage.removeItem('ai_support_session_code');
      sessionStorage.removeItem('auth_redirect_toast');
      useToastStore.getState().hideToast();
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

      localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      set({
        user: null,
        role: null,
        isAuthenticated: false,
        isCheckingAuth: false,
      });
      return false;
    } catch {
      localStorage.removeItem(STORAGE_KEYS.LOGGED_IN);
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
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
