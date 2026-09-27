import React from 'react';
import { Sparkles, UserCheck, Building2, CheckCircle2, Smartphone, Monitor } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingAudienceValue = () => {
  const { t } = useI18nStore();

  const audiences = [
    {
      badge: t('landing_aud_client_badge'),
      channel: t('landing_aud_client_channel'),
      channelIcon: Smartphone,
      title: t('landing_aud_client_title'),
      icon: Sparkles,
      iconColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      points: [
        t('landing_aud_client_point_1'),
        t('landing_aud_client_point_2'),
        t('landing_aud_client_point_3'),
      ],
    },
    {
      badge: t('landing_aud_mua_badge'),
      channel: t('landing_aud_mua_channel'),
      channelIcon: Smartphone,
      title: t('landing_aud_mua_title'),
      icon: UserCheck,
      iconColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      points: [
        t('landing_aud_mua_point_1'),
        t('landing_aud_mua_point_2'),
        t('landing_aud_mua_point_3'),
      ],
    },
    {
      badge: t('landing_aud_agency_badge'),
      channel: t('landing_aud_agency_channel'),
      channelIcon: Monitor,
      title: t('landing_aud_agency_title'),
      icon: Building2,
      iconColor: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      points: [
        t('landing_aud_agency_point_1'),
        t('landing_aud_agency_point_2'),
        t('landing_aud_agency_point_3'),
      ],
    },
  ];

  return (
    <section id="audiences" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <span>{t('landing_audience_badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_audience_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_audience_sub')}
          </p>
        </div>

        {/* 3 Audience Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {audiences.map((card, idx) => (
            <div
              key={idx}
              className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Top Badge & Channel */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${card.iconColor}`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <card.channelIcon className="w-3 h-3" />
                    <span>{card.channel}</span>
                  </span>
                </div>

                <div className="mb-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 block mb-1">
                    {card.badge}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                    {card.title}
                  </h3>
                </div>

                {/* Benefits List */}
                <ul className="mt-5 space-y-3">
                  {card.points.map((point, pIdx) => (
                    <li key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
