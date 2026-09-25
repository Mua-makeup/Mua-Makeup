import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useI18nStore } from '../store/useI18nStore';

export const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const showToast = useToastStore((state) => state.showToast);
  const { t } = useI18nStore();
  const location = useLocation();

  useEffect(() => {
    const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
    if (!isCheckingAuth && !isAuthenticated && !isLoggingOut) {
      const msg =
        t('auth_required_toast') ||
        'Bạn chưa đăng nhập hoặc không có token xác thực. Vui lòng đăng nhập để tiếp tục.';
      showToast(msg, 'error');
      sessionStorage.setItem(
        'auth_redirect_toast',
        JSON.stringify({
          message: msg,
          type: 'error',
        })
      );
    }
  }, [isCheckingAuth, isAuthenticated, showToast, t]);

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase">
            Đang xác thực...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const isLoggingOut = sessionStorage.getItem('is_logging_out') === 'true';
    if (isLoggingOut) {
      return <Navigate to="/login" replace />;
    }
    return <Navigate to="/login" state={{ from: location, reason: 'unauthorized' }} replace />;
  }

  return children;
};
