'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Handshake, CheckCircle2, Shield } from 'lucide-react';
import api from '../services/api';
import { useBranding } from '@/contexts/BrandingContext';

export default function LoginForm({ defaultRole }: { defaultRole?: string }) {
  const { logoUrl, appName } = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [inactivePopup, setInactivePopup] = useState(false);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [tenantName, setTenantName] = useState('RAGCP');
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  const loadingMessages = [
    "🔐 Authenticating your secure session...",
    "🌐 Establishing encrypted connection...",
    "✨ Loading your personalized dashboard...",
    "📊 Preparing compliance and market data...",
    "🚀 Optimizing your experience...",
    "🎉 Almost there, finalizing setup..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'inactive') {
      setInactivePopup(true);
    } else if (errorParam === 'expired') {
      setError('Session expired. Please log in again.');
    }

    const roleParam = defaultRole || searchParams.get('role');
    if (roleParam === 'super-admin') {
      setEmail('superadmin@ragcp.com');
      setPassword('Admin@12345');
    } else if (roleParam === 'admin') {
      setEmail('admin@alpharesearch.com');
      setPassword('Admin@12345');
    } else if (roleParam === 'client') {
      setEmail('client@demomail.com');
      setPassword('Admin@12345');
    }
  }, [searchParams, defaultRole]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      if (res.success) {
        setIsSubmitting(false);
        setLoading(true);
        const user = res.data.user;
        if (user.tenantName) setTenantName(user.tenantName);
        if (user.tenantLogo) setTenantLogo(user.tenantLogo);

        if (user.role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (user.role === 'CLIENT') {
          router.push('/client');
        } else if (user.role === 'RESEARCHER') {
          router.push('/researcher');
        } else if (user.role === 'COMPLIANCE_OFFICER') {
          router.push('/compliance-officer');
        } else {
          router.push('/admin');
        }
      } else {
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setForgotSuccess(null);

    try {
      const res = await api.forgotPassword({ email });
      if (res.success) {
        setForgotSuccess('A temporary password has been sent to your email.');
      } else {
        setError(res.message || 'Failed to request password reset.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4F7FB] dark:bg-slate-950 font-sans antialiased overflow-x-hidden">

      {/* ── LEFT PANEL (Branding & Trust Showcase) ── */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-[#070D1B] relative flex-col justify-between p-12 xl:p-16 border-r border-slate-800/80">
        {/* Glow ambient effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Tagline / Micro Header */}
        <div className="relative z-10 flex items-center space-x-2.5">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Institutional Audit System
          </span>
        </div>

        {/* Center Hero Branding */}
        <div className="relative z-10 my-auto flex flex-col items-center text-center max-w-lg mx-auto">
          <div className="relative mb-8 group">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full scale-90 group-hover:scale-110 transition-transform duration-500" />
            <div className="relative w-32 h-32 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700/80 shadow-2xl flex items-center justify-center p-4">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="object-contain max-h-full max-w-full" />
              ) : (
                <Shield className="w-12 h-12 text-blue-400 stroke-[1.5]" />
              )}
            </div>
          </div>

          <h1 className="text-3xl xl:text-4xl font-black text-white tracking-tight leading-tight uppercase">
            {appName} GOVERNANCE
          </h1>
          <p className="mt-3 text-sm xl:text-base text-slate-400 font-medium tracking-wide">
            Securing Financial Compliance and Trading Audit
          </p>

          {/* Key Metric Pills */}
          <div className="mt-12 grid grid-cols-3 gap-6 w-full pt-8 border-t border-slate-800/60">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-2.5 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Trusted</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-2.5 shadow-inner">
                <Handshake className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Secure</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mb-2.5 shadow-inner">
                <CheckCircle2 className="w-6 h-6 text-blue-400" />
              </div>
              <span className="text-xs font-semibold text-slate-300">Compliant</span>
            </div>
          </div>
        </div>

        {/* Bottom Compliance Label */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/50 pt-4">
          <span>AES-256 Bit Encryption</span>
          <span>ISO 27001 Certified System</span>
        </div>
      </div>

      {/* ── RIGHT PANEL (Login Form) ── */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-center items-center px-6 py-12 sm:px-12 relative bg-[#F8FAFC] dark:bg-slate-950">

        {/* Subtle radial light background */}
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full bg-blue-400/5 blur-[120px] pointer-events-none" />

        {/* Mobile Logo */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 shadow-md p-2">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="object-contain max-h-full max-w-full" />
            ) : (
              <Shield className="w-7 h-7 text-blue-400" />
            )}
          </div>
          <span className="text-lg font-bold text-slate-900 dark:text-white">{appName} Governance</span>
        </div>

        {/* Login Box */}
        <div className="w-full max-w-[430px] bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-8 sm:p-10 shadow-[0_20px_50px_rgba(15,23,42,0.06)] relative z-10 backdrop-blur-xl">

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Access Platform</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Enter your credentials to authenticate session
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs rounded-xl flex items-center space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs rounded-xl flex items-center space-x-2.5">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Lock className="h-4 w-4" />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Authenticate Session</span>
                )}
              </button>

              <div className="pt-2 text-center space-y-2">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); setForgotSuccess(null); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  Forgot Password?
                </button>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Don't have an account?{' '}
                  <Link href="/register" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    Sign up here
                  </Link>
                </div>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                  Registered Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send Reset Link'}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(false); setError(null); }}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Security Footer */}
        <p className="mt-8 text-[11px] text-slate-400 dark:text-slate-600 text-center font-medium">
          Secured Session Encryption · SSL · AES-256
        </p>
      </div>

      {/* ── Loading Overlay Modal ── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/30 flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Secure Login in Progress</h3>
            <p className="text-xs text-blue-400 font-medium mb-6 h-6">{loadingMessages[loadingTextIndex]}</p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full animate-[progress_6s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      {/* ── Inactive Account Popup ── */}
      {inactivePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-5 bg-red-50 dark:bg-red-500/10 border-b border-red-100 dark:border-red-500/20 flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Account Inactive</h3>
            </div>
            <div className="p-5">
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your account is currently inactive or suspended. Please contact the administrator.
              </p>
              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => setInactivePopup(false)}
                  className="px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          0% { width: 10%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </div>
  );
}