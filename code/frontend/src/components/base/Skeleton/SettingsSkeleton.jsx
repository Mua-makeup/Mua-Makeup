import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonText } from './SkeletonText';

/**
 * Settings Skeleton for Agency Settings & Studio Location Page.
 * Replaces full-page spinners and keeps 100% stable geometry for forms and maps.
 */
export const SettingsSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 pb-2 ${className}`}>
      {/* Header Banner Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-52 rounded-lg" />
            <Skeleton className="h-3.5 w-72 rounded" />
          </div>
        </div>
        <Skeleton className="h-7 w-28 rounded-full self-start md:self-auto shrink-0" />
      </div>

      {/* SECTION 1: Surge Pricing Policy Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-44 rounded-lg" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <SkeletonText lines={2} lastLineWidth="w-3/4" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="w-12 h-6 rounded-full" />
          </div>
        </div>
      </div>

      {/* SECTION 2: Map Radar Location Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-5 h-5 rounded shrink-0" />
            <Skeleton className="h-5 w-40 rounded-lg" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-48 rounded" />
            <Skeleton className="h-8 w-24 rounded-xl shrink-0" />
          </div>
        </div>

        {/* Map Container Skeleton */}
        <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
          <Skeleton className="w-full h-full rounded-2xl" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl border border-slate-200/60 dark:border-slate-800/60 flex items-center gap-3 shadow-sm">
              <Skeleton className="w-6 h-6 rounded-full" />
              <Skeleton className="h-4 w-36 rounded" />
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <Skeleton className="h-3.5 w-64 rounded" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
};
