'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar, Hash, Tag, Loader2 } from 'lucide-react';
import api from '../../../services/api';
import ChangePasswordBlock from '../../../components/ChangePasswordBlock';
import { toast } from 'react-hot-toast';

export default function PAProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    mobile: '',
    employeeCode: '',
    dob: '',
    joiningDate: '',
    roleType: '',
    customRole: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/profile/staff');
      if (res.data.success) {
        const user = res.data.data;
        const staff = user.staff || {};
        const pa = staff.personAssociated || {};
        
        const formatDate = (d: any) => d ? new Date(d).toISOString().split('T')[0] : '';
        
        setFormData({
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          email: user.email || '',
          mobile: user.mobile || '',
          employeeCode: user.employeeCode || staff.employeeId || '',
          dob: formatDate(staff.dob),
          joiningDate: formatDate(staff.joiningDate),
          roleType: pa.roleType || '',
          customRole: pa.customRole || ''
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
      const res = await api.put('/profile/staff', formData);
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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Associated Person Profile</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8">Role: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{formData.roleType}</span></p>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Personal & Employment Info</h2>
        <form onSubmit={handleUpdate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee Code</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Hash className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={formData.employeeCode} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <input type="date" value={formData.dob} onChange={(e) => setFormData({ ...formData, dob: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Joining Date</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Calendar className="h-5 w-5 text-gray-400" /></div>
                <input type="date" value={formData.joiningDate} readOnly className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 px-4 py-2 text-gray-500 cursor-not-allowed" />
              </div>
            </div>
            
            {formData.roleType === 'OTHER' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Custom Role</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Tag className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" value={formData.customRole} onChange={(e) => setFormData({ ...formData, customRole: e.target.value })} className="pl-10 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent px-4 py-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            )}

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
