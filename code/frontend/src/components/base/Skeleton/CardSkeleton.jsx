import React from 'react';
import { Skeleton } from './Skeleton';
import { SkeletonCircle } from './SkeletonCircle';
import { SkeletonText } from './SkeletonText';

/**
 * Card Skeleton component for lists of Reviews, Bookings, Staff, and Services.
 */
export const CardSkeleton = ({ count = 3, className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4"
        >
          {/* Card Top: Avatar/Icon + Meta info + Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <SkeletonCircle size="w-10 h-10" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>

          {/* Card Body: Content description */}
          <div className="pt-1">
            <SkeletonText lines={2} lastLineWidth="w-3/4" />
          </div>

          {/* Card Footer: Metadata or buttons */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};
