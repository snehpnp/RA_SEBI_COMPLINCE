'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, Mail, Phone, Lock, Building, FileText, MapPin, Loader2, CheckCircle2, Eye, EyeOff, AlertCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import api from '../services/api';
import { useStates } from '@/hooks/useStates';
import { useCities } from '@/hooks/useCities';
import { formatPan, formatAadhaar } from '../utils/formatters';
import { toast } from 'react-hot-toast';
import { useBranding } from '@/contexts/BrandingContext';

export default function RegisterForm({ onFlip }: { onFlip?: () => void }) {
  const router = useRouter();
  
  const [step, setStep] = useState(1);
  const [tenants, setTenants] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  
  // OTP States
  const [email, setEmail] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [category, setCategory] = useState('INDIVIDUAL');
  const [occupation, setOccupation] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zipCode, setZipCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { states } = useStates();
  const { cities } = useCities(state);
  const { logoUrl, appName } = useBranding();

  useEffect(() => {
    // Load companies
    api.getPublicTenants()
      .then(res => {
        if (res.success && res.data.length > 0) {
          setTenants(res.data);
          setTenantId(res.data[0].id);
        }
      })
      .catch(err => console.error('Failed to load companies:', err))
      .finally(() => setLoadingTenants(false));
  }, []);

  const handleSendOtp = async () => {
    if (!email) return toast.error('Please enter an email address first.');
    setSendingOtp(true);
    try {
      const res = await api.requestOtp(email, tenantId);
      if (res.success) {
        setOtpSent(true);
        toast.success(res.message || 'OTP sent successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return toast.error('Please enter the OTP.');
    setVerifyingOtp(true);
    try {
      const res = await api.verifyOtp(email, otp);
      if (res.success) {
        setEmailVerified(true);
        toast.success(res.message || 'Email verified successfully!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const validateStep1 = () => {
    if (!tenantId) return toast.error('Please select an Advisor.');
    if (!emailVerified) return toast.error('Please verify your email to continue.');
    if (!password || password.length < 8) return toast.error('Password must be at least 8 characters.');
    setStep(2);
  };

  const validateStep2 = () => {
    if (!name.trim()) return toast.error('Full Name is required.');
    if (!mobile || mobile.length !== 10) return toast.error('Valid 10-digit mobile number is required.');
    if (!pan || pan.length !== 10) return toast.error('Valid PAN is required.');
    if (!aadhaar || aadhaar.length !== 12) return toast.error('Valid Aadhaar is required.');
    if (!occupation.trim()) return toast.error('Occupation is required.');
    setStep(3);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step !== 3) return;
    if (!addressLine1 || !state || !city || !zipCode) return toast.error('Please fill all address fields.');
    
    setLoading(true);
    setError(null);

    const payload = {
      tenantId, name, email, mobile, password,
      pan: pan.toUpperCase(), aadhaar, category, occupation,
      addressLine1, city, state, zipCode
    };

    try {
      const res = await api.registerClient(payload);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      let msg = err.message || 'Registration failed. Please check your details.';
      if (err.errors && err.errors.length > 0) {
        msg = `${msg} - ${err.errors[0]}`;
      }
      setError(msg);
      
      // Navigate to the correct step if a specific field is duplicate
      if (err.duplicateField) {
        if (['email', 'password'].includes(err.duplicateField)) setStep(1);
        else if (['mobile', 'pan', 'aadhaar'].includes(err.duplicateField)) setStep(2);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full">
        {success ? (
          <div className="text-center py-12 space-y-6 animate-fade-in-up">
            <div className="flex justify-center">
              <CheckCircle2 className="h-24 w-24 text-emerald-600 dark:text-emerald-400 animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Registration Successful!</h2>
            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
              Your account has been registered successfully. It will be activated after admin approval. You will receive a welcome email once approved.
            </p>
            <div className="pt-6">
              <button onClick={() => {
                if (onFlip) onFlip();
                else router.push('/login');
              }} className="bg-primary-600 hover:bg-primary-500 text-white font-semibold py-3 px-10 rounded-xl transition-all shadow-lg shadow-primary-500/30">
                Go to Login
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Create Client Account</h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm">Register under a SEBI-registered Research Analyst advisor</p>
            </div>

            {/* Progress Stepper */}
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center space-x-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>1</div>
                <div className={`h-1 w-12 rounded-full ${step >= 2 ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>2</div>
                <div className={`h-1 w-12 rounded-full ${step >= 3 ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${step >= 3 ? 'bg-primary-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>3</div>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-200 text-sm rounded-xl flex items-center space-x-3 shadow-sm shadow-red-100 dark:shadow-none animate-fade-in-up">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span className="font-medium">{error}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              
              {/* STEP 1: Account Setup */}
              {step === 1 && (
                <div className="animate-fade-in-up space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Select Advisor Partner</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><Building className="h-5 w-5" /></span>
                      {loadingTenants ? (
                        <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm text-slate-500 flex items-center">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading advisors...
                        </div>
                      ) : (
                        <select
                          value={tenantId} onChange={(e) => setTenantId(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-slate-800 dark:text-slate-200 appearance-none cursor-pointer"
                        >
                          {tenants.map(t => <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{t.companyName} ({t.sebiRegistration})</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/30 p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address (Requires Verification)</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><Mail className="h-5 w-5" /></span>
                          <input
                            type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setEmailVerified(false); setOtpSent(false); }}
                            disabled={emailVerified}
                            className={`w-full bg-white dark:bg-slate-900/50 border rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all ${emailVerified ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/5 cursor-not-allowed' : 'border-slate-200 dark:border-slate-700 focus:border-primary-500'}`}
                            placeholder="john@example.com"
                          />
                        </div>
                        {!emailVerified && (
                          <button type="button" onClick={handleSendOtp} disabled={sendingOtp || !email} className="bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-xl transition-all whitespace-nowrap flex items-center justify-center min-w-[140px] shadow-md shadow-primary-500/20">
                            {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : (otpSent ? 'Resend OTP' : 'Verify Email')}
                          </button>
                        )}
                        {emailVerified && (
                          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium py-2 px-6 rounded-xl border border-emerald-500/20 flex items-center justify-center min-w-[140px]">
                            <CheckCircle2 className="h-5 w-5 mr-2" /> Verified
                          </div>
                        )}
                      </div>
                    </div>

                    {otpSent && !emailVerified && (
                      <div className="animate-fade-in-up pt-2">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Enter 6-Digit OTP</label>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="text" required value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0,6))}
                            className="w-full bg-white dark:bg-slate-900/50 border border-primary-300 dark:border-primary-500/30 rounded-xl py-2 px-4 text-lg tracking-[0.5em] text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all text-slate-800 dark:text-white flex-1"
                            placeholder="------"
                          />
                          <button type="button" onClick={handleVerifyOtp} disabled={verifyingOtp || otp.length !== 6} className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 px-6 rounded-xl transition-all whitespace-nowrap flex items-center justify-center min-w-[140px] shadow-md shadow-emerald-500/20">
                            {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm OTP'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Create Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><Lock className="h-5 w-5" /></span>
                      <input
                        type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <button type="button" onClick={validateStep1} className="w-full bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-primary-500/30">
                    Next Step <ChevronRight className="h-5 w-5 ml-2" />
                  </button>
                </div>
              )}

              {/* STEP 2: Identity */}
              {step === 2 && (
                <div className="animate-fade-in-up space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Full Name (As per PAN)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><User className="h-5 w-5" /></span>
                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="John Doe" />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Mobile Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><Phone className="h-5 w-5" /></span>
                        <input type="text" required value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="9876543210" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">PAN Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><FileText className="h-5 w-5" /></span>
                        <input type="text" required value={pan} onChange={(e) => setPan(formatPan(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="ABCDE1234F" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Aadhaar Number</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><FileText className="h-5 w-5" /></span>
                        <input type="text" required value={aadhaar} onChange={(e) => setAadhaar(formatAadhaar(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="1234 5678 9012" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Category</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer">
                        <option value="INDIVIDUAL">Individual</option>
                        <option value="HUF">HUF</option>
                        <option value="COMPANY">Company</option>
                        <option value="PARTNERSHIP">Partnership / LLP</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Occupation</label>
                      <input type="text" required value={occupation} onChange={(e) => setOccupation(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="e.g. Salaried, Business" />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center">
                      <ChevronLeft className="h-5 w-5 mr-2" /> Back
                    </button>
                    <button type="button" onClick={validateStep2} className="flex-[2] bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-primary-500/30">
                      Next Step <ChevronRight className="h-5 w-5 ml-2" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Address & Submit */}
              {step === 3 && (
                <div className="animate-fade-in-up space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Address Line 1</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400"><MapPin className="h-5 w-5" /></span>
                        <input type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="House / Flat No, Street, Landmark" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">State</label>
                      <select value={state} onChange={(e) => setState(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer">
                        <option value="">Select State</option>
                        {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">City</label>
                      <select value={city} onChange={(e) => setCity(e.target.value)} required className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all appearance-none cursor-pointer">
                        <option value="">Select City</option>
                        {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Pincode</label>
                      <input type="text" required value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="e.g. 110001" />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setStep(2)} className="flex-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center">
                      <ChevronLeft className="h-5 w-5 mr-2" /> Back
                    </button>
                    <button type="submit" disabled={loading} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                      {loading ? 'Submitting...' : 'Complete Registration'}
                    </button>
                  </div>
                </div>
              )}
            </form>
            
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <button type="button" onClick={(e) => {
                  if (onFlip) {
                    e.preventDefault();
                    onFlip();
                  } else {
                    router.push('/login');
                  }
                }} className="text-primary-600 dark:text-primary-400 font-bold hover:underline">
                  Login here
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
