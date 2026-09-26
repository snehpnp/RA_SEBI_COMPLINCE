'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mail, Phone, Lock, Building2, Briefcase, Loader2,
  CheckCircle2, Eye, EyeOff, AlertCircle, ChevronRight, ChevronLeft, ShieldCheck
} from 'lucide-react';
import api from '../services/api';
import { toast } from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';

export default function RegisterForm({ onFlip }: { onFlip?: () => void }) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('INDIVIDUAL');
  const [occupation, setOccupation] = useState('');
  const [occupationsList, setOccupationsList] = useState<any[]>([]);

  // Verification Mode & Policies
  const [verificationMode, setVerificationMode] = useState<'EMAIL_ONLY' | 'MOBILE_ONLY' | 'BOTH'>('EMAIL_ONLY');
  const [passwordPolicy, setPasswordPolicy] = useState<'NORMAL' | 'STRONG'>('NORMAL');

  // Email OTP States
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmailOtp, setVerifyingEmailOtp] = useState(false);

  // Mobile OTP States
  const [mobileVerified, setMobileVerified] = useState(false);
  const [mobileOtpSent, setMobileOtpSent] = useState(false);
  const [mobileOtp, setMobileOtp] = useState('');
  const [sendingMobileOtp, setSendingMobileOtp] = useState(false);
  const [verifyingMobileOtp, setVerifyingMobileOtp] = useState(false);

  // General Status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { logoUrl, appName } = useBranding();

  useEffect(() => {
    // Fetch dynamic occupations
    api.getOccupations().then(res => {
      if (res && res.success && Array.isArray(res.data)) {
        setOccupationsList(res.data);
      }
    }).catch(() => {});

    // Fetch tenant security settings
    api.getSecurityPolicy().then(res => {
      if (res && res.success && res.data) {
        if (res.data.passwordPolicy) setPasswordPolicy(res.data.passwordPolicy);
        if (res.data.signupVerificationMode) setVerificationMode(res.data.signupVerificationMode);
      }
    }).catch(() => {});
  }, []);

  // --- Email OTP Handlers ---
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@')) return toast.error('Please enter a valid email address.');
    setSendingEmailOtp(true);
    try {
      const res = await api.requestOtp({ email, type: 'EMAIL' });
      if (res.success) {
        setEmailOtpSent(true);
        toast.success(res.message || 'OTP sent to your email.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send Email OTP.');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) return toast.error('Please enter the 6-digit Email OTP.');
    setVerifyingEmailOtp(true);
    try {
      const res = await api.verifyOtp({ email, otp: emailOtp, type: 'EMAIL' });
      if (res.success) {
        setEmailVerified(true);
        toast.success(res.message || 'Email verified successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid Email OTP.');
    } finally {
      setVerifyingEmailOtp(false);
    }
  };

  // --- Mobile OTP Handlers ---
  const handleSendMobileOtp = async () => {
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) return toast.error('Please enter a valid 10-digit mobile number.');
    setSendingMobileOtp(true);
    try {
      const res = await api.requestOtp({ mobile: cleanMobile, email: email || undefined, type: 'MOBILE' });
      if (res.success) {
        setMobileOtpSent(true);
        toast.success(res.message || 'OTP sent to your mobile number.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send Mobile OTP.');
    } finally {
      setSendingMobileOtp(false);
    }
  };

  const handleVerifyMobileOtp = async () => {
    if (!mobileOtp || mobileOtp.length !== 6) return toast.error('Please enter the 6-digit Mobile OTP.');
    setVerifyingMobileOtp(true);
    try {
      const res = await api.verifyOtp({ mobile: mobile.replace(/\D/g, ''), otp: mobileOtp, type: 'MOBILE' });
      if (res.success) {
        setMobileVerified(true);
        toast.success(res.message || 'Mobile number verified successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid Mobile OTP.');
    } finally {
      setVerifyingMobileOtp(false);
    }
  };

  // --- Step 1 Validation ---
  const handleNextStep = () => {
    setError(null);
    if (!email || !email.includes('@')) {
      return toast.error('Please enter a valid email address.');
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      return toast.error('Valid 10-digit mobile number is required.');
    }

    // Check verification mode
    if ((verificationMode === 'EMAIL_ONLY' || verificationMode === 'BOTH') && !emailVerified) {
      return toast.error('Please verify your Email OTP before proceeding.');
    }
    if ((verificationMode === 'MOBILE_ONLY' || verificationMode === 'BOTH') && !mobileVerified) {
      return toast.error('Please verify your Mobile OTP before proceeding.');
    }

    // Password validation
    if (!password || password.length < 8 || password.length > 15) {
      return toast.error('Password must be between 8 and 15 characters.');
    }

    if (passwordPolicy === 'STRONG') {
      if (!/[A-Z]/.test(password)) return toast.error('Password must contain at least 1 uppercase letter.');
      if (!/[a-z]/.test(password)) return toast.error('Password must contain at least 1 lowercase letter.');
      if (!/[0-9]/.test(password)) return toast.error('Password must contain at least 1 number.');
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return toast.error('Password must contain at least 1 special character.');
    }

    setStep(2);
  };

  // --- Submit Registration ---
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 2) return;
    if (!occupation) return toast.error('Please select your occupation.');

    setLoading(true);
    setError(null);

    const payload = {
      email: email.trim().toLowerCase(),
      mobile: mobile.replace(/\D/g, ''),
      password,
      category,
      occupation
    };

    try {
      const res = await api.registerClient(payload);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      let msg = '';
      const rawMsg = String(err.message || (err.errors && err.errors[0]) || '');
      if (err.duplicateField === 'email' || /\bemail\b/i.test(rawMsg)) {
        msg = 'This email address is already registered. Please login or use a different email.';
        setStep(1);
      } else if (err.duplicateField === 'mobile' || /\b(mobile|phone)\b/i.test(rawMsg)) {
        msg = 'This mobile number is already registered. Please login or use a different mobile number.';
        setStep(1);
      } else if (err.duplicateField === 'pan' || (err.duplicateField == null && (/\b(pan|pan_1|pan_unique_partial)\b/i.test(rawMsg) || /index:\s*pan/i.test(rawMsg) || /dup key:\s*\{\s*pan:/i.test(rawMsg)))) {
        msg = 'This PAN card number is already registered with an existing account.';
      } else if (err.duplicateField === 'aadhaar' || (err.duplicateField == null && /\baadhaar\b/i.test(rawMsg))) {
        msg = 'This Aadhaar number is already registered with an existing account.';
      } else if (err.errors && err.errors.length > 0 && err.errors[0]) {
        msg = err.errors[0];
      } else {
        msg = err.message || 'Registration failed. Please check your details.';
      }

      // Filter out any leftover raw technical or database error strings
      if (msg.includes('E11000') || msg.includes('duplicate key') || msg.includes('dup key')) {
        msg = 'An account with these details already exists. Please verify your details or login.';
      }

      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {success ? (
        <div className="text-center py-10 space-y-6 animate-fade-in-up">
          <div className="flex justify-center">
            <CheckCircle2 className="h-20 w-20 text-emerald-500 animate-bounce" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Account Created Successfully!</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
            Your client account is now active. As per SEBI regulations, you can complete your DigiLocker KYC and Advisory Agreement upon login.
          </p>
          <div className="pt-4">
            <button
              onClick={() => {
                if (onFlip) onFlip();
                else router.push('/login');
              }}
              className="bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-primary-500/30"
            >
              Proceed to Login
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1 text-slate-900 dark:text-white">Create Client Account</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">
              Quick registration • Zero manual KYC paperwork
            </p>
          </div>

          {/* 2-Step Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                1
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Credentials</span>
              <div className={`h-1 w-10 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                2
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Profile</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-xs rounded-xl flex items-center space-x-2 animate-fade-in-up">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            {/* STEP 1: Email, Mobile, Password & Dynamic OTP Verification */}
            {step === 1 && (
              <div className="animate-fade-in-up space-y-4">
                {/* Email Section */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Email Address</span>
                      {(verificationMode === 'EMAIL_ONLY' || verificationMode === 'BOTH') && (
                        <span className="text-[10px] text-primary-500 font-semibold lowercase">Verification Required</span>
                      )}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <Mail className="h-4 w-4" />
                        </span>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setEmailVerified(false);
                            setEmailOtpSent(false);
                          }}
                          disabled={emailVerified}
                          className={`w-full bg-white dark:bg-slate-900 border rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${
                            emailVerified
                              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 cursor-not-allowed'
                              : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 text-slate-800 dark:text-white'
                          }`}
                          placeholder="client@example.com"
                        />
                      </div>
                      {(verificationMode === 'EMAIL_ONLY' || verificationMode === 'BOTH') && (
                        <>
                          {!emailVerified ? (
                            <button
                              type="button"
                              onClick={handleSendEmailOtp}
                              disabled={sendingEmailOtp || !email}
                              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all whitespace-nowrap flex items-center justify-center min-w-[110px]"
                            >
                              {sendingEmailOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : (emailOtpSent ? 'Resend' : 'Send OTP')}
                            </button>
                          ) : (
                            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2 px-3 rounded-xl border border-emerald-500/20 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verified
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Email OTP Verification Input */}
                  {(verificationMode === 'EMAIL_ONLY' || verificationMode === 'BOTH') && emailOtpSent && !emailVerified && (
                    <div className="pt-1 animate-fade-in-up">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={emailOtp}
                          onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-500/40 rounded-xl py-2 px-3 text-center tracking-[0.4em] font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-slate-800 dark:text-white flex-1"
                          placeholder="••••••"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyEmailOtp}
                          disabled={verifyingEmailOtp || emailOtp.length !== 6}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center justify-center min-w-[100px]"
                        >
                          {verifyingEmailOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm OTP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mobile Section */}
                <div className="bg-slate-50 dark:bg-slate-800/40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Mobile Number</span>
                      {(verificationMode === 'MOBILE_ONLY' || verificationMode === 'BOTH') && (
                        <span className="text-[10px] text-primary-500 font-semibold lowercase">Verification Required</span>
                      )}
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <Phone className="h-4 w-4" />
                        </span>
                        <input
                          type="text"
                          required
                          value={mobile}
                          onChange={(e) => {
                            setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                            setMobileVerified(false);
                            setMobileOtpSent(false);
                          }}
                          disabled={mobileVerified}
                          className={`w-full bg-white dark:bg-slate-900 border rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${
                            mobileVerified
                              ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 cursor-not-allowed'
                              : 'border-slate-200 dark:border-slate-700 focus:border-primary-500 text-slate-800 dark:text-white'
                          }`}
                          placeholder="9876543210"
                        />
                      </div>
                      {(verificationMode === 'MOBILE_ONLY' || verificationMode === 'BOTH') && (
                        <>
                          {!mobileVerified ? (
                            <button
                              type="button"
                              onClick={handleSendMobileOtp}
                              disabled={sendingMobileOtp || mobile.length !== 10}
                              className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-all whitespace-nowrap flex items-center justify-center min-w-[110px]"
                            >
                              {sendingMobileOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : (mobileOtpSent ? 'Resend' : 'Send OTP')}
                            </button>
                          ) : (
                            <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold py-2 px-3 rounded-xl border border-emerald-500/20 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Verified
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Mobile OTP Verification Input */}
                  {(verificationMode === 'MOBILE_ONLY' || verificationMode === 'BOTH') && mobileOtpSent && !mobileVerified && (
                    <div className="pt-1 animate-fade-in-up">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={mobileOtp}
                          onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          className="w-full bg-white dark:bg-slate-900 border border-primary-300 dark:border-primary-500/40 rounded-xl py-2 px-3 text-center tracking-[0.4em] font-bold text-base focus:outline-none focus:ring-2 focus:ring-primary-500/40 text-slate-800 dark:text-white flex-1"
                          placeholder="••••••"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyMobileOtp}
                          disabled={verifyingMobileOtp || mobileOtp.length !== 6}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all whitespace-nowrap flex items-center justify-center min-w-[100px]"
                        >
                          {verifyingMobileOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm OTP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Password Section */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Password {passwordPolicy === 'STRONG' && <span className="text-primary-500 font-bold normal-case text-[10px]">(Strong Policy)</span>}
                  </label>
                  <div className="relative mb-2">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      maxLength={15}
                      className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800 dark:text-white"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {passwordPolicy === 'STRONG' ? (
                    <div className="p-2.5 bg-slate-100/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                      <div className="grid grid-cols-2 gap-1 text-[10px]">
                        <div className={`flex items-center gap-1 ${password.length >= 8 && password.length <= 15 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${password.length >= 8 && password.length <= 15 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          8 - 15 chars
                        </div>
                        <div className={`flex items-center gap-1 ${/[A-Z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${/[A-Z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          1 Uppercase
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${/[a-z]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          1 Lowercase
                        </div>
                        <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${/[0-9]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          1 Number
                        </div>
                        <div className={`col-span-2 flex items-center gap-1 ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : ''}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          1 Special character (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Must be between 8 and 15 characters</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleNextStep}
                  className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-primary-500/25 mt-2"
                >
                  Continue <ChevronRight className="h-4 w-4 ml-1.5" />
                </button>
              </div>
            )}

            {/* STEP 2: Category & Occupation (Zero Manual PAN/Aadhaar/Address) */}
            {step === 2 && (
              <div className="animate-fade-in-up space-y-4">
                {/* DigiLocker Compliance Notice */}
                <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800/60 rounded-xl p-3.5 flex items-start space-x-3">
                  <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-primary-900 dark:text-primary-200 leading-relaxed">
                    <p className="font-bold">SEBI Automated DigiLocker Verification</p>
                    <p className="text-[11px] text-primary-700 dark:text-primary-300 mt-0.5">
                      No manual entry of PAN, Aadhaar, or Address needed. Your verified government details will be fetched automatically via DigiLocker upon login.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Client Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800 dark:text-white"
                  >
                    <option value="INDIVIDUAL">Individual</option>
                    <option value="HUF">HUF</option>
                    <option value="COMPANY">Company</option>
                    <option value="PARTNERSHIP">Partnership / LLP</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Occupation
                  </label>
                  <select
                    required
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 text-slate-800 dark:text-white"
                  >
                    <option value="">Select Occupation</option>
                    {occupationsList.map((o: any) => (
                      <option key={o.id || o._id} value={o.name}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center text-xs"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !occupation}
                    className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center text-xs shadow-lg shadow-emerald-500/25"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {loading ? 'Creating Account...' : 'Complete Registration'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={(e) => {
                  if (onFlip) {
                    e.preventDefault();
                    onFlip();
                  } else {
                    router.push('/login');
                  }
                }}
                className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
              >
                Login here
              </button>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
