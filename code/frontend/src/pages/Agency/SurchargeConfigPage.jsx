import React, { useState } from 'react';
import { DollarSign, Clock, Navigation } from 'lucide-react';
import { SurchargeConfigCard } from '../../components/features/agency/SurchargeConfigCard';
import { OvertimeConfigCard } from '../../components/features/agency/OvertimeConfigCard';
import { useI18nStore } from '../../store/useI18nStore';

export const SurchargeConfigPage = () => {
  const { t } = useI18nStore();
  const [activeTab, setActiveTab] = useState('surcharges');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('surcharges_title')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('surcharges_sub')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => setActiveTab('surcharges')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'surcharges'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>{t('surcharges_title')}</span>
        </button>

        <button
          onClick={() => setActiveTab('overtime')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer shrink-0 ${
            activeTab === 'overtime'
              ? 'border-rose-600 text-rose-600 dark:text-rose-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('overtime_title')}</span>
        </button>
      </div>

      {/* Content */}
      {activeTab === 'surcharges' && <SurchargeConfigCard />}
      {activeTab === 'overtime' && <OvertimeConfigCard />}
    </div>
  );
};
