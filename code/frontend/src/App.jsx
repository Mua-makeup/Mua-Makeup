import React, { useEffect } from 'react';
import { AppRoutes } from './routes';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { useToastStore } from './store/useToastStore';
import { Toast } from './components/base/Toast';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const setCheckingDone = useAuthStore((state) => state.setCheckingDone);
  const initTheme = useThemeStore((state) => state.initTheme);
  const toast = useToastStore((state) => state.toast);
  const hideToast = useToastStore((state) => state.hideToast);
  const showToast = useToastStore((state) => state.showToast);

  useEffect(() => {
    // Apply class 'dark' len <html> ngay khi app khoi dong
    initTheme();

    const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
    if (isLoggingOut) {
      sessionStorage.removeItem('auth_redirect_toast');
    } else {
      const savedRedirectToast = sessionStorage.getItem('auth_redirect_toast');
      if (savedRedirectToast) {
        try {
          const parsed = JSON.parse(savedRedirectToast);
          if (parsed?.message) {
            showToast(parsed.message, parsed.type || 'error');
          }
        } catch {
          showToast(savedRedirectToast, 'error');
        } finally {
          sessionStorage.removeItem('auth_redirect_toast');
        }
      }
    }

    // Chi goi /auth/me khi co flag session
    const hasSession = localStorage.getItem('mua_logged_in') === 'true';
    if (hasSession) {
      checkAuth();
    } else {
      setCheckingDone();
    }
  }, [initTheme, checkAuth, setCheckingDone, showToast]);

  return (
    <>
      <AppRoutes />
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={hideToast}
        />
      )}
    </>
  );
}
