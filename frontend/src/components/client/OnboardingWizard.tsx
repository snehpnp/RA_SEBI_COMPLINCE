import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, User, FileText, CheckCircle2, AlertTriangle,
  ChevronRight, ChevronLeft, CreditCard, PenTool, Check, Loader2, Tag
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useBranding } from '../../contexts/BrandingContext';

interface OnboardingWizardProps {
  profile: any;
  onComplete: () => void;
}

export default function OnboardingWizard({ profile, onComplete }: OnboardingWizardProps) {
  const [loading, setLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const { appName, logoUrl } = useBranding();
  const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};



  // Settings
  const kycFirst = profile?.user?.tenant?.kycFirst !== false; // Default true

  // Flow determination
  const STEPS = kycFirst ? [
    { id: 'welcome', label: 'Welcome' },
    { id: 'profile', label: 'Complete Profile' },
    { id: 'kyc', label: 'Identity KYC' },
    { id: 'agreement', label: 'Legal Agreement' },
    { id: 'subscription', label: 'Subscription' }
  ] : [
    { id: 'welcome', label: 'Welcome' },
    { id: 'profile', label: 'Complete Profile' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'kyc', label: 'Identity KYC' },
    { id: 'agreement', label: 'Legal Agreement' }
  ];

  const getInitialStep = () => {
    if (!profile) return 0;
    const status = profile.status;
    
    // Resume logic based on profile status
    if (status === 'ACTIVE') {
      if (profile.kycStatus !== 'VERIFIED' && profile.kycStatus !== 'FAILED') {
        const idx = STEPS.findIndex(s => s.id === 'kyc');
        return idx !== -1 ? idx : 2;
      }
      return STEPS.length - 1; // Show last step if fully active
    }

    if (status === 'PAYMENT_PENDING') {
      const idx = STEPS.findIndex(s => s.id === 'subscription');
      return idx !== -1 ? idx : 4;
    }

    if (status === 'AGREEMENT_PENDING') {
      const idx = STEPS.findIndex(s => s.id === 'agreement');
      return idx !== -1 ? idx : 3;
    }

    if (status === 'KYC_PENDING' || status === 'KYC_FAILED') {
      const idx = STEPS.findIndex(s => s.id === 'kyc');
      return idx !== -1 ? idx : 2;
    }

    // Default to Welcome (step 0) or Profile (step 1) for PENDING_ONBOARDING
    const profIdx = STEPS.findIndex(s => s.id === 'profile');
    return profIdx !== -1 ? profIdx : 1;
  };

  const [currentStep, setCurrentStep] = useState(getInitialStep());

  // Step Profile State
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || profile?.mobile || '',
    address: profile?.profile?.addressLine1 || profile?.address || '',
  });

  // Step KYC State
  const [pan, setPan] = useState(profile?.pan || '');
  const [aadhaar, setAadhaar] = useState(profile?.aadhaar || '');
  const [kraStatus, setKraStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>(
    profile?.status === 'KYC_FAILED' ? 'failed' :
      (profile?.status === 'AGREEMENT_PENDING' || profile?.status === 'PAYMENT_PENDING' || profile?.status === 'ACTIVE' || profile?.kycStatus === 'VERIFIED') ? 'success' : 'idle'
  );


  // Step Agreement
  const [agreementSigned, setAgreementSigned] = useState(!!profile?.agreementSigned);

  // Coupons
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const agreementHTML = React.useMemo(() => {
    if (!profile?.user?.tenant) return "Loading agreement...";
    let content = profile.user.tenant.agreementContent || "Standard SEBI Agreement...";
    const replacements: Record<string, string> = {
      '{{CLIENT_NAME}}': formData.name || `${profile.user.firstName || ''} ${profile.user.lastName || ''}`,
      '{{CLIENT_EMAIL}}': formData.email || profile.user.email || '',
      '{{CLIENT_MOBILE}}': formData.phone || profile.mobile || 'NA',
      '{{PAN_NUMBER}}': pan || profile.pan || '',
      '{{AADHAAR_NUMBER}}': aadhaar || profile.aadhaar || '',
      '{{CLIENT_ADDRESS}}': formData.address || (profile.profile?.addressLine1 ? `${profile.profile.addressLine1}, ${profile.profile?.city || ''}` : 'NA'),
      '{{COMPANY_NAME}}': profile.user.tenant.companyName || '',
      '{{SEBI_REGISTRATION}}': profile.user.tenant.sebiRegistration || '',
      '{{COMPANY_ADDRESS}}': profile.user.tenant.address || '',
      '{{DATE}}': new Date().toLocaleDateString('en-IN')
    };
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }
    return content;
  }, [profile, formData, pan, aadhaar]);

  useEffect(() => {
    // Fetch plans
    api.getPlans().then(res => {
      if (res.success) setAvailablePlans(res.data || []);
    }).catch(console.error);
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.updateProfile(formData);
      handleNext();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let formatted = '';
    for (let i = 0; i < val.length; i++) {
      if (i < 5 && /[A-Z]/.test(val[i])) {
        formatted += val[i];
      } else if (i >= 5 && i < 9 && /[0-9]/.test(val[i])) {
        formatted += val[i];
      } else if (i === 9 && /[A-Z]/.test(val[i])) {
        formatted += val[i];
      }
    }
    setPan(formatted);
    if (kraStatus !== 'idle') setKraStatus('idle');
  };

  const handleAadhaarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    let formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
    setAadhaar(formatted);
  };

  const handleVerifyKRA = async () => {
    setKraStatus('loading');
    try {
      const res = await api.initiateDigioKyc();

      if (res.success && res.data && res.data.id) {
        const options = {
          environment: 'production',
          callback: async function (response: any) {
            if (response.hasOwnProperty('error_code')) {
              toast.error("Digio KYC Failed or Cancelled");
              setKraStatus('failed');
            } else {
              // Now save PAN/Aadhaar to our DB
              const verifyRes = await api.verifyKRA({ pan, aadhaar });
              if (verifyRes.success) {
                setKraStatus('success');
                toast.success('Demat Account / KYC Verified!');
              } else {
                toast.error(verifyRes.message || 'Failed to update KRA status');
                setKraStatus('failed');
              }
            }
          },
          logo: 'https://digio.in/images/logo.png',
          theme: {
            primaryColor: '#1B42E0',
            secondaryColor: '#000000'
          }
        };
        const digio = new (window as any).Digio(options);
        digio.init();
        digio.submit(res.data.id, formData.email || pan);
      } else {
        toast.error(res.message || 'Failed to initiate Digio request');
        setKraStatus('failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to connect to Digio. Please ensure credentials are correct.');
      setKraStatus('failed');
    }
  };

  const handleKycNext = async () => {
    if (kraStatus !== 'success' && kraStatus !== 'failed') return;
    setLoading(true);
    try {
      handleNext();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async () => {
    setLoading(true);
    try {
      const res = await api.initiateDigioAgreement();

      if (res.success && res.data && res.data.id) {
        const options = {
          environment: 'production',
          callback: async function (response: any) {
            if (response.hasOwnProperty('error_code')) {
              toast.error("Digio eSign Failed or Cancelled");
              setLoading(false);
            } else {
              await api.updateDigioStatus({ type: 'AGREEMENT', status: 'COMPLETED' });
              setAgreementSigned(true);
              setLoading(false);
            }
          },
          logo: 'https://digio.in/images/logo.png',
          theme: {
            primaryColor: '#1B42E0',
            secondaryColor: '#000000'
          }
        };
        const digio = new (window as any).Digio(options);
        digio.init();
        digio.submit(res.data.id, formData.email);
      } else {
        toast.error(res.message || 'Failed to initiate Digio request');
        setLoading(false);
      }
    } catch (err: any) {
      toast.error('Failed to connect to Digio. Please ensure credentials are correct.');
      setLoading(false);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setLoading(true);
    try {
      const res = await api.applyCoupon(couponCode);
      if (res.success) {
        setAppliedCoupon(res.data);
        toast('Coupon applied!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setLoading(false);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectPlan = async (planId: string) => {
    setLoading(true);
    try {
      const activeGateway = profile?.user?.tenant?.activePaymentGateway || 'CCAVENUE';

      if (activeGateway === 'RAZORPAY') {
        const res = await api.initiateRazorpayPayment({
          planId,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
        });

        if (res.success && res.orderId) {
          const isLoaded = await loadRazorpayScript();
          if (!isLoaded) throw new Error('Razorpay SDK failed to load');

          const options = {
            key: res.keyId,
            amount: res.amount,
            currency: res.currency,
            name: profile?.user?.tenant?.companyName || 'Premium Advisory',
            description: 'Subscription Payment',
            order_id: res.orderId,
            handler: async function (response: any) {
              try {
                const verifyRes = await api.verifyRazorpayPayment({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  planId,
                  couponCode: appliedCoupon ? appliedCoupon.code : undefined
                });
                if (verifyRes.success) {
                  toast.success('Payment successful!');
                  window.location.href = '/client?payment=success';
                } else {
                  throw new Error(verifyRes.message || 'Payment verification failed');
                }
              } catch (err: any) {
                toast.error(err.message || 'Verification failed');
                window.location.href = '/client?payment=failed';
              }
            },
            prefill: {
              name: profile?.name || '',
              email: profile?.email || '',
              contact: profile?.phone || profile?.mobile || ''
            },
            theme: {
              color: profile?.user?.tenant?.themeColor || '#4F46E5'
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error(response.error.description || 'Payment failed');
          });
          rzp.open();
          setLoading(false);
        } else {
          throw new Error(res.message || 'Failed to initiate Razorpay payment');
        }

      } else {
        // Fallback to CCAvenue
        const res = await api.initiateCCAvenuePayment({
          planId,
          couponCode: appliedCoupon ? appliedCoupon.code : undefined
        });

        if (res.success && res.url) {
          const form = document.createElement('form');
          form.method = 'POST';
          form.action = res.url;

          const encRequestInput = document.createElement('input');
          encRequestInput.type = 'hidden';
          encRequestInput.name = 'encRequest';
          encRequestInput.value = res.encRequest;
          form.appendChild(encRequestInput);

          const accessCodeInput = document.createElement('input');
          accessCodeInput.type = 'hidden';
          accessCodeInput.name = 'access_code';
          accessCodeInput.value = res.accessCode;
          form.appendChild(accessCodeInput);

          document.body.appendChild(form);
          form.submit();
        } else {
          throw new Error(res.message || 'Failed to initiate payment');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to select plan');
      setLoading(false);
    }
  };

  const renderStepContent = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
        return (
          <div className="flex-1 flex flex-col justify-center animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-2xl bg-premium-primary/20 flex items-center justify-center mb-6">
              <ShieldCheck className="w-8 h-8 text-premium-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">Welcome to Premium Advisory</h1>
            <p className="text-premium-text/60 leading-relaxed mb-8">
              Before we can provide you with exclusive market signals and research, SEBI regulations require us to complete a quick onboarding process.
            </p>
            <button onClick={handleNext} className="w-full md:w-auto px-8 py-4 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-auto">
              Start Onboarding <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        );
      case 'profile':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-premium-primary/20 flex items-center justify-center border border-premium-primary/30">
                <User className="w-5 h-5 text-premium-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
                Complete Your Profile
              </h2>
            </div>
            <p className="text-premium-text/60 text-sm mb-6">
              Please verify your basic contact information. This ensures seamless communication and regulatory compliance.
            </p>

            <div className="bg-premium-primary/5 border border-premium-primary/20 rounded-xl p-4 mb-8 flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-premium-primary shrink-0 mt-0.5" />
              <div className="text-sm text-premium-text/80">
                <p className="font-semibold text-premium-primary mb-1">Why do we need this?</p>
                As a SEBI-registered Research Analyst, we are required to maintain up-to-date KYC and contact information for all our clients to provide secure and compliant advisory services.
              </div>
            </div>

            <div className="space-y-5 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="group">
                  <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-premium-primary">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-text/40 group-focus-within:text-premium-primary transition-colors" />
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoComplete="off" className="w-full bg-premium-bg/50 border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-premium-primary focus:bg-premium-bg focus:ring-1 focus:ring-premium-primary transition-all outline-none" placeholder="Your full name" />
                  </div>
                </div>
                <div className="group">
                  <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-premium-primary">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-text/40 group-focus-within:text-premium-primary transition-colors flex items-center justify-center">@</div>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-premium-bg/50 border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-premium-primary focus:bg-premium-bg focus:ring-1 focus:ring-premium-primary transition-all outline-none" placeholder="Your email address" />
                  </div>
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-premium-primary">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-text/40 group-focus-within:text-premium-primary transition-colors flex items-center justify-center">📞</div>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-premium-bg/50 border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-premium-primary focus:bg-premium-bg focus:ring-1 focus:ring-premium-primary transition-all outline-none" placeholder="Your mobile number" />
                </div>
              </div>

              <div className="group">
                <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5 transition-colors group-focus-within:text-premium-primary">Complete Address</label>
                <div className="relative">
                  <div className="absolute left-4 top-4 w-4 h-4 text-premium-text/40 group-focus-within:text-premium-primary transition-colors flex items-center justify-center">📍</div>
                  <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-premium-bg/50 border border-premium-border rounded-xl pl-11 pr-4 py-3.5 text-sm focus:border-premium-primary focus:bg-premium-bg focus:ring-1 focus:ring-premium-primary transition-all outline-none min-h-[100px] resize-none" placeholder="Enter your full residential address" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-premium-border/50">
              <button onClick={handleBack} className="px-6 py-3.5 bg-premium-bg border border-premium-border hover:border-premium-text/30 rounded-xl font-bold transition-colors">Back</button>
              <button onClick={handleUpdateProfile} disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.address} className="flex-1 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Continue'}
                {!loading && <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          </div>
        );
      case 'kyc':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">Identity Verification</h2>
            <p className="text-premium-text/60 text-sm mb-8">As per SEBI guidelines, KYC verification is mandatory.</p>

            <div className="space-y-6 flex-1">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5">PAN Number</label>
                  <div className="flex gap-3">
                    <input type="text" value={pan} onChange={handlePanChange} autoComplete="off" className="flex-1 bg-premium-bg/50 border border-premium-border rounded-xl px-4 py-3.5 focus:border-premium-primary focus:outline-none uppercase text-sm tracking-wider font-mono" maxLength={10} placeholder="ABCDE1234F" />
                    <button onClick={handleVerifyKRA} disabled={kraStatus === 'loading' || pan.length !== 10} className="px-5 bg-premium-cards border border-premium-border hover:border-premium-primary text-sm font-bold rounded-xl transition-colors flex items-center justify-center min-w-[120px] disabled:opacity-50 disabled:cursor-not-allowed">
                      {kraStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check KRA'}
                    </button>
                  </div>
                  {kraStatus === 'success' && <p className="text-xs text-premium-success mt-2 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Demat account verified</p>}
                  {kraStatus === 'failed' && <p className="text-xs text-premium-warning mt-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> KRA check failed (You can still proceed)</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-1.5 mt-2">Aadhaar Number (For Digio eSign)</label>
                  <input type="text" value={aadhaar} onChange={handleAadhaarChange} autoComplete="off" className="w-full bg-premium-bg/50 border border-premium-border rounded-xl px-4 py-3.5 focus:border-premium-primary focus:outline-none text-sm tracking-widest font-mono" maxLength={14} placeholder="1234 5678 9012" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-premium-border/50">
              <button onClick={handleBack} className="px-6 py-3.5 bg-premium-bg border border-premium-border hover:border-premium-text/30 rounded-xl font-bold transition-colors">Back</button>
              {(kraStatus === 'success' || kraStatus === 'failed') ? (
                <button onClick={handleKycNext} disabled={loading || !pan || !aadhaar || aadhaar.replace(/\s/g, '').length < 12} className="flex-1 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Continue to eSign <ChevronRight className="w-5 h-5" /></>}
                </button>
              ) : (
                <div className="flex-1 bg-premium-bg border border-premium-border text-premium-text/30 rounded-xl font-bold flex items-center justify-center cursor-not-allowed">
                  Verify PAN to Continue
                </div>
              )}
            </div>
          </div>
        );
      case 'agreement':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">Legal Agreement</h2>
            <div className="flex-1 flex flex-col">
              {agreementSigned ? (
                <div className="bg-premium-success/10 border border-premium-success/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center h-full">
                  <PenTool className="w-12 h-12 text-premium-success mb-4" />
                  <h3 className="text-xl font-bold text-premium-success mb-2">Agreement Signed</h3>
                </div>
              ) : (
                <div className="bg-white/20 dark:bg-black/20 backdrop-blur-lg border border-white/30 dark:border-white/10 shadow-xl rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-premium-primary" /> Advisory Agreement</h3>
                  <div className="flex-1 overflow-y-auto pr-2 text-xs text-premium-text/70 space-y-4 mb-6 bg-white/40 dark:bg-black/40 backdrop-blur-sm border border-white/30 dark:border-white/5 p-4 rounded-xl max-h-[200px] custom-scrollbar [&_p]:mb-3 [&_br]:block [&_br]:content-[''] [&_br]:mb-2 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-premium-text [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-premium-text [&_strong]:font-bold [&_strong]:text-premium-text [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
                    <div dangerouslySetInnerHTML={{ __html: agreementHTML }} />
                  </div>
                  <button onClick={handleSignAgreement} disabled={loading} className="w-full py-4 bg-[#1B42E0] hover:bg-[#1535B5] text-white rounded-xl font-bold flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'eSign via Digio'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-4 mt-8 pt-6 border-t border-premium-border">
              <button onClick={handleBack} className="px-6 py-3 bg-premium-bg border border-premium-border rounded-xl font-bold">Back</button>
              <button onClick={handleNext} disabled={!agreementSigned} className="flex-1 bg-premium-primary text-white rounded-xl font-bold">Continue</button>
            </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-bold mb-2">Choose Your Plan</h2>
            <p className="text-premium-text/60 text-sm mb-6">Select a research plan.</p>

            <div className="mb-6 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-premium-text/50" />
                <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Have a coupon?" className="w-full bg-premium-bg border border-premium-border rounded-xl pl-9 pr-4 py-2.5 text-sm uppercase" />
              </div>
              <button onClick={handleApplyCoupon} disabled={loading || !couponCode} className="px-4 py-2.5 bg-premium-bg border border-premium-border hover:border-premium-primary rounded-xl text-sm font-bold">Apply</button>
            </div>
            {appliedCoupon && (
              <p className="text-emerald-500 text-sm mb-4">
                Coupon Applied: {appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
              </p>
            )}

            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[250px]">
              {availablePlans.map((plan) => {
                let finalPrice = plan.amount || plan.price;
                if (appliedCoupon) {
                  if (appliedCoupon.discountType === 'PERCENTAGE') {
                    finalPrice = finalPrice - (finalPrice * (appliedCoupon.discountValue / 100));
                  } else {
                    finalPrice = Math.max(0, finalPrice - appliedCoupon.discountValue);
                  }
                }

                return (
                  <div key={plan.id || plan._id} className="bg-white/20 dark:bg-black/20 backdrop-blur-lg border border-white/30 dark:border-white/10 hover:border-premium-primary/50 hover:bg-white/30 dark:hover:bg-black/30 transition-all duration-300 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold">₹{finalPrice.toFixed(2)}</span>
                        {appliedCoupon && <span className="line-through text-xs text-premium-text/50 ml-2">₹{plan.amount || plan.price}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleSelectPlan(plan.id || plan._id)} disabled={loading} className="px-6 py-3 bg-premium-primary text-white rounded-xl font-bold flex items-center justify-center">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Pay Now'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 mt-auto pt-6 border-t border-premium-border">
              <button onClick={handleBack} className="px-6 py-3 bg-premium-bg border border-premium-border rounded-xl font-bold">Back</button>
              <button onClick={onComplete} className="flex-1 text-premium-text/50 hover:text-premium-text font-medium text-sm">Skip for now</button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-premium-bg text-premium-text flex flex-col items-center justify-center p-4 relative font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-premium-primary/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-premium-success/10 blur-[120px]" />

      <button
        onClick={onComplete}
        className="absolute top-8 left-8 flex items-center space-x-2 text-premium-text/60 hover:text-premium-primary font-medium transition-colors z-20 bg-premium-cards/50 px-4 py-2 rounded-xl border border-premium-border backdrop-blur-sm"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-sm">Back to Dashboard</span>
      </button>

      <div className="w-full max-w-4xl bg-white/20 dark:bg-black/40 backdrop-blur-3xl border border-white/50 dark:border-white/10 rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.1)] relative z-10 flex flex-col md:flex-row min-h-[600px] overflow-hidden">
        <div className="w-full md:w-1/3 bg-white/30 dark:bg-black/50 border-r border-white/40 dark:border-white/10 p-8 hidden md:flex flex-col backdrop-blur-xl">
          <div className="flex items-center space-x-3 mb-10 w-full">
            {logoUrl && logoUrl !== '/logo-light.png' ? (
              <img src={logoUrl} alt={appName || 'Logo'} className="max-h-12 w-auto object-contain" />
            ) : currentUser?.tenantLogo ? (
              <img src={currentUser.tenantLogo} alt={currentUser.tenantName || 'Logo'} className="max-h-12 w-auto object-contain" />
            ) : (
              <>
                <ShieldCheck className="w-6 h-6 text-premium-primary" />
                <span className="text-xl font-bold tracking-wider">{appName || currentUser?.tenantName || 'RAGCP'}</span>
              </>
            )}
          </div>

          <div className="flex-1 relative mt-4">
            {/* Background Line */}
            <div className="absolute left-[15px] top-2 bottom-8 w-0.5 bg-premium-border/50" />

            {/* Animated Progress Line */}
            <div
              className="absolute left-[15px] top-2 w-0.5 bg-gradient-to-b from-premium-primary to-premium-success transition-all duration-700 ease-in-out shadow-[0_0_10px_var(--tw-colors-premium-primary)]"
              style={{ height: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />

            <div className="space-y-8 relative z-10">
              {STEPS.map((step, idx) => {
                const isPast = idx < currentStep;
                const isActive = idx === currentStep;
                return (
                  <div key={step.id} className="flex items-start gap-4 group">
                    <div className="relative mt-1">
                      {isActive && <div className="absolute inset-0 rounded-full border-2 border-premium-primary animate-ping opacity-75" />}
                      <div className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${isActive ? 'bg-premium-primary text-white scale-110 shadow-[0_0_15px_var(--tw-colors-premium-primary)]' : isPast ? 'bg-premium-success text-premium-bg shadow-[0_0_10px_var(--tw-colors-premium-success)]' : 'bg-premium-bg border-2 border-premium-border text-premium-text/50 group-hover:border-premium-primary/50'}`}>
                        {isPast ? <Check className="w-4 h-4" /> : <span className="text-sm font-bold">{idx + 1}</span>}
                      </div>
                    </div>
                    <div>
                      <p className={`text-sm font-bold transition-colors ${isActive ? 'text-premium-primary text-base' : isPast ? 'text-premium-success' : 'text-premium-text/40'}`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-premium-primary/80 animate-pulse bg-premium-primary/10 px-2 py-1 rounded-md border border-premium-primary/20 w-max">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>In Progress...</span>
                        </div>
                      )}
                      {isPast && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-premium-success/80">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col relative">
          {renderStepContent(STEPS[currentStep].id)}
        </div>
      </div>
    </div>
  );
}
