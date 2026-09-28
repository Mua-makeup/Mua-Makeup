import React from 'react';
import { ArrowRight, Clock, Sparkles } from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingStylesSection = ({ onSelectStyle }) => {
  const { t } = useI18nStore();

  const styles = [
    {
      id: 'bridal_vip',
      title: t('style_bridal_title'),
      tag: t('style_bridal_tag'),
      desc: t('style_bridal_desc'),
      image: '/images/styles/bridal_vip.jpg',
      duration: t('style_bridal_duration'),
      palette: t('style_bridal_palette'),
      occasion: t('style_bridal_occasion'),
      features: [
        t('style_bridal_feature_1'),
        t('style_bridal_feature_2'),
        t('style_bridal_feature_3'),
      ],
    },
    {
      id: 'douyin_korean',
      title: t('style_douyin_title'),
      tag: t('style_douyin_tag'),
      desc: t('style_douyin_desc'),
      image: '/images/styles/douyin_korean.jpg',
      duration: t('style_douyin_duration'),
      palette: t('style_douyin_palette'),
      occasion: t('style_douyin_occasion'),
      features: [
        t('style_douyin_feature_1'),
        t('style_douyin_feature_2'),
        t('style_douyin_feature_3'),
      ],
    },
    {
      id: 'gala_vip',
      title: t('style_gala_title'),
      tag: t('style_gala_tag'),
      desc: t('style_gala_desc'),
      image: '/images/styles/gala_vip.jpg',
      duration: t('style_gala_duration'),
      palette: t('style_gala_palette'),
      occasion: t('style_gala_occasion'),
      features: [
        t('style_gala_feature_1'),
        t('style_gala_feature_2'),
        t('style_gala_feature_3'),
      ],
    },
    {
      id: 'nude_western',
      title: t('style_western_title'),
      tag: t('style_western_tag'),
      desc: t('style_western_desc'),
      image: '/images/styles/nude_western.jpg',
      duration: t('style_western_duration'),
      palette: t('style_western_palette'),
      occasion: t('style_western_occasion'),
      features: [
        t('style_western_feature_1'),
        t('style_western_feature_2'),
        t('style_western_feature_3'),
      ],
    },
  ];

  return (
    <section id="styles" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <span>{t('landing_styles_tag')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_styles_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_styles_sub')}
          </p>
        </div>

        {/* 4 Styles Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {styles.map((style) => (
            <div
              key={style.id}
              onClick={() => onSelectStyle(style)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectStyle(style);
                }
              }}
              tabIndex={0}
              role="button"
              aria-label={`${style.title} - ${t('landing_view_detail')}`}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-rose-500"
            >
              <div>
                {/* Image Container with Aspect Ratio */}
                <div className="relative w-full aspect-4/3 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4 border border-slate-100 dark:border-slate-800">
                  <img
                    src={style.image}
                    alt={style.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 select-none"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-white backdrop-blur-xs">
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>{style.tag}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{style.duration}</span>
                </div>

                <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {style.title}
                </h3>

                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                  {style.desc}
                </p>
              </div>

              {/* Card Footer Action */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
                <span>{t('landing_view_detail')}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
