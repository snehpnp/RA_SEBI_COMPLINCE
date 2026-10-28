'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LogIn, UserPlus, Compass, ShieldAlert } from 'lucide-react';
import { useBranding } from '../contexts/BrandingContext';

export default function NotFound() {
  const branding = useBranding();
  const [logoFailed, setLogoFailed] = useState(false);

  const displayLogo = branding?.loginLogoUrl || branding?.logoUrl;
  const brandName = branding?.appName || 'SEBI Compliance Portal';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden select-none">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-gradient-to-tr from-indigo-600/20 via-sky-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Top Header with Dynamic White-Label Brand */}
      <header className="relative z-10 max-w-5xl mx-auto w-full flex items-center justify-center py-4">
        <div className="flex items-center gap-3">
          {displayLogo && !logoFailed ? (
            <img
              src={displayLogo}
              alt={brandName}
              className="h-10 max-w-[200px] object-contain drop-shadow"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md">
                <ShieldAlert className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-white">{brandName}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main 404 Hero Section */}
      <main className="relative z-10 max-w-xl mx-auto w-full text-center py-8 sm:py-12 flex flex-col items-center">
        {/* Animated Badge & Compass */}
        <div className="relative mb-4 flex items-center justify-center">
          <span className="text-8xl sm:text-9xl font-black tracking-tighter bg-gradient-to-r from-rose-500 via-amber-400 to-indigo-400 bg-clip-text text-transparent drop-shadow-2xl font-mono">
            404
          </span>
          <Compass className="w-10 h-10 sm:w-12 sm:h-12 text-amber-400/90 absolute -top-1 -right-4 sm:-right-6 animate-pulse" />
        </div>

        {/* Status Message */}
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
          Oops... Looks Like You&apos;re Lost!
        </h1>
        <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mb-8 font-medium">
          The link you entered is incorrect, expired, or does not exist on this server. Please log in or register your account to continue.
        </p>

        {/* Dynamic Action Buttons - ONLY Login and Sign Up */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md">
          {/* Dynamic Login Button */}
          <Link
            href="/login"
            className="w-full sm:w-1/2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] border border-indigo-400/30"
          >
            <LogIn className="w-4 h-4" />
            <span>Login</span>
          </Link>

          {/* Dynamic Sign Up Button */}
          <Link
            href="/signup"
            className="w-full sm:w-1/2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-100 hover:text-white font-black text-sm shadow-lg shadow-black/40 flex items-center justify-center gap-2 transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Sign Up</span>
          </Link>
        </div>
      </main>

      {/* Footer Note */}
      <footer className="relative z-10 max-w-5xl mx-auto w-full text-center text-xs text-slate-500 py-4 font-mono">
        Secured by SEBI Regulatory Compliance Infrastructure
      </footer>
    </div>
  );
}
