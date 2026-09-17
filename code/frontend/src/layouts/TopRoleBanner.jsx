import React, { useState } from 'react';
import {
  LogOut,
  Key,
  User,
  Shield,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { USER_ROLES } from '../constants/roles.constant';
import { Modal } from '../components/base/Modal';
import { Input } from '../components/base/Input';
import { Button } from '../components/base/Button';
import { authService } from '../services/auth.service';
import { agencyService } from '../services/agency.service';
import { changePasswordSchema } from '../schemas/auth.schema';
import { useI18nStore } from '../store/useI18nStore';
import { useThemeStore } from '../store/useThemeStore';

export const TopRoleBanner = ({ onToggleMobileSidebar, isMobileSidebarOpen }) => {
  const { user, role, logout } = useAuth();
  const { language, toggleLanguage, t } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();

  const [agencyLogo, setAgencyLogo] = useState(null);
  const [isAgencyVerified, setIsAgencyVerified] = useState(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      setPasswordError(validation.error.errors[0]?.message || 'Dữ liệu không hợp lệ');
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
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs transition-colors">
        {/* Left: Mobile hamburger + Brand */}
        <div className="flex items-center gap-3">
          {onToggleMobileSidebar && (
            <button
              onClick={onToggleMobileSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
              title="Menu"
            >
              {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-rose-400 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white tracking-tight text-sm sm:text-base">
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
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {roleInfo.title}
            </p>
          </div>
        </div>

        {/* Right: Controls & User Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher Button */}
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition-colors"
            title="Đổi ngôn ngữ (Switch Language)"
          >
            <Globe className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Dark / Light Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={theme === 'dark' ? 'Chế độ Sáng (Light Mode)' : 'Chế độ Tối (Dark Mode)'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* User Capsule */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {user?.avatarUrl || agencyLogo ? (
              <img
                src={user?.avatarUrl || agencyLogo}
                alt="Avatar"
                className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                <User className="w-4 h-4" />
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {user?.fullName || user?.email || 'Admin'}
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                {user?.phoneNumber || user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title={t('change_password')}
          >
            <Key className="w-4 h-4" />
          </button>

          <button
            onClick={logout}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
            title={t('logout')}
          >
            <LogOut className="w-4 h-4" />
          </button>
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
            label="Mật khẩu hiện tại"
            type="password"
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Tối thiểu 6 ký tự"
          />
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu mới"
          />
          <div className="pt-2 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsPasswordModalOpen(false)}
              disabled={isLoading}
            >
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" isLoading={isLoading}>
              {t('save')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};
