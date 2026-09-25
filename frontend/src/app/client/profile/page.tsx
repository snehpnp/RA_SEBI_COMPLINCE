'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, FileText, MapPin, Briefcase, Loader2, ShieldCheck, Lock, CheckCircle2, Calendar } from 'lucide-react';
import api from '../../../services/api';
import ChangePasswordBlock from '../../../components/ChangePasswordBlock';
import { toast } from 'react-hot-toast';

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    mobile: '',
    pan: '',
    aadhaar: '',
    dob: '',
    category: 'INDIVIDUAL',
    occupation: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: 'India',
    zipCode: ''
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

  const formatDob = (dobVal?: any) => {
    if (!dobVal) return '';
    const str = String(dobVal).trim();
    if (str.includes('T')) return str.split('T')[0];
    return str;
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/client/profile');
      if (res.data?.success) {
        const client = res.data.data;
        const profile = client.profile || {};
        const user = client.user || {};
        
        const kycDone = Boolean(
          client.kraVerified || 
          client.kycStatus === 'VERIFIED' ||
          client.status === 'ACTIVE' || 
          client.status === 'AGREEMENT_PENDING' ||
          (client.pan && client.pan.length === 10)
        );
        setIsKycVerified(kycDone);

        const fullName = client.name || profile.panName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
        const nameParts = fullName.split(' ');
        const firstName = user.firstName || nameParts[0] || '';
        const lastName = user.lastName || nameParts.slice(1).join(' ') || '';

        setFormData({
          firstName,
          lastName,
          fullName,
          email: user.email || client.email || '',
          mobile: user.mobile || client.mobile || '',
          pan: client.pan || profile.pan || '',
          aadhaar: formatMaskedAadhaar(client.aadhaar || profile.aadhaar),
          dob: formatDob(client.dob || profile.dob),
          category: client.category || 'INDIVIDUAL',
          occupation: client.occupation || 'Job / Salaried',
          addressLine1: profile.addressLine1 || client.address || '',
          addressLine2: profile.addressLine2 || '',
          city: profile.city || client.city || '',
          state: profile.state || client.state || '',
          country: profile.country || 'India',
          zipCode: profile.zipCode || client.zipCode || ''
        });

        console.log('%c👤 [PROFILE PAGE] Client Profile Data Loaded:', 'background: #0f172a; color: #a5b4fc; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
        console.table({
          'Full Name': fullName,
          'DOB': formatDob(client.dob || profile.dob),
          'PAN': client.pan || profile.pan || '—',
          'Aadhaar': formatMaskedAadhaar(client.aadhaar || profile.aadhaar),
          'Address': profile.addressLine1 || client.address || '—',
          'City': profile.city || client.city || '—',
          'State': profile.state || client.state || '—',
          'Pincode': profile.zipCode || client.zipCode || '—',
          'KYC Verified': kycDone ? 'YES' : 'NO'
        });
      }
    } catch (err: any) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/client/profile', formData);
      if (res.data.success) {
        toast.success('Profile updated successfully');
        await fetchProfile();
      } else {
        toast.error(res.data.message || 'Update failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Manage your account and view verified government credentials</p>
        </div>
        {isKycVerified ? (
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>DigiLocker KYC Verified</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-bold">
            <span>KYC Verification Pending</span>
          </div>
        )}
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal &amp; KYC Information</h2>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ── DigiLocker Verified Credentials Section ── */}
            <h3 className="col-span-full text-base font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                DigiLocker Government Verified Credentials
              </span>
              {isKycVerified && (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  Locked &amp; Tamper-Proof
                </span>
              )}
            </h3>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Full Name (as per Govt ID)</label>
                {formData.fullName && isKycVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                <input 
                  type="text" 
                  value={formData.fullName || `${formData.firstName} ${formData.lastName}`.trim()} 
                  readOnly={isKycVerified} 
                  className={`pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-gray-900 dark:text-white font-medium ${isKycVerified ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed' : 'bg-transparent focus:ring-2 focus:ring-indigo-500'}`} 
                />
                {isKycVerified && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-emerald-500" /></div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth (DOB)</label>
                {formData.dob && isKycVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <input 
                  type="text" 
                  value={formData.dob || '—'} 
                  readOnly={isKycVerified} 
                  onChange={(e) => !isKycVerified && setFormData({ ...formData, dob: e.target.value })}
                  placeholder="DD-MM-YYYY"
                  className={`pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-gray-900 dark:text-white font-medium ${isKycVerified ? 'bg-gray-50 dark:bg-gray-700/50 cursor-not-allowed font-mono font-bold' : 'bg-transparent focus:ring-2 focus:ring-indigo-500'}`} 
                />
                {isKycVerified && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-emerald-500" /></div>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">PAN Number</label>
                {formData.pan && isKycVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> DigiLocker Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-gray-400" /></div>
                <input 
                  type="text" 
                  value={formData.pan || '—'} 
                  readOnly 
                  className="pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-900 dark:text-white font-mono font-bold cursor-not-allowed uppercase" 
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-emerald-500" /></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Aadhaar Number</label>
                {formData.aadhaar && isKycVerified && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Masked &amp; Verified
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ShieldCheck className="h-5 w-5 text-gray-400" /></div>
                <input 
                  type="text" 
                  value={formData.aadhaar || '—'} 
                  readOnly 
                  className="pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-900 dark:text-white font-mono font-bold cursor-not-allowed" 
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-emerald-500" /></div>
              </div>
            </div>

            {/* ── Basic Account Info ── */}
            <h3 className="col-span-full text-base font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">
              Account Details
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" value={formData.email} readOnly className="pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-500 cursor-not-allowed font-medium" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="pl-10 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.category} readOnly className="pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-700 dark:text-gray-300 cursor-not-allowed font-medium" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Occupation</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <input
                  type="text"
                  value={formData.occupation || 'Job / Salaried'}
                  readOnly
                  disabled
                  className="pl-10 pr-9 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-700 dark:text-gray-300 cursor-not-allowed font-medium"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-gray-400" /></div>
              </div>
            </div>

            {/* ── Address Details ── */}
            <h3 className="col-span-full text-base font-semibold text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">
              Verified Address
            </h3>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} className="pl-10 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-full md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City / District</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-full md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <input type="text" value={formData.country} readOnly className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2.5 text-gray-500 cursor-not-allowed font-medium" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pincode / Zip Code</label>
                <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

          </div>
          
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving} className="inline-flex items-center px-6 py-2.5 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all">
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <ChangePasswordBlock />
    </div>
  );
}
