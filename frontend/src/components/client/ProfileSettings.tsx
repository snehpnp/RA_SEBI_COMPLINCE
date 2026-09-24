'use client';

import { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Calendar, MapPin, Loader2, ShieldCheck, 
  ShieldAlert, CreditCard, Lock, CheckCircle2, ArrowRight, Building2, Briefcase
} from 'lucide-react';
import api from '../../services/api';
import ChangePasswordBlock from '../ChangePasswordBlock';
import { toast } from 'react-hot-toast';

interface ProfileSettingsProps {
  onNavigateToKyc?: () => void;
}

export default function ProfileSettings({ onNavigateToKyc }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    dob: '',
    pan: '',
    aadhaar: '',
    category: 'INDIVIDUAL',
    occupation: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India'
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const formatMaskedAadhaar = (aadhaarStr?: string | null) => {
    if (!aadhaarStr) return '';
    const clean = String(aadhaarStr).trim();
    if (clean.includes('XXXX') || clean.includes('••••')) return clean;
    if (clean.length === 12) {
      return `XXXX-XXXX-${clean.slice(8)}`;
    }
    if (clean.length === 4) {
      return `XXXX-XXXX-${clean}`;
    }
    return clean;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.getClientProfile();
      if (res.success && res.data) {
        const client = res.data;
        const profile = client.profile || {};
        const formatDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '';
        
        const kycDone = Boolean(
          client.kraVerified || 
          client.status === 'ACTIVE' || 
          client.status === 'AGREEMENT_PENDING' ||
          (client.pan && client.pan.length === 10)
        );
        setIsKycVerified(kycDone);

        setFormData({
          name: client.name || client.user?.name || '',
          email: client.email || client.user?.email || '',
          mobile: client.mobile || client.phone || client.user?.mobile || '',
          dob: formatDate(client.dob || profile.dob),
          pan: client.pan || '',
          aadhaar: formatMaskedAadhaar(client.aadhaar),
          category: client.category || 'INDIVIDUAL',
          occupation: client.occupation || 'Job / Salaried',
          address: profile.addressLine1 || client.address || '',
          city: profile.city || '',
          state: profile.state || '',
          zipCode: profile.zipCode || '',
          country: profile.country || 'India'
        });
      }
    } catch (err) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        dob: formData.dob,
        address: formData.address,
        addressLine1: formData.address,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode
      };
      const res = await api.updateProfile(payload);
      if (res.success) {
        toast.success('Profile updated successfully');
      } else {
        toast.error(res.message || 'Update failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Title & KYC Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Profile Settings</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal profile and view DigiLocker KYC verified credentials
          </p>
        </div>

        {/* KYC Verification Badge */}
        {isKycVerified ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>DigiLocker KYC Verified</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold tracking-wide">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>KYC Verification Pending</span>
            {onNavigateToKyc && (
              <button
                type="button"
                onClick={onNavigateToKyc}
                className="ml-1 inline-flex items-center gap-1 underline hover:text-amber-700 dark:hover:text-amber-300 font-semibold"
              >
                Complete KYC <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Profile Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 overflow-hidden">
        <form onSubmit={handleUpdate} className="p-6 md:p-8 space-y-8">
          
          {/* SECTION 1: DigiLocker KYC & Government Identity Details */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    DigiLocker & KYC Verification Details
                  </h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Government identity authenticated via DigiLocker UIDAI / Income Tax Department
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" /> SEBI Locked
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* PAN Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    PAN Number
                  </label>
                  {formData.pan ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500">Not verified</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <CreditCard className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.pan || ''}
                    readOnly
                    placeholder={isKycVerified ? 'Verified via DigiLocker' : 'Complete KYC to verify PAN'}
                    className="pl-10 pr-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white cursor-not-allowed uppercase"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Income Tax Department Permanent Account Number
                </p>
              </div>

              {/* Aadhaar Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Aadhaar Number
                  </label>
                  {formData.aadhaar ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Masked & Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-500">Not verified</span>
                  )}
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <ShieldCheck className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.aadhaar || ''}
                    readOnly
                    placeholder={isKycVerified ? 'XXXX-XXXX-XXXX' : 'Complete KYC to verify Aadhaar'}
                    className="pl-10 pr-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  Masked UIDAI Aadhaar number as per SEBI privacy guidelines
                </p>
              </div>

              {/* Client Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Client Category
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Building2 className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.category}
                    readOnly
                    className="pl-10 pr-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Occupation
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.occupation || 'Job / Salaried'}
                    readOnly
                    className="pl-10 pr-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-900 dark:text-white cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Personal Details */}
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
              <div className="p-1.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Personal Information
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Basic contact details linked to your research advisory subscription
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Full Name {isKycVerified && <span className="text-[10px] text-slate-400 font-normal">(As per DigiLocker)</span>}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    readOnly
                    className="pl-10 pr-9 w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Lock className="h-3.5 w-3.5 text-slate-400" />
                  </div>
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Mobile Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="tel"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="pl-10 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                    required
                  />
                </div>
              </div>

              {/* DOB */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Date of Birth
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                    className="pl-10 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Address Information */}
          <div>
            <div className="flex items-center gap-2.5 border-b border-slate-100 dark:border-white/10 pb-3 mb-5">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Residential / Communication Address
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Address details synchronized with DigiLocker Aadhaar KYC
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Street Address
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none">
                    <MapPin className="h-4 w-4 text-slate-400" />
                  </div>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter full street address"
                    className="pl-10 w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-4 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition resize-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="State"
                    className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    ZIP / Pincode
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    placeholder="Pincode"
                    maxLength={6}
                    className="w-full rounded-xl border border-slate-300 dark:border-white/15 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs text-slate-600 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/10">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Block */}
      <ChangePasswordBlock />
    </div>
  );
}
