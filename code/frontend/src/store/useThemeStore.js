import { create } from 'zustand';

const getInitialTheme = () => {
  // Luôn mặc định là 'light' nếu người dùng chưa chọn theme trước đó
  const saved = localStorage.getItem('mua_theme');
  return saved || 'light';
};

export const useThemeStore = create((set, get) => ({
  theme: getInitialTheme(),

  initTheme: () => {
    const current = get().theme;
    if (current === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },

  toggleTheme: () => {
    const current = get().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem('mua_theme', next);
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme: next });
  },
}));
