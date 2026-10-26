import React from 'react';
import { Skeleton } from './Skeleton';

/**
 * Table Skeleton component matching DataTable structure.
 * Keeps table headers, row borders, and container height 100% stable during fetch.
 */
export const TableSkeleton = ({
  columns = [],
  columnCount = 5,
  rows = 6,
  hasPagination = true,
  className = '',
}) => {
  const actualCols = columns.length > 0 ? columns : Array.from({ length: columnCount });

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between ${className}`}
    >
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
          {/* Table Header */}
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              {actualCols.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 sm:px-5 ${
                    col?.align === 'right'
                      ? 'text-right'
                      : col?.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col?.header ? (
                    <span className="opacity-70">{col.header}</span>
                  ) : (
                    <Skeleton className="h-3 w-20 rounded" />
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/50">
                {actualCols.map((col, cIdx) => {
                  const align = col?.align;
                  const justifyClass =
                    align === 'right'
                      ? 'justify-end'
                      : align === 'center'
                      ? 'justify-center'
                      : 'justify-start';

                  // Natural varied widths across columns
                  const widthClass =
                    cIdx === 0
                      ? 'w-24 sm:w-32'
                      : cIdx === 1
                      ? 'w-36 sm:w-48'
                      : cIdx === actualCols.length - 1
                      ? 'w-16 sm:w-20'
                      : 'w-24';

                  return (
                    <td key={cIdx} className="py-3.5 px-4 sm:px-5">
                      <div className={`flex items-center ${justifyClass}`}>
                        <Skeleton className={`h-3.5 ${widthClass} rounded`} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar Skeleton */}
      {hasPagination && (
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <Skeleton className="h-3.5 w-32 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
};
