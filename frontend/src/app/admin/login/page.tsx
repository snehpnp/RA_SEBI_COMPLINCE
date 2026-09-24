'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import LoginForm from '../../../components/LoginForm';
import { useBranding } from '@/contexts/BrandingContext';

function AdminLoginContent() {
  const router = useRouter();
  const { loginLogoUrl, logoUrl, appName } = useBranding();
  const [checking, setChecking] = useState(true);

  // If already logged in as admin/staff, go straight to /admin
  useEffect(() => {
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const hasError = params && (params.has('error') || params.get('error'));

    if (hasError) {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId');
      setChecking(false);
      return;
    }

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'SUPER_ADMIN') {
          router.replace('/super-admin');
          return;
        } else if (user.role === 'CLIENT') {
          router.replace('/client');
          return;
        } else {
          router.replace('/admin');
          return;
        }
      } catch {
        setChecking(false);
      }
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600 dark:text-primary-500" />
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  const currentLogo = loginLogoUrl || logoUrl || null;
  const displayName = appName || 'RAGCP';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 relative font-sans overflow-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/15 dark:bg-blue-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/15 dark:bg-indigo-600/10 blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-20 dark:opacity-5 pointer-events-none" />

      {/* Dynamic Logo / Brand Header */}
      <div className="relative z-20 mb-6 text-center flex flex-col items-center">
        {currentLogo ? (
          <img
            src={currentLogo}
            alt={displayName}
            className="h-12 sm:h-14 max-w-[260px] object-contain drop-shadow-sm mb-3"
          />
        ) : (
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-primary-600/10 dark:bg-primary-500/20 border border-primary-500/30 rounded-xl text-primary-600 dark:text-primary-400 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white drop-shadow-sm">
              {displayName}
            </h1>
          </div>
        )}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
          <Lock className="w-3 h-3" />
          <span>Management & Staff Console</span>
        </div>
      </div>

      {/* Admin Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.7)] p-6 sm:p-8">
        <LoginForm defaultRole="admin" isAdminPortal={true} />
      </div>

      {/* Security Disclaimer Footer */}
      <div className="relative z-10 mt-6 text-center text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>Restricted access for authorized advisors & staff personnel only.</span>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-primary-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Loading Admin Console...</span>
        </div>
      </div>
    }>
      <AdminLoginContent />
    </Suspense>
  );
}
