import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Weekly Shift Schedule Skeleton matching WeeklyShiftTable layout.
 * Preserves the 5 KPI stat cards, week toolbar, and 7-day multi-period calendar grid.
 */
export const WeeklyShiftSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 5 KPI Stat Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs flex items-center gap-3"
          >
            <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3 w-16 rounded" />
              <Skeleton className="h-5 w-12 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* Week Toolbar Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-9 w-44 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* 3 Shift Periods (Morning, Afternoon, Evening) Skeleton */}
      <div className="space-y-4">
        {[0, 1, 2].map((_, pIdx) => (
          <div
            key={pIdx}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden"
          >
            {/* Period Header */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-4 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-16 rounded" />
            </div>

            {/* 7 Columns for 7 Days of the Week */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800 p-2 gap-2 sm:gap-0">
              {Array.from({ length: 7 }).map((_, dIdx) => (
                <div key={dIdx} className="p-2 space-y-2 min-h-[110px] flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-3 w-10 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                  </div>
                  {/* Mock Shift Card item */}
                  <div className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1.5">
                    <Skeleton className="h-3.5 w-16 rounded" />
                    <Skeleton className="h-3 w-20 rounded" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
