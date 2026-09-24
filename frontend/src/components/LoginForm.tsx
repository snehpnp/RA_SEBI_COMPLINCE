'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, ShieldAlert, AlertTriangle, X, Key, Smartphone, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useBranding } from '@/contexts/BrandingContext';

export default function LoginForm({
  defaultRole,
  onFlip,
  isAdminPortal
}: {
  defaultRole?: string;
  onFlip?: () => void;
  isAdminPortal?: boolean;
}) {
  const { logoUrl, appName } = useBranding();
  const router = useRouter();
  const searchParams = useSearchParams();

  const roleParam = defaultRole || searchParams?.get('role') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null);
  const isAdmin = Boolean(isAdminPortal || roleParam === 'admin' || (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')));

  const [email, setEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'suspended' | 'inactive' | 'expired' | null>(null);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [tenantName, setTenantName] = useState('RAGCP');
  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  // Two-Factor Authentication (2FA) states
  const [is2FAStep, setIs2FAStep] = useState(false);
  const [twoFactorData, setTwoFactorData] = useState<{
    tempToken?: string;
    twoFactorToken?: string;
    email?: string;
    mobile?: string;
    channel?: string;
    currentStep?: string;
  } | null>(null);
  const [current2FAStep, setCurrent2FAStep] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState('');
  const [emailResendCooldown, setEmailResendCooldown] = useState(0);
  const [smsResendCooldown, setSmsResendCooldown] = useState(0);
  const [isVerifying2FA, setIsVerifying2FA] = useState(false);
  const [isResending2FA, setIsResending2FA] = useState(false);
  const [resendingType, setResendingType] = useState<'EMAIL' | 'SMS' | null>(null);
  const [stepSuccess, setStepSuccess] = useState<string | null>(null);

  // Login with OTP States (Smart 2FA Bypass)
  const [loginMode, setLoginMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [otpIdentifier, setOtpIdentifier] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loginOtp, setLoginOtp] = useState('');
  const [isSendingLoginOtp, setIsSendingLoginOtp] = useState(false);
  const [isSubmittingLoginOtp, setIsSubmittingLoginOtp] = useState(false);
  const [loginOtpCooldown, setLoginOtpCooldown] = useState(0);

  const loadingMessages = [
    "🔐 Authenticating your secure session...",
    "🌐 Establishing encrypted connection...",
    "✨ Loading your personalized dashboard...",
    "📊 Preparing compliance and market data...",
    "🚀 Optimizing your experience...",
    "🎉 Almost there, finalizing setup..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const dismissAlert = () => {
    setErrorType(null);
    setError(null);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('error');
      window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : ''));
    }
  };

  useEffect(() => {
    const errorParam = searchParams?.get('error') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('error') : null);
    if (errorParam === 'suspended' || errorParam === 'inactive' || errorParam === 'expired') {
      setErrorType(errorParam);
      setError(null);
    } else {
      setErrorType(null);
    }

    const roleParam = defaultRole || searchParams?.get('role') || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('role') : null);
    if (roleParam === 'super-admin') {
      setEmail('superadmin@gmail.com');
      setPassword('Admin@987');
    } else if (roleParam === 'admin') {
      setEmail('admin@gmail.com');
      setPassword('12345678');
    } else if (roleParam === 'client') {
      setEmail('client@demomail.com');
      setPassword('Admin@12345');
    }
  }, [searchParams, defaultRole]);

  // 2FA Resend Countdown for Email & SMS separately
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (emailResendCooldown > 0 || smsResendCooldown > 0) {
      timer = setInterval(() => {
        setEmailResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
        setSmsResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [emailResendCooldown, smsResendCooldown]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setErrorType(null);

    try {
      const res = await api.login({ email, password });
      if (res.requires2FA) {
        setIsSubmitting(false);
        setIs2FAStep(true);
        const token = res.data?.twoFactorToken || res.data?.tempToken;
        setTwoFactorData({
          ...res.data,
          tempToken: token,
          twoFactorToken: token
        });
        const startStep = res.data?.channel === 'SMS' ? 'SMS' : 'EMAIL';
        setCurrent2FAStep(startStep);
        setEmailVerified(false);
        setOtp('');
        setStepSuccess(null);
        setEmailResendCooldown(30);
        setSmsResendCooldown(30);
        return;
      }

      if (res.success) {
        const user = res.data.user;
        if (isAdmin && user.role === 'CLIENT') {
          setIsSubmitting(false);
          setError('Access restricted: This portal is for Administrators and Staff only. Please use the Client Login.');
          return;
        }

        setIsSubmitting(false);
        setLoading(true);
        if (user.tenantName) setTenantName(user.tenantName);
        if (user.tenantLogo) setTenantLogo(user.tenantLogo);

        const target = user.role === 'SUPER_ADMIN'
          ? '/super-admin'
          : user.role === 'CLIENT'
          ? '/client'
          : user.role === 'RESEARCHER'
          ? '/researcher'
          : user.role === 'COMPLIANCE_OFFICER'
          ? '/compliance-officer'
          : '/admin';

        window.location.href = target;
      } else {
        setIsSubmitting(false);
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Check credentials.');
      setIsSubmitting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError(`Please enter the complete 6-digit ${current2FAStep === 'EMAIL' ? 'Email' : 'SMS'} passcode.`);
      return;
    }
    const token = twoFactorData?.twoFactorToken || twoFactorData?.tempToken;
    if (!token) {
      setError('Verification session expired. Please enter your credentials again.');
      setIs2FAStep(false);
      return;
    }

    setIsVerifying2FA(true);
    setError(null);
    setStepSuccess(null);

    try {
      const res = await api.verify2FA({
        tempToken: token,
        otp: otp.trim(),
        type: current2FAStep
      });

      if (res.requiresNextStep) {
        setIsVerifying2FA(false);
        setOtp('');
        setCurrent2FAStep(res.nextStep as 'SMS' | 'EMAIL');
        if (current2FAStep === 'EMAIL') {
          setEmailVerified(true);
        }
        setStepSuccess(res.message || 'Email passcode verified! Now enter the Mobile SMS verification code.');
        return;
      }

      if (res.success) {
        setIsVerifying2FA(false);
        setLoading(true);
        const user = res.data.user;
        if (user.tenantName) setTenantName(user.tenantName);
        if (user.tenantLogo) setTenantLogo(user.tenantLogo);

        const target = user.role === 'CLIENT' ? '/client' : '/admin';
        window.location.href = target;
      } else {
        setError(res.message || `Invalid ${current2FAStep === 'EMAIL' ? 'Email' : 'SMS'} verification passcode.`);
        setIsVerifying2FA(false);
      }
    } catch (err: any) {
      setError(err.message || `Invalid ${current2FAStep === 'EMAIL' ? 'Email' : 'SMS'} verification passcode.`);
      setIsVerifying2FA(false);
    }
  };

  const handleResend2FA = async (targetType: 'EMAIL' | 'SMS') => {
    const token = twoFactorData?.twoFactorToken || twoFactorData?.tempToken;
    if (!token) return;
    if (targetType === 'EMAIL' && emailResendCooldown > 0) return;
    if (targetType === 'SMS' && smsResendCooldown > 0) return;

    setIsResending2FA(true);
    setResendingType(targetType);
    setError(null);
    setStepSuccess(null);

    try {
      const res = await api.resend2FA({
        tempToken: token,
        type: targetType
      });

      if (res.success) {
        if (targetType === 'EMAIL') {
          setEmailResendCooldown(30);
          setStepSuccess(res.message || 'A fresh Email verification code has been dispatched.');
        } else {
          setSmsResendCooldown(30);
          setStepSuccess(res.message || 'A fresh SMS verification code has been dispatched.');
        }
      } else {
        setError(res.message || `Failed to resend ${targetType} passcode.`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to resend ${targetType} passcode.`);
    } finally {
      setIsResending2FA(false);
      setResendingType(null);
    }
  };

  // Timer for OTP Login Resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loginOtpCooldown > 0) {
      timer = setTimeout(() => setLoginOtpCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [loginOtpCooldown]);

  const handleRequestLoginOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!otpIdentifier || otpIdentifier.trim() === '') {
      setError('Please enter your registered Email address or Mobile number.');
      return;
    }
    setError(null);
    setIsSendingLoginOtp(true);
    try {
      const res = await api.requestLoginOtp(otpIdentifier.trim());
      if (res.success) {
        setOtpSent(true);
        setLoginOtpCooldown(60);
        setStepSuccess(res.message || 'OTP sent successfully.');
      } else {
        setError(res.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP.');
    } finally {
      setIsSendingLoginOtp(false);
    }
  };

  const handleLoginWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginOtp || loginOtp.trim().length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setError(null);
    setIsSubmittingLoginOtp(true);
    try {
      const res = await api.loginWithOtp(otpIdentifier.trim(), loginOtp.trim());
      if (res.success) {
        setLoading(true);
        const user = res.data.user;
        if (user.tenantName) setTenantName(user.tenantName);
        if (user.tenantLogo) setTenantLogo(user.tenantLogo);

        const target = user.role === 'CLIENT'
          ? '/client'
          : user.role === 'SUPER_ADMIN'
          ? '/super-admin'
          : user.role === 'RESEARCHER'
          ? '/researcher'
          : user.role === 'COMPLIANCE_OFFICER'
          ? '/compliance-officer'
          : '/admin';

        window.location.href = target;
      } else {
        setError(res.message || 'Failed to login with OTP.');
        setIsSubmittingLoginOtp(false);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid OTP or session expired.');
      setIsSubmittingLoginOtp(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setErrorType(null);
    setForgotSuccess(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your registered email address.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.forgotPassword({ email: cleanEmail });
      if (res.success) {
        setForgotSuccess(res.message || 'A temporary password has been sent to your registered email address.');
      } else {
        setError(res.message || 'No account found with this email address.');
      }
    } catch (err: any) {
      setError(err.message || 'No account found with this email address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {is2FAStep
              ? twoFactorData?.channel === 'BOTH'
                ? 'Two-Step Verification'
                : twoFactorData?.channel === 'SMS'
                ? 'Mobile SMS Verification'
                : 'Email Verification'
              : isForgotPassword
              ? 'Reset Password'
              : isAdmin
              ? 'Admin & Staff Portal'
              : 'Access Platform'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {is2FAStep
              ? twoFactorData?.channel === 'BOTH'
                ? current2FAStep === 'EMAIL'
                  ? 'Step 1 of 2: Verify your registered Email passcode'
                  : 'Step 2 of 2: Verify your registered Mobile SMS passcode'
                : twoFactorData?.channel === 'SMS'
                ? 'Enter the 6-digit passcode sent to your mobile via SMS'
                : 'Enter the 6-digit passcode sent to your email address'
              : isForgotPassword
              ? 'Enter your registered email to receive reset instructions'
              : isAdmin
              ? 'Enter your administrative credentials to sign in'
              : 'Enter your credentials to authenticate session'}
          </p>
        </div>

        {/* ── INLINE ALERTS (Replacing disruptive modals) ── */}
        {errorType === 'inactive' && (
          <div className="mb-5 p-4 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl flex items-start justify-between space-x-3 text-amber-900 dark:text-amber-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-amber-900 dark:text-amber-100 text-sm mb-0.5">Account Deactivated or Inactive</p>
                <p className="text-amber-700 dark:text-amber-300/90">
                  Your account credentials or entity access is currently deactivated or pending review. Please reach out to your organization administrator or compliance desk.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-200 p-1 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorType === 'suspended' && (
          <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl flex items-start justify-between space-x-3 text-rose-900 dark:text-rose-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-rose-900 dark:text-rose-100 text-sm mb-0.5">Organization Portal Suspended</p>
                <p className="text-rose-700 dark:text-rose-300/90">
                  This portal has been suspended by Super Admin. Please contact Super Admin compliance support to reactivate your entity.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-200 p-1 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {errorType === 'expired' && (
          <div className="mb-5 p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-start justify-between space-x-3 text-blue-900 dark:text-blue-200 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start space-x-3">
              <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-blue-900 dark:text-blue-100 text-sm mb-0.5">Session Expired</p>
                <p className="text-blue-700 dark:text-blue-300/90">
                  Your session has expired. Please authenticate your credentials to log in again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={dismissAlert}
              className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-200 p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-300 text-xs rounded-2xl flex items-center justify-between space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/20"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {forgotSuccess && (
          <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs rounded-2xl flex items-center space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{forgotSuccess}</span>
          </div>
        )}

        {stepSuccess && (
          <div className="mb-5 p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-xs rounded-2xl flex items-center justify-between space-x-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span className="font-medium">{stepSuccess}</span>
            </div>
            <button
              type="button"
              onClick={() => setStepSuccess(null)}
              className="text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-200 p-1 rounded"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {is2FAStep ? (
          <form onSubmit={handleVerify2FA} className="space-y-4 animate-fade-in">
            {/* Step progress pills if BOTH channels are enabled */}
            {twoFactorData?.channel === 'BOTH' && (
              <div className="p-2.5 bg-slate-100 dark:bg-slate-800/70 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    emailVerified
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : current2FAStep === 'EMAIL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Mail className="h-3.5 w-3.5" />
                  <span>1. Email OTP</span>
                  {emailVerified && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
                </div>

                <div className="flex-1 mx-2 h-0.5 bg-slate-200 dark:bg-slate-700 relative overflow-hidden rounded-full">
                  <div
                    className={`h-full transition-all duration-300 ${
                      emailVerified ? 'bg-emerald-500 w-full' : 'bg-transparent w-0'
                    }`}
                  />
                </div>

                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    current2FAStep === 'SMS'
                      ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>2. Mobile SMS OTP</span>
                </div>
              </div>
            )}

            {/* Instruction Callout for Current Step */}
            {current2FAStep === 'EMAIL' ? (
              <div className="p-3.5 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-800/40 rounded-2xl flex items-start gap-3">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-950 dark:text-blue-200 space-y-0.5">
                  <p className="font-bold text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    {twoFactorData?.channel === 'BOTH' ? 'Step 1: Email Verification' : 'Email Verification Code'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Enter the 6-digit passcode sent to your registered email:
                  </p>
                  <p className="font-mono font-bold text-blue-700 dark:text-blue-300 text-xs">
                    {twoFactorData?.email || 'registered email'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 rounded-2xl flex items-start gap-3">
                <Smartphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-950 dark:text-indigo-200 space-y-0.5">
                  <p className="font-bold text-xs uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                    {twoFactorData?.channel === 'BOTH' ? 'Step 2: Mobile SMS Verification' : 'Mobile SMS Verification Code'}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Enter the 6-digit passcode sent via SMS to:
                  </p>
                  <p className="font-mono font-bold text-indigo-700 dark:text-indigo-300 text-xs">
                    {twoFactorData?.mobile || 'registered mobile'}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                {current2FAStep === 'EMAIL' ? 'Enter 6-Digit Email Passcode' : 'Enter 6-Digit Mobile SMS Passcode'}
              </label>
              <div className="relative max-w-[250px] mx-auto">
                <input
                  key={current2FAStep}
                  type="text"
                  maxLength={6}
                  autoFocus
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl py-3 px-4 text-center text-2xl font-mono tracking-[0.4em] font-bold text-slate-800 dark:text-white focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 transition"
                  placeholder="······"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifying2FA || otp.length !== 6}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 cursor-pointer"
            >
              {isVerifying2FA ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Passcode...</span>
                </>
              ) : twoFactorData?.channel === 'BOTH' && current2FAStep === 'EMAIL' ? (
                <span>Verify Email & Proceed to Step 2 →</span>
              ) : (
                <span>Verify Passcode & Login</span>
              )}
            </button>

            {/* Contextual Resend Button for Active Step */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-3">
              {current2FAStep === 'EMAIL' ? (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                    <span>Didn&apos;t receive email passcode?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResend2FA('EMAIL')}
                    disabled={emailResendCooldown > 0 || isResending2FA}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isResending2FA && resendingType === 'EMAIL'
                      ? 'Sending...'
                      : emailResendCooldown > 0
                      ? `Resend in ${emailResendCooldown}s`
                      : 'Resend Email Code'}
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Didn&apos;t receive SMS passcode?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResend2FA('SMS')}
                    disabled={smsResendCooldown > 0 || isResending2FA}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                  >
                    {isResending2FA && resendingType === 'SMS'
                      ? 'Sending...'
                      : smsResendCooldown > 0
                      ? `Resend in ${smsResendCooldown}s`
                      : 'Resend SMS Code'}
                  </button>
                </div>
              )}

              <div className="flex justify-center pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIs2FAStep(false);
                    setTwoFactorData(null);
                    setOtp('');
                    setError(null);
                    setStepSuccess(null);
                  }}
                  className="inline-flex items-center text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium transition"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back to credentials login
                </button>
              </div>
            </div>
          </form>
        ) : !isForgotPassword ? (
          <div>
            {/* Login Mode Toggle Tabs (Only for client/investors) */}
            {!isAdmin && (
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-5 border border-slate-200/80 dark:border-slate-700/60">
                <button
                  type="button"
                  onClick={() => { setLoginMode('PASSWORD'); setError(null); setStepSuccess(null); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'PASSWORD'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Password Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMode('OTP'); setError(null); setStepSuccess(null); }}
                  className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    loginMode === 'OTP'
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Login with OTP</span>
                </button>
              </div>
            )}

            {loginMode === 'OTP' ? (
              <form onSubmit={handleLoginWithOtp} className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Email or 10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Smartphone className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      required
                      value={otpIdentifier}
                      onChange={(e) => setOtpIdentifier(e.target.value)}
                      disabled={otpSent}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-24 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition disabled:opacity-60"
                      placeholder="client@mail.com or 9876543210"
                    />
                    {!otpSent ? (
                      <button
                        type="button"
                        onClick={() => handleRequestLoginOtp()}
                        disabled={isSendingLoginOtp || !otpIdentifier.trim()}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow-sm cursor-pointer"
                      >
                        {isSendingLoginOtp ? 'Sending...' : 'Send OTP'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setOtpSent(false); setLoginOtp(''); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[11px] font-bold px-2 py-1 transition cursor-pointer"
                      >
                        Change
                      </button>
                    )}
                  </div>
                </div>

                {otpSent && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                          6-Digit OTP Code
                        </label>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                          OTP Sent!
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <Key className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={loginOtp}
                          onChange={(e) => setLoginOtp(e.target.value.replace(/\D/g, ''))}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-center tracking-[0.4em] font-mono font-bold text-base text-slate-800 dark:text-white placeholder:tracking-normal placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                          placeholder="••••••"
                          autoFocus
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLoginOtp || loginOtp.length !== 6}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3.5 px-4 rounded-xl transition duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {isSubmittingLoginOtp ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Verifying & Logging In...</span>
                        </>
                      ) : (
                        <span>Login Directly with OTP ➔</span>
                      )}
                    </button>

                    <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                      <span>Didn&apos;t receive code?</span>
                      <button
                        type="button"
                        onClick={() => handleRequestLoginOtp()}
                        disabled={loginOtpCooldown > 0 || isSendingLoginOtp}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold disabled:opacity-50 disabled:no-underline cursor-pointer"
                      >
                        {loginOtpCooldown > 0 ? `Resend in ${loginOtpCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      placeholder="name@company.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all duration-200 shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>{isAdmin ? 'Sign In to Management Console' : 'Authenticate Session'}</span>
                  )}
                </button>
              </form>
            )}

            <div className="pt-3 text-center space-y-2">
              {loginMode === 'PASSWORD' && (
                <button
                  type="button"
                  onClick={() => { setIsForgotPassword(true); setError(null); setForgotSuccess(null); }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 cursor-pointer"
                >
                  Forgot Password?
                </button>
              )}
              {!isAdmin && (
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (onFlip) {
                        e.preventDefault();
                        onFlip();
                      } else {
                        router.push('/register');
                      }
                    }}
                    className="text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                  >
                    Sign up here
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Send Reset Link'}
            </button>
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => { setIsForgotPassword(false); setError(null); }}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                Back to Login
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Loading Overlay Modal (Active during successful login transition) ── */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl transition-all duration-500">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 text-center transform scale-100 opacity-100 transition-all duration-300">
            <div className="relative w-24 h-24 mb-6">
              {/* Outer rotating dashed ring */}
              <div className="absolute inset-0 rounded-full border-4 border-dashed border-blue-500/30 dark:border-blue-500/20 animate-[spin_4s_linear_infinite]" />
              {/* Inner rotating ring */}
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400 animate-[spin_2s_linear_infinite]" />
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 m-4 shadow-inner">
                <ShieldCheck className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2 tracking-tight">Secure Login in Progress</h3>
            <p className="text-xs text-slate-500 dark:text-blue-400 font-medium mb-6 h-6 transition-all duration-300">{loadingMessages[loadingTextIndex]}</p>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative shadow-inner">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 h-full rounded-full animate-[progress_6s_ease-in-out_infinite]" />
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes progress {
          0% { width: 10%; }
          50% { width: 70%; }
          100% { width: 95%; }
        }
      `}</style>
    </>
  );
}