'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export default function ClientLogin() {
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.login({ email, password });
      if (res.success) {
        const user = res.data.user;
        if (user.role === 'CLIENT') {
          window.location.href = '/client';
        } else {
          setError('This login portal is only for clients.');
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError(res.message || 'Login failed. Check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-premium-bg text-premium-text flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Premium subtle background glow */}
      <div className="absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-full bg-premium-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[400px] h-[400px] rounded-full bg-premium-success/5 blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center space-y-4 mb-10">
          <div className="bg-premium-cards p-3 rounded-2xl border border-premium-border shadow-xl">
            <ShieldCheck className="h-10 w-10 text-premium-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-premium-text">
            Client Portal
          </h1>
          <p className="text-sm text-premium-text/60">Secure Access for Premium Members</p>
        </div>

        <div className="bg-premium-cards p-8 rounded-3xl border border-premium-border shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div className="p-3 bg-premium-danger/10 border border-premium-danger/30 rounded-xl text-premium-danger text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-premium-danger"></span>
                {error}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-premium-text/70 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-premium-text/40" />
                <div className="relative w-full"><input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-premium-bg border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-premium-text placeholder-premium-text/30 focus:outline-none focus:ring-2 focus:ring-premium-primary/50 focus:border-premium-primary transition-all duration-300"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-semibold text-premium-text/70 uppercase tracking-wider">Password</label>
                <Link href="/forgot-password" className="text-xs text-premium-primary hover:text-premium-primary/80 transition-colors">
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-premium-text/40" />
                <input
                  type={showPassword ? 'text' : 'password'}required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-premium-bg border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-premium-text placeholder-premium-text/30 focus:outline-none focus:ring-2 focus:ring-premium-primary/50 focus:border-premium-primary transition-all duration-300"
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
              className="w-full bg-premium-primary hover:bg-premium-primary/90 text-white font-medium rounded-xl py-3.5 flex items-center justify-center space-x-2 transition-all duration-300 hover:shadow-lg hover:shadow-premium-primary/25 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-premium-text/60">
            Don't have an account?{' '}
            <Link href="/client-register" className="text-premium-primary hover:text-premium-primary/80 font-medium transition-colors">
              Apply Now
            </Link>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-xs text-premium-text/40 flex gap-4">
        <Link href="/legal/terms" className="hover:text-premium-text/70">Terms</Link>
        <Link href="/legal/privacy" className="hover:text-premium-text/70">Privacy</Link>
        <Link href="/legal/disclaimer" className="hover:text-premium-text/70">Disclaimer</Link>
      </div>
    </div>
  );
}
