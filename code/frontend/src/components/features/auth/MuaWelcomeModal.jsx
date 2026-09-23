import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Smartphone,
  Zap,
  Navigation,
  Wallet,
  ArrowRight,
  LogOut,
  Building2,
  X,
  QrCode,
  Download,
} from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';
import { Button } from '../../base/Button';

export const MuaWelcomeModal = ({ isOpen, onClose, user, onLogout }) => {
  const navigate = useNavigate();
  const { t } = useI18nStore();
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  if (!isOpen) return null;

  const handleJoinStudio = (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;
    navigate(`/join?code=${encodeURIComponent(inviteCodeInput.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl border border-rose-100 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors duration-300">
        {/* Header with decorative gradient banner */}
        <div className="relative bg-gradient-to-r from-rose-500 via-pink-600 to-amber-500 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white/90 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner">
            <Smartphone className="w-7 h-7 text-white" />
          </div>

          <h3 className="text-xl font-bold tracking-tight">
            {t('mua_modal_welcome_title')}
            {user?.fullName ? `, ${user.fullName}!` : '!'}
          </h3>
          <p className="mt-1.5 text-xs text-white/90 max-w-md mx-auto leading-relaxed">
            {t('mua_modal_welcome_sub')}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Key Mobile Features */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
              {t('mua_modal_features_title')}
            </h4>
            <div className="grid grid-cols-1 gap-2.5">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/70 dark:bg-slate-800/60 border border-rose-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs">
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span className="font-medium leading-snug">{t('mua_modal_feature_1')}</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/70 dark:bg-slate-800/60 border border-amber-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Navigation className="w-4 h-4" />
                </div>
                <span className="font-medium leading-snug">{t('mua_modal_feature_2')}</span>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-slate-800/60 border border-emerald-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="font-medium leading-snug">{t('mua_modal_feature_3')}</span>
              </div>
            </div>
          </div>

          {/* Quick Action: Enter Studio Invite Code */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-200/80 dark:border-rose-900/40 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Building2 className="w-4 h-4 text-rose-500" />
              <span>{t('mua_modal_have_invite_code')}</span>
            </div>
            <form onSubmit={handleJoinStudio} className="flex gap-2">
              <input
                type="text"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value)}
                placeholder={t('mua_modal_enter_code_ph')}
                className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              />
              <Button
                type="submit"
                variant="primary"
                className="px-4 py-2 text-xs bg-rose-500 hover:bg-rose-600 text-white font-semibold rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-500/20"
              >
                <span>{t('mua_modal_btn_join')}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>

          {/* Mobile App Download Teaser */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('mua_modal_download_title')}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('mua_modal_download_sub')}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Download className="w-3 h-3" />
              iOS & Android
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3">
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('mua_modal_btn_logout')}</span>
          </button>

          <Button
            variant="outline"
            className="px-4 py-2 text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={onClose}
          >
            {t('mua_modal_btn_stay')}
          </Button>
        </div>
      </div>
    </div>
  );
};
