import React from 'react';
import { CalendarDays } from 'lucide-react';
import { WeeklyShiftTable } from '../../components/features/agency/WeeklyShiftTable';
import { useI18nStore } from '../../store/useI18nStore';

export const ShiftSchedulePage = () => {
  const { t } = useI18nStore();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t('shifts_title')}
          </h1>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {t('shifts_sub')}
        </p>
      </div>

      {/* Matrix Table */}
      <WeeklyShiftTable />
    </div>
  );
};
