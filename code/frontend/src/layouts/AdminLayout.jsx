import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { TopRoleBanner } from './TopRoleBanner';
import { Sidebar } from './Sidebar';
import { AdminRealtimeNotifier } from '../components/features/notification/AdminRealtimeNotifier';

export const AdminLayout = () => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      <TopRoleBanner
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex flex-1">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
      {/* Realtime STOMP WebSocket notification listener for Super Admin */}
      <AdminRealtimeNotifier />
    </div>
  );
};
