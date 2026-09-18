import React, { useEffect } from 'react';
import { AppRoutes } from './routes';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return <AppRoutes />;
}
