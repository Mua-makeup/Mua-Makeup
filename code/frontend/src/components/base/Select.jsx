import React from 'react';

export const Select = React.forwardRef(
  (
    {
      label,
      error,
      options = [],
      placeholder = 'Chọn một mục...',
      required = false,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`block w-full text-sm rounded-lg border px-3 py-2 bg-white transition-all focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-400 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-slate-200 text-slate-800 focus:ring-rose-500 focus:border-rose-500 hover:border-slate-300'
          } ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
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
