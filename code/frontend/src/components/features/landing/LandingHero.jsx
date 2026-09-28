import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  Building2,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingHero = () => {
  const { t } = useI18nStore();

  const handleScrollToStyles = (e) => {
    e.preventDefault();
    const el = document.querySelector('#styles');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const trustBadges = [
    t('landing_hero_trust_1'),
    t('landing_hero_trust_2'),
    t('landing_hero_trust_3'),
    t('landing_hero_trust_4'),
  ];

  return (
    <section className="relative pt-10 sm:pt-16 pb-16 sm:pb-24 overflow-hidden">
      {/* Background Soft Glow Pattern */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-rose-500/5 dark:bg-rose-500/10 blur-3xl rounded-full pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
        {/* Top Floating Pill Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-6 sm:mb-8">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
          <span>{t('landing_hero_badge')}</span>
        </div>

        {/* Hero Heading H1 */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.18]">
          {t('landing_hero_h1_main')}{' '}
          <span className="text-rose-600 dark:text-rose-500 block sm:inline">
            {t('landing_hero_h1_sub')}
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-5 text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
          {t('landing_hero_desc')}
        </p>

        {/* CTAs */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-none mx-auto w-full">
          <a
            href="#styles"
            onClick={handleScrollToStyles}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/25 transition-all hover:scale-102 active:scale-98 cursor-pointer"
          >
            <span>{t('landing_hero_cta_explore')}</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            to="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all hover:scale-102 active:scale-98"
          >
            <Building2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>{t('landing_hero_cta_partner')}</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
          {trustBadges.map((badge, idx) => (
            <div key={idx} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{badge}</span>
            </div>
          ))}
        </div>

        {/* Realistic Interactive Appointment Preview Card */}
        <div className="mt-12 sm:mt-14 max-w-3xl mx-auto text-left">
          <div className="relative p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all">
            {/* Card Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                    {t('landing_hero_mock_title')}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                    {t('landing_hero_mock_client')}
                  </span>
                </div>
              </div>

              {/* Status Pill Badge */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('landing_hero_mock_status')}
              </span>
            </div>

            {/* Card Content Row */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>{t('landing_hero_mock_service')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('landing_hero_mock_time')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t('landing_hero_mock_address')}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 text-white font-black text-xs flex items-center justify-center shrink-0">
                    ML
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {t('landing_hero_mock_artist')}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      {t('landing_feat_cert_mock_status')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-0.5 text-amber-500 text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>5.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
