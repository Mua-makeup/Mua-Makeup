import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingFooter = () => {
  const { t } = useI18nStore();

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 py-10 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-7 h-7 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                {t('app_title')}
              </span>
            </Link>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">|</span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('landing_footer_rights')}
            </p>
          </div>

          {/* Quick Route Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Link to="/login" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              {t('landing_footer_login')}
            </Link>
            <Link to="/register" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              {t('landing_footer_register')}
            </Link>
            <Link to="/join" className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
              {t('landing_footer_join')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
