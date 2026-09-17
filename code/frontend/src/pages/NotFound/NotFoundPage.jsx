import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { USER_ROLES } from '../../constants/roles.constant';

export const NotFoundPage = () => {
  const { isAuthenticated, role } = useAuth();

  const getBackDestination = () => {
    if (!isAuthenticated) {
      return { path: '/', label: 'Quay Về Trang Chủ' };
    }
    if (role === USER_ROLES.SUPER_ADMIN) {
      return { path: '/admin/dashboard', label: 'Quay Về Bảng Điều Khiển Super Admin' };
    }
    if (role === USER_ROLES.AGENCY_ADMIN) {
      return { path: '/agency/dashboard', label: 'Quay Về Bảng Điều Khiển Studio' };
    }
    return { path: '/', label: 'Quay Về Trang Chủ' };
  };

  const dest = getBackDestination();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-6 shadow-sm">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <p className="text-sm font-bold text-rose-600 tracking-wider uppercase">
        Lỗi 404 - Không Tìm Thấy Trang
      </p>

      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        Đường Dẫn Không Tồn Tại
      </h1>

      <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        Trang bạn đang tìm kiếm có thể đã bị di chuyển, xóa bỏ hoặc bạn chưa được phân quyền truy cập hợp lệ.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to={dest.path}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Home className="w-4 h-4" />
          <span>{dest.label}</span>
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200 shadow-xs transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay Lại Trang Trước</span>
        </button>
      </div>
    </div>
  );
};
