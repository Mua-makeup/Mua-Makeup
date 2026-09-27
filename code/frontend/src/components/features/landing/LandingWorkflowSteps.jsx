import React from 'react';
import { Palette, CalendarCheck, Sparkles, Building2 } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingWorkflowSteps = () => {
  const { t } = useI18nStore();

  const steps = [
    {
      num: t('landing_step_1_num'),
      title: t('landing_step_1_title'),
      desc: t('landing_step_1_desc'),
      icon: Palette,
      color: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
    },
    {
      num: t('landing_step_2_num'),
      title: t('landing_step_2_title'),
      desc: t('landing_step_2_desc'),
      icon: CalendarCheck,
      color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
    },
    {
      num: t('landing_step_3_num'),
      title: t('landing_step_3_title'),
      desc: t('landing_step_3_desc'),
      icon: Sparkles,
      color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
    },
    {
      num: t('landing_step_4_num'),
      title: t('landing_step_4_title'),
      desc: t('landing_step_4_desc'),
      icon: Building2,
      color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
    },
  ];

  return (
    <section id="workflow" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <span>{t('landing_steps_badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_steps_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_steps_sub')}
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between relative"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${step.color}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className="text-2xl font-black text-slate-200 dark:text-slate-800">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                  {step.title}
                </h3>

                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
