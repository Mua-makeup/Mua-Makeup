import React, { createContext, useContext, useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';

const AppContext = createContext(null);

/**
 * AppProvider - Bọc các context / global providers cho toàn ứng dụng
 */
export const AppProvider = ({ children }) => {
  const { user, isAuthenticated, theme } = useAppStore();

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      theme,
    }),
    [user, isAuthenticated, theme],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
