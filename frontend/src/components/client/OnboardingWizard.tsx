import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, User, FileText, CheckCircle2, AlertTriangle,
  ChevronRight, ChevronLeft, CreditCard, PenTool, Check, Loader2, Tag, Sparkles, X
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { useBranding } from '../../contexts/BrandingContext';
import ContactAdminModal from './ContactAdminModal';

interface OnboardingWizardProps {
  profile: any;
  onComplete: () => void;
  onClose?: () => void;
}

export default function OnboardingWizard({ profile, onComplete, onClose }: OnboardingWizardProps) {
  const [loading, setLoading] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const { appName } = useBranding();
  const [welcomeVisited, setWelcomeVisited] = useState(false);

  // Contact Admin Modal State
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [contactAdminData, setContactAdminData] = useState<{
    adminContact?: any;
    plan?: any;
    finalPrice?: string | number;
    appliedCoupon?: any;
    customMessage?: string;
  }>({});

  // Coupons
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  // Step Profile State
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || profile?.user?.email || '',
    phone: profile?.phone || profile?.mobile || '',
    address: profile?.profile?.addressLine1 || profile?.address || '',
  });

  // Step KYC State
  const [pan, setPan] = useState(profile?.pan || '');
  const [aadhaar, setAadhaar] = useState(profile?.aadhaar || '');
  const [kraStatus, setKraStatus] = useState<'idle' | 'loading' | 'success' | 'failed'>(
    profile?.status === 'KYC_FAILED' ? 'failed' :
      ((profile?.status === 'AGREEMENT_PENDING' || profile?.status === 'PAYMENT_PENDING' || profile?.status === 'ACTIVE' || profile?.kycStatus === 'VERIFIED' || profile?.kraVerified === true) && profile?.pan) ? 'success' : 'idle'
  );

  // Step Agreement State
  const [agreementSigned, setAgreementSigned] = useState(
    Boolean(profile?.agreementSigned || profile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE'))
  );

  // Status checkers
  const hasActiveSubscription = Boolean(
    (profile?.subscriptions && profile.subscriptions.some((s: any) => s.status === 'ACTIVE')) ||
    (profile?.status === 'ACTIVE' && ((profile?.subscriptions && profile.subscriptions.length > 0) || profile?.plan))
  );

  const isProfileDone = Boolean(
    (formData.name || profile?.name) &&
    (formData.email || profile?.email || profile?.user?.email) &&
    (formData.phone || profile?.phone || profile?.mobile)
  );

  const isKycDone = Boolean(
    profile?.kraVerified === true ||
    kraStatus === 'success' ||
    profile?.kycStatus === 'VERIFIED' ||
    profile?.kycStatus === 'APPROVED'
  );

  const isAgreementDone = Boolean(
    agreementSigned ||
    profile?.agreementSigned ||
    profile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE')
  );

  const kycFirst = profile?.user?.tenant?.kycFirst !== false;

  // Standard ordered steps list (1. Welcome, 2. Profile, 3. Subscription/KYC, 4. KYC/Agreement, 5. Agreement/Subscription)
  const baseStepList = useMemo(() => {
    if (hasActiveSubscription) {
      return [
        { id: 'welcome', label: 'Welcome' },
        { id: 'profile', label: 'Complete Profile' },
        { id: 'subscription', label: 'Subscription' },
        { id: 'kyc', label: 'Identity KYC' },
        { id: 'agreement', label: 'Legal Agreement' }
      ];
    }
    if (kycFirst) {
      return [
        { id: 'welcome', label: 'Welcome' },
        { id: 'profile', label: 'Complete Profile' },
        { id: 'kyc', label: 'Identity KYC' },
        { id: 'agreement', label: 'Legal Agreement' },
        { id: 'subscription', label: 'Subscription' }
      ];
    }
    return [
      { id: 'welcome', label: 'Welcome' },
      { id: 'profile', label: 'Complete Profile' },
      { id: 'subscription', label: 'Subscription' },
      { id: 'kyc', label: 'Identity KYC' },
      { id: 'agreement', label: 'Legal Agreement' }
    ];
  }, [hasActiveSubscription, kycFirst]);

  // Find step completion status
  const isStepComplete = (stepId: string) => {
    const flowOrder = baseStepList.map(s => s.id);
    const stepIdx = flowOrder.indexOf(stepId);
    const currentIdx = flowOrder.indexOf(currentStepId);

    switch (stepId) {
      case 'welcome':
        return welcomeVisited || currentIdx > stepIdx;
      case 'profile':
        return isProfileDone && (currentIdx > stepIdx || isKycDone || isAgreementDone);
      case 'subscription':
        return hasActiveSubscription;
      case 'kyc':
        return isKycDone;
      case 'agreement':
        return isAgreementDone;
      default:
        return false;
    }
  };

  // Initial Step: Welcome or first uncompleted step
  const getInitialStepId = () => {
    if (!profile) return 'welcome';
    if (!isProfileDone) return 'welcome';
    if (!isKycDone) return 'kyc';
    if (!isAgreementDone) return 'agreement';
    if (!hasActiveSubscription) return 'subscription';
    return 'welcome';
  };

  const [currentStepId, setCurrentStepId] = useState<string>(getInitialStepId());

  const agreementHTML = useMemo(() => {
    if (!profile?.user?.tenant) return "Loading agreement...";
    let content = profile.user.tenant.agreementContent || "Standard SEBI Agreement...";
    const replacements: Record<string, string> = {
      '{{CLIENT_NAME}}': formData.name || `${profile.user?.firstName || ''} ${profile.user?.lastName || ''}`.trim() || 'Client',
      '{{CLIENT_EMAIL}}': formData.email || profile.user?.email || '',
      '{{CLIENT_MOBILE}}': formData.phone || profile.mobile || 'NA',
      '{{PAN_NUMBER}}': pan || profile.pan || '',
      '{{AADHAAR_NUMBER}}': aadhaar || profile.aadhaar || '',
      '{{CLIENT_ADDRESS}}': formData.address || (profile.profile?.addressLine1 ? `${profile.profile.addressLine1}, ${profile.profile?.city || ''}` : 'NA'),
      '{{COMPANY_NAME}}': profile.user?.tenant?.companyName || '',
      '{{SEBI_REGISTRATION}}': profile.user?.tenant?.sebiRegistration || '',
      '{{COMPANY_ADDRESS}}': profile.user?.tenant?.address || '',
      '{{DATE}}': new Date().toLocaleDateString('en-IN')
    };
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }
    return content;
  }, [profile, formData, pan, aadhaar]);

  useEffect(() => {
    api.getPlans().then(res => {
      if (res.success) setAvailablePlans(res.data || []);
    }).catch(console.error);
  }, []);

  const handleNextStep = () => {
    setWelcomeVisited(true);
    const flowOrder = baseStepList.map(s => s.id);
    const currentIdx = flowOrder.indexOf(currentStepId);

    // Advance to next step in the sequence
    if (currentIdx < flowOrder.length - 1) {
      setCurrentStepId(flowOrder[currentIdx + 1]);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    const flowOrder = baseStepList.map(s => s.id);
    const currentIdx = flowOrder.indexOf(currentStepId);
    if (currentIdx > 0) {
      setCurrentStepId(flowOrder[currentIdx - 1]);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      await api.updateProfile(formData);
      handleNextStep();
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
    if (!pan || pan.length !== 10) {
      toast.error('Please enter a valid 10-digit PAN number');
      return;
    }
    setKraStatus('loading');
    try {
      let digioInitiated = false;
      try {
        const res = await api.initiateDigioKyc();
        if (res.success && res.data && res.data.id && typeof window !== 'undefined' && (window as any).Digio) {
          digioInitiated = true;
          const options = {
            environment: 'production',
            callback: async function (response: any) {
              if (response.hasOwnProperty('error_code')) {
                toast.error("Digio KYC Failed or Cancelled");
                setKraStatus('failed');
              } else {
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
          return;
        }
      } catch (digioErr) {
        console.warn('Digio KYC initiation skipped, proceeding with direct KRA verification:', digioErr);
      }

      const verifyRes = await api.verifyKRA({ pan, aadhaar });
      if (verifyRes.success) {
        setKraStatus('success');
        toast.success('Demat Account / KYC Verified Successfully!');
      } else {
        toast.error(verifyRes.message || 'KRA check failed');
        setKraStatus('failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to verify KRA. Please try again.');
      setKraStatus('failed');
    }
  };

  const handleKycNext = async () => {
    if (kraStatus !== 'success' && kraStatus !== 'failed') return;
    setLoading(true);
    try {
      await api.verifyKRA({ pan, aadhaar });
      handleNextStep();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update KYC');
    } finally {
      setLoading(false);
    }
  };

  const handleSignAgreement = async () => {
    setLoading(true);
    try {
      let digioInitiated = false;
      try {
        const res = await api.initiateDigioAgreement();
        if (res.success && res.data && res.data.id && typeof window !== 'undefined' && (window as any).Digio) {
          digioInitiated = true;
          const options = {
            environment: 'production',
            callback: async function (response: any) {
              if (response.hasOwnProperty('error_code')) {
                toast.error("Digio eSign Failed or Cancelled");
                setLoading(false);
              } else {
                await api.signAgreement({ signatureText: formData.name || profile?.name || 'Digio eSign' });
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
          return;
        }
      } catch (digioErr) {
        console.warn('Digio agreement initiation skipped, falling back to direct eSign:', digioErr);
      }

      const signRes = await api.signAgreement({ signatureText: formData.name || profile?.name || 'Aadhaar eSign' });
      if (signRes.success) {
        setAgreementSigned(true);
        toast.success('Advisory Agreement signed successfully!');
      } else {
        toast.error(signRes.message || 'Failed to sign agreement');
      }
      setLoading(false);
    } catch (err: any) {
      try {
        const signRes = await api.signAgreement({ signatureText: formData.name || profile?.name || 'Aadhaar eSign' });
        if (signRes.success) {
          setAgreementSigned(true);
          toast.success('Advisory Agreement signed successfully!');
        } else {
          toast.error(signRes.message || 'Failed to sign agreement');
        }
      } catch (innerErr: any) {
        toast.error(innerErr.message || 'Failed to sign agreement');
      }
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
      const selectedPlan = availablePlans.find(p => (p.id || p._id) === planId);

      let gatewayStatusRes: any = null;
      try {
        gatewayStatusRes = await api.getPaymentGatewayStatus();
      } catch (err) {
        console.warn('Payment gateway status check encountered an error:', err);
      }

      if (gatewayStatusRes && gatewayStatusRes.isConfigured === false) {
        setContactAdminData({
          adminContact: gatewayStatusRes.adminContact || profile?.user?.tenant,
          plan: selectedPlan || { id: planId, name: 'Selected Plan' },
          finalPrice: selectedPlan ? (selectedPlan.amount || selectedPlan.price) : undefined,
          appliedCoupon: appliedCoupon,
          customMessage: gatewayStatusRes.message || 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.'
        });
        setShowContactAdminModal(true);
        setLoading(false);
        return;
      }

      const activeGateway = (gatewayStatusRes?.activeGateway || profile?.user?.tenant?.activePaymentGateway || 'RAZORPAY').toUpperCase();

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
          if (res.isConfigured === false || (res.message && res.message.toLowerCase().includes('contact the administrator'))) {
            setContactAdminData({
              adminContact: gatewayStatusRes?.adminContact || profile?.user?.tenant,
              plan: selectedPlan || { id: planId, name: 'Selected Plan' },
              finalPrice: selectedPlan ? (selectedPlan.amount || selectedPlan.price) : undefined,
              appliedCoupon: appliedCoupon,
              customMessage: res.message
            });
            setShowContactAdminModal(true);
            setLoading(false);
            return;
          }
          throw new Error(res.message || 'Failed to initiate Razorpay payment');
        }

      } else {
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
          if (res.isConfigured === false || (res.message && res.message.toLowerCase().includes('contact the administrator'))) {
            setContactAdminData({
              adminContact: gatewayStatusRes?.adminContact || profile?.user?.tenant,
              plan: selectedPlan || { id: planId, name: 'Selected Plan' },
              finalPrice: selectedPlan ? (selectedPlan.amount || selectedPlan.price) : undefined,
              appliedCoupon: appliedCoupon,
              customMessage: res.message
            });
            setShowContactAdminModal(true);
            setLoading(false);
            return;
          }
          throw new Error(res.message || 'Failed to initiate payment');
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.toLowerCase().includes('contact the administrator') || err.message.toLowerCase().includes('not configured'))) {
        const selectedPlan = availablePlans.find(p => (p.id || p._id) === planId);
        setContactAdminData({
          adminContact: profile?.user?.tenant,
          plan: selectedPlan || { id: planId, name: 'Selected Plan' },
          finalPrice: selectedPlan ? (selectedPlan.amount || selectedPlan.price) : undefined,
          appliedCoupon: appliedCoupon,
          customMessage: err.message
        });
        setShowContactAdminModal(true);
      } else {
        toast.error(err.message || 'Failed to select plan');
      }
      setLoading(false);
    }
  };

  const renderStepContent = (stepId: string) => {
    switch (stepId) {
      case 'welcome':
        return (
          <div className="flex-1 flex flex-col justify-center animate-in fade-in duration-500">
            <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center mb-5 border border-blue-600/20">
              <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-3 text-slate-900 dark:text-white">Welcome to Premium Advisory</h1>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mb-6">
              Before we can provide you with exclusive market signals and research, SEBI regulations require us to complete a quick onboarding process.
            </p>
            {hasActiveSubscription && (
              <div className="mb-6 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                  Your research plan is already active and assigned. Complete KYC &amp; Agreement to access signals immediately.
                </p>
              </div>
            )}
            <button onClick={handleNextStep} className="w-full md:w-auto px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-auto shadow-lg shadow-blue-600/20">
              Start Onboarding <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        );
      case 'profile':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-600/20">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Complete Your Profile
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-5">
              Please verify your contact details for SEBI compliance and advisory records.
            </p>

            <div className="space-y-4 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} autoComplete="off" className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Your full name" />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex items-center justify-center text-xs">@</div>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Your email address" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 flex items-center justify-center text-xs">📞</div>
                  <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" placeholder="Your mobile number" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Complete Address</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 flex items-center justify-center text-xs">📍</div>
                  <textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all min-h-[80px] resize-none" placeholder="Enter your full residential address" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Back</button>
              <button onClick={handleUpdateProfile} disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.address} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all py-2.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        );
      case 'subscription':
        if (hasActiveSubscription) {
          const activeSub = profile?.subscriptions?.find((s: any) => s.status === 'ACTIVE') || profile?.subscriptions?.[0];
          const planName = activeSub?.plan?.name || activeSub?.planName || activeSub?.name || 'Active Advisory Plan';
          const planPrice = activeSub?.plan?.price || activeSub?.amount || 0;

          return (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20">
                  <CreditCard className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                  Subscription Status
                </h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-5">
                Your research advisory subscription is active and assigned.
              </p>

              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-5 mb-5 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Active Subscription</span>
                  </div>
                  <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Assigned
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{planName}</h3>
                {planPrice > 0 && <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">₹{Number(planPrice).toFixed(2)}</p>}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your advisor has configured this research plan for your account. You will have full access to market signals once KYC &amp; Agreement are completed.
                </p>
              </div>

              <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
                <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Back</button>
                <button onClick={handleNextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all py-2.5">
                  Continue Onboarding <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-900 dark:text-white">Choose Your Plan</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">Select a research plan.</p>

            <div className="mb-4 flex gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Have a coupon?" className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3.5 py-2 text-xs uppercase text-slate-900 dark:text-white" />
              </div>
              <button onClick={handleApplyCoupon} disabled={loading || !couponCode} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">Apply</button>
            </div>
            {appliedCoupon && (
              <p className="text-emerald-600 dark:text-emerald-400 text-xs mb-3 font-semibold">
                Coupon Applied: {appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
              </p>
            )}

            <div className="flex-1 overflow-y-auto pr-1 space-y-3 max-h-[220px] custom-scrollbar">
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
                  <div key={plan.id || plan._id} className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 transition-all">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{plan.name}</h3>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-lg font-bold text-slate-900 dark:text-white">₹{finalPrice.toFixed(2)}</span>
                        {appliedCoupon && <span className="line-through text-xs text-slate-400 ml-2">₹{plan.amount || plan.price}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleSelectPlan(plan.id || plan._id)} disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center shadow-md">
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Pay Now'}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Back</button>
              <button onClick={onClose || onComplete} className="flex-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium text-xs">Skip for now</button>
            </div>
          </div>
        );
      case 'kyc':
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center border border-blue-600/20">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">
                Identity Verification
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-5">
              As per SEBI guidelines, KYC identity verification is mandatory.
            </p>

            <div className="space-y-4 flex-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">PAN Number</label>
                <div className="flex gap-2.5">
                  <input type="text" value={pan} onChange={handlePanChange} autoComplete="off" className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none uppercase font-mono tracking-wider" maxLength={10} placeholder="ABCDE1234F" />
                  <button onClick={handleVerifyKRA} disabled={kraStatus === 'loading' || pan.length !== 10} className="px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-xl transition-colors flex items-center justify-center min-w-[100px] disabled:opacity-50">
                    {kraStatus === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Check KRA'}
                  </button>
                </div>
                {kraStatus === 'success' && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Demat account verified</p>}
                {kraStatus === 'failed' && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> KRA check failed (You can still proceed)</p>}
              </div>

              <div className="pt-1">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Aadhaar Number (For Digio eSign)</label>
                <input type="text" value={aadhaar} onChange={handleAadhaarChange} autoComplete="off" className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono tracking-widest" maxLength={14} placeholder="1111 1111 1111" />
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Back</button>
              {(kraStatus === 'success' || kraStatus === 'failed') ? (
                <button onClick={handleKycNext} disabled={loading || !pan || !aadhaar || aadhaar.replace(/\s/g, '').length < 12} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue to Legal Agreement <ChevronRight className="w-4 h-4" /></>}
                </button>
              ) : (
                <button onClick={handleVerifyKRA} disabled={loading || pan.length !== 10} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all py-2.5">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify PAN & Continue'}
                </button>
              )}
            </div>
          </div>
        );
      case 'agreement':
        const allCompleted = isProfileDone && isKycDone && (hasActiveSubscription || agreementSigned);
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-900 dark:text-white">Legal Agreement</h2>
            <div className="flex-1 flex flex-col my-2">
              {agreementSigned ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                  <PenTool className="w-10 h-10 text-emerald-600 dark:text-emerald-400 mb-3" />
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">Agreement Signed</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">You have successfully eSigned the Research Analyst Advisory Agreement.</p>
                  {hasActiveSubscription && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Plan Assigned &amp; Ready
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col relative overflow-hidden">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-900 dark:text-white"><FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Advisory Agreement</h3>
                  <div className="flex-1 overflow-y-auto pr-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-2 mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl max-h-[160px] custom-scrollbar">
                    <div dangerouslySetInnerHTML={{ __html: agreementHTML }} />
                  </div>
                  <button onClick={handleSignAgreement} disabled={loading} className="w-full py-2.5 bg-[#1B42E0] hover:bg-[#1535B5] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'eSign via Digio / Aadhaar'}
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
              <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">Back</button>
              <button 
                onClick={handleNextStep} 
                disabled={!agreementSigned} 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all py-2.5"
              >
                {allCompleted ? 'Complete Onboarding & Access Dashboard' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      default: return null;
    }
  };

  const currentIdx = baseStepList.findIndex(s => s.id === currentStepId);
  const progressPercent = Math.min(100, Math.round(((currentIdx + 1) / baseStepList.length) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-6 bg-slate-950/65 backdrop-blur-md animate-in fade-in duration-300">
      {/* Backdrop overlay */}
      <div 
        className="fixed inset-0 bg-transparent" 
        onClick={onClose || onComplete} 
      />

      {/* Modal Container */}
      <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.4)] relative z-10 flex flex-col md:flex-row min-h-[560px] max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-300">
        
        {/* Close Modal X Button */}
        <button
          onClick={onClose || onComplete}
          className="absolute top-4 right-4 z-30 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-white/10 flex items-center justify-center transition-all shadow-sm"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Stepper Left Sidebar */}
        <div className="w-full md:w-1/3 bg-slate-50 dark:bg-slate-950/70 border-r border-slate-200 dark:border-white/10 p-6 md:p-8 hidden md:flex flex-col backdrop-blur-xl">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <div className="w-8 h-8 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 border border-blue-600/20 dark:border-blue-500/30 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">Client Onboarding</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">SEBI Compliance &amp; Setup</p>
            </div>
          </div>

          <div className="flex-1 relative mt-2">
            {/* Background Line */}
            <div className="absolute left-[13px] top-2 bottom-8 w-0.5 bg-slate-200 dark:bg-slate-800" />

            {/* Animated Progress Line */}
            <div
              className="absolute left-[13px] top-2 w-0.5 bg-gradient-to-b from-blue-600 to-emerald-500 transition-all duration-700 ease-in-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
              style={{ height: `${progressPercent}%` }}
            />

            <div className="space-y-5 relative z-10">
              {baseStepList.map((step, idx) => {
                const isActive = step.id === currentStepId;
                const isDone = isStepComplete(step.id);

                return (
                  <div 
                    key={step.id} 
                    onClick={() => setCurrentStepId(step.id)}
                    className="flex items-start gap-3.5 group cursor-pointer select-none transition-all duration-300"
                  >
                    <div className="relative mt-0.5">
                      {isActive && <div className="absolute inset-0 rounded-full border-2 border-blue-600 dark:border-blue-400 animate-ping opacity-75" />}
                      <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${
                        isActive
                          ? 'bg-blue-600 text-white scale-110 shadow-md shadow-blue-500/30 ring-2 ring-blue-600/30'
                          : isDone
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 group-hover:border-blue-500/50'
                      }`}>
                        {isDone && !isActive ? <Check className="w-3.5 h-3.5 text-white" /> : <span className="text-xs font-bold">{idx + 1}</span>}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold transition-colors ${
                        isActive ? 'text-blue-600 dark:text-blue-400 text-sm' : isDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200'
                      }`}>
                        {step.label}
                      </p>
                      {isActive && (
                        <div className="flex items-center gap-1.5 mt-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 animate-pulse bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-500/20 w-max">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                          <span>In Progress...</span>
                        </div>
                      )}
                      {isDone && !isActive && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Completed</span>
                        </div>
                      )}
                      {!isDone && !isActive && (
                        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                          <span>Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Right Area */}
        <div className="w-full md:w-2/3 p-6 md:p-10 flex flex-col relative overflow-y-auto custom-scrollbar">
          {renderStepContent(currentStepId)}
        </div>
      </div>

      {/* Contact Admin Modal for unconfigured gateways */}
      <ContactAdminModal
        isOpen={showContactAdminModal}
        onClose={() => setShowContactAdminModal(false)}
        plan={contactAdminData.plan}
        finalPrice={contactAdminData.finalPrice}
        appliedCoupon={contactAdminData.appliedCoupon}
        adminContact={contactAdminData.adminContact}
        userProfile={profile}
        customMessage={contactAdminData.customMessage}
      />
    </div>
  );
}
