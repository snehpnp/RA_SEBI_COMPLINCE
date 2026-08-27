'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, Handshake, CheckCircle2, Shield } from 'lucide-react';
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
    <>
      <div className="w-full">

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
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline"
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
    </>
  );
}