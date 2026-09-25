import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  ShieldAlert,
  ArrowRight,
  Home,
  RotateCcw,
  LogOut,
  User,
  Sun,
  Moon,
  Globe,
  Clock,
  Smartphone,
  Download,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useI18nStore } from '../../store/useI18nStore';
import { useThemeStore } from '../../store/useThemeStore';
import { agencyService } from '../../services/agency.service';
import { USER_ROLES } from '../../constants/roles.constant';
import { Button } from '../../components/base/Button';

export const JoinAgencyPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language, toggleLanguage } = useI18nStore();
  const { theme, toggleTheme } = useThemeStore();

  const isDark = theme === 'dark';
  const inviteCode = searchParams.get('code')?.trim() || '';

  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const logout = useAuthStore((state) => state.logout);

  const [status, setStatus] = useState('idle'); // 'idle' | 'submitting' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [studioInfo, setStudioInfo] = useState(null);
  const [isLoadingStudio, setIsLoadingStudio] = useState(false);
  const hasSubmittedRef = useRef(false);

  // Lấy thông tin công khai của Studio (bao gồm avatar/logo của Studio) theo mã mời
  useEffect(() => {
    if (!inviteCode) {
      setStudioInfo(null);
      return;
    }

    let isMounted = true;
    setIsLoadingStudio(true);

    agencyService
      .getPublicInvitationInfo(inviteCode)
      .then((res) => {
        if (isMounted) {
          const data = res?.data || res;
          setStudioInfo(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load public studio info for invite code:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingStudio(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [inviteCode]);

  const submitApplication = useCallback(async () => {
    if (!inviteCode || hasSubmittedRef.current) return;
    hasSubmittedRef.current = true;
    setStatus('submitting');
    setErrorMessage('');

    try {
      await agencyService.acceptInvitation({ inviteCode });
      setStatus('success');
    } catch (err) {
      const errCode = err.response?.data?.errorCode;
      const msg = err.response?.data?.message || err.message || t('error_general');

      if (
        errCode === 'ERR_STAFF_APPLICATION_PENDING' ||
        msg.toLowerCase().includes('đang chờ') ||
        msg.toLowerCase().includes('pending')
      ) {
        setStatus('pending');
        setErrorMessage(msg);
      } else {
        setStatus('error');
        setErrorMessage(msg);
      }
    }
  }, [inviteCode, t]);

  useEffect(() => {
    if (isCheckingAuth) return;

    if (!inviteCode) {
      return;
    }

    if (isAuthenticated && role === USER_ROLES.FREELANCE_MUA && status === 'idle' && !hasSubmittedRef.current) {
      submitApplication();
    }
  }, [isCheckingAuth, isAuthenticated, role, status, inviteCode, submitApplication]);

  const handleRetry = () => {
    hasSubmittedRef.current = false;
    submitApplication();
  };

  const handleGoLogin = () => {
    const redirectUrl = `/join?code=${encodeURIComponent(inviteCode)}`;
    navigate(`/login?redirect=${encodeURIComponent(redirectUrl)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50/80 via-white to-pink-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-rose-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Top Right Controls: Theme & Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className={`flex items-center justify-center w-9 h-9 rounded-xl border transition-all active:scale-95 cursor-pointer shadow-xs ${
            isDark
              ? 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-amber-400'
              : 'border-rose-200/80 bg-white/90 hover:bg-rose-50 text-slate-600'
          }`}
          title={isDark ? t('switch_theme_light') : t('switch_theme_dark')}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language Switcher Button */}
        <button
          onClick={toggleLanguage}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
            isDark
              ? 'border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-200'
              : 'border-rose-200/80 bg-white/90 hover:bg-rose-50 text-slate-700'
          }`}
          title={t('switch_language')}
        >
          <Globe className="w-3.5 h-3.5 text-rose-500" />
          <span>{language.toUpperCase()}</span>
        </button>
      </div>

      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-400/10 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-400/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header: Hiển thị Logo của chính Studio được mời (không lấy avatar của admin) */}
      <div className="mb-6 flex flex-col items-center text-center z-10">
        {isLoadingStudio ? (
          <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-slate-800 flex items-center justify-center mb-3 animate-pulse border border-rose-200 dark:border-slate-700">
            <Loader2 className="w-6 h-6 text-rose-500 animate-spin" />
          </div>
        ) : studioInfo?.logoUrl ? (
          <img
            src={studioInfo.logoUrl}
            alt={studioInfo.agencyName || 'Studio Logo'}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-300 dark:border-rose-500/40 shadow-lg shadow-rose-500/20 mb-3"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/20 mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[14px] flex items-center justify-center transition-colors">
              <Building2 className="w-8 h-8 text-rose-500 dark:text-rose-400" />
            </div>
          </div>
        )}
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white text-center">
          {studioInfo?.agencyName || 'MUA MAKEUP PLATFORM'}
        </h1>
        <div className="mt-1.5 flex items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 shadow-xs">
            Studio Invite
          </span>
        </div>
      </div>

      {/* Main Container Card */}
      <div className="w-full max-w-lg bg-white/95 dark:bg-slate-900/85 backdrop-blur-xl border border-rose-100 dark:border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl shadow-rose-200/50 dark:shadow-slate-950/70 z-10 relative transition-colors duration-300">
        {/* Case 1: Checking Auth State */}
        {isCheckingAuth && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {language === 'vi' ? 'Đang kiểm tra phiên đăng nhập...' : 'Checking authentication session...'}
            </p>
          </div>
        )}

        {/* Case 2: Missing Invite Code */}
        {!isCheckingAuth && !inviteCode && (
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('join_code_missing_title')}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">{t('join_code_missing_desc')}</p>
            </div>
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4" />
                {t('join_btn_home')}
              </Button>
            </div>
          </div>
        )}

        {/* Case 3: Not Authenticated */}
        {!isCheckingAuth && inviteCode && !isAuthenticated && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 dark:text-rose-400">
                <Building2 className="w-7 h-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('join_agency_title')}</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{t('join_login_required_desc')}</p>
            </div>

            {/* Invite Code Box */}
            <div className="p-4 bg-rose-50/70 dark:bg-slate-950/70 border border-rose-200/80 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                {t('join_invite_code_label')}
              </span>
              <span className="font-mono text-xl font-extrabold text-rose-600 dark:text-rose-400 tracking-wider">
                {inviteCode}
              </span>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                className="w-full justify-center gap-2 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-semibold py-2.5 shadow-lg shadow-rose-500/25"
                onClick={handleGoLogin}
              >
                <User className="w-4 h-4" />
                {t('join_btn_login')}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                className="w-full justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4" />
                {t('join_btn_home')}
              </Button>
            </div>
          </div>
        )}

        {/* Case 4: Authenticated with Wrong Role */}
        {!isCheckingAuth && inviteCode && isAuthenticated && role !== USER_ROLES.FREELANCE_MUA && (
          <div className="space-y-6 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('join_role_invalid_title')}</h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('join_role_invalid_desc')}
              </p>
            </div>

            <div className="p-3 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              {language === 'vi' ? 'Tài khoản hiện tại:' : 'Current Account:'}{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{user?.fullName || user?.email}</span> (
              <span className="text-amber-600 dark:text-amber-400 font-mono">{role}</span>)
            </div>

            {studioInfo?.agencyName && (
              <div className="p-3 bg-rose-50/70 dark:bg-slate-950/70 rounded-xl border border-rose-200/80 dark:border-slate-800 text-xs flex items-center justify-center gap-2">
                {studioInfo.logoUrl ? (
                  <img
                    src={studioInfo.logoUrl}
                    alt={studioInfo.agencyName}
                    className="w-5 h-5 rounded-md object-cover"
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-rose-500" />
                )}
                <span className="text-slate-600 dark:text-slate-300">
                  {language === 'vi' ? 'Studio gửi mã mời:' : 'Inviting Studio:'}{' '}
                  <span className="font-bold text-rose-600 dark:text-rose-400">{studioInfo.agencyName}</span>
                </span>
              </div>
            )}

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={logout}
              >
                <LogOut className="w-4 h-4" />
                {t('join_btn_logout')}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4" />
                {t('join_btn_home')}
              </Button>
            </div>
          </div>
        )}

        {/* Case 5: Authenticated as MUA - Submitting / Success / Error */}
        {!isCheckingAuth && inviteCode && isAuthenticated && role === USER_ROLES.FREELANCE_MUA && (
          <div className="space-y-6 text-center">
            {/* 5A. Submitting */}
            {status === 'submitting' && (
              <div className="py-6 space-y-4">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-rose-500/20 border-t-rose-500 animate-spin" />
                  <Building2 className="w-7 h-7 text-rose-500 dark:text-rose-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('join_submitting')}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    {t('join_submitting_desc')}
                  </p>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-slate-950/60 rounded-xl border border-rose-200/80 dark:border-slate-800 inline-block font-mono text-xs text-rose-600 dark:text-rose-300">
                  {inviteCode}
                </div>
              </div>
            )}

            {/* 5B. Success */}
            {status === 'success' && (
              <div className="py-2 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shadow-lg shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('join_success_title')}</h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    {t('join_success_desc')}
                  </p>
                </div>

                {/* Application Snapshot */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl text-left space-y-2 text-xs">
                  {studioInfo?.agencyName && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">
                        {language === 'vi' ? 'Studio tuyển dụng:' : 'Studio:'}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {studioInfo.logoUrl && (
                          <img src={studioInfo.logoUrl} alt="" className="w-4 h-4 rounded-md object-cover" />
                        )}
                        <span>{studioInfo.agencyName}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('join_invite_code_label')}</span>
                    <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{inviteCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('join_applicant_info')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{user?.fullName || user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">
                      {language === 'vi' ? 'Trạng Thái:' : 'Status:'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30">
                      {language === 'vi' ? 'Chờ Xét Duyệt (PENDING)' : 'Pending Review (PENDING)'}
                    </span>
                  </div>
                </div>

                {/* Next Steps Timeline */}
                <div className="p-4 rounded-2xl bg-rose-50/50 dark:bg-slate-950/60 border border-rose-100 dark:border-slate-800 text-left space-y-3">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    <span>{t('join_timeline_title')}</span>
                  </h4>

                  <div className="space-y-3 text-xs">
                    {/* Step 1 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{t('join_timeline_step1_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('join_timeline_step1_desc')}</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{t('join_timeline_step2_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('join_timeline_step2_desc')}</p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Smartphone className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{t('join_timeline_step3_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{t('join_timeline_step3_desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* App Download / Home Actions */}
                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Smartphone className="w-4 h-4 text-rose-500" />
                      <span>{t('join_btn_download_app')}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                      <Download className="w-3 h-3" />
                      iOS / Android
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4" />
                    {t('join_btn_home')}
                  </Button>
                </div>
              </div>
            )}

            {/* 5C. Already Applied - Pending Studio Review */}
            {status === 'pending' && (
              <div className="py-2 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400 shadow-lg shadow-amber-500/20">
                  <Clock className="w-9 h-9 animate-pulse" />
                </div>
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    <span>{t('join_pending_status_badge')}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {t('join_pending_title')}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
                    {errorMessage || t('join_pending_desc')}
                  </p>
                </div>

                {/* Application Snapshot */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/70 border border-amber-200 dark:border-amber-500/30 rounded-2xl text-left space-y-2 text-xs">
                  {studioInfo?.agencyName && (
                    <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">
                        {language === 'vi' ? 'Studio tuyển dụng:' : 'Studio:'}
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {studioInfo.logoUrl && (
                          <img src={studioInfo.logoUrl} alt="" className="w-4 h-4 rounded-md object-cover" />
                        )}
                        <span>{studioInfo.agencyName}</span>
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('join_invite_code_label')}</span>
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{inviteCode}</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">{t('join_applicant_info')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{user?.fullName || user?.email}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 dark:text-slate-400">{t('status')}</span>
                    <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {t('join_pending_status_badge')}
                    </span>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-left space-y-3">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    {t('join_timeline_title')}
                  </p>
                  <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-amber-200 dark:before:bg-amber-800/50">
                    {/* Step 1: Sent */}
                    <div className="flex items-start gap-3 relative z-1">
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t('join_timeline_step1_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('join_timeline_step1_desc')}</p>
                      </div>
                    </div>
                    {/* Step 2: Under Review */}
                    <div className="flex items-start gap-3 relative z-1">
                      <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Clock className="w-3.5 h-3.5 animate-spin" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{t('join_timeline_step2_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('join_timeline_step2_desc')}</p>
                      </div>
                    </div>
                    {/* Step 3: Notification */}
                    <div className="flex items-start gap-3 relative z-1 opacity-60">
                      <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center shrink-0 text-xs font-bold">
                        3
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{t('join_timeline_step3_title')}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{t('join_timeline_step3_desc')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* App Download / Home Actions */}
                <div className="space-y-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                      <Smartphone className="w-4 h-4 text-rose-500" />
                      <span>{t('join_btn_download_app')}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500 text-white flex items-center gap-1 shadow-xs">
                      <Download className="w-3 h-3" />
                      iOS / Android
                    </span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4" />
                    {t('join_pending_btn_home')}
                  </Button>
                </div>
              </div>
            )}

            {/* 5D. Error */}
            {status === 'error' && (
              <div className="py-2 space-y-5">
                <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shadow-lg shadow-rose-500/20">
                  <XCircle className="w-9 h-9" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{t('join_error_title')}</h2>
                  <div className="p-3.5 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium">
                    {errorMessage}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 justify-center gap-2 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={handleRetry}
                  >
                    <RotateCcw className="w-4 h-4" />
                    {t('join_btn_retry')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    onClick={() => navigate('/')}
                  >
                    <Home className="w-4 h-4" />
                    {t('join_btn_home')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub Footer Info */}
      <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 z-10 transition-colors">
        &copy; 2026 MUA Makeup Platform • Professional Beauty Ecosystem
      </div>
    </div>
  );
};
