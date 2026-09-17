import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { USER_ROLES } from '../constants/roles.constant';
import { ProtectedRoute } from './ProtectedRoute';
import { RoleBasedRoute } from './RoleBasedRoute';

// Layouts
import { AdminLayout } from '../layouts/AdminLayout';
import { AgencyLayout } from '../layouts/AgencyLayout';

// Public Pages
import { LandingPage } from '../pages/Landing/LandingPage';
import { LoginPage } from '../pages/Auth/LoginPage';
import { RegisterPage } from '../pages/Auth/RegisterPage';
import { NotFoundPage } from '../pages/NotFound/NotFoundPage';

// Super Admin Pages
import { AdminDashboardPage } from '../pages/SuperAdmin/AdminDashboardPage';
import { AdminBookingsPage } from '../pages/SuperAdmin/AdminBookingsPage';
import { AdminUsersPage } from '../pages/SuperAdmin/AdminUsersPage';
import { AdminAgenciesPage } from '../pages/SuperAdmin/AdminAgenciesPage';
import { MuaVerificationPage } from '../pages/SuperAdmin/MuaVerificationPage';
import { TaxonomyManagementPage } from '../pages/SuperAdmin/TaxonomyManagementPage';

// Agency Admin Pages
import { AgencyDashboardPage } from '../pages/Agency/AgencyDashboardPage';
import { AgencyBookingsPage } from '../pages/Agency/AgencyBookingsPage';
import { AgencyProfilePage } from '../pages/Agency/AgencyProfilePage';
import { ServicePackageListPage } from '../pages/Agency/ServicePackageListPage';
import { SurchargeConfigPage } from '../pages/Agency/SurchargeConfigPage';
import { StaffManagementPage } from '../pages/Agency/StaffManagementPage';
import { ShiftSchedulePage } from '../pages/Agency/ShiftSchedulePage';

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Super Admin Protected Routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[USER_ROLES.SUPER_ADMIN]}>
                <AdminLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="agencies" element={<AdminAgenciesPage />} />
          <Route path="muas/credentials" element={<MuaVerificationPage />} />
          <Route path="taxonomy" element={<TaxonomyManagementPage />} />
        </Route>

        {/* Agency Admin Protected Routes */}
        <Route
          path="/agency"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={[USER_ROLES.AGENCY_ADMIN]}>
                <AgencyLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/agency/dashboard" replace />} />
          <Route path="dashboard" element={<AgencyDashboardPage />} />
          <Route path="bookings" element={<AgencyBookingsPage />} />
          <Route path="profile" element={<AgencyProfilePage />} />
          <Route path="packages" element={<ServicePackageListPage />} />
          <Route path="surcharges" element={<SurchargeConfigPage />} />
          <Route path="staff" element={<StaffManagementPage />} />
          <Route path="shifts" element={<ShiftSchedulePage />} />
        </Route>

        {/* 404 Not Found Catch-All Route */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};
