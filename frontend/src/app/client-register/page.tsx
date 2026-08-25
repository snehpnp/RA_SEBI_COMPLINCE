'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, ArrowRight, Loader2, CheckCircle2, User, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export default function ClientRegister() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const regRes = await api.registerClient({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        mobile: formData.phone, // Backend expects 'mobile'
        role: 'CLIENT'
      });
      
      if (!regRes.success) throw new Error(regRes.message || 'Registration failed');

      setSuccess(true);
      setTimeout(() => {
        router.push('/client-login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-premium-bg text-premium-text flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-premium-primary/10 blur-[150px] pointer-events-none" />
        <div className="z-10 bg-premium-cards rounded-3xl border border-premium-border shadow-2xl p-10 flex flex-col items-center text-center max-w-md animate-in fade-in zoom-in duration-500">
          <div className="w-24 h-24 rounded-full bg-premium-success/20 flex items-center justify-center mb-6">
            <CheckCircle2 className="w-12 h-12 text-premium-success" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-premium-text/60 mb-6">
            Welcome aboard. You can now log in and explore our premium research plans. Redirecting to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-premium-bg text-premium-text flex flex-col items-center py-12 px-4 relative overflow-hidden font-sans">
      <div className="absolute top-[10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-premium-primary/10 blur-[150px] pointer-events-none" />
      
      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center justify-center space-y-4 mb-10 text-center">
          <ShieldCheck className="h-12 w-12 text-premium-primary" />
          <h1 className="text-3xl font-bold tracking-tight">Become a Member</h1>
          <p className="text-premium-text/60">
            Sign up to access exclusive market insights and subscribe to premium plans.
          </p>
        </div>

        <div className="bg-premium-cards rounded-3xl border border-premium-border shadow-2xl p-8">
          
          {error && (
            <div className="mb-6 p-4 bg-premium-danger/10 border border-premium-danger/30 rounded-xl text-premium-danger text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-premium-text/70 uppercase">Full Name</label>
              <div className="relative w-full"><input required type="text" name="name" value={formData.name} onChange={handleChange} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:ring-2 focus:ring-premium-primary/50 transition-shadow" placeholder="John Doe" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-premium-text/70 uppercase">Email Address</label>
              <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:ring-2 focus:ring-premium-primary/50 transition-shadow" placeholder="john@example.com" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-premium-text/70 uppercase">Phone Number</label>
              <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:ring-2 focus:ring-premium-primary/50 transition-shadow" placeholder="9876543210" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-premium-text/70 uppercase">Password</label>
              <input required type={showPassword ? 'text' : 'password'}name="password" value={formData.password} onChange={handleChange} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:ring-2 focus:ring-premium-primary/50 transition-shadow" placeholder="••••••••" />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
            </div>
            
            <div className="pt-4">
              <button type="submit" disabled={loading} className="w-full bg-premium-primary hover:bg-premium-primary/90 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-premium-primary/20">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-8 text-center text-sm text-premium-text/60">
          Already have an account?{' '}
          <Link href="/client-login" className="text-premium-primary hover:text-premium-primary/80 font-medium transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
