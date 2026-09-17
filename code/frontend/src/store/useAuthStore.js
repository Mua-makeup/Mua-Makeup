import { create } from 'zustand';
import { STORAGE_KEYS, USER_ROLES } from '../constants/roles.constant';
import { authService } from '../services/auth.service';

const getInitialState = () => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  const userInfoStr = localStorage.getItem(STORAGE_KEYS.USER_INFO);
  let user = null;
  if (userInfoStr) {
    try {
      user = JSON.parse(userInfoStr);
    } catch {
      user = null;
    }
  }
  const role = user?.roles?.[0] || localStorage.getItem(STORAGE_KEYS.USER_ROLE) || null;

  return {
    token: token || null,
    user: user,
    role: role,
    isAuthenticated: Boolean(token && user),
    isLoading: false,
  };
};

export const useAuthStore = create((set, get) => ({
  ...getInitialState(),

  login: async (credentials) => {
    set({ isLoading: true });
    try {
      const res = await authService.login(credentials);
      // res = { success: true, data: { accessToken, refreshToken, userInfo... } }
      const authData = res.data || res;
      const { accessToken, refreshToken, userInfo } = authData;
      const primaryRole = userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, primaryRole);
      if (refreshToken) {
        localStorage.setItem('mua_refresh_token', refreshToken);
      }

      set({
        token: accessToken,
        user: userInfo,
        role: primaryRole,
        isAuthenticated: true,
        isLoading: false,
      });

      return { success: true, role: primaryRole };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('mua_refresh_token');
    try {
      await authService.logout(refreshToken);
    } catch {
      // Ignored if failed on server
    } finally {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_INFO);
      localStorage.removeItem(STORAGE_KEYS.USER_ROLE);
      localStorage.removeItem('mua_refresh_token');
      set({
        token: null,
        user: null,
        role: null,
        isAuthenticated: false,
        isLoading: false,
      });
      window.location.href = '/login';
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      set({ isAuthenticated: false, user: null, role: null });
      return false;
    }
    try {
      const res = await authService.getCurrentUser();
      const userInfo = res.data || res;
      const primaryRole = userInfo?.roles?.[0] || USER_ROLES.CUSTOMER;
      localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, primaryRole);
      set({
        user: userInfo,
        role: primaryRole,
        isAuthenticated: true,
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  setUser: (user) => {
    const primaryRole = user?.roles?.[0] || null;
    localStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(user));
    if (primaryRole) {
      localStorage.setItem(STORAGE_KEYS.USER_ROLE, primaryRole);
    }
    set({ user, role: primaryRole });
  },
}));
