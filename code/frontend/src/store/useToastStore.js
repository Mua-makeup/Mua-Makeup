import { create } from 'zustand';

/**
 * Global Toast Notification Store
 * Manages transient toast alerts across the entire SPA
 */
export const useToastStore = create((set) => ({
  toast: null, // { message: string, type: 'success' | 'error' | 'info', duration: number, id: number }

  showToast: (message, type = 'error', duration = 4000) => {
    if (!message) return;
    set({
      toast: {
        message,
        type,
        duration,
        id: Date.now(),
      },
    });
  },

  hideToast: () => set({ toast: null }),
}));
