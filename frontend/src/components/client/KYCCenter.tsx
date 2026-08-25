'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck, FileText, CheckCircle2, AlertTriangle,
  UploadCloud, PenTool, ExternalLink, Clock, XCircle,
  AlertCircle, Loader2, RefreshCw, Check, Download
} from 'lucide-react';
import api from '../../services/api';

export default function KYCCenter({ onTriggerOnboarding }: { onTriggerOnboarding?: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  // ── Status helpers ──────────────────────────────────────────────────────────
  const status: string = profile?.status || 'PENDING_ONBOARDING';

  const getStatusBanner = () => {
    switch (status) {
      case 'ACTIVE':
        return {
          border: 'border-premium-success/30',
          glow: 'bg-premium-success/5',
          iconBg: 'bg-premium-success/20',
          Icon: ShieldCheck,
          iconColor: 'text-premium-success',
          title: 'Fully Verified',
          titleColor: 'text-premium-success',
          desc: 'Your KYC and onboarding are complete. You have full access to all premium features and research services.',
          showDownload: true,
        };
      case 'KYC_FAILED':
        return {
          border: 'border-premium-danger/30',
          glow: 'bg-premium-danger/5',
          iconBg: 'bg-premium-danger/20',
          Icon: XCircle,
          iconColor: 'text-premium-danger',
          title: 'KYC Failed',
          titleColor: 'text-premium-danger',
          desc: 'Your KYC verification failed. Please re-upload your documents or contact support.',
          showDownload: false,
        };
      case 'KYC_PENDING':
        return {
          border: 'border-premium-warning/30',
          glow: 'bg-premium-warning/5',
          iconBg: 'bg-premium-warning/20',
          Icon: Clock,
          iconColor: 'text-premium-warning',
          title: 'KYC Pending',
          titleColor: 'text-premium-warning',
          desc: 'Your KYC documents have been submitted and are under review. This usually takes 1–2 business days.',
          showDownload: false,
        };
      case 'AGREEMENT_PENDING':
        return {
          border: 'border-premium-warning/30',
          glow: 'bg-premium-warning/5',
          iconBg: 'bg-premium-warning/20',
          Icon: AlertCircle,
          iconColor: 'text-premium-warning',
          title: 'Agreement Pending',
          titleColor: 'text-premium-warning',
          desc: 'KYC verified. Please sign the Research Analyst Advisory Agreement to complete onboarding.',
          showDownload: false,
        };
      case 'PAYMENT_PENDING':
        return {
          border: 'border-blue-400/30',
          glow: 'bg-blue-400/5',
          iconBg: 'bg-blue-400/20',
          Icon: AlertCircle,
          iconColor: 'text-blue-400',
          title: 'Payment Pending',
          titleColor: 'text-blue-400',
          desc: 'KYC & agreement are complete. Please purchase a plan to activate your account.',
          showDownload: false,
        };
      default: // PENDING_ONBOARDING
        return {
          border: 'border-premium-border',
          glow: 'bg-premium-primary/5',
          iconBg: 'bg-premium-primary/10',
          Icon: AlertTriangle,
          iconColor: 'text-premium-text/40',
          title: 'KYC Not Started',
          titleColor: 'text-premium-text/60',
          desc: 'You have not started KYC yet. Please complete your identity verification to access all features.',
          showDownload: false,
        };
    }
  };

  const banner = getStatusBanner();

  // ── Document helpers ────────────────────────────────────────────────────────
  const maskAadhaar = (str: string) =>
    str ? '••••••••' + str.slice(-4) : '—';

  const maskPan = (str: string) => str || '—';

  // Latest agreement
  const latestAgreement = profile?.agreements?.[0] ?? null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="w-10 h-10 text-premium-primary animate-spin" />
        <p className="text-premium-text/50 text-sm">Loading KYC data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <AlertTriangle className="w-10 h-10 text-premium-danger" />
        <p className="text-premium-text/60 text-sm">{error}</p>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 text-sm text-premium-primary hover:underline"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 max-w-4xl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">KYC Center</h1>
          <p className="text-sm text-premium-text/60 mt-1">
            Manage your verification documents and compliance agreements.
          </p>
        </div>
        <button
          onClick={fetchProfile}
          className="flex items-center gap-2 text-xs text-premium-text/50 hover:text-premium-primary transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ── Status Banner ── */}
        <div className={`md:col-span-3 bg-premium-cards border ${banner.border} rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden`}>
          <div className={`absolute right-0 top-0 w-64 h-64 ${banner.glow} rounded-full blur-[80px] pointer-events-none`} />

          <div className={`w-20 h-20 rounded-full ${banner.iconBg} flex items-center justify-center shrink-0`}>
            <banner.Icon className={`w-10 h-10 ${banner.iconColor}`} />
          </div>

          <div className="text-center md:text-left flex-1">
            <h2 className={`text-2xl font-bold ${banner.titleColor} flex items-center justify-center md:justify-start gap-2`}>
              {banner.title}
              {status === 'ACTIVE' && <CheckCircle2 className="w-5 h-5" />}
            </h2>
            <p className="text-sm text-premium-text/70 mt-1">{banner.desc}</p>
          </div>

          {banner.showDownload && (
            <div className="shrink-0">
              <button className="bg-premium-bg border border-premium-border hover:border-premium-text/30 px-6 py-3 rounded-xl text-sm font-medium transition-colors">
                Download Certificate
              </button>
            </div>
          )}
        </div>

        {/* ── Identity Documents ── */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-premium-cards border border-premium-border rounded-3xl p-6">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-premium-primary" /> Identity Documents
            </h3>

            <div className="space-y-4">
              {/* PAN */}
              <div className="bg-premium-bg border border-premium-border p-4 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-premium-primary/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-premium-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">PAN Card</p>
                    {profile?.kycStatus === 'VERIFIED' || profile?.kycStatus === 'APPROVED' ? (
                      <p className="text-xs text-premium-success">KRA: Verified</p>
                    ) : profile?.kycStatus === 'MANUAL_REVIEW_REQUIRED' || profile?.kycStatus === 'FAILED' ? (
                      <p className="text-xs text-premium-warning">KRA: Failed</p>
                    ) : (
                      <p className="text-xs text-premium-text/50">KRA: Pending</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono bg-premium-cards px-2 py-1 rounded">
                    {maskPan(profile?.pan)}
                  </p>
                </div>
              </div>

              {/* Aadhaar */}
              <div className="bg-premium-bg border border-premium-border p-4 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-premium-primary/10 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-premium-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Aadhaar Card</p>
                    {(latestAgreement || status === 'ACTIVE' || status === 'PAYMENT_PENDING') ? (
                      <p className="text-xs text-premium-success">Verified via Digio</p>
                    ) : (
                      <p className="text-xs text-premium-warning">Pending eSign</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono bg-premium-cards px-2 py-1 rounded">
                    {maskAadhaar(profile?.aadhaar)}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-premium-border">
              <p className="text-xs text-premium-text/50 mb-3">Need to update your documents?</p>
              <button className="flex items-center gap-2 text-sm text-premium-primary hover:underline">
                <UploadCloud className="w-4 h-4" /> Request Re-upload
              </button>
            </div>
          </div>
        </div>

        {/* ── Legal Agreement ── */}
        <div className="bg-premium-cards border border-premium-border rounded-3xl p-6 flex flex-col relative overflow-hidden">
          {/* Subtle glow background */}
          <div className="absolute bottom-[-10%] right-[-10%] w-40 h-40 bg-premium-primary/10 rounded-full blur-[50px] pointer-events-none" />
          
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2 relative z-10">
            <PenTool className="w-5 h-5 text-premium-primary" /> Legal Agreement
          </h3>

          <div className="flex-1 flex flex-col justify-center p-5 bg-premium-bg rounded-2xl border border-premium-border mb-6 relative z-10">
            <div className="space-y-6 relative">
              {/* Vertical line */}
              <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-premium-border" />
              
              {/* Step 1: KYC Verification */}
              <div className="flex items-start gap-4 relative z-10 group">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shadow-md z-10 transition-colors ${(status === 'ACTIVE' || status === 'AGREEMENT_PENDING' || status === 'PAYMENT_PENDING') ? 'bg-premium-success text-premium-bg ring-4 ring-premium-success/20' : status === 'KYC_PENDING' ? 'bg-premium-warning text-premium-bg animate-pulse ring-4 ring-premium-warning/20' : 'bg-premium-cards border border-premium-border'}`}>
                   {(status === 'ACTIVE' || status === 'AGREEMENT_PENDING' || status === 'PAYMENT_PENDING') ? <Check className="w-3 h-3" /> : (status === 'KYC_PENDING' ? <Loader2 className="w-3 h-3 animate-spin" /> : <div className="w-2 h-2 rounded-full bg-premium-text/20" />)}
                </div>
                <div>
                  <p className={`text-sm font-bold ${(status === 'ACTIVE' || status === 'AGREEMENT_PENDING' || status === 'PAYMENT_PENDING') ? 'text-premium-success' : 'text-premium-text'}`}>KYC Verification</p>
                  <p className="text-xs text-premium-text/60 mt-0.5">{(status === 'ACTIVE' || status === 'AGREEMENT_PENDING' || status === 'PAYMENT_PENDING') ? 'Verified successfully' : status === 'KYC_PENDING' ? 'Pending Completion' : 'Pending submission'}</p>
                </div>
              </div>

              {/* Step 2: Agreement Signature */}
              <div className="flex items-start gap-4 relative z-10 group">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 shadow-md z-10 transition-colors ${latestAgreement ? 'bg-premium-success text-premium-bg ring-4 ring-premium-success/20' : (status === 'AGREEMENT_PENDING' ? 'bg-premium-primary text-white animate-pulse ring-4 ring-premium-primary/20' : 'bg-premium-cards border border-premium-border')}`}>
                   {latestAgreement ? <Check className="w-3 h-3" /> : (status === 'AGREEMENT_PENDING' ? <PenTool className="w-3 h-3" /> : <div className="w-2 h-2 rounded-full bg-premium-text/20" />)}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-bold ${latestAgreement ? 'text-premium-success' : 'text-premium-text'}`}>Advisory Agreement</p>
                  {latestAgreement ? (
                    <div className="text-xs text-premium-text/60 mt-2 space-y-1.5 bg-premium-cards p-3 rounded-xl border border-premium-border shadow-sm">
                       <p className="flex justify-between items-center"><span className="text-premium-text/40">Status:</span> <span className="text-premium-success font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Signed & Sealed</span></p>
                       <p className="flex justify-between items-center"><span className="text-premium-text/40">Date:</span> <span>{new Date(latestAgreement.signedAt).toLocaleDateString()}</span></p>
                       {latestAgreement.ipAddress && <p className="flex justify-between items-center"><span className="text-premium-text/40">IP Addr:</span> <span>{latestAgreement.ipAddress}</span></p>}
                    </div>
                  ) : (
                    <p className="text-xs text-premium-text/60 mt-0.5">{status === 'AGREEMENT_PENDING' ? 'Awaiting your eSign via Digio' : 'Locked (Requires KYC)'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {latestAgreement?.agreementUrl ? (
            <a
              href={latestAgreement.agreementUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-premium-success to-emerald-600 hover:from-emerald-500 hover:to-premium-success text-white shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 relative z-10"
            >
              Download Agreement <Download className="w-4 h-4" />
            </a>
          ) : (
            <button
              onClick={onTriggerOnboarding}
              className="w-full bg-premium-primary/10 hover:bg-premium-primary/20 border border-premium-primary/20 text-premium-primary py-3.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 relative z-10 transition-colors"
            >
              Sign Agreement <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
