import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useI18nStore } from '../../store/useI18nStore';
import { USER_ROLES } from '../../constants/roles.constant';

export const NotFoundPage = () => {
  const { isAuthenticated, role } = useAuth();
  const { t } = useI18nStore();

  const getBackDestination = () => {
    if (!isAuthenticated) {
      return { path: '/', label: t('btn_back_home') };
    }
    if (role === USER_ROLES.SUPER_ADMIN) {
      return { path: '/admin/dashboard', label: t('btn_back_admin_dashboard') };
    }
    if (role === USER_ROLES.AGENCY_ADMIN) {
      return { path: '/agency/dashboard', label: t('btn_back_agency_dashboard') };
    }
    return { path: '/', label: t('btn_back_home') };
  };

  const dest = getBackDestination();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-6 shadow-sm">
        <ShieldAlert className="w-10 h-10" />
      </div>

      <p className="text-sm font-bold text-rose-600 tracking-wider uppercase">
        {t('error_404_title')}
      </p>

      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        404
      </h1>

      <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        {t('error_404_desc')}
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
          <span>{t('dt_prev_page')}</span>
        </button>
      </div>
    </div>
  );
};
