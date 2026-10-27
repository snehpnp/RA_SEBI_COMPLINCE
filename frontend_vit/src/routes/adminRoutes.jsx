import React from 'react';
import { Route } from 'react-router-dom';
import AdminPage from '@/pages/admin/AdminPage';
import AdminProfilePage from '@/pages/admin/profile/AdminProfilePage';
import StaffProfilePage from '@/pages/admin/profile/StaffProfilePage';
import PAProfilePage from '@/pages/admin/profile/PAProfilePage';

export const adminRoutes = (
  <>
    {/* Admin Portal Base & Tabs */}
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/admin/:tab" element={<AdminPage />} />
    
    {/* Admin Profiles */}
    <Route path="/admin/profile" element={<AdminProfilePage />} />
    <Route path="/admin/staff-profile" element={<StaffProfilePage />} />
    <Route path="/admin/pa-profile" element={<PAProfilePage />} />

    {/* Compliance Officer & Researcher Role Aliases */}
    <Route path="/compliance-officer" element={<AdminPage />} />
    <Route path="/compliance-officer/:tab" element={<AdminPage />} />
    <Route path="/researcher" element={<AdminPage />} />
    <Route path="/researcher/:tab" element={<AdminPage />} />
  </>
);

export default adminRoutes;
