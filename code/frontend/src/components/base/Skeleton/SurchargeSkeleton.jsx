import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonText } from './SkeletonText';

/**
 * Surcharge and Overtime Config Skeleton.
 * Preserves the sub-tab bar, form inputs, simulator preview card, and action buttons.
 */
export const SurchargeSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sub-tab pills skeleton */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Main 2-Column Grid: Form Inputs + Live Simulator Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form Settings */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3 w-64 rounded" />
            </div>
          </div>

          {/* Form input fields */}
          <div className="space-y-4 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-3.5 w-32 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-3 w-48 rounded" />
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        {/* Right Simulator Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-slate-800 pb-3">
            <Skeleton className="w-6 h-6 rounded-lg" />
            <Skeleton className="h-5 w-40 rounded-lg" />
          </div>

          <SkeletonText lines={2} />

          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-3">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-7 w-36 rounded-lg" />
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
};
