'use client';
import { useState } from 'react';
import { Settings, AlertTriangle, UploadCloud, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface Props {
  user: any;
  setUser: any;
  loadData: () => void;
  showMobilePreview: boolean;
  toggleMobilePreview: () => void;
}

export default function SignatureSettingsTab({ user, setUser, loadData, showMobilePreview, toggleMobilePreview }: Props) {
  const [uploadingCoSignature, setUploadingCoSignature] = useState(false);

  const handleUploadCoSignature = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingCoSignature(true);
    try {
      const formData = new FormData();
      formData.append('coSignature', file);
      const data = await api.request('/admin/signature', {
        method: 'PUT',
        body: formData
      });
      if (data.success) {
        toast.success('Signature uploaded successfully');

        // Update user state and local storage with the new tenant signature URL
        if (data.data && data.data.coSignatureUrl) {
          setUser((prevUser: any) => {
            const updatedUser = {
              ...prevUser,
              tenant: {
                ...prevUser.tenant,
                coSignatureUrl: data.data.coSignatureUrl
              }
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
          });
        }

        loadData();
      } else {
        toast.error(data.message || 'Failed to upload signature');
      }
    } catch (err: any) {
      toast(err.message);
    } finally {
      setUploadingCoSignature(false);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Settings</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Configure your UI preferences and signature</p>
        </div>
      </div>

      {/* UI Preferences Section */}
      <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6">
        <h3 className="text-lg font-bold mb-4">UI Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <div>
            <h4 className="font-bold text-sm">Show Mobile Preview in Signal Desk</h4>
            <p className="text-xs text-slate-500 mt-1">Enable or disable the right-side mobile app preview panel when managing signals.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {/* Signature Section */}
      {(user?.role === 'RESEARCHER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6">
          <h3 className="text-lg font-bold mb-4">Research Analyst Signature</h3>
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 p-4 rounded-xl mb-6 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Why is this required?</h4>
              <p className="text-xs mt-1 leading-relaxed">
                As per SEBI guidelines, every Research Report generated must bear the signature of the responsible Research Analyst.
                When you upload your signature here, it will be securely saved and automatically appended to the footer of all PDF
                Research Reports generated from the Signal Management desk.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {user?.tenant?.coSignatureUrl && (
              <div className="mb-4 p-4 bg-slate-50 dark:bg-[#1A2235] rounded-xl border border-slate-200 dark:border-white/10 inline-block">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-bold uppercase">Current Signature</p>
                <img
                  src={user.tenant.coSignatureUrl.startsWith('http') ? user.tenant.coSignatureUrl : `${api.getBaseUrl()}${user.tenant.coSignatureUrl}`}
                  alt="Current Signature"
                  className="h-20 object-contain mix-blend-multiply dark:mix-blend-normal bg-white"
                />
              </div>
            )}
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Upload Your Signature</label>
            <p className="text-xs text-slate-500 dark:text-slate-400">Accepted formats: PNG, JPG, JPEG (Max 2MB). A clear signature on a white background is recommended.</p>

            <div className="mt-2">
              <input
                type="file"
                id="coSignatureUploadSettings"
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                  if (window.confirm("Notice: This signature will be applied to all your generated PDF Research Reports. Do you want to proceed?")) {
                    handleUploadCoSignature(e);
                  } else {
                    e.target.value = '';
                  }
                }}
                disabled={uploadingCoSignature}
              />
              <label
                htmlFor="coSignatureUploadSettings"
                className={`inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer ${uploadingCoSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingCoSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span>Select & Upload Signature File</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
