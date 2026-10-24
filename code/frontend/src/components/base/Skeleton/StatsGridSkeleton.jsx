import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Standard 4-card KPI Stats Grid Skeleton matching Admin & Agency dashboards.
 */
export const StatsGridSkeleton = ({ count = 4, className = '' }) => {
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[120px]"
        >
          {/* Header row: Title skeleton + Icon box skeleton */}
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
          </div>

          {/* Big Number KPI */}
          <div className="my-1">
            <Skeleton className="h-7 w-32 rounded-lg" />
          </div>

          {/* Subtext description / Link */}
          <div className="mt-2 flex items-center justify-between">
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
