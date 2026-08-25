'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Lock, Smartphone, LogOut, Loader2, Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '../../services/api';

export default function ProfileSettings() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'personal' | 'security'>('personal');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchProfile = async () => {
    try {
      const res = await api.getClientProfile();
      if (res.success && res.data) {
        setProfile(res.data);
        setName(res.data.name || '');
        setEmail(res.data.email || '');
        setMobile(res.data.mobile || res.data.phone || '');
        setAddress(res.data.address || '');
        if (res.data.dob) {
          setDob(new Date(res.data.dob).toISOString().split('T')[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profile', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = () => {
    api.logout();
    window.location.href = '/client-login';
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      await api.updateProfile({ name, mobile, address, dob });
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
      fetchProfile();
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setMsg({ type: 'error', text: 'New passwords do not match!' });
    }
    setSubmitting(true);
    setMsg({ type: '', text: '' });
    try {
      await api.changePassword({ currentPassword, newPassword });
      setMsg({ type: 'success', text: 'Password changed successfully! Redirecting to login...' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }, 1500);
    } catch (err: any) {
      setMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
        <p className="text-sm text-premium-text/60">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 max-w-5xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Profile & Settings</h1>
          <p className="text-sm text-premium-text/60 mt-1">Manage your personal information and security preferences.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Settings Nav */}
        <div className="w-full md:w-64 flex flex-col gap-2">
          <button 
            onClick={() => { setActiveTab('personal'); setMsg({ type: '', text: '' }); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'personal' ? 'bg-premium-primary/10 text-premium-primary' : 'text-premium-text/70 hover:bg-premium-cards hover:text-premium-text'}`}
          >
            <User className="w-5 h-5" /> Personal Info
          </button>
          <button 
            onClick={() => { setActiveTab('security'); setMsg({ type: '', text: '' }); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-left ${activeTab === 'security' ? 'bg-premium-primary/10 text-premium-primary' : 'text-premium-text/70 hover:bg-premium-cards hover:text-premium-text'}`}
          >
            <Lock className="w-5 h-5" /> Security & Password
          </button>
          <div className="my-2 border-t border-premium-border"></div>
          <button onClick={() => setIsLogoutModalOpen(true)} className="flex items-center gap-3 px-4 py-3 text-premium-danger hover:bg-premium-danger/10 rounded-xl font-medium transition-colors text-left">
            <LogOut className="w-5 h-5" /> Log Out
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 shadow-sm">
            
            {msg.text && (
              <div className={`mb-6 p-4 rounded-xl text-sm font-semibold border ${msg.type === 'success' ? 'bg-premium-success/10 text-premium-success border-premium-success/20' : 'bg-premium-danger/10 text-premium-danger border-premium-danger/20'}`}>
                {msg.text}
              </div>
            )}

            {activeTab === 'personal' && (
              <form onSubmit={handleUpdateProfile}>
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-premium-border">
                  <div className="w-20 h-20 rounded-full bg-premium-primary/20 flex items-center justify-center text-3xl font-bold text-premium-primary">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{profile?.name || 'User'}</h2>
                    <p className="text-premium-text/60">Registered on {new Date(profile?.user?.createdAt || Date.now()).toLocaleDateString()}</p>
                    <span className={`inline-block mt-2 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${profile?.status === 'ACTIVE' ? 'bg-premium-success/20 text-premium-success' : 'bg-premium-warning/20 text-premium-warning'}`}>
                      {profile?.status}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Email Address (Cannot change)</label>
                    <input type="email" value={email} disabled className="w-full bg-premium-bg/50 border border-premium-border rounded-xl px-4 py-3 text-premium-text/50 cursor-not-allowed" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Phone Number</label>
                    <input type="tel" value={mobile} onChange={e => setMobile(e.target.value)} required className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Date of Birth</label>
                    <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Residential Address</label>
                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={3} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors resize-none"></textarea>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-premium-border flex justify-end">
                  <button type="submit" disabled={submitting} className="bg-premium-primary hover:bg-premium-primary/90 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Profile Changes'}
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword}>
                <div className="mb-6">
                  <h3 className="text-lg font-bold">Change Password</h3>
                  <p className="text-sm text-premium-text/60">Update your account password to maintain security.</p>
                </div>

                <div className="space-y-6 max-w-md">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Current Password</label>
                    <div className="relative w-full"><input type={showPassword ? 'text' : 'password'}required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">New Password</label>
                    <div className="relative w-full"><input type={showPassword ? 'text' : 'password'}required minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-premium-text/70 uppercase">Confirm New Password</label>
                    <div className="relative w-full"><input type={showPassword ? 'text' : 'password'}required minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-premium-bg border border-premium-border rounded-xl px-4 py-3 text-premium-text focus:outline-none focus:border-premium-primary transition-colors" />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-premium-border flex justify-end">
                  <button type="submit" disabled={submitting} className="bg-premium-primary hover:bg-premium-primary/90 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update Password'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
            <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-center mb-2 text-slate-800 dark:text-white">Sign Out</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-6">Are you sure you want to sign out of your account?</p>
            <div className="flex justify-center space-x-3">
              <button onClick={() => setIsLogoutModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
              <button onClick={handleLogout} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Log Out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
