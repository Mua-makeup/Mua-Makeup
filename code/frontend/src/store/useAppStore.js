import { create } from 'zustand';

/**
 * Global App & Auth Store
 * Quản lý trạng thái toàn cục của ứng dụng (User session, Theme, Loading)
 */
export const useAppStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  theme: 'dark',

  setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
  logout: () => set({ user: null, isAuthenticated: false }),
  setTheme: (theme) => set({ theme }),
}));
