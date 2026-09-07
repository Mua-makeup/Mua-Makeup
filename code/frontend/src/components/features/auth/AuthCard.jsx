import React from 'react';

/**
 * Component mẫu cho Feature Auth
 */
export const AuthCard = ({ title, description, children }) => {
  return (
    <div className="w-full max-w-md p-8 bg-surface-card rounded-xl border border-surface-border shadow-xl">
      {title && <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>}
      {description && <p className="text-sm text-slate-400 mb-6">{description}</p>}
      {children}
    </div>
  );
};
