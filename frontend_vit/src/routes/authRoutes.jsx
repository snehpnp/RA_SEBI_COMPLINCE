import React from 'react';
import { Route } from 'react-router-dom';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import AdminLoginPage from '@/pages/auth/AdminLoginPage';
import SuperAdminLoginPage from '@/pages/auth/SuperAdminLoginPage';
import ClientLoginPage from '@/pages/auth/ClientLoginPage';
import ClientRegisterPage from '@/pages/auth/ClientRegisterPage';
import StaffLoginPage from '@/pages/auth/StaffLoginPage';
import UserLoginPage from '@/pages/auth/UserLoginPage';

export const authRoutes = (
  <>
    {/* Unified & Role Logins */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/signup" element={<RegisterPage />} />

    <Route path="/adminlogin" element={<AdminLoginPage />} />
    <Route path="/admin/login" element={<AdminLoginPage />} />

    <Route path="/superadminlogin" element={<SuperAdminLoginPage />} />
    <Route path="/superadmin/login" element={<SuperAdminLoginPage />} />
    <Route path="/super-admin/login" element={<SuperAdminLoginPage />} />

    <Route path="/clientlogin" element={<ClientLoginPage />} />
    <Route path="/client-login" element={<ClientLoginPage />} />
    <Route path="/client/login" element={<ClientLoginPage />} />
    <Route path="/clientregister" element={<ClientRegisterPage />} />
    <Route path="/client-register" element={<ClientRegisterPage />} />
    <Route path="/client/register" element={<ClientRegisterPage />} />
    <Route path="/client-signup" element={<ClientRegisterPage />} />

    <Route path="/stafflogin" element={<StaffLoginPage />} />
    <Route path="/staff-login" element={<StaffLoginPage />} />
    <Route path="/staff/login" element={<StaffLoginPage />} />

    <Route path="/userlogin" element={<UserLoginPage />} />
    <Route path="/user-login" element={<UserLoginPage />} />
    <Route path="/user/login" element={<UserLoginPage />} />
  </>
);

export default authRoutes;
