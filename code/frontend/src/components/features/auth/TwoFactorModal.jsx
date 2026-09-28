import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Mail, RefreshCw, KeyRound, ArrowRight, AlertCircle } from 'lucide-react';
import { Modal } from '../../base/Modal';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';

export const TwoFactorModal = ({
  isOpen,
  onClose,
  emailMasked,
  onVerify,
  onResend,
  isLoading,
  error,
}) => {
  const { t } = useI18nStore();
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const inputRef = useRef(null);

  // Focus input when modal opens & reset state
  useEffect(() => {
    if (isOpen) {
      setOtpCode('');
      setResendSuccess('');
      setCountdown(60);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen || countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleInputChange = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtpCode(val);
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (otpCode.length === 6 && !isLoading) {
      onVerify(otpCode);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    setResendSuccess('');
    try {
      await onResend();
      setCountdown(60);
      setResendSuccess(t('auth_2fa_resend_success'));
      setOtpCode('');
    } catch {
      // Error handled by parent or toast
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('auth_2fa_modal_title')}
      size="md"
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            {t('modal_cancel_btn')}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={otpCode.length !== 6 || isLoading}
            icon={ArrowRight}
            iconPosition="right"
            className="shadow-md shadow-rose-500/20 font-bold"
          >
            {t('auth_2fa_verify_btn')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Header Icon & Info */}
        <div className="flex flex-col items-center text-center pt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-rose-500/20 via-pink-500/15 to-amber-500/20 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3 shadow-inner">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
            {t('auth_2fa_modal_desc')}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
            <Mail className="w-3.5 h-3.5 text-rose-500" />
            <span>{emailMasked || '••••••••@••••.com'}</span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
            {(error.includes('hết hạn') || error.toLowerCase().includes('expired')) && (
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 underline font-bold hover:text-rose-800 dark:hover:text-rose-200 text-rose-600 dark:text-rose-400"
              >
                Đăng nhập lại
              </button>
            )}
          </div>
        )}

        {/* Resend Success Alert */}
        {resendSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{resendSuccess}</span>
          </div>
        )}

        {/* OTP Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2 text-center">
              {t('auth_2fa_otp_label')}
            </label>
            <div className="relative max-w-xs mx-auto">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={handleInputChange}
                placeholder="••••••"
                className="w-full text-center text-3xl font-mono font-black tracking-[0.4em] py-3.5 px-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 dark:focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center mt-1.5">
              {t('auth_2fa_otp_placeholder')} (6 số)
            </p>
          </div>

          {/* Resend Link & Countdown */}
          <div className="text-center pt-1">
            {countdown > 0 ? (
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {t('auth_2fa_resend_countdown')}{' '}
                <strong className="text-slate-600 dark:text-slate-300 font-mono">
                  {countdown}s
                </strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 hover:underline disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{t('auth_2fa_resend_btn')}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </Modal>
  );
};
