'use client';

import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Lock, Unlock, Eye, EyeOff, Loader2, X, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import api from '../../services/api';

interface SecretComplianceVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefreshMetrics?: () => void;
}

export default function SecretComplianceVaultModal({ isOpen, onClose, onRefreshMetrics }: SecretComplianceVaultModalProps) {
  const [step, setStep] = useState<'OTP_VERIFY' | 'VAULT_ACTIVE'>('OTP_VERIFY');
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300);
  const [vaultToken, setVaultToken] = useState<string | null>(null);

  // Penalties State
  const [penalties, setPenalties] = useState<any[]>([]);
  const [loadingPenalties, setLoadingPenalties] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Auto-send OTP when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('OTP_VERIFY');
      setOtp('');
      setErrorMessage(null);
      setVaultToken(null);
      sendOtp();
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || step !== 'OTP_VERIFY' || countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [isOpen, step, countdown]);

  const sendOtp = async () => {
    setIsSendingOtp(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/admin/secret-vault/send-otp');
      if (res.data?.success) {
        setOtpMessage(res.data.message || 'OTP sent successfully to your registered mobile and email.');
        setCountdown(res.data.expiresInSeconds || 300);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch security OTP. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    setErrorMessage(null);
    try {
      const res = await api.post('/admin/secret-vault/verify-otp', { otp: otp.trim() });
      if (res.data?.success && res.data.vaultToken) {
        setVaultToken(res.data.vaultToken);
        setStep('VAULT_ACTIVE');
        fetchVaultPenalties(res.data.vaultToken);
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const fetchVaultPenalties = async (token: string) => {
    setLoadingPenalties(true);
    try {
      const res = await api.get('/admin/secret-vault/penalties', {
        headers: { 'x-vault-token': token }
      });
      if (res.data?.success) {
        setPenalties(res.data.data || []);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load penalties: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingPenalties(false);
    }
  };

  const handleToggleMask = async (penaltyId: string, currentMasked: boolean) => {
    if (!vaultToken) return;
    setTogglingId(penaltyId);
    try {
      const newMaskState = !currentMasked;
      const res = await api.post(
        '/admin/secret-vault/toggle-mask',
        { penaltyId, isMasked: newMaskState },
        { headers: { 'x-vault-token': vaultToken } }
      );
      if (res.data?.success) {
        setPenalties((prev) =>
          prev.map((p) => (p.id === penaltyId ? { ...p, isMasked: newMaskState } : p))
        );
        if (onRefreshMetrics) onRefreshMetrics();
      }
    } catch (err: any) {
      alert('Error updating penalty mask: ' + (err.response?.data?.message || err.message));
    } finally {
      setTogglingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>SEBI Penalty Override Vault</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Stealth Access
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized Admin Security Clearance • Two-Factor Authenticated
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {step === 'OTP_VERIFY' ? (
            /* STEP 1: DUAL OTP VERIFICATION (Single Input for SMS or Email code) */
            <div className="max-w-md mx-auto py-4 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-lg shadow-amber-500/10">
                <KeyRound className="w-7 h-7" />
              </div>
              <h4 className="text-lg font-bold text-white mb-1">Security Identity Verification</h4>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                A single 6-digit authorization code was dispatched to both your registered <strong>Mobile SMS</strong> and <strong>Email</strong>. Enter the OTP below to unlock the vault.
              </p>

              {otpMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-left flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                  <span>{otpMessage}</span>
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-left flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="• • • • • •"
                    className="w-full text-center tracking-[12px] text-2xl font-mono font-black py-3 px-4 rounded-xl bg-slate-950 border border-white/20 text-amber-400 focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    autoFocus
                  />
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500 font-mono">
                    <span>Code expires in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}</span>
                    <button
                      type="button"
                      disabled={isSendingOtp || countdown > 240}
                      onClick={sendOtp}
                      className="text-amber-400 hover:text-amber-300 disabled:opacity-40 underline font-semibold"
                    >
                      Resend Code
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifyingOtp || otp.length !== 6}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black text-sm shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
                >
                  {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  <span>Verify OTP &amp; Unlock Vault</span>
                </button>
              </form>
            </div>
          ) : (
            /* STEP 2: PENALTY MANAGEMENT VAULT (Toggle active / disabled) */
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>
                    <strong>Vault Active:</strong> Toggling a penalty to <strong>Disabled</strong> removes it from all system audits, reports, health scores, and total penalty calculations.
                  </span>
                </div>
                <button
                  onClick={() => vaultToken && fetchVaultPenalties(vaultToken)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white"
                  title="Refresh List"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingPenalties ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {loadingPenalties ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
                  <span className="text-sm font-semibold">Decrypting compliance penalty records...</span>
                </div>
              ) : penalties.length === 0 ? (
                <div className="py-12 text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h5 className="text-sm font-bold text-white">Clean Compliance Record</h5>
                  <p className="text-xs text-slate-500 mt-1">No penalties have been registered for this tenant.</p>
                </div>
              ) : (
                <div className="border border-white/10 rounded-xl overflow-hidden bg-slate-950/40 divide-y divide-white/5">
                  {penalties.map((item) => (
                    <div
                      key={item.id}
                      className={`p-4 flex items-center justify-between gap-4 transition-colors ${
                        item.isMasked ? 'bg-rose-950/10 opacity-70' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs font-black text-white">{item.month}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/10">
                            Occurrence #{item.occurrenceNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.isMasked
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {item.isMasked ? 'MASKED / EXCLUDED' : 'ACTIVE CALCULATION'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-medium truncate" title={item.reason}>
                          {item.reason}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                          {item.regulation} • Status: {item.status}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-black font-mono ${
                            item.isMasked ? 'line-through text-slate-500' : 'text-amber-400'
                          }`}
                        >
                          ₹{Number(item.amount).toLocaleString('en-IN')}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {item.isMasked ? 'Excluded' : 'Counted'}
                        </span>
                      </div>

                      {/* Action Toggle */}
                      <div className="shrink-0 flex items-center gap-2 pl-2 border-l border-white/10">
                        <button
                          type="button"
                          disabled={togglingId === item.id}
                          onClick={() => handleToggleMask(item.id, item.isMasked)}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                            item.isMasked
                              ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30'
                          }`}
                          title={item.isMasked ? 'Re-enable into calculations' : 'Hide / Mask from calculations'}
                        >
                          {togglingId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : item.isMasked ? (
                            <>
                              <Eye className="w-3.5 h-3.5" />
                              <span>Enable</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" />
                              <span>Disable</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>Confidential Audit Vault</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 font-bold"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
}
