import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Text Skeleton component with multi-line support and organic width variations.
 */
export const SkeletonText = ({
  lines = 1,
  lineHeight = 'h-3.5',
  spacing = 'space-y-2',
  className = '',
  lastLineWidth = 'w-3/5',
}) => {
  if (lines <= 1) {
    return <Skeleton className={`${lineHeight} w-full rounded ${className}`} />;
  }

  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-5/6', 'w-3/4'];

  return (
    <div className={`${spacing} w-full ${className}`}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1;
        const width = isLast
          ? lastLineWidth
          : widths[index % widths.length];

        return (
          <Skeleton
            key={index}
            className={`${lineHeight} ${width} rounded`}
          />
        );
      })}
    </div>
  );
};
