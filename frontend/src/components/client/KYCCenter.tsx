'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, FileText, CheckCircle2, AlertTriangle,
  PenTool, ExternalLink, Clock, XCircle,
  AlertCircle, Loader2, RefreshCw, Check, Download, ChevronRight, Lock, MapPin, User, Calendar
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

  const fetchProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getClientProfile();
      if (res?.success && res.data) {
        setProfile(res.data);
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
                if (statusRes.success) {
                  toast.success('DigiLocker KYC completed successfully! Government data auto-filled.');
                  await fetchProfile();
                } else {
                  toast.error(statusRes.message || 'Failed to save KYC status.');
                }
              } catch (saveErr: any) {
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
        digio.submit(res.data.id, profile?.email || profile?.user?.email);
      } else {
        toast.error(res?.message || res?.errors?.[0] || 'Digio DigiLocker service unavailable. Please check tenant credentials.');
        setFetchingKyc(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate DigiLocker KYC.');
      setFetchingKyc(false);
    }
  };

  // --- 2. Sign Agreement via Digio eSign ---
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
            if (response.hasOwnProperty('error_code')) {
              toast.error(response.message || 'Agreement eSign was cancelled or failed.');
              setSigningAgreement(false);
            } else {
              try {
                const statusRes = await api.updateDigioStatus({
                  type: 'AGREEMENT',
                  status: 'COMPLETED',
                  kycId: response.digio_doc_id || res.data.id,
                  digioResponse: response
                });
                if (statusRes.success) {
                  toast.success('Advisory Agreement signed successfully!');
                  await fetchProfile();
                } else {
                  toast.error(statusRes.message || 'Failed to update agreement status.');
                }
              } catch (e: any) {
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
        digio.submit(res.data.id, profile?.email || profile?.user?.email);
        return;
      } else {
        toast.error(res?.message || 'Could not initiate Digio eSign. Please verify Digio credentials in Admin Settings.');
        setSigningAgreement(false);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate Digio agreement signing. Please check Digio account setup.');
      setSigningAgreement(false);
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
              Your DigiLocker KYC and Advisory Agreement are active and locked. You have unrestricted access to all subscribed market research.
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
              Per SEBI guidelines, you must complete the 2 sequential steps below: first fetch your verified details from DigiLocker, then eSign your Advisory Agreement.
            </p>
          </div>
        </div>
      )}

      {/* The 2 Sequential Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* ── CARD 1: Fetch KYC (DigiLocker) ── */}
        <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${
          isKycCompleted
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
        <div className={`rounded-3xl p-6 border flex flex-col justify-between transition-all ${
          isAgreementSigned
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
              Pre-fills your DigiLocker verified details into the SEBI-mandated Research Analyst Advisory Agreement and signs digitally via Aadhaar OTP.
            </p>

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
                  <CheckCircle2 className="w-3 h-3" /> Legally Binding eSign under IT Act 2000
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
                <span>{signingAgreement ? 'Preparing eSign...' : 'Sign Agreement via Aadhaar eSign'}</span>
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
                <Check className="w-4 h-4" /> Advisory Agreement Signed
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
