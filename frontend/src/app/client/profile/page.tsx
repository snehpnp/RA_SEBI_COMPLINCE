'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, FileText, MapPin, Briefcase, Activity, Target, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import ChangePasswordBlock from '../../../components/ChangePasswordBlock';
import { toast } from 'react-hot-toast';

export default function ClientProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    pan: '',
    aadhaar: '',
    category: '',
    occupation: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
    riskProfile: '',
    netWorth: '',
    investmentLimit: '',
    investmentPeriod: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/client/profile');
      if (res.data.success) {
        const client = res.data.data;
        const profile = client.profile || {};
        const user = client.user || {};
        
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          pan: client.pan || '',
          aadhaar: client.aadhaar || '',
          category: client.category || '',
          occupation: client.occupation || '',
          addressLine1: profile.addressLine1 || '',
          addressLine2: profile.addressLine2 || '',
          city: profile.city || '',
          state: profile.state || '',
          country: profile.country || '',
          zipCode: profile.zipCode || '',
          riskProfile: profile.riskProfile || '',
          netWorth: profile.netWorth || '',
          investmentLimit: profile.investmentLimit || '',
          investmentPeriod: profile.investmentPeriod || ''
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">My Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal & KYC Information</h2>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Basic Info</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-5 w-5 text-gray-400" /></div>
                <input type="email" value={formData.email} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>

            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">KYC Details</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.pan} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aadhaar</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.aadhaar} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="NON_INDIVIDUAL">Non-Individual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Occupation</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">Address</h3>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><MapPin className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-full md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 col-span-full md:col-span-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zip Code</label>
                <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">Risk Profile</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Risk Assessment</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ShieldAlert className="h-5 w-5 text-gray-400" /></div>
                <select value={formData.riskProfile} onChange={(e) => setFormData({ ...formData, riskProfile: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500">
                  <option value="CONSERVATIVE">Conservative</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="AGGRESSIVE">Aggressive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Net Worth</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Activity className="h-5 w-5 text-gray-400" /></div>
                <input type="number" value={formData.netWorth} onChange={(e) => setFormData({ ...formData, netWorth: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Investment Limit</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Target className="h-5 w-5 text-gray-400" /></div>
                <input type="number" value={formData.investmentLimit} onChange={(e) => setFormData({ ...formData, investmentLimit: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Investment Period (Months)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Clock className="h-5 w-5 text-gray-400" /></div>
                <input type="number" value={formData.investmentPeriod} onChange={(e) => setFormData({ ...formData, investmentPeriod: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

          </div>
          
          <div className="flex justify-end pt-4">
            <button type="submit" disabled={saving} className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50">
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
