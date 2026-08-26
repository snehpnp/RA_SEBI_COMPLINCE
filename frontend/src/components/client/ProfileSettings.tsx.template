'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Briefcase, FileText, Loader2, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
import api from '../../../services/api';
import ChangePasswordBlock from '../../../components/ChangePasswordBlock';
import { toast } from 'react-hot-toast';

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    companyName: '',
    raType: '',
    sebiRegistration: '',
    pan: '',
    gst: '',
    address: '',
    ownerName: '',
    website: '',
    logoUrl: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile/admin');
      if (res.data.success) {
        const user = res.data.data;
        const tenant = user.tenant || {};
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          companyName: tenant.companyName || '',
          raType: tenant.raType || '',
          sebiRegistration: tenant.sebiRegistration || '',
          pan: tenant.pan || '',
          gst: tenant.gst || '',
          address: tenant.address || '',
          ownerName: tenant.ownerName || '',
          website: tenant.website || '',
          logoUrl: tenant.logoUrl || ''
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
      const res = await api.put('/profile/admin', formData);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Admin / Company Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Information</h2>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2">Personal Details</h3>
            
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

            <h3 className="col-span-full text-lg font-medium text-gray-800 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-2 mt-4">Company Details</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Building className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.companyName} onChange={(e) => setFormData({ ...formData, companyName: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SEBI Registration</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.sebiRegistration} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PAN Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.pan} onChange={(e) => setFormData({ ...formData, pan: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">GST Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FileText className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.gst} onChange={(e) => setFormData({ ...formData, gst: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="col-span-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" rows={3} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><LinkIcon className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ImageIcon className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.logoUrl} onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
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
