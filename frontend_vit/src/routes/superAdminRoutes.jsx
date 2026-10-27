import React from 'react';
import { Route } from 'react-router-dom';
import SuperAdminPage from '@/pages/super-admin/SuperAdminPage';
import SuperAdminProfilePage from '@/pages/super-admin/profile/SuperAdminProfilePage';

export const superAdminRoutes = (
  <>
    {/* Super Admin Dashboard & Tabs */}
    <Route path="/super-admin" element={<SuperAdminPage />} />
    <Route path="/super-admin/:tab" element={<SuperAdminPage />} />
    <Route path="/super-admin/profile" element={<SuperAdminProfilePage />} />

    {/* URL Aliases */}
    <Route path="/superadmin" element={<SuperAdminPage />} />
    <Route path="/superadmin/:tab" element={<SuperAdminPage />} />
    <Route path="/superadmin/profile" element={<SuperAdminProfilePage />} />
  </>
);

export default superAdminRoutes;
