import React, { useState } from 'react';
import {
  CalendarRange,
  Package,
  Clock,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { useI18nStore } from '../../../store/useI18nStore';

export const LandingOperationalPreview = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState('shifts');

  const tabs = [
    { id: 'shifts', label: t('landing_prev_tab_shifts'), icon: CalendarRange },
    { id: 'packages', label: t('landing_prev_tab_packages'), icon: Package },
    { id: 'bookings', label: t('landing_prev_tab_bookings'), icon: Clock },
  ];

  return (
    <section id="preview" className="py-16 sm:py-24 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs mb-3">
            <span>{t('landing_preview_badge')}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {t('landing_preview_title')}
          </h2>
          <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
            {t('landing_preview_sub')}
          </p>
        </div>

        {/* Tab Switcher Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Studio Portal Container Mockup */}
        <div className="p-4 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-200/50 dark:shadow-none transition-all">
          {/* Top Bar of Studio Portal Mockup */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-slate-800 text-white flex items-center justify-center font-black text-sm">
                S
              </div>
              <div>
                <span className="text-xs font-extrabold text-slate-900 dark:text-white block">
                  {t('landing_prev_studio_name')}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">
                  {t('landing_prev_studio_status')}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {t('landing_prev_commission')}
              </span>
            </div>
          </div>

          {/* Tab 1: Shifts Matrix Preview */}
          {activeTab === 'shifts' && (
            <div className="pt-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('landing_prev_shifts_title')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('landing_prev_shifts_no_conflict')}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[550px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold text-[11px]">
                      <th className="pb-2.5">{t('landing_prev_col_artist')}</th>
                      <th className="pb-2.5">{t('landing_prev_col_mon')}</th>
                      <th className="pb-2.5">{t('landing_prev_col_tue')}</th>
                      <th className="pb-2.5">{t('landing_prev_col_wed')}</th>
                      <th className="pb-2.5">{t('landing_prev_col_thu')}</th>
                      <th className="pb-2.5">{t('landing_prev_col_fri')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">Mai Linh (Senior)</td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-semibold">{t('landing_prev_shift_bridal_morning')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">{t('landing_prev_shift_day_off')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] font-semibold">{t('landing_prev_shift_douyin_afternoon')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold">{t('landing_prev_shift_prom_morning')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[10px] font-semibold">{t('landing_prev_shift_gala_evening')}</span></td>
                    </tr>
                    <tr>
                      <td className="py-3 font-bold text-slate-900 dark:text-white">Thanh Vân (Master)</td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[10px] font-semibold">{t('landing_prev_shift_gala_vip_evening')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-semibold">{t('landing_prev_shift_bridal_morning')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 text-[10px] font-semibold">{t('landing_prev_shift_bridal_noon')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px]">{t('landing_prev_shift_day_off')}</span></td>
                      <td className="py-3"><span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold">{t('landing_prev_shift_party_evening')}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Packages Catalog Preview */}
          {activeTab === 'packages' && (
            <div className="pt-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('landing_prev_packages_title')}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 cursor-pointer">
                  <Plus className="w-3.5 h-3.5" />
                  {t('landing_prev_packages_create')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {t('landing_prev_pkg_1_name')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('landing_prev_pkg_1_desc')}</span>
                  </div>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">2.500.000 đ</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {t('landing_prev_pkg_2_name')}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('landing_prev_pkg_2_desc')}</span>
                  </div>
                  <span className="text-xs font-black text-rose-600 dark:text-rose-400">850.000 đ</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Booking Monitor Preview */}
          {activeTab === 'bookings' && (
            <div className="pt-6 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('landing_prev_bookings_title')}
                </span>
                <span className="text-[11px] text-slate-400">
                  {t('landing_prev_bookings_realtime')}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{t('landing_prev_bk_1_title')}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('landing_prev_bk_1_desc')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {t('landing_prev_bk_1_status')}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{t('landing_prev_bk_2_title')}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block">{t('landing_prev_bk_2_desc')}</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                    {t('landing_prev_bk_2_status')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Disclaimer Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 italic">
              {t('landing_preview_disclaimer')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
