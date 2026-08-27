'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import ChangePasswordBlock from '../../../components/ChangePasswordBlock';
import { toast } from 'react-hot-toast';
import { useBranding } from '../../../contexts/BrandingContext';

export default function SuperAdminProfilePage() {
  const { refreshBranding, logoUrl: currentLogoUrl, faviconUrl: currentFaviconUrl } = useBranding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: ''
  });

  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingData, setBrandingData] = useState({
    appName: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile/super-admin');
      if (res.data.success) {
        const { firstName, lastName, email, mobile } = res.data.data;
        setFormData({ firstName: firstName || '', lastName: lastName || '', email: email || '', mobile: mobile || '' });
      }

      const brandingRes = await api.get('/system-settings/branding');
      if (brandingRes.data.success && brandingRes.data.data) {
        setBrandingData({ appName: brandingRes.data.data.appName || '' });
      }
    } catch (err: any) {
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.put('/profile/super-admin', formData);
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

  const handleBrandingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBrandingSaving(true);
      const fd = new FormData();
      fd.append('appName', brandingData.appName);
      if (logoFile) fd.append('logo', logoFile);
      if (faviconFile) fd.append('favicon', faviconFile);

      const res = await api.put('/system-settings/branding', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        toast.success('Global branding updated! Sidebar logo updated instantly.');
        setLogoFile(null);
        setFaviconFile(null);
        setLogoPreview(null);
        setFaviconPreview(null);
        await refreshBranding(); // ← sidebar logo turant update karega
      } else {
        toast.error(res.data.message || 'Branding update failed');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Branding update failed');
    } finally {
      setBrandingSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">Super Admin Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal Information</h2>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={formData.email}
                  readOnly
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.mobile}
                  onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                  className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Save Changes
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Global Application Branding</h2>
        <form onSubmit={handleBrandingUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Application Name</label>
              <input
                type="text"
                value={brandingData.appName}
                onChange={(e) => setBrandingData({ ...brandingData, appName: e.target.value })}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. RAGCP"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Global Logo</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setLogoPreview(url);
                  } else {
                    setLogoPreview(null);
                  }
                }}
                className="w-full text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
              />
              {logoPreview ? (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <img src={logoPreview} alt="Logo Preview" className="h-10 w-auto object-contain rounded" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{logoFile?.name}</p>
                    <p className="text-[10px] text-gray-400">{logoFile ? (logoFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
                  </div>
                </div>
              ) : currentLogoUrl ? (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <img src={currentLogoUrl} alt="Current Logo" className="h-10 w-auto object-contain rounded" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Logo</p>
                    <p className="text-[10px] text-gray-500">Leave empty to keep existing logo</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing logo</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon</label>
              <input
                type="file"
                accept="image/*,.ico"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setFaviconFile(file);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setFaviconPreview(url);
                  } else {
                    setFaviconPreview(null);
                  }
                }}
                className="w-full text-gray-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-900/30 dark:file:text-indigo-400"
              />
              {faviconPreview ? (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                  <img src={faviconPreview} alt="Favicon Preview" className="h-8 w-8 object-contain rounded" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{faviconFile?.name}</p>
                    <p className="text-[10px] text-gray-400">{faviconFile ? (faviconFile.size / 1024).toFixed(1) + ' KB' : ''}</p>
                  </div>
                </div>
              ) : currentFaviconUrl ? (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <img src={currentFaviconUrl} alt="Current Favicon" className="h-8 w-8 object-contain rounded" />
                  <div>
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Current Favicon</p>
                    <p className="text-[10px] text-gray-500">Leave empty to keep existing favicon</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Leave empty to keep existing favicon</p>
              )}
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={brandingSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {brandingSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Update Branding
            </button>
          </div>
        </form>
      </div>

      <ChangePasswordBlock />
    </div>
  );
}
