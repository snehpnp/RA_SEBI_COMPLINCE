import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import adminRoutes from './adminRoutes';
import superAdminRoutes from './superAdminRoutes';
import clientRoutes from './clientRoutes';
import staffRoutes from './staffRoutes';
import authRoutes from './authRoutes';
import VideoKycRoomPage from '@/pages/video-kyc/VideoKycRoomPage';

function HomeRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'SUPER_ADMIN') {
          navigate('/super-admin', { replace: true });
        } else if (user.role === 'CLIENT') {
          navigate('/client', { replace: true });
        } else if (user.role === 'STAFF') {
          navigate('/staff', { replace: true });
        } else {
          navigate('/admin', { replace: true });
        }
      } catch (e) {
        navigate('/login', { replace: true });
      }
    } else {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Redirection */}
      <Route path="/" element={<HomeRedirect />} />

      {/* Auth Routes */}
      {authRoutes}

      {/* Admin Routes */}
      {adminRoutes}

      {/* Super Admin Routes */}
      {superAdminRoutes}

      {/* Client Routes */}
      {clientRoutes}

      {/* Staff Routes */}
      {staffRoutes}

      {/* Video KYC WebRTC Room */}
      <Route path="/video-kyc/:sessionId" element={<VideoKycRoomPage />} />
      <Route path="/video-kyc" element={<VideoKycRoomPage />} />

      {/* 404 Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
