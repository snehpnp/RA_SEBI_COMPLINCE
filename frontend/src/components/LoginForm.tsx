'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, ShieldAlert, AlertTriangle, X } from 'lucide-react';
import api from '../services/api';
import { useBranding } from '@/contexts/BrandingContext';

export default function LoginForm({ defaultRole, onFlip }: { defaultRole?: string; onFlip?: () => void }) {
  const { logoUrl, appName } = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'suspended' | 'inactive' | 'expired' | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
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

  const dismissAlert = () => {
    setErrorType(null);
    setError(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    }
  };

  useEffect(() => {
    const errorParam = searchParams?.get('error') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null);
    if (errorParam === 'suspended' || errorParam === 'inactive' || errorParam === 'expired') {
      setErrorType(errorParam);
      setError(null);
    } else {
      setErrorType(null);
    }

    const roleParam = defaultRole || searchParams?.get('role') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null);
    if (roleParam === 'super-admin') {
      setEmail('superadmin@gmail.com');
      setPassword('Admin@987');
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
    setErrorType(null);

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
    setErrorType(null);
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
    <>
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Access Platform</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enter your credentials to authenticate session
          </p>
        </div>

        {/* ── INLINE ALERTS (Replacing disruptive modals) ── */}
        {errorType === 'inactive' && (
          <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start justify-between space-x-3 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-amber-900 dark:text-amber-100 text-sm mb-0.5">Account Deactivated or Inactive</p>
                <p className="text-amber-700 dark:text-amber-300/90">
                  Your account credentials or entity access is currently deactivated or pending review. Please reach out to your organization administrator or compliance desk.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorType === 'suspended' && (
          <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start justify-between space-x-3 text-rose-900 dark:text-rose-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-rose-900 dark:text-rose-100 text-sm mb-0.5">Organization Portal Suspended</p>
                <p className="text-rose-700 dark:text-rose-300/90">
                  This portal has been suspended by Super Admin. Please contact Super Admin compliance support to reactivate your entity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorType === 'expired' && (
          <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-start justify-between space-x-3 text-blue-900 dark:text-blue-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-0.5">Session Expired</p>
                <p className="text-blue-700 dark:text-blue-300/90">
                  Your session has expired. Please authenticate your credentials to log in again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs rounded-2xl flex items-center justify-between space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {forgotSuccess && (
          <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs rounded-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
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
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={(e) => {
                    if (onFlip) {
                      e.preventDefault();
                      onFlip();
                    } else {
                      router.push('/register');
                    }
                  }}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                >
                  Sign up here
                </button>
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
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Loading Overlay Modal (Active during successful login transition) ── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform scale-100 opacity-100 transition-all duration-300">
            <div className="relative w-24 h-24 mb-6">
              {/* Outer rotating dashed ring */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/30 dark:border-blue-500/20 animate-[spin_4s_linear_infinite]" />
              {/* Inner rotating ring */}
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-[spin_2s_linear_infinite]" />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 m-4 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Secure Login in Progress</h3>
            <p className="text-xs text-slate-500 dark:text-blue-400 font-medium mb-6 h-6 transition-all duration-300">{loadingMessages[loadingTextIndex]}</p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 h-full rounded-full animate-[progress_6s_ease-in-out_infinite]" />
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
    </>
  );
}