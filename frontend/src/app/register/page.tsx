'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, User, Mail, Phone, Lock, Building, FileText, MapPin, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { useStates } from '@/hooks/useStates';
import { useCities } from '@/hooks/useCities';
import { formatPan, formatAadhaar } from '../../utils/formatters';

export default function RegisterPage() {
  const router = useRouter();
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
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
  const [duplicateField, setDuplicateField] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const { states } = useStates();
  const { cities } = useCities(state);

  useEffect(() => {
    document.body.classList.add('dark');
    return () => document.body.classList.remove('dark');
    
    // Load companies
    api.getPublicTenants()
      .then(res => {
        if (res.success && res.data.length > 0) {
          setTenants(res.data);
          // Set default tenant
          setTenantId(res.data[0].id);
        }
      })
      .catch(err => {
        console.error('Failed to load companies:', err);
      })
      .finally(() => {
        setLoadingTenants(false);
      });
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDuplicateField(null);
    setDuplicateError(null);

    const payload = {
      tenantId,
      name,
      email,
      mobile,
      password,
      pan: pan.toUpperCase(),
      aadhaar,
      category,
      occupation,
      addressLine1,
      city,
      state,
      zipCode
    };

    try {
      const res = await api.registerClient(payload);
      if (res.success) {
        setSuccess(true);
      }
    } catch (err: any) {
      if (err.duplicateField) {
        setDuplicateField(err.duplicateField);
        setDuplicateError(err.message);
      } else {
        setError(err.message || 'Registration failed. Check uniqueness of PAN, Aadhaar, Email, Mobile.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute bottom-[5%] right-[5%] w-[400px] h-[400px] rounded-full bg-emerald-500/5 blur-[120px]" />
      
      <div className="w-full max-w-2xl relative z-10 my-8">
        <div className="flex items-center justify-center space-x-2 mb-6">
          <ShieldCheck className="h-10 w-10 text-primary-600 dark:text-primary-500" />
          <span className="text-2xl font-black tracking-wider bg-gradient-to-r from-white to-primary-400 bg-clip-text text-transparent">
            RAGCP
          </span>
        </div>

        <div className="glassmorphism p-8 rounded-2xl border border-slate-400 dark:border-white/10 shadow-2xl">
          {success ? (
            <div className="text-center py-12 space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="h-20 w-20 text-emerald-600 dark:text-emerald-400 animate-bounce" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Successful!</h2>
              <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
                Your account has been registered successfully. It will be activated after admin approval. You will receive a welcome email once approved.
              </p>
              <div className="pt-6">
                <button
                  onClick={() => router.push('/login?role=client')}
                  className="bg-primary-600 hover:bg-primary-500 text-slate-900 dark:text-white font-semibold py-3 px-8 rounded-xl transition-all"
                >
                  Go to Login
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1">Create Client Account</h2>
              <p className="text-slate-600 dark:text-slate-400 text-xs mb-6">Register under a registered SEBI Research Analyst advisor</p>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-xs rounded-xl">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-6">
                
                {/* Select Advisor Company */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Select Advisor Partner</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Building className="h-4 w-4" />
                    </span>
                    {loadingTenants ? (
                      <div className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-500 flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading advisors...
                      </div>
                    ) : (
                      <select
                        value={tenantId}
                        onChange={(e) => setTenantId(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition text-slate-800 dark:text-slate-200"
                      >
                        {tenants.map(t => (
                          <option key={t.id} value={t.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                            {t.companyName} ({t.sebiRegistration})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Basic Details */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Full Name (As per PAN)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="relative w-full"><input
                        type="text" required value={name} onChange={(e) => setName(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Mail className="h-4 w-4" />
                      </span>
                      <input
                        type="email" required value={email} onChange={(e) => {
                          setEmail(e.target.value);
                          if (duplicateField === 'email') {
                            setDuplicateField(null);
                            setDuplicateError(null);
                          }
                        }}
                        className={`w-full bg-white/50 dark:bg-slate-900/50 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition ${
                          duplicateField === 'email' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/15 focus:border-primary-500'
                        }`}
                        placeholder="john@example.com"
                      />
                    </div>
                    {duplicateField === 'email' && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{duplicateError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Mobile Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Phone className="h-4 w-4" />
                      </span>
                      <input
                        type="text" required value={mobile} onChange={(e) => {
                          setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                          if (duplicateField === 'mobile') {
                            setDuplicateField(null);
                            setDuplicateError(null);
                          }
                        }}
                        className={`w-full bg-white/50 dark:bg-slate-900/50 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition ${
                          duplicateField === 'mobile' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/15 focus:border-primary-500'
                        }`}
                        placeholder="9876543210"
                      />
                    </div>
                    {duplicateField === 'mobile' && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{duplicateError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Password</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <Lock className="h-4 w-4" />
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}required value={password} onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition"
                        placeholder="••••••••"
                      />
<button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary-500 focus:outline-none">
  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
</button></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-300 dark:border-white/5 pt-4">
                  {/* Identity Check */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">PAN Number (10 Alphanumeric)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <FileText className="h-4 w-4" />
                      </span>
                      <input
                        type="text" required value={pan} onChange={(e) => {
                          setPan(formatPan(e.target.value));
                          if (duplicateField === 'pan') {
                            setDuplicateField(null);
                            setDuplicateError(null);
                          }
                        }}
                        className={`w-full bg-white/50 dark:bg-slate-900/50 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition uppercase ${
                          duplicateField === 'pan' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/15 focus:border-primary-500'
                        }`}
                        placeholder="ABCDE1234F"
                      />
                    </div>
                    {duplicateField === 'pan' && (
                      <p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{duplicateError}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Aadhaar Number (12 Digits)</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <FileText className="h-4 w-4" />
                      </span>
                      <input
                        type="text" required value={aadhaar} onChange={(e) => {
                          setAadhaar(formatAadhaar(e.target.value));
                          if (duplicateField === 'aadhaar') {
                            setDuplicateField(null);
                            setDuplicateError(null);
                          }
                        }}
                        className={`w-full bg-white/50 dark:bg-slate-900/50 border rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none transition ${
                          duplicateField === 'aadhaar' ? 'border-red-500 focus:border-red-500' : 'border-slate-400 dark:border-white/15 focus:border-primary-500'
                        }`}
                        placeholder="123456789012"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Category</label>
                    <select
                      value={category} onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition"
                    >
                      <option value="INDIVIDUAL" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">INDIVIDUAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Occupation</label>
                    <input
                      type="text" value={occupation} onChange={(e) => setOccupation(e.target.value)}
                      className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition"
                      placeholder="e.g. Engineer, Business"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-300 dark:border-white/5 pt-4 space-y-4">
                  {/* Address Section */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Address Line 1</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <input
                        type="text" required value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-primary-500 transition"
                        placeholder="Apartment, Street Name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">State</label>
                      <select
                        required value={state} onChange={(e) => {
                          setState(e.target.value);
                          setCity(''); // Reset city when state changes
                        }}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition appearance-none"
                      >
                        <option value="">Select State</option>
                        {states.map((s: any) => (
                          <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">City</label>
                      <input
                        type="text" required value={city} onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition"
                        placeholder="Select or type city"
                        list="city-options"
                        disabled={!state}
                      />
                      <datalist id="city-options">
                        {cities.map((c: any, i: number) => (
                          <option key={i} value={c.name} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">Zip Code</label>
                      <input
                        type="text" required value={zipCode} onChange={(e) => setZipCode(e.target.value)}
                        className="w-full bg-white/50 dark:bg-slate-900/50 border border-slate-400 dark:border-white/15 rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-primary-500 transition"
                        placeholder="400001"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full py-3.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-sm transition hover-lift shadow-lg shadow-primary-600/20 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Creating Profile...</span>
                    </>
                  ) : (
                    <span>Register Account</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-slate-600 dark:text-slate-400 border-t border-slate-300 dark:border-white/5 pt-4">
                <span>Already registered? </span>
                <Link href="/login?role=client" className="text-primary-600 dark:text-primary-400 hover:underline font-semibold">
                  Log in here
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
