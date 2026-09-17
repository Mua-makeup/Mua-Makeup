import React from 'react';

export const Input = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      icon: Icon,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <div className="relative rounded-lg shadow-sm">
          {Icon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`block w-full text-sm rounded-lg border transition-all focus:outline-none focus:ring-1 ${
              Icon ? 'pl-9' : 'pl-3'
            } pr-3 py-2 ${
              error
                ? 'border-red-400 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
                : 'border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-rose-500 focus:border-rose-500 bg-white hover:border-slate-300'
            } ${className}`}
            {...props}
          />
        </div>
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
