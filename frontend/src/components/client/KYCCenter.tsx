'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, FileText, CheckCircle2, AlertTriangle,
  PenTool, ExternalLink, Clock, XCircle,
  AlertCircle, Loader2, RefreshCw, Check, Download, ChevronRight, Lock, MapPin, User, Calendar, Video
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function KYCCenter({ onTriggerOnboarding }: { onTriggerOnboarding?: () => void }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchingKyc, setFetchingKyc] = useState(false);
  const [signingAgreement, setSigningAgreement] = useState(false);
  const [error, setError] = useState('');
  const [videoKycSession, setVideoKycSession] = useState<any>(null);
  const [requestingVideoKyc, setRequestingVideoKyc] = useState(false);
  const [videoKycSettings, setVideoKycSettings] = useState<any>(null);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [clientScheduleType, setClientScheduleType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [clientScheduledAt, setClientScheduledAt] = useState('');

  // Minimum allowed date-time (current moment, preventing past dates)
  const getMinDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getClientProfile();
      if (res?.success && res.data) {
        setProfile(res.data);
        
        // Also fetch active Video KYC session and settings
        try {
          const [sessRes, settingsRes]: any = await Promise.all([
            api.listVideoKycSessions({ limit: 1 }),
            api.getVideoKycSettings()
          ]);
          if (sessRes?.success && sessRes?.data?.sessions?.[0]) {
            setVideoKycSession(sessRes.data.sessions[0]);
          }
          if (settingsRes?.success && settingsRes?.data) {
            setVideoKycSettings(settingsRes.data);
          }
        } catch {}
        const data = res.data;
        console.log('%c📋 [CLIENT PROFILE / KYC RECORDS LOADED]', 'background: #1e293b; color: #38bdf8; font-weight: bold; font-size: 12px; padding: 4px 8px; border-radius: 4px;');
        console.table({
          'Name': data.name || data.profile?.panName || '—',
          'DOB': data.dob || data.profile?.dob || '—',
          'PAN': data.pan || '—',
          'Aadhaar': data.aadhaar || '—',
          'Address': data.profile?.addressLine1 || data.address || '—',
          'City': data.profile?.city || data.city || '—',
          'State': data.profile?.state || data.state || '—',
          'Pincode': data.profile?.zipCode || data.zipCode || '—',
          'KYC Status': data.kraVerified ? 'VERIFIED (DigiLocker)' : (data.kycStatus || 'PENDING'),
          'Agreement': data.agreementSigned ? 'SIGNED' : 'PENDING'
        });
      } else {
        setError('Could not load KYC data.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  // Check if DigiLocker KYC is genuinely completed
  const isKycCompleted = Boolean(
    profile?.kraVerified === true ||
    profile?.kycStatus === 'VERIFIED' ||
    profile?.kycStatus === 'APPROVED' ||
    (profile?.pan && (profile?.profile?.isDigiLockerLocked || profile?.isDigiLockerLocked))
  );

  // Check if agreement is signed
  const isAgreementSigned = Boolean(
    profile?.agreementSigned === true ||
    profile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE')
  );

  const maskAadhaar = (str?: string) => {
    if (!str) return '•••• •••• ••••';
    const clean = str.replace(/\D/g, '');
    if (clean.length >= 4) {
      return `•••• •••• ${clean.slice(-4)}`;
    }
    return str;
  };

  const maskPan = (str?: string) => {
    if (!str) return '••••••••••';
    return str.toUpperCase();
  };

  // --- 1. Fetch KYC via Digio DigiLocker ---
  const handleFetchKYC = async () => {
    setFetchingKyc(true);
    try {
      const res = await api.initiateDigioKyc();
      if (res.success && res.data && res.data.id && typeof window !== 'undefined' && (window as any).Digio) {
        const env = (res.environment || (profile?.user?.tenant?.digioEnvironment || '').toLowerCase() || 'production') as any;
        const options = {
          environment: env,
          callback: async function (response: any) {
            console.log('%c🟢 [DIGILOCKER KYC CALLBACK RECEIVED]', 'background: #059669; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;');
            console.log('📌 Raw Digio Response:', response);
            if (response.hasOwnProperty('error_code')) {
              toast.error(response.message || 'DigiLocker KYC was cancelled or failed.');
              setFetchingKyc(false);
            } else {
              try {
                const statusRes = await api.updateDigioStatus({
                  type: 'KYC',
                  status: 'COMPLETED',
                  kycId: response.digio_doc_id || res.data.id,
                  digioResponse: response
                });
                console.log('%c💾 [DIGILOCKER KYC SAVED TO BACKEND]', 'background: #2563EB; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;');
                console.log('📌 Save Result:', statusRes);
                if (statusRes.success) {
                  toast.success('DigiLocker KYC completed successfully! Government data auto-filled.');
                  await fetchProfile();
                } else {
                  toast.error(statusRes.message || 'Failed to save KYC status.');
                }
              } catch (saveErr: any) {
                console.error('❌ [DigiLocker KYC Save Error]:', saveErr);
                toast.error(saveErr.message || 'Failed to process DigiLocker response.');
              } finally {
                setFetchingKyc(false);
              }
            }
          },
          logo: 'https://digio.in/images/logo.png',
          theme: { primaryColor: '#1B42E0', secondaryColor: '#000000' }
        };
        const digio = new (window as any).Digio(options);
        digio.init();
        const customerId = profile?.email || profile?.user?.email || profile?.mobile || profile?.user?.mobile;
        const tokenId = res.tokenId || res.data?.tokenId || res.data?.access_token?.id || res.data?.token_id;
        console.log('🚀 [Digio KYC SDK] Submitting request:', res.data.id, 'Identifier:', customerId, 'TokenId:', tokenId);
        if (tokenId) {
          digio.submit(res.data.id, customerId, tokenId);
        } else {
          digio.submit(res.data.id, customerId);
        }
      } else {
        toast.error(res?.message || res?.errors?.[0] || 'Digio DigiLocker service unavailable. Please check tenant credentials.');
        setFetchingKyc(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate DigiLocker KYC.');
      setFetchingKyc(false);
    }
  };

  // --- 2. Sign Agreement via Digio Aadhaar eSign (Digio sends signed PDF directly to client email) ---
  const verifiedSignerName = profile?.name || profile?.profile?.panName || profile?.panName || profile?.aadhaarName || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim() || 'Client';

  const handleSignAgreement = async () => {
    if (!isKycCompleted) {
      return toast.error('Please complete Step 1 (Fetch KYC) before signing agreement.');
    }
    setSigningAgreement(true);
    try {
      const res = await api.initiateDigioAgreement();
      if (res.success && res.data && res.data.id && typeof window !== 'undefined' && (window as any).Digio) {
        const env = (res.environment || (profile?.user?.tenant?.digioEnvironment || '').toLowerCase() || 'production') as any;
        const options = {
          environment: env,
          callback: async function (response: any) {
            console.log('%c✍️ [DIGIO eSIGN CALLBACK RECEIVED]', 'background: #7c3aed; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;');
            console.log('📌 Raw eSign Response:', response);
            if (response.hasOwnProperty('error_code')) {
              toast.error(response.message || 'Agreement eSign was cancelled or failed.');
              setSigningAgreement(false);
            } else {
              try {
                const statusRes = await api.updateDigioStatus({
                  type: 'AGREEMENT',
                  status: 'COMPLETED',
                  kycId: response.digio_doc_id || res.data.id,
                  documentId: response.digio_doc_id || res.data.id,
                  digioResponse: response
                });
                console.log('%c💾 [DIGIO AGREEMENT SAVED TO BACKEND]', 'background: #2563EB; color: #ffffff; font-weight: bold; font-size: 13px; padding: 4px 8px; border-radius: 4px;');
                console.log('📌 Save Result:', statusRes);
                if (statusRes.success) {
                  toast.success('Service Agreement signed successfully! Digio has emailed your copy.');
                  await fetchProfile();
                } else {
                  toast.error(statusRes.message || 'Failed to update agreement status.');
                }
              } catch (e: any) {
                console.error('❌ [Digio Agreement Save Error]:', e);
                toast.error(e.message || 'Failed to complete eSign.');
              } finally {
                setSigningAgreement(false);
              }
            }
          },
          logo: 'https://digio.in/images/logo.png',
          theme: { primaryColor: '#1B42E0', secondaryColor: '#000000' }
        };
        const digio = new (window as any).Digio(options);
        digio.init();
        const customerId = (res as any).identifier || profile?.email || profile?.user?.email || profile?.mobile || profile?.user?.mobile;
        const tokenId = res.tokenId || res.data?.tokenId || res.data?.access_token?.id || res.data?.signers?.[0]?.access_token?.id || res.data?.token_id;
        console.log('✍️ [Digio eSign SDK] Submitting document:', res.data.id, 'Identifier:', customerId, 'TokenId:', tokenId);
        if (tokenId) {
          digio.submit(res.data.id, customerId, tokenId);
        } else {
          digio.submit(res.data.id, customerId);
        }
        return;
      } else {
        // Fallback to direct sign if Digio credentials not present
        const signRes = await api.signAgreement({
          signatureText: verifiedSignerName
        });
        if (signRes.success) {
          toast.success('Service Agreement signed successfully!');
          await fetchProfile();
        } else {
          toast.error(signRes.message || 'Failed to sign agreement.');
        }
      }
    } catch (err: any) {
      console.error('Agreement eSign Error:', err);
      toast.error(err.message || 'Failed to initiate Digio agreement signing.');
    } finally {
      setSigningAgreement(false);
    }
  };

  const handleRequestVideoKyc = async () => {
    if (clientScheduleType === 'SCHEDULED') {
      if (!clientScheduledAt) {
        toast.error('Please choose an appointment date and time.');
        return;
      }
      if (new Date(clientScheduledAt).getTime() <= Date.now()) {
        toast.error('Scheduled appointment must be in the future.');
        return;
      }
    }

    try {
      setRequestingVideoKyc(true);
      const res: any = await api.createVideoKycSession({
        scheduleType: clientScheduleType,
        scheduledAt: clientScheduleType === 'SCHEDULED' ? clientScheduledAt : null
      });
      if (res?.success && res.data) {
        setVideoKycSession(res.data.session);
        setIsRequestModalOpen(false);
        toast.success(
          clientScheduleType === 'SCHEDULED'
            ? 'Video KYC appointment scheduled! Check your registered email for details.'
            : 'Video KYC session requested! An invitation has also been sent to your email.'
        );
      } else {
        toast.error(res?.message || 'Failed to request Video KYC session.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error requesting Video KYC');
    } finally {
      setRequestingVideoKyc(false);
    }
  };

  const latestAgreement = profile?.agreements?.[0] ?? null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] gap-4">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
        <p className="text-slate-500 text-sm">Loading KYC compliance records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[45vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-red-500" />
        <p className="text-slate-600 text-sm">{error}</p>
        <button onClick={fetchProfile} className="flex items-center gap-2 text-sm text-primary-500 hover:underline">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-white animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black">KYC &amp; Agreement Center</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SEBI Regulatory Compliance • 2-Step Sequential Verification
          </p>
        </div>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-primary-500 transition-colors border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Records
        </button>
      </div>

      {/* Compliance Overview Banner */}
      {isKycCompleted && isAgreementSigned ? (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              100% SEBI Compliance Verified
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Your DigiLocker KYC and Service Agreement are active and locked. You have unrestricted access to all subscribed market research.
            </p>
          </div>
          {latestAgreement?.agreementUrl && (
            <a
              href={api.getDownloadUrl(latestAgreement.agreementUrl)}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md transition-all shrink-0"
            >
              <Download className="w-4 h-4" /> Download Agreement
            </a>
          )}
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">
              Compliance Onboarding Pending
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              Per SEBI guidelines, you must complete the 2 sequential steps below: first fetch your verified details from DigiLocker, then eSign your Service Agreement.
            </p>
          </div>
        </div>
      )}

      {/* The 2 Sequential Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── CARD 1: Fetch KYC (DigiLocker) ── */}
        <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${isKycCompleted
          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800'
          : 'bg-white dark:bg-slate-900 border-primary-500/40 shadow-lg shadow-primary-500/5 ring-1 ring-primary-500/20'
          }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300">
                Step 1 of 2
              </span>
              {isKycCompleted ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" /> Verified via DigiLocker
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                  Action Required
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" />
              1. Fetch KYC (DigiLocker)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Directly fetches your Name, DOB, PAN, Aadhaar, and Address from DigiLocker. Eliminates all manual paperwork and guarantees 100% compliance.
            </p>

            {/* If Verified: Display Extracted Government Details (Read-Only) */}
            {isKycCompleted && (
              <div className="space-y-2 bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/40 text-xs mb-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Name:</span>
                  <span className="font-bold">{profile?.name || profile?.profile?.panName || '—'}</span>
                </div>
                {(profile?.dob || profile?.profile?.dob) && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> DOB:</span>
                    <span className="font-bold">{profile?.dob || profile?.profile?.dob}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> PAN:</span>
                  <span className="font-mono font-bold">{maskPan(profile?.pan)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Aadhaar:</span>
                  <span className="font-mono font-bold">{maskAadhaar(profile?.aadhaar)}</span>
                </div>
                <div className="pt-1">
                  <span className="text-slate-500 flex items-center gap-1.5 mb-1"><MapPin className="w-3.5 h-3.5" /> Verified Address:</span>
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed pl-5">
                    {profile?.profile?.addressLine1 || profile?.address || '—'}, {profile?.profile?.city || profile?.city || ''} {profile?.profile?.state || profile?.state || ''} {profile?.profile?.zipCode || profile?.zipCode || ''}
                  </p>
                </div>
                <div className="pt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Data Locked &amp; Verified via Government DigiLocker
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            {!isKycCompleted ? (
              <button
                onClick={handleFetchKYC}
                disabled={fetchingKyc}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
              >
                {fetchingKyc ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                <span>{fetchingKyc ? 'Connecting to DigiLocker...' : 'Fetch KYC via DigiLocker'}</span>
              </button>
            ) : (
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> KYC Details Fetched &amp; Locked
              </div>
            )}
          </div>
        </div>

        {/* ── CARD 2: Sign Agreement (Aadhaar eSign) ── */}
        <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${isAgreementSigned
          ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800'
          : !isKycCompleted
            ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-70'
            : 'bg-white dark:bg-slate-900 border-primary-500/40 shadow-lg shadow-primary-500/5 ring-1 ring-primary-500/20'
          }`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                Step 2 of 2
              </span>
              {isAgreementSigned ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" /> Agreement eSigned
                </span>
              ) : !isKycCompleted ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                  <Lock className="w-3 h-3" /> Locked (Requires Step 1)
                </span>
              ) : (
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                  Ready to Sign
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
              <PenTool className="w-5 h-5 text-primary-600" />
              2. Sign Agreement (Aadhaar eSign)
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Pre-fills your DigiLocker verified details into the SEBI-mandated Research Analyst Service Agreement and signs digitally via Digio Aadhaar OTP. Digio automatically emails a signed copy to your inbox upon completion.
            </p>

            {/* If KYC Completed & Agreement not signed: show verified signer preview */}
            {isKycCompleted && !isAgreementSigned && (
              <div className="space-y-2 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 text-xs mb-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-slate-500">Signer Name:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{verifiedSignerName}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="text-slate-500">Aadhaar (DigiLocker):</span>
                  <span className="font-mono">{maskAadhaar(profile?.aadhaar || profile?.profile?.aadhaar)}</span>
                </div>
                <div className="pt-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Details pre-filled from Step 1 — Ready for Digio eSign OTP
                </div>
              </div>
            )}

            {/* If Agreement Signed: Display Signature Verification Card */}
            {isAgreementSigned && latestAgreement && (
              <div className="space-y-2 bg-white dark:bg-slate-800/60 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-800/40 text-xs mb-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500">Signer Name:</span>
                  <span className="font-bold">{latestAgreement.signerName || profile?.name || 'Client'}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                  <span className="text-slate-500">Signed On:</span>
                  <span className="font-medium">{new Date(latestAgreement.signedAt).toLocaleDateString()}</span>
                </div>
                {latestAgreement.ipAddress && (
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700/60">
                    <span className="text-slate-500">Signer IP:</span>
                    <span className="font-mono text-[11px]">{latestAgreement.ipAddress}</span>
                  </div>
                )}
                <div className="pt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Legally Binding eSign under IT Act 2000
                </div>
              </div>
            )}

            {!isKycCompleted && (
              <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Disabled until DigiLocker KYC is completed in Step 1.</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            {!isAgreementSigned ? (
              <button
                onClick={handleSignAgreement}
                disabled={!isKycCompleted || signingAgreement}
                className="w-full bg-primary-600 hover:bg-primary-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 disabled:shadow-none"
              >
                {signingAgreement ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenTool className="w-4 h-4" />}
                <span>{signingAgreement ? 'Preparing Digio eSign...' : 'Sign Agreement via Aadhaar eSign'}</span>
              </button>
            ) : latestAgreement?.agreementUrl ? (
              <a
                href={api.getDownloadUrl(latestAgreement.agreementUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Download className="w-4 h-4" /> Download Signed Copy
              </a>
            ) : (
              <div className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5">
                <Check className="w-4 h-4" /> Service Agreement Signed
              </div>
            )}
          </div>
        </div>

        {/* ── CARD 3: Video KYC & IPV Verification (SEBI V-CIP) ── */}
        {videoKycSettings?.videoKycEnabled !== false && (
          <div className={`md:col-span-2 rounded-3xl p-6 border flex flex-col justify-between transition-all ${
            videoKycSession?.status === 'APPROVED'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-300 dark:border-emerald-800'
              : videoKycSession?.status === 'REJECTED'
                ? 'bg-red-50/40 dark:bg-red-950/10 border-red-300 dark:border-red-800'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  SEBI Digital IPV
                </span>
                {videoKycSession?.status === 'APPROVED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full">
                    <Check className="w-3.5 h-3.5" /> Video KYC Approved
                  </span>
                ) : videoKycSession?.status === 'REJECTED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/40 px-2.5 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Verification Rejected
                  </span>
                ) : videoKycSession?.status === 'COMPLETED' ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full">
                    <Clock className="w-3.5 h-3.5" /> Under Compliance Review
                  </span>
                ) : videoKycSession ? (
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2.5 py-1 rounded-full">
                    Session Active / Ready
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                    Optional Verification Layer
                  </span>
                )}
              </div>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-2">
                    <Video className="w-5 h-5 text-indigo-600" />
                    Interactive Video KYC (Digital IPV)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4 max-w-2xl">
                    Live two-way video verification with the compliance team to verify your original PAN card and confirm voluntary subscription. Does not affect your existing trading services or signal access.
                  </p>
                </div>
              </div>

              {videoKycSession?.status === 'REJECTED' && (
                <div className="mb-4 p-3.5 bg-red-950/20 border border-red-500/30 rounded-xl text-xs text-red-400">
                  <strong>Rejection Note from Officer:</strong> {videoKycSession.rejectionReason || 'Please re-attempt video KYC verification.'}
                </div>
              )}

              {videoKycSession && videoKycSession.scheduleType === 'SCHEDULED' && videoKycSession.scheduledAt && (
                <div className="mb-4 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-indigo-200">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Scheduled Appointment:
                  </div>
                  <div className="font-semibold text-white font-mono bg-indigo-900/60 px-2.5 py-1 rounded-lg border border-indigo-500/40">
                    {new Date(videoKycSession.scheduledAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </div>
                </div>
              )}

              {videoKycSession && ['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(videoKycSession.status) && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-xs flex flex-wrap gap-4 mb-4">
                  <div>
                    <span className="text-slate-400">Session ID:</span>{' '}
                    <span className="font-mono font-bold text-slate-200">{videoKycSession.sessionId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Code / OTP:</span>{' '}
                    <span className="font-mono font-black text-emerald-400">{videoKycSession.otpCode}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              {videoKycSession ? (
                videoKycSession.status === 'COMPLETED' ? (
                  <div className="flex items-center gap-2 py-2.5 px-5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Verification Completed (Awaiting Officer Review)</span>
                  </div>
                ) : videoKycSession.status === 'APPROVED' ? (
                  <div className="flex items-center gap-2 py-2.5 px-5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Video KYC Verified & Approved</span>
                  </div>
                ) : videoKycSession.status === 'REJECTED' ? (
                  <button
                    onClick={() => {
                      setClientScheduleType('INSTANT');
                      const nextHour = new Date(Date.now() + 60 * 60 * 1000);
                      nextHour.setMinutes(0, 0, 0);
                      const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                      setClientScheduledAt(localIso);
                      setIsRequestModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-indigo-500/20 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Re-request Video KYC
                  </button>
                ) : (
                  <a
                    href={`/video-kyc/?sessionId=${videoKycSession.sessionId}&role=client`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-blue-500/20 flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> {videoKycSession.scheduleType === 'SCHEDULED' ? 'Open Scheduled Video KYC Room' : 'Open Live Video KYC Room'}
                  </a>
                )
              ) : videoKycSettings?.clientVideoKycRequestEnabled !== false ? (
                <button
                  onClick={() => {
                    setClientScheduleType('INSTANT');
                    const nextHour = new Date(Date.now() + 60 * 60 * 1000);
                    nextHour.setMinutes(0, 0, 0);
                    const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                    setClientScheduledAt(localIso);
                    setIsRequestModalOpen(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition shadow-md shadow-indigo-500/20 flex items-center gap-2"
                >
                  <Video className="w-4 h-4" /> Request Video KYC
                </button>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  Video KYC invitations are initiated by the compliance officer.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Client Request Video KYC (Instant vs Schedule) */}
        {isRequestModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Video className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">Request Video KYC</h3>
                    <p className="text-[11px] text-slate-400">Choose instant call or schedule an appointment</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRequestModalOpen(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Select Verification Mode:</label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setClientScheduleType('INSTANT')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition ${
                      clientScheduleType === 'INSTANT'
                        ? 'bg-blue-600/20 text-blue-300 border-blue-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-base">⚡</span>
                    <span>Instant Call</span>
                    <span className="text-[10px] font-normal text-slate-400">Join right now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setClientScheduleType('SCHEDULED')}
                    className={`py-3 px-3 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 border transition ${
                      clientScheduleType === 'SCHEDULED'
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="text-base">📅</span>
                    <span>Schedule Later</span>
                    <span className="text-[10px] font-normal text-slate-400">Pick date & time</span>
                  </button>
                </div>

                {clientScheduleType === 'SCHEDULED' && (
                  <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 mb-4">
                    <label className="text-xs font-bold text-indigo-300 block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Choose Date & Time (IST):
                    </label>
                    <input
                      type="datetime-local"
                      min={getMinDateTimeString()}
                      value={clientScheduledAt}
                      onChange={(e) => {
                        const val = e.target.value;
                        const minVal = getMinDateTimeString();
                        if (val && val < minVal) {
                          toast.error('Past date and time cannot be selected. Please choose a future appointment.');
                          setClientScheduledAt(minVal);
                        } else {
                          setClientScheduledAt(val);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <p className="text-[11px] text-slate-400">
                      Officer will be informed of this slot. You can join the room at the scheduled time.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestVideoKyc}
                  disabled={requestingVideoKyc}
                  className="py-2.5 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50"
                >
                  {requestingVideoKyc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  {clientScheduleType === 'SCHEDULED' ? 'Confirm & Schedule' : 'Start Instant KYC'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
