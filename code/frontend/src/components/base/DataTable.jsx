import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useI18nStore } from '../../store/useI18nStore';
import { getSavedPageSize, savePageSize } from '../../utils/pagination.util';

export const DataTable = ({
  columns,
  data = [],
  isLoading = false,
  emptyMessage,
  pagination,
  onRowClick,
}) => {
  const { t } = useI18nStore();
  const [sizeDropdownOpen, setSizeDropdownOpen] = useState(false);
  const effectiveEmptyMessage = emptyMessage || t('dt_no_data');

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex gap-4 animate-pulse">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex gap-4 animate-pulse">
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/4"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/6"></div>
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/5"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center shadow-sm">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{effectiveEmptyMessage}</p>
      </div>
    );
  }

  const curPage = pagination?.currentPage ?? (pagination?.page !== undefined ? pagination.page + 1 : 1);
  const pageSize = pagination?.pageSize ?? pagination?.size ?? getSavedPageSize(10);
  const totalItems = pagination?.totalElements ?? pagination?.total_elements ?? pagination?.totalItems ?? data.length;
  const calculatedPages = Math.ceil(totalItems / pageSize) || 1;
  const totalPages = Math.max(pagination?.totalPages ?? pagination?.total_pages ?? calculatedPages, calculatedPages, 1);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (curPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (curPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', curPage - 1, curPage, curPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[45vh] sm:min-h-[55vh] lg:min-h-[65vh] flex flex-col justify-between">
      <div className="overflow-x-auto flex-1">
        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800 text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 whitespace-nowrap ${
                    col.headerClassName
                      ? col.headerClassName
                      : idx === 0
                      ? 'pl-3.5 sm:pl-4 pr-3 sm:pr-4'
                      : 'px-4 sm:px-5'
                  } ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200">
            {data.map((row, rIdx) => (
              <tr
                key={row.id || rIdx}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick
                    ? 'cursor-pointer hover:bg-rose-50/40 dark:hover:bg-rose-950/20'
                    : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/50'
                }`}
              >
                {columns.map((col, cIdx) => (
                  <td
                    key={cIdx}
                    className={`py-3.5 whitespace-nowrap ${
                      col.className
                        ? col.className
                        : cIdx === 0
                        ? 'pl-3.5 sm:pl-4 pr-3 sm:pr-4'
                        : 'px-4 sm:px-5'
                    } ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col.render ? col.render(row, rIdx) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="px-4 sm:px-5 py-3 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mt-auto">
          {/* Left: Total Records */}
          <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Tổng số bản ghi: <strong className="font-bold text-slate-900 dark:text-white">{totalItems}</strong>
          </div>

          {/* Right: Page Navigation & Size Selector */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center sm:justify-end">
            {/* Prev Button */}
            <button
              onClick={() => pagination.onPageChange(curPage - 1)}
              disabled={curPage <= 1}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('dt_prev_page')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Mobile Page Indicator */}
            <div className="flex sm:hidden items-center px-2 font-medium text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-rose-600 dark:text-rose-400">{curPage}</span>
              <span className="mx-1 text-slate-400">/</span>
              <span>{totalPages}</span>
            </div>

            {/* Desktop Numeric Page Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              {getPageNumbers().map((p, idx) =>
                p === '...' ? (
                  <span key={`ellipsis-${idx}`} className="w-6 text-center text-xs text-slate-400 font-bold">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => pagination.onPageChange(p)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      p === curPage
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'border border-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>

            {/* Next Button */}
            <button
              onClick={() => pagination.onPageChange(curPage + 1)}
              disabled={curPage >= totalPages}
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title={t('dt_next_page')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Page Size Dropdown */}
            <div className="relative ml-2">
              <button
                type="button"
                onClick={() => setSizeDropdownOpen(!sizeDropdownOpen)}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer shadow-xs"
              >
                <span>{pageSize}/trang</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {sizeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setSizeDropdownOpen(false)}
                  />
                  <div className="absolute right-0 bottom-full mb-2 w-28 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 animate-in fade-in zoom-in-95 duration-150">
                    {[10, 20, 50, 100].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => {
                          savePageSize(opt);
                          if (pagination.onPageSizeChange) {
                            pagination.onPageSizeChange(opt);
                          }
                          setSizeDropdownOpen(false);
                        }}
                        className={`w-full px-3.5 py-1.5 text-left text-xs font-medium transition-colors cursor-pointer flex items-center justify-between ${
                          opt === pageSize
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold'
                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <span>{opt}/trang</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
