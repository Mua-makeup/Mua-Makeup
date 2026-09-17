import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldX, Home } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { USER_ROLES } from '../constants/roles.constant';
import { Button } from '../components/base/Button';

export const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const role = useAuthStore((state) => state.role);

  const hasAccess = allowedRoles.includes(role);

  if (!hasAccess) {
    const targetDashboard =
      role === USER_ROLES.SUPER_ADMIN
        ? '/admin/dashboard'
        : role === USER_ROLES.AGENCY_ADMIN
        ? '/agency/dashboard'
        : '/';

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          403 - Quyền Truy Cập Bị Từ Chối
        </h2>
        <p className="mt-2 text-xs text-slate-500 max-w-md">
          Tài khoản của bạn ({role || 'Không xác định'}) không có quyền truy cập vào phân hệ này.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link to={targetDashboard}>
            <Button variant="primary" size="md" icon={Home}>
              Quay Về Phân Hệ Của Bạn
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary" size="md">
              Đổi Tài Khoản Khác
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return children;
};
