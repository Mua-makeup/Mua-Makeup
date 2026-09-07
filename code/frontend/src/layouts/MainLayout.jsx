import React from 'react';

export const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen bg-surface-dark text-white">
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};
