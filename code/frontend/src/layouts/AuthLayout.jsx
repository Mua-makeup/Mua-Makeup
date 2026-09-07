import React from 'react';

export const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-dark">
      {children}
    </div>
  );
};
