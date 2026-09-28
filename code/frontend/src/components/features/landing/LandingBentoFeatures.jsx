import React, { useState } from 'react';
import {
  CalendarRange,
  AlertTriangle,
  QrCode,
  Copy,
  Check,
  Receipt,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingBentoFeatures = () => {
  const { t } = useI18nStore();
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText('https://muamakeup.vn/join?code=INV-STUDIO-8899');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section id="features" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <span>{t('landing_bento_badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_bento_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_bento_sub')}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Card 1: Shift Matrix with Conflict Shield (Span 7) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900/60">
                  <CalendarRange className="w-3.5 h-3.5" />
                  <span>{t('landing_feat_shift_badge')}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">
                  {t('landing_feat_shift_mock_safe')}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('landing_feat_shift_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-6">
                {t('landing_feat_shift_desc')}
              </p>
            </div>

            {/* Shift Matrix Mockup */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <div className="grid grid-cols-5 gap-2 text-center text-[11px] font-bold text-slate-500 pb-3 border-b border-slate-200/70 dark:border-slate-700/60">
                <span>{t('landing_feat_shift_mock_mon')}</span>
                <span>{t('landing_feat_shift_mock_tue')}</span>
                <span>{t('landing_feat_shift_mock_wed')}</span>
                <span>{t('landing_feat_shift_mock_thu')}</span>
                <span>{t('landing_feat_shift_mock_fri')}</span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-3">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left">
                  <span className="text-[9px] font-extrabold text-rose-600 block">08:00</span>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{t('landing_feat_shift_mock_bridal')}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Mai Linh</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left">
                  <span className="text-[9px] font-extrabold text-indigo-600 block">10:30</span>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{t('landing_feat_shift_mock_gala')}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Thanh Vân</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left">
                  <span className="text-[9px] font-extrabold text-amber-600 block">14:00</span>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{t('landing_feat_shift_mock_douyin')}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Hà My</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left">
                  <span className="text-[9px] font-extrabold text-emerald-600 block">09:00</span>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{t('landing_feat_shift_mock_prom')}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Mai Linh</span>
                </div>
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-left">
                  <span className="text-[9px] font-extrabold text-purple-600 block">18:00</span>
                  <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block truncate">{t('landing_feat_shift_mock_gala_vip')}</span>
                  <span className="text-[9px] text-slate-400 block truncate">Lan Anh</span>
                </div>
              </div>

              {/* Conflict Alert Banner */}
              <div className="mt-3.5 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <span className="font-bold text-rose-700 dark:text-rose-400 block">
                    {t('landing_feat_shift_mock_conflict_badge')}
                  </span>
                  <span className="text-rose-600/90 dark:text-rose-300">
                    {t('landing_feat_shift_mock_conflict_desc')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: 72-Hour QR Recruitment (Span 5) */}
          <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-900/60">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>{t('landing_feat_qr_badge')}</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300">
                  {t('landing_feat_qr_mock_timer')}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('landing_feat_qr_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-5">
                {t('landing_feat_qr_desc')}
              </p>
            </div>

            {/* QR Mockup */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
              <div className="w-24 h-24 rounded-xl bg-white p-2 border border-slate-200 flex items-center justify-center shrink-0 shadow-xs">
                {/* Visual SVG QR representation */}
                <svg className="w-full h-full text-slate-900" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14 0h4v4h-4v-4zm-4 4h4v4h-4v-4zm0-4h4v-4h-4v4zm4-4h4v4h-4v-4zM6 6h4v4H6V6zm10 0h4v4h-4V6zM6 18h4v4H6v-4z" />
                </svg>
              </div>

              <div className="flex-1 space-y-2 w-full">
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                  {t('landing_feat_qr_mock_code')}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                  {t('landing_feat_qr_mock_scan_hint')}
                </span>

                <button
                  onClick={handleCopyInvite}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('landing_feat_qr_mock_copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>{t('landing_feat_qr_mock_copy')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Card 3: Transparent Pricing & Surcharges (Span 6) */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-900/60">
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t('landing_feat_pricing_badge')}</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('landing_feat_pricing_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-5">
                {t('landing_feat_pricing_desc')}
              </p>
            </div>

            {/* Pricing Receipt Mockup */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {t('landing_feat_pricing_mock_base')}
                </span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {t('landing_feat_pricing_mock_base_price')}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{t('landing_feat_pricing_mock_km')}</span>
                <span className="font-semibold">{t('landing_feat_pricing_mock_km_price')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>{t('landing_feat_pricing_mock_early')}</span>
                <span className="font-semibold">{t('landing_feat_pricing_mock_early_price')}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm">
                <span className="font-bold text-slate-900 dark:text-white">
                  {t('landing_feat_pricing_mock_total')}
                </span>
                <span className="font-extrabold text-rose-600 dark:text-rose-400">
                  {t('landing_feat_pricing_mock_total_price')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Credential Verification & Quality Audits (Span 6) */}
          <div className="lg:col-span-6 p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/60">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t('landing_feat_cert_badge')}</span>
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2">
                {t('landing_feat_cert_title')}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal mb-5">
                {t('landing_feat_cert_desc')}
              </p>
            </div>

            {/* Artist Credential Badge Mockup */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('landing_feat_cert_mock_status')}
                  </span>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block mt-0.5">
                    {t('landing_feat_cert_mock_exp')}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {t('landing_feat_cert_mock_specialty')}
                  </span>
                </div>
              </div>

              <div className="hidden sm:block text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('landing_feat_cert_mock_audit')}
                </span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('landing_feat_cert_mock_official')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
