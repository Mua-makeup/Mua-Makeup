import React from 'react';
import { useI18nStore } from '../../store/useI18nStore';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      options = [],
      placeholder,
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const { t } = useI18nStore();
    const effectivePlaceholder = placeholder !== undefined ? placeholder : t('select_placeholder');
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`block w-full text-sm rounded-lg border px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700 transition-all focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-400 text-red-900 dark:text-red-200 focus:ring-red-500 focus:border-red-500 bg-red-50/20 dark:bg-red-950/30'
              : 'focus:ring-rose-500 focus:border-rose-500 hover:border-slate-300 dark:hover:border-slate-600'
          } ${className}`}
          {...props}
        >
          {effectivePlaceholder && <option value="">{effectivePlaceholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
