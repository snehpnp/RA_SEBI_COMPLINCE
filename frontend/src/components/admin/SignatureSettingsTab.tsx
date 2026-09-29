'use client';
import { useState, useEffect } from 'react';
import {
  Settings,
  AlertTriangle,
  UploadCloud,
  Loader2,
  Eye,
  Download,
  RefreshCw,
  CheckCircle2,
  X,
  FileCheck,
  ShieldCheck,
  Usb,
  Fingerprint,
  HardDrive,
  Check,
  Radio,
  Clock,
  ExternalLink,
  Info
} from 'lucide-react';
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
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Active Signature Mode: 'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN'
  const [signatureMode, setSignatureMode] = useState<'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN'>('UPLOAD_SIGN');
  const [personalSignatureUrl, setPersonalSignatureUrl] = useState<string | null>(null);
  const [tenantSignatureUrl, setTenantSignatureUrl] = useState<string | null>(null);
  const [dailyAadhaar, setDailyAadhaar] = useState<{
    hasValidDailySign: boolean;
    date: string | null;
    verifiedAt: string | null;
    signerName: string | null;
    aadhaarLast4: string | null;
  } | null>(null);

  // DSC Settings
  const [dscPlacement, setDscPlacement] = useState<'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT'>('BOTTOM_RIGHT');
  const [dscScope, setDscScope] = useState<'ALL_PAGES' | 'LAST_PAGE'>('ALL_PAGES');
  const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [checkingBridge, setCheckingBridge] = useState(false);

  // Upload state
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Fetch Researcher Signature Settings on mount
  const fetchSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await api.getResearcherSignatureSettings();
      if (res.success && res.data) {
        setSignatureMode(res.data.signatureMode || 'UPLOAD_SIGN');
        setPersonalSignatureUrl(res.data.signatureUrl || null);
        setTenantSignatureUrl(res.data.tenantSignatureUrl || null);
        setDailyAadhaar(res.data.dailyAadhaarSignature || null);
        if (res.data.dscSettings) {
          setDscPlacement(res.data.dscSettings.placement || 'BOTTOM_RIGHT');
          setDscScope(res.data.dscSettings.signScope || 'ALL_PAGES');
        }
      }
    } catch (err: any) {
      console.warn('Could not load researcher signature settings:', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Ping DSC local bridge
  const checkDscBridge = async (silent = false) => {
    setCheckingBridge(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:1620/ping', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        setBridgeStatus('connected');
        if (!silent) toast.success(`DSC Bridge Connected! (${data.service || 'v1.0.0'})`);
      } else {
        setBridgeStatus('disconnected');
        if (!silent) toast.error('DSC Bridge responded with an error');
      }
    } catch (err) {
      setBridgeStatus('disconnected');
      if (!silent) toast.error('DSC Local Bridge is not running on http://127.0.0.1:1620');
    } finally {
      setCheckingBridge(false);
    }
  };

  // Change Active Signature Mode
  const handleModeChange = async (mode: 'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN') => {
    setSignatureMode(mode);
    setSavingSettings(true);
    try {
      const res = await api.updateResearcherSignatureSettings({
        signatureMode: mode,
        dscSettings: {
          placement: dscPlacement,
          signScope: dscScope
        }
      });
      if (res.success) {
        toast.success(`Active signature mode set to: ${mode === 'UPLOAD_SIGN' ? 'Upload Signature' : mode === 'AADHAAR_ESIGN' ? 'Aadhaar eSign' : 'Hardware DSC Token'}`);
        // update user object in local state
        setUser((prev: any) => ({
          ...prev,
          signatureMode: mode
        }));
        if (mode === 'DSC_TOKEN') {
          checkDscBridge(true);
        }
      } else {
        toast.error(res.message || 'Failed to update signature mode');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update signature mode');
    } finally {
      setSavingSettings(false);
    }
  };

  // Update DSC Placement or Scope
  const handleUpdateDscSettings = async (placement: 'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT', scope: 'ALL_PAGES' | 'LAST_PAGE') => {
    setDscPlacement(placement);
    setDscScope(scope);
    try {
      await api.updateResearcherSignatureSettings({
        signatureMode: 'DSC_TOKEN',
        dscSettings: {
          placement,
          signScope: scope
        }
      });
      toast.success('DSC placement & page settings updated');
    } catch (err: any) {
      toast.error('Failed to update DSC settings');
    }
  };

  // Upload researcher personal signature file
  const uploadFile = async (file: File) => {
    setUploadingSignature(true);
    try {
      const formData = new FormData();
      formData.append('signature', file);
      const data = await api.uploadResearcherSignature(formData);
      if (data.success && data.data?.signatureUrl) {
        toast.success('Signature uploaded and updated successfully!');
        setPersonalSignatureUrl(data.data.signatureUrl);
        setPreviewUrl(null);
        setSelectedFileName(null);
        setSelectedFileSize(null);

        setUser((prevUser: any) => {
          const updatedUser = {
            ...prevUser,
            signatureUrl: data.data.signatureUrl
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          return updatedUser;
        });

        loadData();
      } else {
        toast.error(data.message || 'Failed to upload signature');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload signature');
    } finally {
      setUploadingSignature(false);
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

  const activeDisplayUrl = previewUrl || (personalSignatureUrl ? (personalSignatureUrl.startsWith('http') ? personalSignatureUrl : `${api.getBaseUrl()}${personalSignatureUrl}`) : (tenantSignatureUrl ? (tenantSignatureUrl.startsWith('http') ? tenantSignatureUrl : `${api.getBaseUrl()}${tenantSignatureUrl}`) : null));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Settings</h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Configure your UI preferences and research report signature mode</p>
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

      {/* 3-Tier Researcher Signature Mode Selector */}
      <div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/10 p-6 shadow-sm space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Research Analyst Signature Mode
            </h3>
            {savingSettings && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving changes...
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose how your official signature will be applied to research PDF reports. This configuration is specific to your login.
          </p>
        </div>

        {/* 3-Way Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Option 1: Upload Signature */}
          <div
            onClick={() => handleModeChange('UPLOAD_SIGN')}
            className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between ${
              signatureMode === 'UPLOAD_SIGN'
                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {signatureMode === 'UPLOAD_SIGN' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <UploadCloud className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">1. Upload Sign</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Standard image stamp (PNG/JPG). Uploaded image is embedded on the report footer and saved automatically.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold">
              <span className={signatureMode === 'UPLOAD_SIGN' ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-400'}>
                {signatureMode === 'UPLOAD_SIGN' ? '● Currently Active' : 'Click to Activate'}
              </span>
            </div>
          </div>

          {/* Option 2: Aadhaar eSign */}
          <div
            onClick={() => handleModeChange('AADHAAR_ESIGN')}
            className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between ${
              signatureMode === 'AADHAAR_ESIGN'
                ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30 shadow-md ring-2 ring-emerald-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {signatureMode === 'AADHAAR_ESIGN' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">2. Aadhaar eSign</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Govt-verified Aadhaar OTP (Digio). Signs every page. Subsequent reports on the same day can be signed in 1-Click with current timestamp!
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold">
              <span className={signatureMode === 'AADHAAR_ESIGN' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}>
                {signatureMode === 'AADHAAR_ESIGN' ? '● Currently Active' : 'Click to Activate'}
              </span>
            </div>
          </div>

          {/* Option 3: Hardware DSC Token */}
          <div
            onClick={() => handleModeChange('DSC_TOKEN')}
            className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all duration-200 flex flex-col justify-between ${
              signatureMode === 'DSC_TOKEN'
                ? 'border-amber-600 bg-amber-50/60 dark:bg-amber-950/30 shadow-md ring-2 ring-amber-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {signatureMode === 'DSC_TOKEN' && (
              <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-600 text-white flex items-center justify-center shadow">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            )}
            <div>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <Usb className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">3. Hardware DSC</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Physical USB Pen Drive token (ePass2003, mToken, ProxKey). Cryptographic sign with PIN verification on report generation.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold">
              <span className={signatureMode === 'DSC_TOKEN' ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-400'}>
                {signatureMode === 'DSC_TOKEN' ? '● Currently Active' : 'Click to Activate'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Sub-panel 1: Upload Signature Details ── */}
        {signatureMode === 'UPLOAD_SIGN' && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Uploaded Official Signature</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This image stamp is embedded on the footer of generated research reports.
                </p>
              </div>
              {selectedFileName && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {selectedFileName} ({selectedFileSize})
                </span>
              )}
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              id="coSignatureUploadSettings"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              onChange={handleFileChange}
              disabled={uploadingSignature}
            />

            {activeDisplayUrl ? (
              <div className="space-y-4">
                <div
                  onClick={() => setIsModalOpen(true)}
                  className="relative group cursor-pointer bg-white rounded-xl p-6 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center min-h-[140px] shadow-inner transition-all hover:border-indigo-500/50 hover:shadow-lg"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(0,0,0,0.08) 1px, transparent 0)',
                    backgroundSize: '14px 14px'
                  }}
                >
                  <img
                    src={activeDisplayUrl}
                    alt="Signature Preview"
                    className="max-h-24 max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center space-x-2 text-white text-xs font-semibold">
                    <Eye className="w-4 h-4" />
                    <span>Click to view full preview</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <label
                    htmlFor="coSignatureUploadSettings"
                    className={`px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 cursor-pointer shadow-md shadow-indigo-500/20 ${uploadingSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    <span>{uploadingSignature ? 'Uploading Signature...' : 'Change / Upload New'}</span>
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
                    href={activeDisplayUrl}
                    download="researcher_signature.png"
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
                  className={`inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-indigo-500/25 ${uploadingSignature ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {uploadingSignature ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                  <span>{uploadingSignature ? 'Uploading Signature...' : 'Select & Upload Signature File'}</span>
                </label>
              </div>
            )}
          </div>
        )}

        {/* ── Sub-panel 2: Aadhaar eSign Details ── */}
        {signatureMode === 'AADHAAR_ESIGN' && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 text-emerald-600" />
                  Aadhaar eSign Status & Today&apos;s Active Session
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Powered by Digio & UIDAI Aadhaar OTP. Stamped digitally on every page of the research PDF.
                </p>
              </div>
            </div>

            {/* Daily Session Card */}
            {dailyAadhaar?.hasValidDailySign ? (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Today&apos;s Aadhaar Session Active
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold">
                        Valid for {dailyAadhaar.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-1 font-medium">
                      Signer: <span className="font-bold">{dailyAadhaar.signerName}</span> | Aadhaar: <span className="font-mono">XXXX-XXXX-{dailyAadhaar.aadhaarLast4}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Verified at {dailyAadhaar.verifiedAt ? new Date(dailyAadhaar.verifiedAt).toLocaleTimeString('en-IN') : 'Today'}
                    </p>
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900 inline-block">
                    ⚡ 1-Click Instant Sign Enabled
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 flex items-start space-x-3">
                <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <h5 className="font-bold text-xs mb-0.5">No Aadhaar verification completed yet today</h5>
                  <p>
                    When you click <strong>Generate & Upload PDF</strong> on any research signal today, the Digio Aadhaar popup will open.
                    Once you enter your Aadhaar number & OTP, your daily session will be activated and you can sign all subsequent reports today in 1-Click with current exact timestamp!
                  </p>
                </div>
              </div>
            )}

            <div className="bg-white dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-white/5 space-y-2">
              <h5 className="font-bold text-xs text-slate-800 dark:text-slate-200">How Aadhaar eSign Works on Reports:</h5>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc pl-4">
                <li>Digio opens an interactive UIDAI gateway inside your browser.</li>
                <li>You receive a one-time password (OTP) on your Aadhaar-registered mobile number.</li>
                <li>Every page of the research PDF is stamped with an official SEBI Aadhaar digital seal.</li>
                <li>
                  Subsequent reports generated today can be signed instantly using <strong>&quot;Use Today&apos;s Verified Aadhaar Sign&quot;</strong> (current report timestamp applied) or you can choose <strong>&quot;Regenerate&quot;</strong> for a fresh OTP.
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* ── Sub-panel 3: Hardware DSC Token Details ── */}
        {signatureMode === 'DSC_TOKEN' && (
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-white/10 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/5">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Usb className="w-4 h-4 text-amber-600" />
                  Hardware DSC Token (USB Pen Drive / Dongle)
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Signs reports directly using the cryptographic chip inside your physical DSC USB token.
                </p>
              </div>

              {/* Bridge Status Indicator */}
              <div className="flex items-center space-x-2">
                <span className={`flex h-2.5 w-2.5 rounded-full ${
                  bridgeStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : bridgeStatus === 'disconnected' ? 'bg-rose-500' : 'bg-slate-400'
                }`} />
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {bridgeStatus === 'connected' ? 'Local Bridge Online' : bridgeStatus === 'disconnected' ? 'Local Bridge Offline' : 'Bridge Not Checked'}
                </span>
                <button
                  type="button"
                  onClick={() => checkDscBridge(false)}
                  disabled={checkingBridge}
                  className="px-2.5 py-1 text-[11px] font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition flex items-center gap-1"
                >
                  {checkingBridge ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  <span>Test Connection</span>
                </button>
              </div>
            </div>

            {/* Placement & Scope Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Placement */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Signature Placement on Page:
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'BOTTOM_RIGHT', label: 'Bottom Right (Recommended Standard)' },
                    { id: 'BOTTOM_CENTER', label: 'Bottom Center' },
                    { id: 'BOTTOM_LEFT', label: 'Bottom Left' }
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <input
                        type="radio"
                        name="dscPlacement"
                        value={item.id}
                        checked={dscPlacement === item.id}
                        onChange={() => handleUpdateDscSettings(item.id as any, dscScope)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Page Scope */}
              <div className="bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Pages to Digitally Sign:
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'ALL_PAGES', label: 'All Pages (SEBI Recommended)' },
                    { id: 'LAST_PAGE', label: 'Last Page Only (Summary Page)' }
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center space-x-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <input
                        type="radio"
                        name="dscScope"
                        value={item.id}
                        checked={dscScope === item.id}
                        onChange={() => handleUpdateDscSettings(dscPlacement, item.id as any)}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Bridge Setup Guide */}
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <h5 className="font-bold flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-amber-600" />
                How Hardware DSC Token Works:
              </h5>
              <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                <li>Insert your USB DSC Pen Drive (ePass2003 / mToken / ProxKey) into your computer.</li>
                <li>Make sure the SEBI DSC Bridge is running locally on port 1620 (found in <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">tools/dsc-bridge/start-bridge.bat</code>).</li>
                <li>When you click <strong>Generate & Upload PDF</strong>, a prompt will appear asking for your DSC Token PIN.</li>
                <li>Upon entering your PIN, your token digitally signs the PDF with Adobe Approved Trust List (AATL) green tick!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Preview Modal */}
      {isModalOpen && activeDisplayUrl && (
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
                src={activeDisplayUrl}
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
