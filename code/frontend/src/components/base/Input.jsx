import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18nStore } from '../../store/useI18nStore';

export const Input = React.forwardRef(
  (
    {
      label,
      type = 'text',
      error,
      helperText,
      required = false,
      icon: Icon,
      className = '',
      id,
      showPasswordToggle = true,
      ...props
    },
    ref
  ) => {
    const { t } = useI18nStore();
    const [showPassword, setShowPassword] = useState(false);
    const isPasswordType = type === 'password' && showPasswordToggle;
    const actualType = isPasswordType ? (showPassword ? 'text' : 'password') : type;

    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
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
            type={actualType}
            className={`block w-full text-sm rounded-lg border transition-all focus:outline-none focus:ring-1 ${
              Icon ? 'pl-9' : 'pl-3'
            } ${isPasswordType ? 'pr-10' : 'pr-3'} py-2 ${
              error
                ? 'border-red-400 text-red-900 dark:text-red-200 placeholder-red-300 dark:placeholder-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50/20 dark:bg-red-950/30'
                : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-rose-500 focus:border-rose-500 bg-white dark:bg-slate-800/90 hover:border-slate-300 dark:hover:border-slate-600'
            } ${className}`}
            {...props}
          />
          {isPasswordType && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer focus:outline-none"
              title={showPassword ? t('hide_password') : t('show_password')}
              aria-label={showPassword ? t('hide_password') : t('show_password')}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
        {error && <p className="mt-1 text-xs text-red-600 dark:text-red-400 font-medium">{error}</p>}
        {!error && helperText && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

