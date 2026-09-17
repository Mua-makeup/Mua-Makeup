import React from 'react';
import { Sparkles, Clock, Palette, CheckCircle2, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18nStore } from '../../../store/useI18nStore';

export const StyleDetailModal = ({ isOpen, onClose, styleData }) => {
  const { t } = useI18nStore();

  if (!isOpen || !styleData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card - Responsive 2-Column Showcase */}
      <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-100 dark:border-slate-800 overflow-hidden z-10 max-h-[92vh] flex flex-col md:flex-row transition-all">
        {/* Close Button - Top Right on Mobile and Desktop */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer shadow-lg"
          title={t('close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Column: Full 3D Makeup Portrait Artwork (No Face Cropping) */}
        <div className="relative md:w-5/12 lg:w-1/2 bg-slate-950 overflow-hidden flex-shrink-0 flex items-center justify-center min-h-[280px] sm:min-h-[340px] md:min-h-[520px]">
          <img
            src={styleData.image}
            alt={styleData.title}
            className="w-full h-full object-cover object-center hover:scale-105 transition-transform duration-700 select-none"
          />

          {/* Floating Subtle Gradient for Visual Depth */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-black/20 pointer-events-none" />

          {/* Floating Style Category Badge */}
          <div className="absolute top-4 left-4 z-20">
            <span
              className={`inline-block px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-md backdrop-blur-md ${styleData.tagBadgeColor}`}
            >
              {styleData.tag}
            </span>
          </div>
        </div>

        {/* Right Column: Details, Specifications, Palette & Actions */}
        <div className="md:w-7/12 lg:w-1/2 flex flex-col justify-between bg-white dark:bg-slate-900 overflow-hidden">
          {/* Scrollable Content Container */}
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-800 dark:text-slate-200">
            {/* Header: Title & Description */}
            <div className="pr-8">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-rose-600 dark:text-rose-400 block mb-1">
                {t('landing_styles_tag')}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {styleData.title}
              </h2>
              <p className="mt-2.5 text-slate-600 dark:text-slate-400 leading-relaxed text-sm font-normal">
                {styleData.desc}
              </p>
            </div>

            {/* Specifications Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Duration */}
              <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
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
              <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30 sm:col-span-2 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0 mt-0.5">
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

            {/* Exclusive Techniques / Key Highlights */}
            <div className="pt-1">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
                {t('style_modal_specs')}
              </h4>
              <div className="space-y-2.5">
                {styleData.features && styleData.features.map((feat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 flex-shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('close')}
            </button>

            <Link
              to="/register"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-600 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
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

