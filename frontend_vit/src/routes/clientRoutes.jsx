import React from 'react';
import { Route } from 'react-router-dom';
import ClientPage from '@/pages/client/ClientPage';
import ClientProfilePage from '@/pages/client/profile/ClientProfilePage';

export const clientRoutes = (
  <>
    {/* Client Portal Base & Tabs */}
    <Route path="/client" element={<ClientPage />} />
    <Route path="/client/:tab" element={<ClientPage />} />
    <Route path="/client/profile" element={<ClientProfilePage />} />
  </>
);

export default clientRoutes;
