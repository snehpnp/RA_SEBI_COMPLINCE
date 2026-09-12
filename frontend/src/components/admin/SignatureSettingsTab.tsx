'use client';
import { useState } from 'react';
import { Settings, AlertTriangle, UploadCloud, Loader2, Eye, Download, RefreshCw, CheckCircle2, X, FileCheck } from 'lucide-react';
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const savedSignatureUrl = user?.tenant?.coSignatureUrl
    ? (user.tenant.coSignatureUrl.startsWith('http')
        ? user.tenant.coSignatureUrl
        : `${api.getBaseUrl()}${user.tenant.coSignatureUrl}`)
    : null;

  const displaySignatureUrl = previewUrl || savedSignatureUrl;

  const uploadFile = async (file: File) => {
    setUploadingCoSignature(true);
    try {
      const formData = new FormData();
      formData.append('coSignature', file);
      const data = await api.request('/admin/signature', {
        method: 'PUT',
        body: formData
      });
      if (data.success) {
        toast.success('Signature uploaded and updated successfully!');

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
        setPreviewUrl(null);
        setSelectedFileName(null);
        setSelectedFileSize(null);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload signature');
      setPreviewUrl(null);
      setSelectedFileName(null);
      setSelectedFileSize(null);
    } finally {
      setUploadingCoSignature(false);
    }
  };

  const processFile = (file: File) => {
    if (!file) return;

    const allowedExtensions = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext)) {
      toast.error('Only image files (PNG, JPG, JPEG, SVG, WebP) are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size exceeds 2MB limit.');
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setSelectedFileName(file.name);
    setSelectedFileSize((file.size / 1024).toFixed(1) + ' KB');

    uploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    processFile(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Settings</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Configure your UI preferences and research signature</p>
        </div>
      </div>

      {/* UI Preferences Section */}
      <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6 shadow-sm">
        <h3 className="text-base font-bold mb-3 text-slate-900 dark:text-white">UI Preferences</h3>
        <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-white/5">
          <div>
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Show Mobile Preview in Signal Desk</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Enable or disable the right-side mobile app preview panel when managing signals.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input type="checkbox" className="sr-only peer" checked={showMobilePreview} onChange={toggleMobilePreview} />
            <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
          </label>
        </div>
      </div>

      {/* Signature Section */}
      {(user?.role === 'RESEARCHER' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
        <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6 shadow-sm space-y-5">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Research Analyst Signature</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your official signature for research calls and generated PDF reports</p>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="text-xs leading-relaxed">
              <h4 className="font-bold text-sm mb-1 text-amber-900 dark:text-amber-200">Why is this required?</h4>
              <p>
                As per SEBI guidelines, every Research Report generated must bear the signature of the responsible Research Analyst.
                When you upload your signature here, it will be securely saved and automatically appended to the footer of all PDF
                Research Reports generated from the Signal Management desk.
              </p>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            type="file"
            id="coSignatureUploadSettings"
            className="hidden"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
            onChange={handleFileChange}
            disabled={uploadingCoSignature}
          />

          {/* If Signature exists or is previewing */}
          {displaySignatureUrl ? (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center space-x-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Active Signature on Reports
                  </span>
                </div>
                {selectedFileName && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {selectedFileName} ({selectedFileSize})
                  </span>
                )}
              </div>

              {/* Signature Preview Canvas */}
              <div 
                onClick={() => setIsModalOpen(true)}
                className="relative group cursor-pointer bg-white rounded-xl p-6 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center min-h-[140px] shadow-inner transition-all hover:border-indigo-500/50 hover:shadow-lg"
                style={{
                  backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)',
                  backgroundSize: '14px 14px'
                }}
              >
                <img
                  src={displaySignatureUrl}
                  alt="Signature Preview"
                  className="max-h-24 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                />
                
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center space-x-2 text-white text-xs font-semibold">
                  <Eye className="w-4 h-4" />
                  <span>Click to view full preview</span>
                </div>
              </div>

              {/* Actions Toolbar */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <label
                  htmlFor="coSignatureUploadSettings"
                  className={`px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md shadow-indigo-500/20 ${uploadingCoSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingCoSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span>{uploadingCoSignature ? 'Uploading Signature...' : 'Change / Upload New'}</span>
                </label>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-white/10 transition flex items-center space-x-2"
                >
                  <Eye className="h-4 w-4" />
                  <span>Full Preview</span>
                </button>

                <a
                  href={displaySignatureUrl}
                  download="research_analyst_signature.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-white/10 transition flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </a>
              </div>
            </div>
          ) : (
            /* Upload Dropzone when no signature exists */
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  processFile(e.dataTransfer.files[0]);
                }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]' 
                  : 'border-slate-300 dark:border-white/10 hover:border-indigo-400 dark:hover:border-indigo-500/50 bg-slate-50 dark:bg-slate-900/30'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center mx-auto mb-3 text-indigo-600 dark:text-indigo-400">
                <UploadCloud className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-white mb-1">Upload Your Official Signature</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
                Accepted formats: PNG, JPG, JPEG, SVG, WebP (Max 2MB). A clear signature on a white or transparent background is recommended.
              </p>

              <label
                htmlFor="coSignatureUploadSettings"
                className={`inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/25 ${uploadingCoSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {uploadingCoSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                <span>{uploadingCoSignature ? 'Uploading Signature...' : 'Select & Upload Signature File'}</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isModalOpen && displaySignatureUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-300 dark:border-white/10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Research Analyst Signature Preview</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div 
              className="bg-white rounded-xl p-8 border border-slate-200 dark:border-slate-800 flex items-center justify-center min-h-[220px]"
              style={{
                backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)',
                backgroundSize: '16px 16px'
              }}
            >
              <img
                src={displaySignatureUrl}
                alt="Signature Full Preview"
                className="max-h-56 max-w-full object-contain"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2">
              <p className="text-[11px] text-slate-500">
                This signature will be appended to the footer of all generated PDF Research Reports.
              </p>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
