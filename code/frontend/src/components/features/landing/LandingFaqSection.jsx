import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingFaqSection = () => {
  const { t } = useI18nStore();
  const [openIdx, setOpenIdx] = useState(0);

  const faqs = [
    { q: t('landing_faq_q1'), a: t('landing_faq_a1') },
    { q: t('landing_faq_q2'), a: t('landing_faq_a2') },
    { q: t('landing_faq_q3'), a: t('landing_faq_a3') },
    { q: t('landing_faq_q4'), a: t('landing_faq_a4') },
    { q: t('landing_faq_q5'), a: t('landing_faq_a5') },
  ];

  return (
    <section id="faq" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <HelpCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>{t('landing_faq_badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_faq_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_faq_sub')}
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {faq.q}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rotate-180'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3 animate-in fade-in duration-200">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
