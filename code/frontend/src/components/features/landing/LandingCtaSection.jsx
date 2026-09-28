import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Sparkles } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingCtaSection = () => {
  const { t } = useI18nStore();

  return (
    <section className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-rose-50/90 via-white to-pink-50/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 dark:bg-slate-900 border border-rose-200/80 dark:border-slate-800 text-slate-900 dark:text-white text-center relative overflow-hidden shadow-xl shadow-rose-500/5 dark:shadow-none transition-colors">
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 blur-3xl pointer-events-none rounded-full" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-rose-600 dark:text-rose-400 shadow-xs">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('landing_cta_badge')}</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-snug text-slate-900 dark:text-white">
              {t('landing_cta_title')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              {t('landing_cta_desc')}
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full">
              <Link
                to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-600/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>{t('landing_cta_btn_register')}</span>
              </Link>

              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-xs sm:text-sm border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 shadow-xs transition-all hover:scale-102 active:scale-98"
              >
                <span>{t('landing_cta_btn_login')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
