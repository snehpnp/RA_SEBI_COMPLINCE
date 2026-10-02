import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Fingerprint,
  Usb,
  UploadCloud,
  Upload,
  X,
  Loader2,
  FileText,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

interface UploadSignConfirmModalProps {
  file: File;
  signal: any;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadSignConfirmModal({
  file,
  signal,
  user,
  onClose,
  onSuccess
}: UploadSignConfirmModalProps) {
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [signatureMode, setSignatureMode] = useState<'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN'>('UPLOAD_SIGN');
  const [dailyAadhaar, setDailyAadhaar] = useState<any>(null);
  const [dscSettings, setDscSettings] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Aadhaar sub-dialog (Choose Daily vs Regenerate)
  const [showDailyChoice, setShowDailyChoice] = useState(false);

  // DSC Token PIN Modal
  const [showDscModal, setShowDscModal] = useState(false);
  const [dscPin, setDscPin] = useState('');
  const [dscPinError, setDscPinError] = useState('');
  const [dscBridgeConnected, setDscBridgeConnected] = useState<boolean | null>(null);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Fetch current signature configuration
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getResearcherSignatureSettings();
        if (res.success && res.data) {
          setSignatureMode(res.data.signatureMode || 'UPLOAD_SIGN');
          setDailyAadhaar(res.data.dailyAadhaarSignature || null);
          setDscSettings(res.data.dscSettings || null);
        }
      } catch (err) {
        console.warn('Failed to load researcher signature settings:', err);
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // ── 1. FLOW: DIRECT UPLOAD (NO SIGNATURE) ──
  const handleDirectUpload = async () => {
    setIsProcessing(true);
    setStatusMessage('Uploading original PDF report...');
    try {
      const formData = new FormData();
      formData.append('report', file, file.name);
      formData.append('signatureMode', 'NONE');
      formData.append('applySignature', 'false');

      const data = await api.uploadSignalReport(signal.id, formData);
      if (data && (data.success || data.data)) {
        toast.success('Report PDF uploaded successfully (without signature)');
        onSuccess();
        onClose();
      } else {
        throw new Error(data?.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('Upload Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ── 2. FLOW: USER CLICKS "YES, SIGN & UPLOAD" ──
  const handleProceedWithSignature = async () => {
    if (signatureMode === 'UPLOAD_SIGN') {
      await executeUploadSignFlow();
    } else if (signatureMode === 'AADHAAR_ESIGN') {
      if (dailyAadhaar?.hasValidDailySign) {
        setShowDailyChoice(true);
      } else {
        await executeFreshDigioEsign();
      }
    } else if (signatureMode === 'DSC_TOKEN') {
      await openDscModalFlow();
    }
  };

  // ── 2A. UPLOAD SIGN (Image Stamp) ──
  const executeUploadSignFlow = async () => {
    setIsProcessing(true);
    setStatusMessage('Applying official signature stamp to PDF...');
    try {
      const formData = new FormData();
      formData.append('report', file, file.name);
      formData.append('signatureMode', 'UPLOAD_SIGN');
      formData.append('applySignature', 'true');

      const data = await api.uploadSignalReport(signal.id, formData);
      if (data && (data.success || data.data)) {
        toast.success('Report stamped with your official signature and uploaded!');
        onSuccess();
        onClose();
      } else {
        throw new Error(data?.message || 'Upload failed');
      }
    } catch (err: any) {
      toast.error('Error uploading signed report: ' + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ── 2B. AADHAAR ESIGN: 1-Click Daily Session ──
  const handleUseDailyAadhaarSign = async () => {
    setShowDailyChoice(false);
    setIsProcessing(true);
    setStatusMessage('Applying verified Aadhaar seal with current timestamp...');
    try {
      const formData = new FormData();
      formData.append('report', file, file.name);
      formData.append('signalId', signal.id);

      const res = await api.useDailyAadhaarSign(formData);
      if (res.success) {
        toast.success("Report signed with today's verified Aadhaar seal and uploaded!");
        if (res.reportUrl) {
          const downloadUrl = api.getDownloadUrl(res.reportUrl);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = file.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        onSuccess();
        onClose();
      } else {
        throw new Error(res.message || 'Failed to apply daily Aadhaar seal');
      }
    } catch (err: any) {
      toast.error('Aadhaar Sign Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ── 2C. AADHAAR ESIGN: Fresh OTP via Digio ──
  const executeFreshDigioEsign = async () => {
    setShowDailyChoice(false);
    setIsProcessing(true);
    setStatusMessage('Preparing document for Digio Aadhaar eSign...');
    try {
      const formData = new FormData();
      formData.append('report', file, file.name);
      formData.append('signalId', signal.id);

      const res = await api.initiateReportAadhaarEsign(formData);
      if (!res.success || !res.documentId) {
        throw new Error(res.message || 'Failed to initiate Digio eSign');
      }

      if (typeof window === 'undefined' || !(window as any).Digio) {
        throw new Error('Digio SDK script not loaded in browser');
      }

      const options = {
        environment: res.environment || 'sandbox',
        callback: async (digioResponse: any) => {
          if (digioResponse.hasOwnProperty('error_code')) {
            toast.error(digioResponse.message || 'Aadhaar eSign was cancelled or failed.');
            setIsProcessing(false);
            setStatusMessage('');
          } else {
            setIsProcessing(true);
            setStatusMessage('Aadhaar OTP verified! Saving signed report...');
            try {
              const docId = res.documentId || digioResponse.document_id || digioResponse.id;
              const completeRes = await api.completeReportAadhaarEsign({
                documentId: docId,
                signalId: signal.id
              });

              if (completeRes.success) {
                toast.success('Report eSigned via Aadhaar and published successfully!');
                if (completeRes.reportUrl) {
                  const downloadUrl = api.getDownloadUrl(completeRes.reportUrl);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = file.name;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }
                onSuccess();
                onClose();
              } else {
                throw new Error(completeRes.message || 'Failed to finalize signed document');
              }
            } catch (saveErr: any) {
              toast.error(saveErr.message || 'Error finalizing eSign');
            } finally {
              setIsProcessing(false);
              setStatusMessage('');
            }
          }
        },
        logo: 'https://digio.in/images/logo.png',
        theme: { primaryColor: '#059669', secondaryColor: '#000000' },
        is_redirection_approach: false
      };

      const digio = new (window as any).Digio(options);
      digio.init();

      const customerId = res.signerIdentifier;
      const tokenId = res.tokenId;
      if (tokenId) {
        digio.submit(res.documentId, customerId, tokenId);
      } else {
        digio.submit(res.documentId, customerId);
      }
    } catch (err: any) {
      toast.error('Digio Aadhaar eSign error: ' + err.message);
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // ── 2D. HARDWARE DSC TOKEN FLOW ──
  const openDscModalFlow = async () => {
    setIsProcessing(true);
    setStatusMessage('Checking Hardware DSC Bridge on localhost:1620...');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch('http://127.0.0.1:1620/ping', {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        setDscBridgeConnected(true);
        setDscPin('');
        setDscPinError('');
        setShowDscModal(true);
      } else {
        setDscBridgeConnected(false);
        setShowDscModal(true);
      }
    } catch {
      setDscBridgeConnected(false);
      setShowDscModal(true);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleExecuteDscSign = async () => {
    if (!dscPin || dscPin.trim().length < 4) {
      setDscPinError('Please enter a valid DSC Token PIN (at least 4 digits)');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Digitally signing uploaded PDF with Hardware DSC USB Token...');
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const resStr = (reader.result as string).split(',')[1];
          resolve(resStr);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const pdfBase64 = await base64Promise;

      const bridgeRes = await fetch('http://127.0.0.1:1620/sign-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          pin: dscPin,
          placement: dscSettings?.placement || 'BOTTOM_RIGHT',
          signScope: dscSettings?.signScope || 'ALL_PAGES',
          signerName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.name || 'Research Analyst',
          reason: 'SEBI Research Report Digital Signature',
          location: user?.tenant?.city || 'India'
        })
      });

      const bridgeData = await bridgeRes.json();
      if (!bridgeData.success || !bridgeData.signedPdfBase64) {
        throw new Error(bridgeData.message || 'DSC signing failed inside hardware token');
      }

      // Convert signed base64 back to Blob
      const signedBytes = atob(bridgeData.signedPdfBase64);
      const byteNumbers = new Array(signedBytes.length);
      for (let i = 0; i < signedBytes.length; i++) {
        byteNumbers[i] = signedBytes.charCodeAt(i);
      }
      const signedBlob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });

      const formData = new FormData();
      formData.append('report', signedBlob, file.name);
      formData.append('signalId', signal.id);
      formData.append('signatureMeta', JSON.stringify(bridgeData.signerInfo || { method: 'HARDWARE_DSC' }));

      const saveRes = await api.saveDscSignedReport(formData);
      if (!saveRes.success) {
        throw new Error(saveRes.message || 'Failed to save DSC signed report');
      }

      toast.success('Report digitally signed with Hardware DSC Token and uploaded!');
      setShowDscModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('DSC Signing Error: ' + err.message);
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const stockSymbol = signal?.stockId?.symbol || signal?.stock?.symbol || 'Trade Signal';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Upload Research Report
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Digital Signature Confirmation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">

          {/* File & Signal Summary Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Selected File:</span>
              <span className="font-bold text-slate-900 dark:text-white truncate max-w-[220px]" title={file.name}>
                {file.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">File Size:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {formatFileSize(file.size)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 dark:border-white/5">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Target Stock:</span>
              <span className="font-bold text-primary-600 dark:text-primary-400">
                {stockSymbol} ({signal?.segment || 'INTRADAY'})
              </span>
            </div>
          </div>

          {/* Active Signature Mode Banner */}
          <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> Active Signature Mode:
              </span>
              <span className="font-bold text-xs">
                {signatureMode === 'AADHAAR_ESIGN' && (
                  <span className="text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5" /> Aadhaar eSign (Digio)
                  </span>
                )}
                {signatureMode === 'DSC_TOKEN' && (
                  <span className="text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    <Usb className="w-3.5 h-3.5" /> Hardware DSC Token
                  </span>
                )}
                {signatureMode === 'UPLOAD_SIGN' && (
                  <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" /> Uploaded Signature
                  </span>
                )}
              </span>
            </div>

            {signatureMode === 'AADHAAR_ESIGN' && dailyAadhaar?.hasValidDailySign && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center gap-1 pt-0.5 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                Today&apos;s verified session active ({dailyAadhaar.signerName}) — 1-Click instant sign available!
              </p>
            )}
          </div>

          {/* Question / Notice */}
          <div className="text-center pt-1">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white">
              Do you want to digitally sign this report?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Would you like to apply your official digital signature before publishing, or upload the original PDF file as-is?
            </p>
          </div>

          {/* Processing Status Banner */}
          {isProcessing && (
            <div className="p-3 bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded-xl flex items-center gap-2.5 text-xs text-primary-700 dark:text-primary-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{statusMessage || 'Processing...'}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            {/* Option 1: Yes, Sign & Upload */}
            <button
              type="button"
              onClick={handleProceedWithSignature}
              disabled={isProcessing || loadingSettings}
              className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 transition flex items-center justify-between shadow-lg shadow-emerald-500/20 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-white/20 text-white">
                  {signatureMode === 'AADHAAR_ESIGN' ? (
                    <Fingerprint className="w-5 h-5" />
                  ) : signatureMode === 'DSC_TOKEN' ? (
                    <Usb className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-sm leading-tight">
                    Yes, Apply Digital Signature &amp; Upload
                  </h5>
                  <p className="text-[11px] text-white/80 mt-0.5">
                    {signatureMode === 'AADHAAR_ESIGN'
                      ? (dailyAadhaar?.hasValidDailySign ? "Applies today's verified Aadhaar seal (1-Click)" : 'Verifies via Aadhaar OTP (Digio)')
                      : signatureMode === 'DSC_TOKEN'
                      ? 'Digitally signs via USB Hardware DSC Token'
                      : 'Applies official researcher signature image stamp'}
                  </p>
                </div>
              </div>
              <CheckCircle2 className="w-5 h-5 text-white/90 group-hover:scale-110 transition-transform shrink-0" />
            </button>

            {/* Option 2: No, Upload As-Is */}
            <button
              type="button"
              onClick={handleDirectUpload}
              disabled={isProcessing || loadingSettings}
              className="w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition flex items-center justify-between disabled:opacity-50 group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white leading-tight">
                    No, Upload Without Signature (Direct)
                  </h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Uploads and publishes original PDF without adding digital signature seal
                  </p>
                </div>
              </div>
              <Upload className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-colors shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ── SUB-MODAL 1: Daily Aadhaar Option (Instant 1-Click vs Regenerate) ── */}
      {showDailyChoice && (
        <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Fingerprint className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Aadhaar eSign Verification</h3>
              </div>
              <button
                onClick={() => setShowDailyChoice(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Active Verified Aadhaar Session Found
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                Signer: <span className="font-bold">{dailyAadhaar?.signerName}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Aadhaar: XXXX-XXXX-{dailyAadhaar?.aadhaarLast4 || 'XXXX'} | Session: {dailyAadhaar?.date}
              </p>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              How would you like to sign this uploaded PDF report?
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleUseDailyAadhaarSign}
                disabled={isProcessing}
                className="w-full p-4 rounded-xl border-2 border-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 text-left transition flex items-start gap-3 group"
              >
                <div className="p-2 rounded-lg bg-emerald-500 text-white mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    Use Today&apos;s Verified Aadhaar Sign (Instant 1-Click)
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Signs immediately without entering OTP. Exact current timestamp will be stamped on the uploaded PDF.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={executeFreshDigioEsign}
                disabled={isProcessing}
                className="w-full p-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition flex items-start gap-3"
              >
                <div className="p-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 mt-0.5">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Regenerate (New Aadhaar OTP)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Opens Digio popup for fresh Aadhaar number and SMS OTP verification.
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUB-MODAL 2: Hardware DSC Token PIN Prompt ── */}
      {showDscModal && (
        <div className="fixed inset-0 z-[90] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <Usb className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Hardware DSC Signing</h3>
              </div>
              <button
                onClick={() => setShowDscModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {dscBridgeConnected === false ? (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-rose-800 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  Local DSC Bridge Not Connected
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Make sure your local DSC Bridge software is running on port 1620 and your physical USB token (ePass2003, mToken, ProxKey) is inserted.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                  Hardware USB Token detected. Enter your token User PIN to authorize signing.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    DSC Token User PIN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={dscPin}
                    onChange={(e) => {
                      setDscPin(e.target.value);
                      if (e.target.value.trim().length >= 4) setDscPinError('');
                    }}
                    placeholder="Enter Token PIN (e.g. 12345678)"
                    className={`w-full bg-slate-50 dark:bg-slate-800/50 border ${
                      dscPinError ? 'border-rose-500' : 'border-slate-300 dark:border-white/10'
                    } rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white font-mono focus:border-amber-500 outline-none transition`}
                  />
                  {dscPinError && (
                    <p className="text-xs text-rose-500 mt-1 font-medium">{dscPinError}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDscModal(false)}
                    className="py-2.5 px-4 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDscSign}
                    disabled={isProcessing}
                    className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-amber-600/20 disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Usb className="w-4 h-4" />}
                    <span>Sign with Token</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
