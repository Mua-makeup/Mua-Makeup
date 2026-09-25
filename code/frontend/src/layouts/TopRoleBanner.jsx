import React, { useState, useRef, useEffect } from 'react';
import {
  LogOut,
  Key,
  User,
  Shield,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../constants/roles.constant';
import { Modal } from '../components/base/Modal';
import { ConfirmDialog } from '../components/base/ConfirmDialog';
import { Input } from '../components/base/Input';
import { Button } from '../components/base/Button';
import { authService } from '../services/auth.service';
import { agencyService } from '../services/agency.service';
import { changePasswordSchema } from '../schemas/auth.schema';
import { useI18nStore } from '../store/useI18nStore';
import { useThemeStore } from '../store/useThemeStore';
import { NotificationDropdown } from '../components/features/notification/NotificationDropdown';
import { AgencyProfileCommissionModal } from '../components/features/agency/AgencyProfileCommissionModal';
import { AdminProfileModal } from '../components/features/admin/AdminProfileModal';

export const TopRoleBanner = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, role, logout } = useAuth();
  const { language, toggleLanguage, t } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();

  const [agencyLogo, setAgencyLogo] = useState(null);
  const [isAgencyVerified, setIsAgencyVerified] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAdminProfileModalOpen, setIsAdminProfileModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (role === USER_ROLES.AGENCY_ADMIN) {
      agencyService
        .getMyProfile()
        .then((res) => {
          const p = res?.data || res;
          if (p?.logoUrl) {
            setAgencyLogo(p.logoUrl);
          }
          if (p && typeof p.isVerified === 'boolean') {
            setIsAgencyVerified(p.isVerified);
          }
        })
        .catch(() => {});
    }

    const handleProfileUpdated = (e) => {
      const updated = e.detail;
      if (updated?.logoUrl) {
        setAgencyLogo(updated.logoUrl);
      }
      if (updated && typeof updated.isVerified === 'boolean') {
        setIsAgencyVerified(updated.isVerified);
      }
    };

    window.addEventListener('agency-profile-updated', handleProfileUpdated);
    return () => window.removeEventListener('agency-profile-updated', handleProfileUpdated);
  }, [role, user?.avatarUrl]);

  const getRoleLabel = () => {
    switch (role) {
      case USER_ROLES.SUPER_ADMIN:
        return {
          title: t('portal_admin_title'),
          badge: t('role_super_admin'),
          color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
        };
      case USER_ROLES.AGENCY_ADMIN:
        return {
          title: t('portal_agency_title'),
          badge: t('role_agency_admin'),
          color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
        };
      default:
        return {
          title: 'Makeup Platform',
          badge: 'User',
          color: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        };
    }
  };

  const roleInfo = getRoleLabel();

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    const validation = changePasswordSchema.safeParse({
      oldPassword,
      newPassword,
      confirmPassword,
    });

    if (!validation.success) {
      setPasswordError(validation.error.errors[0]?.message || t('invalid_data'));
      return;
    }

    setIsLoading(true);
    try {
      await authService.changePassword({ oldPassword, newPassword });
      setPasswordSuccess(t('save_success'));
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess('');
      }, 1500);
    } catch (err) {
      setPasswordError(err.message || t('error_general'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-[1100] shadow-xs transition-colors">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              title={t('menu')}
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          {/* Brand Logo / Avatar */}
          {agencyLogo || user?.avatarUrl ? (
            <img
              src={agencyLogo || user?.avatarUrl}
              alt="Avatar"
              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm flex-shrink-0"
            />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
              {role === USER_ROLES.AGENCY_ADMIN ? (
                <Building2 className="w-5 h-5" />
              ) : (
                <Shield className="w-5 h-5" />
              )}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[200px] md:max-w-none">
                {t('app_title')}
              </span>
              <span
                className={`hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${roleInfo.color}`}
              >
                {roleInfo.badge}
              </span>
              {role === USER_ROLES.AGENCY_ADMIN && isAgencyVerified === false && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  {t('status_pending')}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[110px] xs:max-w-[150px] sm:max-w-[220px] md:max-w-none">
              {roleInfo.title}
            </p>
          </div>
        </div>

        {/* Right: Controls & User Info */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Notification Bell Dropdown (Shown for Agency Admin & Super Admin) */}
          {(role === USER_ROLES.AGENCY_ADMIN || role === USER_ROLES.SUPER_ADMIN) && (
            <NotificationDropdown agencyLogo={role === USER_ROLES.AGENCY_ADMIN ? agencyLogo : null} />
          )}

          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors shrink-0"
            title={t('switch_language')}
          >
            <Globe className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="text-[11px] sm:text-xs">{language.toUpperCase()}</span>
          </button>

          {/* Dark / Light Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shrink-0"
            title={theme === 'dark' ? t('theme_light') : t('theme_dark')}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 shrink-0" />
            )}
          </button>

          {/* User Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 md:px-3 md:py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            >
              {agencyLogo || user?.avatarUrl ? (
                <img
                  src={agencyLogo || user?.avatarUrl}
                  alt="Avatar"
                  className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="text-left hidden md:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {user?.fullName || user?.email || 'Admin'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                  {user?.phoneNumber || user?.email}
                </p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 hidden md:block ${
                  isDropdownOpen ? 'rotate-180 text-rose-500' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu Popover */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 sm:w-60 max-w-[calc(100vw-24px)] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-[1200] animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {user?.fullName || 'Admin User'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate mt-0.5">
                    {user?.email || user?.phoneNumber}
                  </p>
                  <div className="mt-2">
                    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40">
                      {roleInfo.badge}
                    </span>
                  </div>
                </div>

                {/* Dropdown Actions */}
                <div className="py-1">
                  {role === USER_ROLES.SUPER_ADMIN && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsAdminProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left"
                    >
                      <User className="w-4 h-4 text-rose-500" />
                      <span>{t('menu_admin_profile')}</span>
                    </button>
                  )}

                  {role === USER_ROLES.AGENCY_ADMIN && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsProfileModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-colors text-left"
                    >
                      <Building2 className="w-4 h-4 text-rose-500" />
                      <span>{t('menu_agency_profile_commission')}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 transition-colors text-left"
                  >
                    <Key className="w-4 h-4 text-slate-400" />
                    <span>{t('change_password')}</span>
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsLogoutConfirmOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('logout')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Modal Đổi mật khẩu */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        title={
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Shield className="w-5 h-5 text-rose-600" />
            <span>{t('change_password')}</span>
          </div>
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs rounded-lg">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-lg">
              {passwordSuccess}
            </div>
          )}
          <Input
            label={t('field_current_password')}
            type="password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label={t('field_new_password')}
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('pwd_min_chars_hint')}
          />
          <Input
            label={t('field_confirm_new_password')}
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('pwd_reenter_hint')}
          />
          <div className="pt-3 grid grid-cols-3 gap-3">
            <Button
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isLoading}
              className="col-span-1 w-full"
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading} className="col-span-2 w-full">
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Logout Dialog */}
      <ConfirmDialog
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          logout();
        }}
        title={t('logout_confirm_title')}
        message={t('logout_confirm_desc')}
        confirmText={t('logout')}
        cancelText={t('cancel')}
        isDangerous={true}
        variant="danger"
      />

      {/* Modal Chỉnh Sửa Hồ Sơ & Avatar cho Super Admin */}
      {role === USER_ROLES.SUPER_ADMIN && (
        <AdminProfileModal
          isOpen={isAdminProfileModalOpen}
          onClose={() => setIsAdminProfileModalOpen(false)}
        />
      )}

      {/* Modal Chỉnh Sửa Hồ Sơ & Hoa Hồng Studio cho Agency Admin */}
      {role === USER_ROLES.AGENCY_ADMIN && (
        <AgencyProfileCommissionModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          onUpdated={(updated) => {
            if (updated?.logoUrl) {
              setAgencyLogo(updated.logoUrl);
            }
          }}
        />
      )}
    </>
  );
};
