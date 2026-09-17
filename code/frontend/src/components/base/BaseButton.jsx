import React from 'react';

export const BaseButton = ({ children, className = '', variant = 'primary', ...props }) => {
  const variantClass = variant === 'secondary' ? 'bg-slate-200 text-slate-800' : 'bg-brand-600 hover:bg-brand-700 text-white';
  return (
    <button
      className={`px-4 py-2 rounded font-medium ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
