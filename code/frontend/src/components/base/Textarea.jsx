import React from 'react';

export const Textarea = React.forwardRef(
  (
    {
      label,
      error,
      helperText,
      required = false,
      rows = 3,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const textareaId =
      id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5"
          >
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={`block w-full text-sm rounded-lg border p-3 transition-all focus:outline-none focus:ring-1 ${
            error
              ? 'border-red-400 text-red-900 focus:ring-red-500 focus:border-red-500 bg-red-50/20'
              : 'border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-rose-500 focus:border-rose-500 bg-white hover:border-slate-300'
          } ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-600 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
