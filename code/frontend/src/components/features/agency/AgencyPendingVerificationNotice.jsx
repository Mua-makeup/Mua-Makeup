import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, CheckCircle2, ArrowRight, RefreshCw, PhoneCall, Building2 } from 'lucide-react';
import { Button } from '../../base/Button';
import { useI18nStore } from '../../../store/useI18nStore';

export const AgencyPendingVerificationNotice = ({
  featureName,
  onRefresh,
  isLoading = false,
}) => {
  const navigate = useNavigate();
  const { t } = useI18nStore();

  return (
    <div className="bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-amber-950/10 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-6 sm:p-8 shadow-sm transition-all">
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        {/* Glowing Icon */}
        <div className="relative flex-shrink-0">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-inner">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 border-2 border-white dark:border-slate-900" />
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('pending_verification_title')}
              </h2>
              <span className="px-3 py-0.5 text-xs font-semibold rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                {t('pending_verification_badge')}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-3xl">
              {t('pending_verification_desc')} {featureName && <span className="font-semibold text-amber-900 dark:text-amber-200">({featureName})</span>}
            </p>
          </div>

          {/* Verification Timeline / Steps */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('pending_step_1_title')}</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                {t('pending_step_1_desc')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/5 border border-amber-300 dark:border-amber-700/80 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold">
                <Clock className="w-4 h-4 animate-spin text-amber-500" style={{ animationDuration: '4s' }} />
                <span>{t('pending_step_2_title')}</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                {t('pending_step_2_desc')}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/60 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-1.5 opacity-80">
              <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold">
                <Building2 className="w-4 h-4" />
                <span>{t('pending_step_3_title')}</span>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-normal">
                {t('pending_step_3_desc')}
              </p>
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="md"
              icon={ArrowRight}
              onClick={() => navigate('/agency/profile')}
              className="font-medium shadow-xs"
            >
              {t('btn_complete_profile')}
            </Button>

            {onRefresh && (
              <Button
                variant="secondary"
                size="md"
                icon={RefreshCw}
                isLoading={isLoading}
                onClick={onRefresh}
                className="font-medium"
              >
                {t('btn_recheck_status')}
              </Button>
            )}

            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 sm:ml-auto">
              <PhoneCall className="w-3.5 h-3.5 text-rose-500" />
              <span>{t('hotline_support')} <strong>1900 86288</strong></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
