import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck, User, FileText, CheckCircle2, AlertTriangle,
  ChevronRight, ChevronLeft, CreditCard, PenTool, Check, Loader2, Tag, Sparkles, X, Lock,
  QrCode, Copy, Upload, ArrowLeft
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
  const [clientProfile, setClientProfile] = useState<any>(profile);

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

  // Gateway & QR/UPI configuration from Admin
  const [gatewayConfig, setGatewayConfig] = useState<{
    gateway?: { enabled: boolean; activeGateway?: string; isConfigured?: boolean };
    paymentGatewayEnabled?: boolean;
    upiQr?: { enabled: boolean; upiId?: string; payeeName?: string; qrImageUrl?: string; instructions?: string };
    adminContact?: any;
    message?: string;
  } | null>(null);

  // Wizard Subscription & Payment States
  const [wizardSelectedPlan, setWizardSelectedPlan] = useState<any>(null);
  const [wizardPaymentMode, setWizardPaymentMode] = useState<'CHOICE' | 'UPI_QR' | null>(null);
  const [upiUtr, setUpiUtr] = useState('');
  const [upiProofFile, setUpiProofFile] = useState<File | null>(null);
  const [upiProofPreview, setUpiProofPreview] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  const getFullUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() + ''}${url}`;
  };

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
    (clientProfile?.subscriptions && clientProfile.subscriptions.some((s: any) => s.status === 'ACTIVE' || s.status === 'active')) ||
    (clientProfile?.status === 'ACTIVE' && ((clientProfile?.subscriptions && clientProfile.subscriptions.length > 0) || clientProfile?.plan))
  );

  const isProfileDone = Boolean(
    (formData.name || clientProfile?.name) &&
    (formData.email || clientProfile?.email || clientProfile?.user?.email) &&
    (formData.phone || clientProfile?.phone || clientProfile?.mobile) &&
    (formData.address || clientProfile?.profile?.addressLine1 || clientProfile?.address)
  );

  const isKycDone = Boolean(
    clientProfile?.kraVerified === true ||
    kraStatus === 'success' ||
    clientProfile?.kycStatus === 'VERIFIED' ||
    clientProfile?.kycStatus === 'APPROVED'
  );

  const isAgreementDone = Boolean(
    agreementSigned ||
    clientProfile?.agreementSigned ||
    clientProfile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE')
  );

  const kycFirst = clientProfile?.user?.tenant?.kycFirst !== false;

  // Standard ordered steps list (Strict linear sequence - Zero Manual Profile Paperwork)
  const baseStepList = useMemo(() => {
    if (hasActiveSubscription) {
      return [
        { id: 'welcome', label: 'Welcome' },
        { id: 'kyc', label: 'Identity KYC' },
        { id: 'agreement', label: 'Legal Agreement' }
      ];
    }
    if (kycFirst) {
      return [
        { id: 'welcome', label: 'Welcome' },
        { id: 'kyc', label: 'Identity KYC' },
        { id: 'agreement', label: 'Legal Agreement' },
        { id: 'subscription', label: 'Subscription' }
      ];
    }
    return [
      { id: 'welcome', label: 'Welcome' },
      { id: 'subscription', label: 'Subscription' },
      { id: 'kyc', label: 'Identity KYC' },
      { id: 'agreement', label: 'Legal Agreement' }
    ];
  }, [hasActiveSubscription, kycFirst]);

  // Always start at the first step
  const [currentStepId, setCurrentStepId] = useState<string>('welcome');

  // Find step completion status
  const isStepComplete = (stepId: string) => {
    const flowOrder = baseStepList.map(s => s.id);
    const stepIdx = flowOrder.indexOf(stepId);
    const currentIdx = flowOrder.indexOf(currentStepId);

    switch (stepId) {
      case 'welcome':
        return welcomeVisited || currentIdx > stepIdx;
      case 'subscription':
        return hasActiveSubscription;
      case 'kyc':
        return isKycDone;
      case 'agreement':
        return agreementSigned || isAgreementDone;
      default:
        return false;
    }
  };

  // Check if a step can be accessed / clicked in sidebar
  const isStepAccessible = (targetStepId: string) => {
    const flowOrder = baseStepList.map(s => s.id);
    const targetIdx = flowOrder.indexOf(targetStepId);
    const currentIdx = flowOrder.indexOf(currentStepId);

    // If already on this step, it's active
    if (targetStepId === currentStepId) return true;

    // Once legal agreement is signed, backward navigation is locked
    if (agreementSigned || isAgreementDone) {
      const agreementIdx = flowOrder.indexOf('agreement');
      if (targetIdx < agreementIdx) {
        return false;
      }
    }

    // Must have all preceding steps completed
    for (let i = 0; i < targetIdx; i++) {
      if (!isStepComplete(flowOrder[i])) {
        return false;
      }
    }

    // Can only jump at most to the next immediate step or any previously accessible step
    return targetIdx <= currentIdx + 1;
  };

  const agreementHTML = useMemo(() => {
    const tenant = clientProfile?.user?.tenant || profile?.user?.tenant;
    if (!tenant) return "Loading agreement...";
    let content = tenant.agreementContent || "Standard SEBI Agreement...";
    const replacements: Record<string, string> = {
      '{{CLIENT_NAME}}': formData.name || `${clientProfile?.user?.firstName || ''} ${clientProfile?.user?.lastName || ''}`.trim() || 'Client',
      '{{CLIENT_EMAIL}}': formData.email || clientProfile?.user?.email || '',
      '{{CLIENT_MOBILE}}': formData.phone || clientProfile?.mobile || 'NA',
      '{{PAN_NUMBER}}': pan || clientProfile?.pan || '',
      '{{AADHAAR_NUMBER}}': aadhaar || clientProfile?.aadhaar || '',
      '{{CLIENT_ADDRESS}}': formData.address || (clientProfile?.profile?.addressLine1 ? `${clientProfile.profile.addressLine1}, ${clientProfile.profile?.city || ''}` : 'NA'),
      '{{COMPANY_NAME}}': tenant.companyName || '',
      '{{SEBI_REGISTRATION}}': tenant.sebiRegistration || '',
      '{{COMPANY_ADDRESS}}': tenant.address || '',
      '{{DATE}}': new Date().toLocaleDateString('en-IN')
    };
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }
    return content;
  }, [clientProfile, profile, formData, pan, aadhaar]);

  useEffect(() => {
    api.getPlans().then(res => {
      if (res.success) setAvailablePlans(res.data || []);
    }).catch(console.error);

    api.getPaymentGatewayStatus().then((res: any) => {
      if (res) setGatewayConfig(res);
    }).catch(console.warn);
  }, []);

  const handleNextStep = () => {
    const flowOrder = baseStepList.map(s => s.id);
    const currentIdx = flowOrder.indexOf(currentStepId);

    if (currentStepId === 'welcome') {
      setWelcomeVisited(true);
    }

    // Advance to next step in the sequence
    if (currentIdx < flowOrder.length - 1) {
      setCurrentStepId(flowOrder[currentIdx + 1]);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    // If agreement is signed, back button is completely disabled
    if (agreementSigned || isAgreementDone) return;

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
          const env = ((res as any).environment || (clientProfile?.user?.tenant?.digioEnvironment || '').toLowerCase() || 'production') as any;
          const options = {
            environment: env,
            callback: async function (response: any) {
              if (response.hasOwnProperty('error_code')) {
                toast.error("Digio KYC Failed or Cancelled");
                setKraStatus('failed');
              } else {
                try {
                  await api.updateDigioStatus({
                    type: 'KYC',
                    status: 'COMPLETED',
                    kycId: res.data.id,
                    digioResponse: response
                  });
                } catch { }

                const verifyRes = await api.verifyKRA({ pan, aadhaar, digioResponse: response });
                if (verifyRes.success) {
                  setKraStatus('success');
                  toast.success('Demat Account / KYC Verified!');
                  api.getClientProfile().then((pRes: any) => {
                    if (pRes.success && pRes.data) {
                      setClientProfile(pRes.data);
                      if (pRes.data.name) setFormData(prev => ({ ...prev, name: pRes.data.name }));
                    }
                  }).catch(() => { });
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
      } catch (digioErr: any) {
        console.warn('Digio KYC initiation error:', digioErr);
        if (clientProfile?.user?.tenant?.hasDigioConfigured) {
          toast.error(digioErr.message || 'Digio KYC initiation failed. Please check Digio credentials.');
          setKraStatus('failed');
          return;
        }
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
      const hasDigio = clientProfile?.user?.tenant?.hasDigioConfigured || clientProfile?.user?.tenant?.digioClientId;
      try {
        const res = await api.initiateDigioAgreement();
        if (res.success && res.data && res.data.id && typeof window !== 'undefined' && (window as any).Digio) {
          const env = ((res as any).environment || (clientProfile?.user?.tenant?.digioEnvironment || '').toLowerCase() || 'production') as any;
          const options = {
            environment: env,
            callback: async function (response: any) {
              if (response.hasOwnProperty('error_code')) {
                toast.error("Digio eSign Failed or Cancelled");
                setLoading(false);
              } else {
                await api.signAgreement({ 
                  signatureText: formData.name || clientProfile?.name || 'Digio eSign',
                  documentId: response.digio_doc_id,
                  digioResponse: response
                });
                setAgreementSigned(true);
                setLoading(false);
                toast.success('Advisory Agreement signed successfully!');
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
        } else if (hasDigio) {
          toast.error(res?.message || 'Could not initiate Digio eSign. Please verify Digio credentials in Admin Settings.');
          setLoading(false);
          return;
        }
      } catch (digioErr: any) {
        console.warn('Digio agreement initiation error:', digioErr);
        if (hasDigio) {
          toast.error(digioErr.message || 'Failed to initiate Digio agreement. Please check Digio account credentials.');
          setLoading(false);
          return;
        }
      }

      const signRes = await api.signAgreement({ signatureText: formData.name || clientProfile?.name || 'Aadhaar eSign' });
      if (signRes.success) {
        setAgreementSigned(true);
        toast.success('Advisory Agreement signed successfully!');
      } else {
        toast.error(signRes.message || 'Failed to sign agreement');
      }
      setLoading(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign agreement');
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
        toast.success('Coupon applied!');
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

  const executeOnlinePayment = async (planInput: any) => {
    setLoading(true);
    const planId = typeof planInput === 'string' ? planInput : (planInput?.id || planInput?._id);
    const selectedPlan = (typeof planInput === 'object' && planInput?.name) ? planInput : availablePlans.find(p => (p.id || p._id) === planId);

    try {
      let gatewayStatusRes: any = gatewayConfig;
      if (!gatewayStatusRes) {
        try {
          gatewayStatusRes = await api.getPaymentGatewayStatus();
          if (gatewayStatusRes) setGatewayConfig(gatewayStatusRes);
        } catch (err) {
          console.warn('Payment gateway status check encountered an error:', err);
        }
      }

      if (gatewayStatusRes && (gatewayStatusRes.isConfigured === false || gatewayStatusRes.paymentGatewayEnabled === false)) {
        setContactAdminData({
          adminContact: gatewayStatusRes.adminContact || clientProfile?.user?.tenant,
          plan: selectedPlan || { id: planId, name: 'Selected Plan' },
          finalPrice: selectedPlan ? (selectedPlan.amount || selectedPlan.price) : undefined,
          appliedCoupon: appliedCoupon,
          customMessage: gatewayStatusRes.message || 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.'
        });
        setShowContactAdminModal(true);
        setLoading(false);
        return;
      }

      const activeGateway = (gatewayStatusRes?.activeGateway || gatewayStatusRes?.gateway?.activeGateway || clientProfile?.user?.tenant?.activePaymentGateway || 'RAZORPAY').toUpperCase();

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
            name: clientProfile?.user?.tenant?.companyName || 'Premium Advisory',
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
              name: clientProfile?.name || '',
              email: clientProfile?.email || '',
              contact: clientProfile?.phone || clientProfile?.mobile || ''
            },
            theme: {
              color: clientProfile?.user?.tenant?.themeColor || '#4F46E5'
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.on('payment.failed', function (response: any) {
            toast.error(response.error?.description || 'Payment failed');
          });
          rzp.open();
          setLoading(false);
        } else {
          if (res.isConfigured === false || (res.message && res.message.toLowerCase().includes('contact the administrator'))) {
            setContactAdminData({
              adminContact: gatewayStatusRes?.adminContact || clientProfile?.user?.tenant,
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
              adminContact: gatewayStatusRes?.adminContact || clientProfile?.user?.tenant,
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
        setContactAdminData({
          adminContact: clientProfile?.user?.tenant,
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

  const handleSubmitUpiProof = async () => {
    if (!upiUtr.trim()) {
      toast.error('Please enter the 12-digit UPI / UTR Transaction Reference number');
      return;
    }
    if (!upiProofFile) {
      toast.error('Payment hone ke baad payment ka screenshot upload karein');
      return;
    }

    setSubmittingProof(true);
    try {
      let price = wizardSelectedPlan.amount || wizardSelectedPlan.price;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
        else price = Math.max(0, price - appliedCoupon.discountValue);
      }
      const formattedPrice = price.toFixed(2);

      const formData = new FormData();
      formData.append('planId', wizardSelectedPlan.id || wizardSelectedPlan._id);
      formData.append('amount', formattedPrice);
      formData.append('paymentMode', 'UPI_QR');
      formData.append('transactionRef', upiUtr.trim());
      formData.append('screenshot', upiProofFile);
      if (appliedCoupon?.code) {
        formData.append('couponCode', appliedCoupon.code);
      }

      const res: any = await api.submitManualPayment(formData);
      if (res.success) {
        setProofSuccess(true);
        toast.success('Payment screenshot & UTR submitted successfully! Pending admin verification.');
      } else {
        toast.error(res.message || 'Failed to submit payment proof');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleChoosePlan = (plan: any) => {
    const isSigned = agreementSigned || isAgreementDone;
    if (kycFirst && !isKycDone) {
      toast.error('KYC Verification is required before purchasing a plan.');
      setCurrentStepId('kyc');
      return;
    }
    if (!isSigned) {
      toast.error('Legal Agreement must be signed before proceeding to payment.');
      setCurrentStepId('agreement');
      return;
    }

    setWizardSelectedPlan(plan);
    setProofSuccess(false);
    setUpiUtr('');
    setUpiProofFile(null);
    setUpiProofPreview('');

    const isGwEnabled = gatewayConfig?.paymentGatewayEnabled !== false && gatewayConfig?.gateway?.isConfigured !== false && gatewayConfig?.isConfigured !== false;
    const isUpiEnabled = Boolean(gatewayConfig?.upiQr?.enabled);

    if (isGwEnabled && isUpiEnabled) {
      setWizardPaymentMode('CHOICE');
    } else if (isUpiEnabled) {
      setWizardPaymentMode('UPI_QR');
    } else if (isGwEnabled) {
      executeOnlinePayment(plan);
    } else {
      setContactAdminData({
        adminContact: gatewayConfig?.adminContact || clientProfile?.user?.tenant,
        plan,
        finalPrice: plan.amount || plan.price,
        appliedCoupon: appliedCoupon,
        customMessage: gatewayConfig?.message || 'Payment gateway and QR/UPI payments are currently not enabled. Please contact administrator.'
      });
      setShowContactAdminModal(true);
    }
  };

  const renderStepContent = (stepId: string) => {
    // Check if legal agreement is already signed
    const isSigned = agreementSigned || isAgreementDone;

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
                  Your research plan is already active and assigned. Complete Profile, KYC &amp; Agreement to access signals immediately.
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
              {!isSigned && (
                <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
                  Back
                </button>
              )}
              <button onClick={handleUpdateProfile} disabled={loading || !formData.name || !formData.email || !formData.phone || !formData.address} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all py-2.5">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save & Continue'}
                {!loading && <ChevronRight className="w-4 h-4" />}
              </button>
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
                Step 1: Fetch KYC (DigiLocker)
              </h2>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
              SEBI requires automated DigiLocker identity verification. Zero manual paperwork or uploading required.
            </p>

            <div className="space-y-4 flex-1">
              {!isKycDone ? (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Automated DigiLocker Verification</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                      Click below to authenticate with DigiLocker. Your official Name, DOB, PAN, Aadhaar, and Address will be fetched securely.
                    </p>
                  </div>
                  <button
                    onClick={handleVerifyKRA}
                    disabled={kraStatus === 'loading'}
                    className="w-full max-w-xs mx-auto py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 transition-all"
                  >
                    {kraStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>{kraStatus === 'loading' ? 'Connecting to DigiLocker...' : 'Fetch KYC via DigiLocker'}</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800/50 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-200 dark:border-emerald-800/40">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> KYC Verified via DigiLocker
                    </span>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full font-bold">
                      Locked &amp; Immutable
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Legal Name:</span>
                      <p className="font-semibold text-slate-800 dark:text-white">{clientProfile?.name || formData.name || 'Verified Investor'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">PAN Number:</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">{clientProfile?.pan || pan || '••••••••••'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Aadhaar (Masked):</span>
                      <p className="font-mono font-bold text-slate-800 dark:text-white">{clientProfile?.aadhaar || aadhaar || '•••• •••• ••••'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase font-bold">DOB:</span>
                      <p className="font-semibold text-slate-800 dark:text-white">{clientProfile?.dob || clientProfile?.profile?.dob || 'Verified'}</p>
                    </div>
                    <div className="col-span-2 pt-1">
                      <span className="text-slate-400 text-[10px] uppercase font-bold">Government Verified Address:</span>
                      <p className="text-[11px] text-slate-700 dark:text-slate-300">
                        {clientProfile?.profile?.addressLine1 || clientProfile?.addressLine1 || formData.address || 'Verified Address on Record'}, {clientProfile?.profile?.city || clientProfile?.city || ''} {clientProfile?.profile?.state || clientProfile?.state || ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-800">
              {!isSigned && (
                <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
                  Back
                </button>
              )}
              <button
                onClick={handleNextStep}
                disabled={!isKycDone}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50 transition-all py-2.5"
              >
                Continue to Legal Agreement <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      case 'agreement':
        const allCompleted = isProfileDone && isKycDone && (hasActiveSubscription || agreementSigned || isAgreementDone);
        return (
          <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-900 dark:text-white">Legal Agreement</h2>
            <div className="flex-1 flex flex-col my-2">
              {isSigned ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-full">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
                    <PenTool className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-1">Agreement Signed Successfully</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 max-w-md">
                    You have legally eSigned the Research Analyst Advisory Agreement. This document is officially locked and compliance-verified.
                  </p>
                  {hasActiveSubscription && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Plan Assigned &amp; Ready
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col relative overflow-hidden">
                  <h3 className="font-bold text-sm mb-2 flex items-center gap-2 text-slate-900 dark:text-white"><FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Advisory Agreement</h3>
                  <div className="flex-1 overflow-y-auto pr-1 text-[11px] text-slate-600 dark:text-slate-300 space-y-2 mb-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-xl max-h-[180px] custom-scrollbar">
                    <div dangerouslySetInnerHTML={{ __html: agreementHTML }} />
                  </div>
                  <button onClick={handleSignAgreement} disabled={loading} className="w-full py-2.5 bg-[#1B42E0] hover:bg-[#1535B5] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'eSign via Digio / Aadhaar'}
                  </button>
                </div>
              )}
            </div>

            {/* Action Buttons: If agreement is signed, REMOVE Back button */}
            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
              {!isSigned && (
                <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
                  Back
                </button>
              )}
              <button
                onClick={handleNextStep}
                disabled={!isSigned}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all py-2.5 shadow-lg shadow-blue-600/20"
              >
                {allCompleted ? 'Complete Onboarding & Access Dashboard' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      case 'subscription':
        if (hasActiveSubscription) {
          const activeSub = clientProfile?.subscriptions?.find((s: any) => s.status === 'ACTIVE' || s.status === 'active') || clientProfile?.subscriptions?.[0];
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
                {!isSigned && (
                  <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
                    Back
                  </button>
                )}
                <button onClick={handleNextStep} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all py-2.5">
                  Continue Onboarding <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        }

        if (proofSuccess) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 p-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center mb-4 border border-emerald-500/20">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Payment Proof Submitted!
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-4 leading-relaxed">
                Your payment screenshot and transaction reference (UTR: <strong className="text-slate-700 dark:text-slate-200">{upiUtr}</strong>) for <strong>{wizardSelectedPlan?.name}</strong> have been submitted. Our compliance team will verify and activate your subscription shortly.
              </p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl p-3 mb-6 max-w-md text-left">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                  Verification usually completes within 15-30 minutes during market hours. You can continue exploring your dashboard.
                </p>
              </div>
              <button
                onClick={onClose || onComplete}
                className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm py-2.5 shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
              >
                Complete Onboarding &amp; Access Dashboard <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          );
        }

        const isGwEnabled = gatewayConfig?.paymentGatewayEnabled !== false && gatewayConfig?.gateway?.isConfigured !== false && gatewayConfig?.isConfigured !== false;
        const isUpiEnabled = Boolean(gatewayConfig?.upiQr?.enabled);

        if (wizardPaymentMode === 'UPI_QR' && wizardSelectedPlan) {
          let price = wizardSelectedPlan.amount || wizardSelectedPlan.price;
          if (appliedCoupon) {
            if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
            else price = Math.max(0, price - appliedCoupon.discountValue);
          }
          const formattedPrice = price.toFixed(2);

          return (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 overflow-y-auto custom-scrollbar pr-1 max-h-[440px]">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => setWizardPaymentMode(isGwEnabled ? 'CHOICE' : null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                  ₹{formattedPrice}
                </span>
              </div>

              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-0.5">Pay with QR / UPI</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">
                Scan QR or pay to the UPI ID. Upload payment screenshot to activate {wizardSelectedPlan.name}.
              </p>

              {/* QR Code and UPI ID */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 mb-3 flex flex-col items-center text-center">
                {gatewayConfig?.upiQr?.qrImageUrl ? (
                  <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 mb-2">
                    <img
                      src={getFullUrl(gatewayConfig.upiQr.qrImageUrl)}
                      alt="Payment QR Code"
                      className="w-32 h-32 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-2">
                    <QrCode className="w-8 h-8 text-slate-400" />
                  </div>
                )}

                {gatewayConfig?.upiQr?.payeeName && (
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-0.5">
                    Payee: {gatewayConfig.upiQr.payeeName}
                  </p>
                )}

                {gatewayConfig?.upiQr?.upiId && (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1 mt-1">
                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 select-all">
                      {gatewayConfig.upiQr.upiId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (gatewayConfig?.upiQr?.upiId) {
                          navigator.clipboard.writeText(gatewayConfig.upiQr.upiId);
                          setCopiedUpi(true);
                          toast.success('UPI ID copied to clipboard!');
                          setTimeout(() => setCopiedUpi(false), 2000);
                        }
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      title="Copy UPI ID"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Hindi Notice Prompt */}
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/30 rounded-xl p-2.5 mb-3 flex items-start gap-2 text-left">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-200 font-medium">
                  <strong>Notice:</strong> Payment hone ke baad payment ka screenshot upload karein aur 12-digit UTR number enter karein.
                </p>
              </div>

              {gatewayConfig?.upiQr?.instructions && (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-500/30 rounded-xl p-2.5 mb-3">
                  <p className="text-[11px] text-blue-800 dark:text-blue-200 leading-relaxed">
                    {gatewayConfig.upiQr.instructions}
                  </p>
                </div>
              )}

              {/* UTR and File Upload */}
              <div className="space-y-2.5 mb-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    12-Digit UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 408219283746"
                    value={upiUtr}
                    onChange={(e) => setUpiUtr(e.target.value.trim())}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Payment Screenshot / Receipt <span className="text-red-500">*</span>
                  </label>
                  {upiProofPreview ? (
                    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 p-2 bg-slate-50 dark:bg-slate-800 flex items-center gap-3">
                      <img src={upiProofPreview} alt="Screenshot Preview" className="w-12 h-12 object-cover rounded-lg border" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {upiProofFile?.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {upiProofFile ? `${(upiProofFile.size / 1024).toFixed(1)} KB` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setUpiProofFile(null);
                          setUpiProofPreview('');
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40">
                      <Upload className="w-4 h-4 text-slate-400 mb-0.5" />
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Click to upload screenshot</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, JPEG up to 10MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setUpiProofFile(file);
                            setUpiProofPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5 mt-auto pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWizardPaymentMode(isGwEnabled ? 'CHOICE' : null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmitUpiProof}
                  disabled={submittingProof || !upiUtr || !upiProofFile}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all py-2"
                >
                  {submittingProof ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Submit Payment Proof
                </button>
              </div>
            </div>
          );
        }

        if (wizardPaymentMode === 'CHOICE' && wizardSelectedPlan) {
          let price = wizardSelectedPlan.amount || wizardSelectedPlan.price;
          if (appliedCoupon) {
            if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
            else price = Math.max(0, price - appliedCoupon.discountValue);
          }
          const formattedPrice = price.toFixed(2);

          return (
            <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => setWizardPaymentMode(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Plans
                </button>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                  ₹{formattedPrice}
                </span>
              </div>

              <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white mb-1">Select Payment Method</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs mb-4">
                Choose how you would like to complete payment for <strong>{wizardSelectedPlan.name}</strong>.
              </p>

              <div className="space-y-3 mb-6">
                {/* Option 1: Online Gateway */}
                <div
                  onClick={() => executeOnlinePayment(wizardSelectedPlan)}
                  className="group relative flex items-center justify-between p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition-transform">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">Pay Online</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">
                          Instant Activation
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Credit/Debit Card, Netbanking, UPI Gateway
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>

                {/* Option 2: Pay with QR / UPI */}
                <div
                  onClick={() => setWizardPaymentMode('UPI_QR')}
                  className="group relative flex items-center justify-between p-4 rounded-2xl border-2 border-slate-200 dark:border-slate-700/80 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition-transform">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">Pay with QR / UPI</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          Direct Transfer
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Scan QR code or send to UPI ID &amp; upload screenshot
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>

              <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWizardPaymentMode(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Back
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
                    <button
                      onClick={() => handleChoosePlan(plan)}
                      disabled={loading}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center shadow-md transition-all"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                        isGwEnabled && isUpiEnabled ? 'Select & Pay' :
                        isUpiEnabled ? 'Pay with QR / UPI' :
                        isGwEnabled ? 'Pay Online' : 'Contact Admin'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
              {!isSigned && (
                <button onClick={handleBack} className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-colors">
                  Back
                </button>
              )}
              <button onClick={onClose || onComplete} className="flex-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-medium text-xs">Skip for now</button>
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
                const isAccessible = isStepAccessible(step.id);

                return (
                  <div
                    key={step.id}
                    onClick={() => {
                      if (isAccessible) {
                        setCurrentStepId(step.id);
                      } else {
                        if ((agreementSigned || isAgreementDone) && idx < baseStepList.findIndex(s => s.id === 'agreement')) {
                          toast.error('Legal Agreement is already signed. Previous steps cannot be modified.');
                        } else {
                          const prevStep = baseStepList[idx - 1];
                          toast.error(`Please complete Step ${idx}: ${prevStep ? prevStep.label : 'previous step'} first.`);
                        }
                      }
                    }}
                    className={`flex items-start gap-3.5 group select-none transition-all duration-300 ${isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'
                      }`}
                  >
                    <div className="relative mt-0.5">
                      {isActive && <div className="absolute inset-0 rounded-full border-2 border-blue-600 dark:border-blue-400 animate-ping opacity-75" />}
                      <div className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all duration-500 shadow-sm ${isActive
                        ? 'bg-blue-600 text-white scale-110 shadow-md shadow-blue-500/30 ring-2 ring-blue-600/30'
                        : isDone
                          ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                          : isAccessible
                            ? 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400 group-hover:border-blue-500/50'
                            : 'bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-400/50'
                        }`}>
                        {isDone && !isActive ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : !isAccessible ? (
                          <Lock className="w-3 h-3 text-slate-400" />
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-bold transition-colors ${isActive ? 'text-blue-600 dark:text-blue-400 text-sm' : isDone ? 'text-emerald-600 dark:text-emerald-400' : isAccessible ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'
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
                          {isAccessible ? <span>Ready</span> : <span>Locked</span>}
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
        userProfile={clientProfile || profile}
        customMessage={contactAdminData.customMessage}
      />
    </div>
  );
}
