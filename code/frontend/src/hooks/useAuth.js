import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';

/**
 * Custom Hook: useAuth
 * Hỗ trợ các thao tác xác thực người dùng
 */
export const useAuth = () => {
  const { user, isAuthenticated, setUser, logout } = useAppStore();

  const handleLogin = useCallback(
    (userData) => {
      setUser(userData);
    },
    [setUser],
  );

  return {
    user,
    isAuthenticated,
    login: handleLogin,
    logout,
  };
};
