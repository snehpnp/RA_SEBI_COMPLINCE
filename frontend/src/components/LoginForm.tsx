'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';

export default function LoginForm({ defaultRole }: { defaultRole?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      if (res.success) {
        const user = res.data.user;
        if (user.tenantName) setTenantName(user.tenantName);
        if (user.tenantLogo) setTenantLogo(user.tenantLogo);
        
        if (user.role === 'SUPER_ADMIN') {
          router.push('/super-admin');
        } else if (user.role === 'CLIENT') {
          router.push('/client');
        } else {
          router.push('/admin');
        }
        return; // Early return to avoid setting loading to false
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-[10%] left-[20%] w-[350px] h-[350px] rounded-full bg-primary-600/10 blur-[100px]" />
      
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-100/80 dark:bg-slate-950/80 backdrop-blur-md">
          <div className="glassmorphism p-8 rounded-3xl border border-slate-400 dark:border-white/10 shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
            <div className="relative mb-10 mt-6 mx-auto perspective-1000">
              {/* Outer glowing effect behind text */}
              <div className="absolute inset-0 bg-primary-500/20 blur-3xl rounded-full animate-[pulse_3s_ease-in-out_infinite]"></div>
              
              {/* Animated Company Name */}
              <div className="relative z-10 flex items-center justify-center space-x-3 animate-[float_4s_ease-in-out_infinite]">
                {tenantLogo ? (
                  <img src={`${(process.env.NODE_ENV === 'production' ? 'https://compliance.pnpuniverse.in/backend' : 'http://localhost:5000')}${tenantLogo}`} alt="Company Logo" className="h-16 w-16 object-contain animate-[spin_6s_linear_infinite]" />
                ) : (
                  <ShieldCheck className="h-12 w-12 text-primary-500 animate-[spin_6s_linear_infinite]" />
                )}
                <h1 className="text-4xl sm:text-5xl font-black tracking-widest uppercase">
                  <span className="bg-gradient-to-r from-primary-400 via-emerald-400 to-primary-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(59,130,246,0.6)]">
                    {tenantName}
                  </span>
                </h1>
              </div>
              <div className="mt-2 text-center relative z-10">
                <p className="text-xs tracking-[0.3em] text-slate-400 uppercase font-semibold bg-gradient-to-r from-transparent via-slate-400 to-transparent bg-clip-text text-transparent animate-pulse">
                  Platform Access
                </p>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2 text-center">
              Secure Login in Progress
            </h3>
            
            <div className="h-8 mb-6 flex items-center justify-center text-center">
              <p className="text-sm text-primary-600 dark:text-primary-400 font-medium animate-fade-in-up" key={loadingTextIndex}>
                {loadingMessages[loadingTextIndex]}
              </p>
            </div>

            {/* Engaging Progress Bar */}
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2.5 mb-2 overflow-hidden relative">
              <div className="bg-gradient-to-r from-primary-400 to-primary-600 h-2.5 rounded-full w-full animate-[progress_15s_ease-in-out_forwards]"></div>
              {/* Shimmer effect */}
              <div className="absolute top-0 left-0 right-0 bottom-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
              Please wait while we set things up...
            </p>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          0% { width: 5%; }
          20% { width: 30%; }
          50% { width: 60%; }
          80% { width: 85%; }
          100% { width: 98%; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotateX(5deg) rotateY(-5deg); }
          50% { transform: translateY(-15px) rotateX(-5deg) rotateY(5deg); }
        }
        .perspective-1000 {
          perspective: 1000px;
        }
      `}</style>

      
      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="flex items-center justify-center space-x-2 mb-8">
          <ShieldCheck className="h-10 w-10 text-primary-600 dark:text-primary-500" />
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white to-primary-400 bg-clip-text text-transparent">
            RAGCP
          </span>
        </div>

        {/* Card */}
        <div className="glassmorphism p-8 rounded-2xl border border-slate-400 dark:border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold mb-2">Access Platform</h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs mb-6">Enter your credential tokens to authenticate session</p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-xs rounded-xl flex items-center space-x-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{forgotSuccess}</span>
            </div>
          )}

          {!isForgotPassword ? (
            <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="h-4 w-4" />
                </span>
                <div className="relative w-full"><input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition placeholder:text-slate-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition placeholder:text-slate-600"
                  placeholder="••••••••"
                />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold text-sm transition hover-lift shadow-lg shadow-primary-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Authenticate Session</span>
              )}
            </button>
            <div className="text-center pt-2 flex flex-col space-y-3">
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(true); setError(null); setForgotSuccess(null); }} 
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 transition"
              >
                Forgot Password?
              </button>
              {searchParams.get('role') === 'client' && (
                <Link href="/register" className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                  Don't have an account? <span className="text-primary-600 dark:text-primary-400 font-semibold hover:underline">Sign up</span>
                </Link>
              )}
            </div>
          </form>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Registered Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition placeholder:text-slate-600"
                    placeholder="name@company.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition hover-lift shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <span>Reset Password</span>
                )}
              </button>
              <div className="text-center pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsForgotPassword(false); setError(null); setForgotSuccess(null); }} 
                  className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition"
                >
                  Back to Login
                </button>
              </div>
            </form>
          )}


        </div>


      </div>

      {/* Inactive Account Modal Popup */}
      {inactivePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="glassmorphism w-full max-w-sm rounded-3xl border border-slate-400 dark:border-white/10 overflow-hidden shadow-2xl animate-fade-in-up">
            <div className="p-6 bg-red-500/10 border-b border-red-500/20 flex items-center space-x-3">
              <div className="h-10 w-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Account Inactive</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Your account has been suspended or is currently inactive. Please contact the administrator for further assistance.
              </p>
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setInactivePopup(false)}
                  className="px-6 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-xl text-sm font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


