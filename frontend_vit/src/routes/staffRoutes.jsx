import React from 'react';
import { Route } from 'react-router-dom';
import StaffPage from '@/pages/staff/StaffPage';
import StaffProfilePage from '@/pages/admin/profile/StaffProfilePage';

export const staffRoutes = (
  <>
    {/* Staff Dashboard & Tabs */}
    <Route path="/staff" element={<StaffPage />} />
    <Route path="/staff/:tab" element={<StaffPage />} />
    <Route path="/staff/profile" element={<StaffProfilePage />} />
  </>
);

export default staffRoutes;
