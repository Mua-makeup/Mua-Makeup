import React, { useEffect } from 'react';
import { AppRoutes } from './routes';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const setCheckingDone = useAuthStore((state) => state.setCheckingDone);
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    // Apply class 'dark' len <html> ngay khi app khoi dong
    initTheme();

    // Chi goi /auth/me khi co flag session
    const hasSession = localStorage.getItem('mua_logged_in') === 'true';
    if (hasSession) {
      checkAuth();
    } else {
      setCheckingDone();
    }
  }, [initTheme, checkAuth, setCheckingDone]);

  return <AppRoutes />;
}
