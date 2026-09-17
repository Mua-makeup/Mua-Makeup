import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Award,
  Layers,
  Building2,
  Package,
  Clock,
  Users,
  CalendarDays,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../constants/roles.constant';
import { useI18nStore } from '../store/useI18nStore';

export const Sidebar = ({ isMobileOpen, onCloseMobile }) => {
  const { role } = useAuth();
  const { t } = useI18nStore();

  const superAdminNav = [
    {
      to: '/admin/dashboard',
      label: t('nav_admin_dashboard'),
      icon: LayoutDashboard,
    },
    {
      to: '/admin/muas/credentials',
      label: t('nav_admin_credentials'),
      icon: Award,
    },
    {
      to: '/admin/taxonomy',
      label: t('nav_admin_taxonomy'),
      icon: Layers,
    },
  ];

  const agencyAdminNav = [
    {
      to: '/agency/dashboard',
      label: t('nav_agency_dashboard'),
      icon: LayoutDashboard,
    },
    {
      to: '/agency/profile',
      label: t('nav_agency_profile'),
      icon: Building2,
    },
    {
      to: '/agency/packages',
      label: t('nav_agency_packages'),
      icon: Package,
    },
    {
      to: '/agency/surcharges',
      label: t('nav_agency_surcharges'),
      icon: Clock,
    },
    {
      to: '/agency/staff',
      label: t('nav_agency_staff'),
      icon: Users,
    },
    {
      to: '/agency/shifts',
      label: t('nav_agency_shifts'),
      icon: CalendarDays,
    },
  ];

  const navItems = role === USER_ROLES.SUPER_ADMIN ? superAdminNav : agencyAdminNav;

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-colors">
      <div className="p-4 space-y-1">
        <div className="flex items-center justify-between lg:hidden pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-800 dark:text-white">
            {t('app_title')} Menu
          </span>
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="px-3 py-2 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {role === USER_ROLES.SUPER_ADMIN
            ? t('portal_admin_title')
            : t('portal_agency_title')}
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-[11px] text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-700 dark:text-slate-300">
          {t('app_title')} {t('platform_version')}
        </p>
        <p className="text-slate-400 font-mono text-[10px] mt-0.5">
          {t('core_status')}
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 min-h-[calc(100vh-64px)] flex-shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="fixed inset-y-0 left-0 w-64 max-w-full shadow-2xl z-50">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
