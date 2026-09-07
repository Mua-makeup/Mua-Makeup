import React from 'react';

export const BaseButton = ({ children, className = '', variant = 'primary', ...props }) => {
  return (
    <button
      className={`px-4 py-2 rounded font-medium bg-brand-600 hover:bg-brand-700 text-white ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
