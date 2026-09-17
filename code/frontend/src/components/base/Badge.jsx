import React from 'react';

export const Badge = ({
  children,
  variant = 'active',
  size = 'sm',
  hasDot = true,
  className = '',
}) => {
  const variantStyles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    draft: 'bg-slate-100 text-slate-600 border-slate-200',
    inactive: 'bg-slate-100 text-slate-600 border-slate-200',
    info: 'bg-sky-50 text-sky-700 border-sky-200',
    brand: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const dotStyles = {
    active: 'bg-emerald-500',
    pending: 'bg-amber-500 animate-pulse',
    rejected: 'bg-rose-500',
    danger: 'bg-rose-500',
    draft: 'bg-slate-400',
    inactive: 'bg-slate-400',
    info: 'bg-sky-500',
    brand: 'bg-rose-500',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium border ${
        sizeStyles[size] || sizeStyles.sm
      } ${variantStyles[variant] || variantStyles.active} ${className}`}
    >
      {hasDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
            dotStyles[variant] || dotStyles.active
          }`}
        />
      )}
      {children}
    </span>
  );
};
