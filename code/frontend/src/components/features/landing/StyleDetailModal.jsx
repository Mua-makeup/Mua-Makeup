import React, { useEffect } from 'react';
import { Clock, Palette, CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18nStore } from '../../../store/useI18nStore';

export const StyleDetailModal = ({ isOpen, onClose, styleData }) => {
  const { t } = useI18nStore();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !styleData) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-style-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden z-10 max-h-[90vh] flex flex-col md:flex-row my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label={t('close')}
          className="absolute top-3.5 right-3.5 z-30 w-9 h-9 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-md focus:outline-hidden focus:ring-2 focus:ring-rose-500"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Image Artwork */}
        <div className="relative md:w-5/12 bg-slate-950 overflow-hidden flex-shrink-0 flex items-center justify-center min-h-[240px] sm:min-h-[300px] md:min-h-[460px]">
          <img
            src={styleData.image}
            alt={styleData.title}
            className="w-full h-full object-cover object-center select-none"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-black/20 pointer-events-none" />

          {/* Floating Tag Badge */}
          <div className="absolute top-3.5 left-3.5 z-20">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-rose-600 text-white shadow-md">
              <Sparkles className="w-3 h-3" />
              {styleData.tag}
            </span>
          </div>
        </div>

        {/* Right Column: Details & Procedure */}
        <div className="md:w-7/12 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-hidden">
          {/* Scrollable Body */}
          <div className="p-5 sm:p-7 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400 block mb-1">
                {t('landing_styles_tag')}
              </span>
              <h2
                id="modal-style-title"
                className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight"
              >
                {styleData.title}
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400 leading-relaxed text-xs sm:text-sm font-normal">
                {styleData.desc}
              </p>
            </div>

            {/* Specifications Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Duration */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                    {t('style_modal_duration_label')}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {styleData.duration}
                  </span>
                </div>
              </div>

              {/* Dominant Palette */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                    {t('style_modal_palette_label')}
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {styleData.palette}
                  </span>
                </div>
              </div>

              {/* Recommended Occasions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 sm:col-span-2 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 block">
                    {t('style_modal_occasion_label')}
                  </span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white mt-0.5 block">
                    {styleData.occasion}
                  </span>
                </div>
              </div>
            </div>

            {/* Features / Techniques */}
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                {t('style_modal_specs')}
              </h3>
              <div className="space-y-2">
                {styleData.features &&
                  styleData.features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('close')}
            </button>

            <Link
              to="/register"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-102 active:scale-98 cursor-pointer"
            >
              <span>{t('style_modal_btn_book')}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
