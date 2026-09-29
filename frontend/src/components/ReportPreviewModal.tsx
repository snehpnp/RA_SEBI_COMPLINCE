import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronDown,
  Check,
  X,
  Upload,
  Loader2,
  Save,
  Fingerprint,
  Usb,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  ShieldCheck,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { base_api_url, base_ra_url } from '../utils/config';
import api from '../services/api';

const STOCK_SECTORS = [
  'Banking & Financial Services',
  'Information Technology (IT)',
  'Pharmaceuticals & Healthcare',
  'Automobiles & Auto Components',
  'FMCG (Fast Moving Consumer Goods)',
  'Oil, Gas & Consumable Fuels',
  'Metals & Mining',
  'Power & Renewable Energy',
  'Real Estate & Construction',
  'Telecommunication',
  'Aviation & Defense',
  'Chemicals & Petrochemicals',
  'Capital Goods & Engineering',
  'Consumer Durables',
  'Media & Entertainment',
  'Textiles & Apparel',
  'Agriculture & Fertilizers',
  'Infrastructure & Logistics'
];

interface ReportPreviewModalProps {
  signal: any;
  user: any;
  onClose: () => void;
  onSuccess: () => void;
}

const PREVIEW_SCALE = 0.75;

/* ------------------------------------------------------------------ */
/* Report Content Component                                           */
/* ------------------------------------------------------------------ */
const ReportContent = React.forwardRef<HTMLDivElement, {
  signal: any;
  user: any;
  sector: string;
  technicalOutlook: string;
  rationale: string;
  chartImage: string | null;
  signatureMode: 'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN';
  signatureUrl: string | null;
  dailyAadhaar: any;
  dscSettings: any;
}>(({ signal, user, sector, technicalOutlook, rationale, chartImage, signatureMode, signatureUrl, dailyAadhaar, dscSettings }, ref) => {
  const trend = signal.callType === 'BUY' ? 'BULLISH' : 'BEARISH';
  const recDate = new Date(signal.createdAt)
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase()
    .replace(/ /g, '-');
  const actionText = signal.callType === 'BUY' ? 'Buy' : 'Sell';

  const activeSigImg = signatureUrl || user?.signatureUrl || user?.tenant?.coSignatureUrl;
  const fullSigUrl = activeSigImg
    ? (activeSigImg.startsWith('http') ? activeSigImg : `${base_ra_url}${activeSigImg}`)
    : null;

  const signerName = dailyAadhaar?.signerName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.tenant?.name || 'Research Analyst';

  return (
    <div
      className="w-[210mm] min-h-[297mm] bg-white text-black shadow-2xl flex flex-col relative tracking-normal"
      ref={ref}
      style={{
        padding: '25mm',
        letterSpacing: '0px',
        wordSpacing: '0px',
        fontFamily: 'Arial, Helvetica, sans-serif',
        textRendering: 'auto',
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="w-32 h-12 bg-black flex items-center justify-center rounded">
          {user?.tenant?.logoUrl ? (
            <img
              src={user.tenant.logoUrl.startsWith('http') ? user.tenant.logoUrl : `${base_ra_url}${user.tenant.logoUrl}`}
              alt="Logo"
              className="max-h-10 max-w-[100px] object-contain"
              crossOrigin="anonymous"
            />
          ) : (
            <span className="text-white font-bold text-sm px-2 text-center">{user?.tenant?.name || 'StockBox'}</span>
          )}
        </div>
        <div className="text-center flex-1 pr-16">
          <h1 className="text-base font-bold text-slate-900">{signal.stock?.symbol || ''} ({signal.segment})</h1>
        </div>
      </div>

      {/* Subtitle */}
      <div className="text-center mb-6">
        <p className="text-sm text-slate-800 font-semibold mb-1">
          (Recommended {actionText} price-{signal.entryPrice}, Target-{[signal.target1, signal.target2, signal.target3].filter(Boolean).join('/')}, Stop loss-{signal.stoploss})
        </p>
        <p className="text-sm text-slate-800 font-semibold">Recommended Date-{recDate}</p>
      </div>

      {/* Table layout */}
      <div className="grid grid-cols-2 gap-y-3 gap-x-20 w-3/4 mx-auto mb-8 text-sm">
        <div className="font-bold text-slate-700">SECTOR</div>
        <div className="text-slate-800">{sector || '-'}</div>

        <div className="font-bold text-slate-700">PRICE</div>
        <div className="text-slate-800">{signal.entryPrice}</div>

        <div className="font-bold text-slate-700">OPTION & FUTURE</div>
        <div className="text-slate-800">{signal.segment}</div>

        <div className="font-bold text-slate-700">TREND</div>
        <div className="text-slate-800 uppercase">{trend}</div>

        <div className="font-bold text-slate-700">VIEW</div>
        <div className="text-slate-800 uppercase">{signal.tradeDuration || 'INTRADAY'}</div>
      </div>

      {/* Content */}
      <div className="text-center mb-4">
        <h4 className="text-sm font-bold text-red-600 uppercase underline underline-offset-4 decoration-red-600">TECHNICAL OUTLOOK</h4>
        {technicalOutlook && <p className="text-sm text-slate-800 mt-3 text-left">{technicalOutlook}</p>}
      </div>

      {chartImage && (
        <div className="mb-6 w-full flex justify-center">
          <img src={chartImage} alt="Chart" className="w-[80%] max-h-[250px] object-contain border border-slate-300 p-1" />
        </div>
      )}

      <div className="mb-6 text-sm text-slate-900">
        <span className="font-bold uppercase underline">RATIONALE:</span>
        {rationale ? (
          <p className="mt-2 text-left">{rationale}</p>
        ) : (
          <p className="mt-2">No rationale provided.</p>
        )}
      </div>

      {/* Footer Details */}
      <div className="mt-auto border-t border-slate-200 pt-4 text-[9px] text-slate-800 leading-tight">
        <span className="font-bold underline uppercase block mb-1">DISCLOSURE:</span>
        {user?.tenant?.reportDisclaimer ? (
          <div
            className="mb-2 text-left text-[7px] leading-snug prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: user.tenant.reportDisclaimer }}
          />
        ) : (
          <p className="mb-2 text-left whitespace-pre-wrap text-[7px] leading-snug">
            {`I, ${user?.tenant?.name || 'Research Analyst'} (SEBI Registered Research Analyst. ${user?.tenant?.sebiRegistrationNo || 'INH000000000'}) Author of this report, hereby certify that everything expressed in this research report accurately reflect my views about the subject issuer(s) or securities. I have no material adverse disciplinary history as on the date of publication of this report. I also certify that no part of our compensation was, is or will be directly or indirectly related to specific recommendation(s) or view(s) in this report.

I or my relatives does not have any financial interest in the subject company. Further Research analyst and his relative doesn't have any material conflict of interest.

Any holding in stock- No
Compliance & grievance officer - ${user?.tenant?.complianceName || 'Mr. Compliance Officer'}
Phone no : ${user?.tenant?.mobile || '-'}, Email :- ${user?.tenant?.email || '-'}
Address :- ${user?.tenant?.address || '-'}

Disclaimer- "Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors."`}
          </p>
        )}

        {/* Dynamic Signature Area Based on Active Mode */}
        <div className="mt-4 flex justify-end">
          <div className="text-center w-52">
            {/* Mode 1: UPLOAD_SIGN */}
            {signatureMode === 'UPLOAD_SIGN' && (
              <>
                {fullSigUrl ? (
                  <img
                    crossOrigin="anonymous"
                    src={fullSigUrl}
                    alt="Signature"
                    className="h-12 object-contain mx-auto mb-1"
                  />
                ) : (
                  <div className="h-12 flex items-center justify-center text-[10px] text-slate-400 italic">
                    [Signature Image Stamp]
                  </div>
                )}
                <p className="text-[9px] font-bold border-t border-slate-500 pt-1">
                  For {user?.tenant?.name || 'Research Analyst'}
                </p>
              </>
            )}

            {/* Mode 2: AADHAAR_ESIGN - Before signing, NO premature sign box should appear */}
            {signatureMode === 'AADHAAR_ESIGN' && (
              <>
                <div className="h-12 flex items-center justify-center">
                  {/* Clean signature area */}
                </div>
                <p className="text-[9px] font-bold border-t border-slate-500 pt-1">
                  For {user?.tenant?.name || 'Research Analyst'}
                </p>
                <p className="text-[8px] text-slate-500">Authorized Signatory</p>
              </>
            )}

            {/* Mode 3: DSC_TOKEN - Clean signature area */}
            {signatureMode === 'DSC_TOKEN' && (
              <>
                <div className="h-12 flex items-center justify-center">
                  {/* Clean signature area */}
                </div>
                <p className="text-[9px] font-bold border-t border-slate-500 pt-1">
                  For {user?.tenant?.name || 'Research Analyst'}
                </p>
                <p className="text-[8px] text-slate-500">Authorized Signatory</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
ReportContent.displayName = 'ReportContent';

export default function ReportPreviewModal({ signal, user, onClose, onSuccess }: ReportPreviewModalProps) {
  const [rationale, setRationale] = useState('');
  const [technicalOutlook, setTechnicalOutlook] = useState('');
  const [sector, setSector] = useState('');
  const [sectorErr, setSectorErr] = useState('');
  const [sectorDropdownOpen, setSectorDropdownOpen] = useState(false);
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Active Researcher Signature Settings
  const [signatureMode, setSignatureMode] = useState<'UPLOAD_SIGN' | 'AADHAAR_ESIGN' | 'DSC_TOKEN'>('UPLOAD_SIGN');
  const [researcherSignatureUrl, setResearcherSignatureUrl] = useState<string | null>(null);
  const [dailyAadhaar, setDailyAadhaar] = useState<{
    hasValidDailySign: boolean;
    date: string | null;
    verifiedAt: string | null;
    signerName: string | null;
    aadhaarLast4: string | null;
  } | null>(null);
  const [dscSettings, setDscSettings] = useState<{
    placement: 'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT';
    signScope: 'ALL_PAGES' | 'LAST_PAGE';
  }>({
    placement: 'BOTTOM_RIGHT',
    signScope: 'ALL_PAGES'
  });

  // Modal Dialogs for signing
  const [showDailyAadhaarDialog, setShowDailyAadhaarDialog] = useState(false);
  const [showDscModal, setShowDscModal] = useState(false);
  const [dscBridgeConnected, setDscBridgeConnected] = useState(false);
  const [checkingDscBridge, setCheckingDscBridge] = useState(false);
  const [dscPin, setDscPin] = useState('');
  const [dscPinError, setDscPinError] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<'BOTTOM_RIGHT' | 'BOTTOM_CENTER' | 'BOTTOM_LEFT'>('BOTTOM_RIGHT');
  const [selectedScope, setSelectedScope] = useState<'ALL_PAGES' | 'LAST_PAGE'>('ALL_PAGES');

  // Load Researcher Signature Settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getResearcherSignatureSettings();
        if (res.success && res.data) {
          if (res.data.signatureMode) setSignatureMode(res.data.signatureMode);
          if (res.data.signatureUrl) setResearcherSignatureUrl(res.data.signatureUrl);
          if (res.data.dailyAadhaarSignature) setDailyAadhaar(res.data.dailyAadhaarSignature);
          if (res.data.dscSettings) {
            setDscSettings(res.data.dscSettings);
            setSelectedPlacement(res.data.dscSettings.placement || 'BOTTOM_RIGHT');
            setSelectedScope(res.data.dscSettings.signScope || 'ALL_PAGES');
          }
        }
      } catch (err) {
        console.warn('Failed to load researcher signature settings in modal:', err);
      }
    };
    fetchSettings();
  }, []);

  // Visible, scaled preview (what the user sees on screen)
  const previewRef = useRef<HTMLDivElement>(null);
  // Hidden, unscaled, off-screen copy — THIS is what html2canvas captures.
  const captureRef = useRef<HTMLDivElement>(null);
  const chartInputRef = useRef<HTMLInputElement>(null);

  const handleChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setChartImage(event.target?.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleRemoveChartImage = () => {
    setChartImage(null);
    if (chartInputRef.current) {
      chartInputRef.current.value = '';
    }
    const chartInput = document.getElementById('chartUpload') as HTMLInputElement | null;
    if (chartInput) chartInput.value = '';
    toast.success('Chart image removed from report');
  };

  // Helper to capture off-screen HTML and build Base PDF Blob
  const generateBasePdfBlob = async (): Promise<{ blob: Blob; fileName: string; pdfInstance: jsPDF }> => {
    if (!captureRef.current) throw new Error('Capture reference unavailable');

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const node = captureRef.current;

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: node.scrollWidth,
      windowHeight: node.scrollHeight,
      x: 0,
      y: 0,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    let imgWidth = pdfWidth;
    let imgHeight = (canvas.height * pdfWidth) / canvas.width;

    if (imgHeight > pageHeight) {
      imgHeight = pageHeight;
      imgWidth = (canvas.width * pageHeight) / canvas.height;
    }

    const x = (pdfWidth - imgWidth) / 2;
    pdf.addImage(imgData, 'PNG', x, 0, imgWidth, imgHeight);

    const stockSymbol = signal.stock?.symbol || 'Signal';
    const fileName = `Research_Report_${stockSymbol}_${new Date().toISOString().split('T')[0]}.pdf`;
    const blob = pdf.output('blob');

    return { blob, fileName, pdfInstance: pdf };
  };

  // ── Main Generate Button Click: Check Researcher Signature Mode First ──
  const handleGenerateClick = async () => {
    if (!sector.trim()) {
      setSectorErr('Please select or enter a sector');
      return;
    }

    console.log('[Generate Report] Checking researcher active signatureMode:', signatureMode);

    // 1. Upload Sign Mode
    if (signatureMode === 'UPLOAD_SIGN') {
      await executeUploadSignFlow();
      return;
    }

    // 2. Aadhaar eSign Mode
    if (signatureMode === 'AADHAAR_ESIGN') {
      // Check if user already verified Aadhaar today
      if (dailyAadhaar?.hasValidDailySign) {
        // Show interactive dialog with 2 options: Use Today's Sign vs Regenerate
        setShowDailyAadhaarDialog(true);
      } else {
        // First Aadhaar eSign of today -> Launch Digio OTP flow
        await executeFreshDigioEsign();
      }
      return;
    }

    // 3. Hardware DSC Token Mode
    if (signatureMode === 'DSC_TOKEN') {
      await checkAndOpenDscModal();
      return;
    }
  };

  // ── 1. FLOW FOR UPLOAD SIGN (Standard Image Stamp) ──
  const executeUploadSignFlow = async () => {
    setGenerating(true);
    try {
      const { blob, fileName, pdfInstance } = await generateBasePdfBlob();

      const formData = new FormData();
      formData.append('report', blob, fileName);
      formData.append('signatureMode', 'UPLOAD_SIGN');

      const res = await fetch(`${base_api_url}/signals/${signal.id}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'x-tenant-id': localStorage.getItem('tenantId') || ''
        },
        body: formData
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Upload failed');
      }

      pdfInstance.save(fileName);
      toast.success('Report generated and uploaded successfully with your signature!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Failed to generate PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── 2A. FLOW: USE TODAY'S VERIFIED AADHAAR SIGN (Instant 1-Click) ──
  const handleUseDailyAadhaarSign = async () => {
    setShowDailyAadhaarDialog(false);
    setGenerating(true);
    try {
      const toastId = toast.loading('Applying today\'s verified Aadhaar seal with current timestamp...');
      const { blob, fileName } = await generateBasePdfBlob();

      const formData = new FormData();
      formData.append('report', blob, fileName);
      formData.append('signalId', signal.id);

      const res = await api.useDailyAadhaarSign(formData);
      if (res.success) {
        toast.success('Report signed instantly with today\'s verified Aadhaar eSign!', { id: toastId });
        if (res.reportUrl) {
          const downloadUrl = api.getDownloadUrl(res.reportUrl);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        onSuccess();
        onClose();
      } else {
        toast.error(res.message || 'Failed to apply daily Aadhaar signature', { id: toastId });
      }
    } catch (err: any) {
      toast.error('Error applying daily Aadhaar sign: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── 2B. FLOW: FRESH AADHAAR ESIGN (Digio Gateway OTP) ──
  const executeFreshDigioEsign = async () => {
    setShowDailyAadhaarDialog(false);
    setGenerating(true);
    try {
      const toastId = toast.loading('Preparing document for Digio Aadhaar eSign...');
      const { blob, fileName } = await generateBasePdfBlob();

      const formData = new FormData();
      formData.append('report', blob, fileName);
      formData.append('signalId', signal.id);

      const res = await api.initiateReportAadhaarEsign(formData);
      toast.dismiss(toastId);

      if (!res.success || !res.documentId) {
        throw new Error(res.message || 'Failed to initiate Digio eSign document');
      }

      if (typeof window === 'undefined' || !(window as any).Digio) {
        throw new Error('Digio SDK script not loaded in browser');
      }

      // Open Digio Aadhaar Popup
      const options = {
        environment: res.environment || 'sandbox',
        callback: async (digioResponse: any) => {
          console.log('[Digio Report eSign Callback]:', digioResponse);
          if (digioResponse.hasOwnProperty('error_code')) {
            toast.error(digioResponse.message || 'Aadhaar eSign was cancelled or failed.');
            setGenerating(false);
          } else {
            setGenerating(true);
            const saveToastId = toast.loading('Aadhaar OTP verified! Downloading signed report...');
            try {
              const docId = res.documentId || digioResponse.document_id || digioResponse.id;
              const completeRes = await api.completeReportAadhaarEsign({
                documentId: docId,
                signalId: signal.id
              });

              if (completeRes.success) {
                toast.success('Report eSigned via Aadhaar and saved successfully!', { id: saveToastId });

                // Update local daily session state with verified Aadhaar name from UIDAI
                const verifiedSigner = completeRes.signerName || completeRes.data?.signatureMeta?.signerName || 'Verified Aadhaar Signer';
                const verifiedAadhaarLast4 = completeRes.data?.signatureMeta?.aadhaarLast4 || 'XXXX';
                setDailyAadhaar({
                  hasValidDailySign: true,
                  date: new Date().toISOString().split('T')[0],
                  verifiedAt: new Date().toISOString(),
                  signerName: verifiedSigner,
                  aadhaarLast4: verifiedAadhaarLast4
                });

                // Auto-download signed PDF
                if (completeRes.reportUrl) {
                  const downloadUrl = api.getDownloadUrl(completeRes.reportUrl);
                  const a = document.createElement('a');
                  a.href = downloadUrl;
                  a.download = fileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                }

                onSuccess();
                onClose();
              } else {
                toast.error(completeRes.message || 'Failed to finalize signed document', { id: saveToastId });
              }
            } catch (saveErr: any) {
              toast.error(saveErr.message || 'Error completing eSign', { id: saveToastId });
            } finally {
              setGenerating(false);
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
      console.log('🚀 [Digio Report eSign] Submitting to SDK:', res.documentId, customerId, tokenId);

      if (tokenId) {
        digio.submit(res.documentId, customerId, tokenId);
      } else {
        digio.submit(res.documentId, customerId);
      }
    } catch (err: any) {
      toast.error('Digio Aadhaar eSign error: ' + err.message);
      setGenerating(false);
    }
  };

  // ── 3. FLOW FOR HARDWARE DSC TOKEN (USB Dongle + PIN) ──
  const checkAndOpenDscModal = async () => {
    setCheckingDscBridge(true);
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
    } catch (e) {
      setDscBridgeConnected(false);
      setShowDscModal(true);
    } finally {
      setCheckingDscBridge(false);
    }
  };

  const handleExecuteDscSign = async () => {
    if (!dscPin || dscPin.trim().length < 4) {
      setDscPinError('Please enter a valid DSC Token PIN (at least 4 digits)');
      return;
    }

    setGenerating(true);
    try {
      const { blob, fileName } = await generateBasePdfBlob();

      // Convert blob to Base64
      const reader = new FileReader();
      const pdfBase64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(blob);
      const pdfBase64 = await pdfBase64Promise;

      const toastId = toast.loading('Signing document with Hardware DSC Token...');

      // Call Local DSC Bridge
      const bridgeRes = await fetch('http://127.0.0.1:1620/sign-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          pin: dscPin,
          placement: selectedPlacement,
          signScope: selectedScope,
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
      const signedArray = new Uint8Array(byteNumbers);
      const signedBlob = new Blob([signedArray], { type: 'application/pdf' });

      // Save to backend
      const formData = new FormData();
      formData.append('report', signedBlob, fileName);
      formData.append('signalId', signal.id);
      formData.append('signatureMeta', JSON.stringify(bridgeData.signerInfo || { method: 'HARDWARE_DSC' }));

      const saveRes = await api.saveDscSignedReport(formData);
      if (!saveRes.success) {
        throw new Error(saveRes.message || 'Failed to save DSC signed report to server');
      }

      toast.success('Report digitally signed with Hardware DSC Token!', { id: toastId });

      // Download signed PDF
      const downloadBlobUrl = URL.createObjectURL(signedBlob);
      const a = document.createElement('a');
      a.href = downloadBlobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShowDscModal(false);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('DSC Signing Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col md:flex-row h-[90vh] relative overflow-hidden">

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 z-[60] p-2 bg-white/90 dark:bg-slate-800/90 shadow-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition backdrop-blur-sm">
          <X className="w-5 h-5" />
        </button>

        {/* Editor Sidebar */}
        <div className="w-full md:w-1/3 border-r border-slate-200 dark:border-white/10 p-6 flex flex-col overflow-y-auto bg-white dark:bg-slate-900 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Configure Report</h2>
          </div>

          {/* Active Signature Mode Banner */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 mb-4 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 dark:text-slate-400">Signing Mode:</span>
              <span className="font-bold flex items-center gap-1.5">
                {signatureMode === 'UPLOAD_SIGN' && (
                  <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" /> Uploaded Sign
                  </span>
                )}
                {signatureMode === 'AADHAAR_ESIGN' && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Fingerprint className="w-3.5 h-3.5" /> Aadhaar eSign
                  </span>
                )}
                {signatureMode === 'DSC_TOKEN' && (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <Usb className="w-3.5 h-3.5" /> Hardware DSC Token
                  </span>
                )}
              </span>
            </div>
            {signatureMode === 'AADHAAR_ESIGN' && dailyAadhaar?.hasValidDailySign && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 pt-0.5">
                <CheckCircle2 className="w-3 h-3" /> Today&apos;s session active ({dailyAadhaar.signerName})
              </p>
            )}
          </div>

          <div className="space-y-4 flex-1">
            <div className="relative">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Sector<span className="text-red-600 dark:text-red-500 ml-1">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={sector}
                  onFocus={() => setSectorDropdownOpen(true)}
                  onChange={(e) => {
                    setSector(e.target.value);
                    if (e.target.value.trim()) setSectorErr('');
                    setSectorDropdownOpen(true);
                  }}
                  className={`w-full bg-slate-50 dark:bg-slate-800/50 border ${sectorErr ? 'border-red-500' : 'border-slate-300 dark:border-white/10'} rounded-xl p-3 pr-10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all`}
                  placeholder="Select or type custom sector..."
                />
                <button
                  type="button"
                  onClick={() => setSectorDropdownOpen(!sectorDropdownOpen)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {sectorDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSectorDropdownOpen(false)} />
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-56 overflow-y-auto py-1">
                    <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Popular Sectors (Click to select or type custom above)
                    </div>
                    {STOCK_SECTORS.filter(s => !sector || s.toLowerCase().includes(sector.toLowerCase())).map((sec) => (
                      <div
                        key={sec}
                        className="px-3 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-slate-700/60 cursor-pointer flex items-center justify-between transition-colors"
                        onClick={() => {
                          setSector(sec);
                          setSectorErr('');
                          setSectorDropdownOpen(false);
                        }}
                      >
                        <span>{sec}</span>
                        {sector === sec && <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />}
                      </div>
                    ))}
                    {STOCK_SECTORS.filter(s => !sector || s.toLowerCase().includes(sector.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 italic">
                        Custom sector: &quot;{sector}&quot; (Will be used in report)
                      </div>
                    )}
                  </div>
                </>
              )}
              {sectorErr && <p className="text-red-600 dark:text-red-500 text-xs mt-1 font-medium">{sectorErr}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Technical Outlook (Optional)</label>
              <textarea
                value={technicalOutlook}
                onChange={(e) => setTechnicalOutlook(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[100px]"
                placeholder="Enter technical outlook..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Rationale (Optional)</label>
              <textarea
                value={rationale}
                onChange={(e) => setRationale(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-300 dark:border-white/10 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all min-h-[100px]"
                placeholder="Enter fundamental/technical rationale..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Chart Screenshot (Optional)
                </label>
                {chartImage && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Attached
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="file"
                  id="chartUpload"
                  ref={chartInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleChartUpload}
                />
                {chartImage ? (
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="chartUpload"
                      className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer border border-dashed border-slate-400 dark:border-white/20"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Change Image</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveChartImage}
                      className="py-2.5 px-3 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm"
                      title="Remove uploaded chart screenshot"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Remove Image</span>
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="chartUpload"
                    className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer border border-dashed border-slate-400 dark:border-white/20"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload Chart Image</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              onClick={handleGenerateClick}
              disabled={generating || checkingDscBridge}
              className="w-full py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 disabled:opacity-50 shadow-lg shadow-primary-500/20"
            >
              {generating || checkingDscBridge ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>
                {generating
                  ? 'Processing Signature...'
                  : signatureMode === 'AADHAAR_ESIGN'
                  ? 'Sign via Aadhaar & Generate PDF'
                  : signatureMode === 'DSC_TOKEN'
                  ? 'Sign with DSC Token & Generate'
                  : 'Generate & Upload PDF'}
              </span>
            </button>
            <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 mt-2">
              {signatureMode === 'UPLOAD_SIGN' && 'Appends your official image signature stamp.'}
              {signatureMode === 'AADHAAR_ESIGN' && 'Signs all pages via Aadhaar eSign (Digio).'}
              {signatureMode === 'DSC_TOKEN' && 'Digitally signs via your USB DSC Pen Drive.'}
            </p>
          </div>
        </div>

        {/* Live Preview Pane (visible, scaled) */}
        <div className="w-full md:w-2/3 bg-slate-100 dark:bg-[#0f1523] overflow-y-auto flex items-start justify-center relative p-6">
          <div
            className="flex justify-center w-full"
            style={{ height: `calc(297mm * ${PREVIEW_SCALE})` }}
          >
            <div style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top center' }}>
              <ReportContent
                ref={previewRef}
                signal={signal}
                user={user}
                sector={sector}
                technicalOutlook={technicalOutlook}
                rationale={rationale}
                chartImage={chartImage}
                signatureMode={signatureMode}
                signatureUrl={researcherSignatureUrl}
                dailyAadhaar={dailyAadhaar}
                dscSettings={dscSettings}
              />
            </div>
          </div>
        </div>

        {/* Hidden capture copy — rendered at 100% natural scale for clean PDF export */}
        <div style={{ position: 'fixed', top: 0, left: '-99999px', zIndex: -1 }}>
          <ReportContent
            ref={captureRef}
            signal={signal}
            user={user}
            sector={sector}
            technicalOutlook={technicalOutlook}
            rationale={rationale}
            chartImage={chartImage}
            signatureMode={signatureMode}
            signatureUrl={researcherSignatureUrl}
            dailyAadhaar={dailyAadhaar}
            dscSettings={dscSettings}
          />
        </div>
      </div>

      {/* ── POPUP 1: Daily Aadhaar Re-use vs Regenerate Dialog ── */}
      {showDailyAadhaarDialog && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400">
                <Fingerprint className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Aadhaar eSign Verification</h3>
              </div>
              <button
                onClick={() => setShowDailyAadhaarDialog(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
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
              How would you like to sign this research report?
            </p>

            <div className="space-y-3">
              {/* Option 1: Use Today's Sign */}
              <button
                type="button"
                onClick={handleUseDailyAadhaarSign}
                disabled={generating}
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
                    Signs immediately without entering OTP. Current date &amp; exact timestamp will be recorded on the report.
                  </p>
                </div>
              </button>

              {/* Option 2: Regenerate */}
              <button
                type="button"
                onClick={executeFreshDigioEsign}
                disabled={generating}
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

      {/* ── POPUP 2: Hardware DSC Token Prompt Modal ── */}
      {showDscModal && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-white/10 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <Usb className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Hardware DSC Token Signing</h3>
              </div>
              <button
                onClick={() => setShowDscModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bridge Status */}
            {dscBridgeConnected ? (
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>USB DSC Bridge Online (Port 1620)</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-bold">
                    Connected
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    DSC Token PIN / Password<span className="text-red-600 ml-1">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value={dscPin}
                      onChange={(e) => {
                        setDscPin(e.target.value);
                        if (e.target.value.trim().length >= 4) setDscPinError('');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
                      placeholder="••••••••"
                      autoFocus
                    />
                  </div>
                  {dscPinError && <p className="text-red-600 text-xs mt-1 font-medium">{dscPinError}</p>}
                </div>

                {/* Placement & Scope Confirmation */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Placement:</label>
                    <select
                      value={selectedPlacement}
                      onChange={(e) => setSelectedPlacement(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="BOTTOM_RIGHT">Bottom Right</option>
                      <option value="BOTTOM_CENTER">Bottom Center</option>
                      <option value="BOTTOM_LEFT">Bottom Left</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Sign Pages:</label>
                    <select
                      value={selectedScope}
                      onChange={(e) => setSelectedScope(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-800 dark:text-slate-200"
                    >
                      <option value="ALL_PAGES">All Pages</option>
                      <option value="LAST_PAGE">Last Page Only</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExecuteDscSign}
                  disabled={generating}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/25 disabled:opacity-50"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>{generating ? 'Signing with USB Token...' : 'Enter PIN & Digitally Sign Report'}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 flex items-start space-x-3 text-xs text-rose-800 dark:text-rose-300">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
                  <div className="space-y-1">
                    <h5 className="font-bold">DSC Local Bridge Not Reachable</h5>
                    <p>
                      Could not connect to the local DSC Bridge at <code className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded">http://127.0.0.1:1620</code>.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                  <p className="font-bold text-slate-800 dark:text-slate-200">Please make sure:</p>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Your USB DSC Pen Drive (ePass2003 / mToken / ProxKey) is plugged into your computer.</li>
                    <li>
                      Run the local bridge: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono text-[11px]">tools/dsc-bridge/start-bridge.bat</code>
                    </li>
                  </ol>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={checkAndOpenDscModal}
                    className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retry Bridge Check</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDscModal(false)}
                    className="py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs hover:bg-slate-200 transition"
                  >
                    Cancel
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