import { useAuthStore } from '../store/useAuthStore';
import { USER_ROLES } from '../constants/roles.constant';

export const useAuth = () => {
  const { user, token, role, isAuthenticated, isLoading, login, logout, checkAuth } =
    useAuthStore();

  const isSuperAdmin = role === USER_ROLES.SUPER_ADMIN;
  const isAgencyAdmin = role === USER_ROLES.AGENCY_ADMIN;

  return {
    user,
    token,
    role,
    isAuthenticated,
    isLoading,
    isSuperAdmin,
    isAgencyAdmin,
    login,
    logout,
    checkAuth,
  };
};
