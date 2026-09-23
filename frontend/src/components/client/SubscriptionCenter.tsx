'use client';

import { useState, useEffect, useMemo } from 'react';
import { CreditCard, CheckCircle2, Star, Zap, Shield, ChevronRight, Loader2, QrCode, Copy, Upload, ArrowLeft, Check, AlertCircle, FileText, X, Clock, ExternalLink, Calendar, PlayCircle, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import ContactAdminModal from './ContactAdminModal';

export default function SubscriptionCenter({ 
  profile, 
  onTriggerOnboarding, 
  onNavigateToKyc 
}: { 
  profile?: any, 
  onTriggerOnboarding?: () => void,
  onNavigateToKyc?: () => void 
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'browse'>('active');
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [gstType, setGstType] = useState<string>('INCLUSIVE');

  // Strict SEBI KYC check: kraVerified must be true or kycStatus verified
  const kycFirst = profile?.user?.tenant?.kycFirst !== false; // Default true
  const isKraVerified = Boolean(profile?.kraVerified === true || profile?.kycStatus === 'VERIFIED' || profile?.kycStatus === 'APPROVED');
  const [isLocalAgreementDone, setIsLocalAgreementDone] = useState(false);
  const isAgreementDone = Boolean(
    isLocalAgreementDone ||
    profile?.agreements?.some((a: any) => a.status === 'SIGNED' || a.status === 'ACTIVE') ||
    profile?.agreementSigned ||
    profile?.status === 'PAYMENT_PENDING'
  );
  const isKycDone = isKraVerified;
  const isFullyOnboarded = !kycFirst || (isKycDone && isAgreementDone);

  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Gateway & QR/UPI configuration from Admin
  const [gatewayConfig, setGatewayConfig] = useState<{
    gateway?: { enabled: boolean; activeGateway?: string; isConfigured?: boolean };
    paymentGatewayEnabled?: boolean;
    upiQr?: { enabled: boolean; upiId?: string; payeeName?: string; qrImageUrl?: string; instructions?: string };
    adminContact?: any;
    message?: string;
  } | null>(null);

  // Method selection & Auto-routing state
  const [checkoutPaymentMethod, setCheckoutPaymentMethod] = useState<'ONLINE' | 'UPI_QR' | null>(null);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<'ONLINE' | 'UPI_QR' | null>(null);

  // QR / UPI Proof form state
  const [upiUtr, setUpiUtr] = useState('');
  const [upiProofFile, setUpiProofFile] = useState<File | null>(null);
  const [upiProofPreview, setUpiProofPreview] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofSuccess, setProofSuccess] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Agreement Signing Modal State
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [agreementConsentChecked, setAgreementConsentChecked] = useState(false);
  const [isSigningAgreement, setIsSigningAgreement] = useState(false);

  // Contact Admin Modal State
  const [showContactAdminModal, setShowContactAdminModal] = useState(false);
  const [contactAdminData, setContactAdminData] = useState<{
    adminContact?: any;
    plan?: any;
    finalPrice?: string | number;
    appliedCoupon?: any;
    customMessage?: string;
  }>({});

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

  const getFullUrl = (url?: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() + ''}${url}`;
  };

  const agreementHTML = useMemo(() => {
    const tenant = profile?.user?.tenant;
    if (!tenant) return "Loading agreement...";
    let content = tenant.agreementContent || "Standard SEBI Advisory Agreement...";
    const replacements: Record<string, string> = {
      '{{CLIENT_NAME}}': profile?.name || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim() || 'Client',
      '{{CLIENT_EMAIL}}': profile?.email || profile?.user?.email || '',
      '{{CLIENT_MOBILE}}': profile?.phone || profile?.mobile || 'NA',
      '{{PAN_NUMBER}}': profile?.pan || '',
      '{{AADHAAR_NUMBER}}': profile?.aadhaar || '',
      '{{CLIENT_ADDRESS}}': (profile?.profile?.addressLine1 ? `${profile.profile.addressLine1}, ${profile.profile?.city || ''}` : 'NA'),
      '{{COMPANY_NAME}}': tenant.companyName || '',
      '{{SEBI_REGISTRATION}}': tenant.sebiRegistration || '',
      '{{COMPANY_ADDRESS}}': tenant.address || '',
      '{{DATE}}': new Date().toLocaleDateString('en-IN')
    };
    for (const [key, value] of Object.entries(replacements)) {
      content = content.replace(new RegExp(key, 'g'), value);
    }
    return content;
  }, [profile]);

  const fetchGatewayStatus = async () => {
    try {
      const res: any = await api.getPaymentGatewayStatus();
      if (res) {
        setGatewayConfig(res);
      }
    } catch (e) {
      console.warn('Failed to load gateway status:', e);
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // 1. ONLINE PAYMENT GATEWAY PURCHASE
  const handleOnlineGatewayPurchase = async () => {
    if (!checkoutPlan) return;

    setLoading(true);
    try {
      let price = checkoutPlan.amount || checkoutPlan.price;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
        else price = Math.max(0, price - appliedCoupon.discountValue);
      }
      if (gstType === 'EXCLUSIVE') {
        price = price * 1.18; // Add 18% GST
      }
      const formattedPrice = price.toFixed(2);

      let gatewayStatusRes = gatewayConfig;
      if (!gatewayStatusRes) {
        try {
          gatewayStatusRes = await api.getPaymentGatewayStatus();
          if (gatewayStatusRes) setGatewayConfig(gatewayStatusRes);
        } catch (err) {
          console.warn('Payment gateway status check encountered an error:', err);
        }
      }

      if (gatewayStatusRes && gatewayStatusRes.isConfigured === false) {
        setContactAdminData({
          adminContact: gatewayStatusRes.adminContact || profile?.user?.tenant,
          plan: checkoutPlan,
          finalPrice: formattedPrice,
          appliedCoupon: appliedCoupon,
          customMessage: gatewayStatusRes.message || 'Payment gateway is not configured by the administrator. To purchase this plan, please contact the administrator.'
        });
        setCheckoutPlan(null);
        setShowContactAdminModal(true);
        setLoading(false);
        return;
      }

      const activeGateway = (gatewayStatusRes?.activeGateway || gatewayStatusRes?.gateway?.activeGateway || profile?.user?.tenant?.activePaymentGateway || 'RAZORPAY').toUpperCase();

      if (activeGateway === 'RAZORPAY') {
        const res = await api.initiateRazorpayPayment({
          planId: checkoutPlan.id || checkoutPlan._id,
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
                  planId: checkoutPlan.id || checkoutPlan._id,
                  couponCode: appliedCoupon ? appliedCoupon.code : undefined
                });

                if (verifyRes.success) {
                  toast.success('Payment successful! Your subscription is now active.');
                  setPaymentSuccess(true);
                  const subRes = await api.getClientSubscriptions().catch(() => ({ success: false, data: [] }));
                  if (subRes.success && Array.isArray(subRes.data)) {
                    setActiveSubscriptions(subRes.data.filter((s: any) => s.status === 'ACTIVE' || s.status === 'active'));
                  }
                  setTimeout(() => {
                    setCheckoutPlan(null);
                    setPaymentSuccess(false);
                    setActiveTab('active');
                    window.location.href = '/client?payment=success';
                  }, 1200);
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
            toast.error(response.error?.description || 'Payment failed');
          });
          rzp.open();
        } else {
          if (res.isConfigured === false || (res.message && res.message.toLowerCase().includes('contact the administrator'))) {
            setContactAdminData({
              adminContact: gatewayStatusRes?.adminContact || profile?.user?.tenant,
              plan: checkoutPlan,
              finalPrice: formattedPrice,
              appliedCoupon: appliedCoupon,
              customMessage: res.message
            });
            setCheckoutPlan(null);
            setShowContactAdminModal(true);
            return;
          }
          throw new Error(res.message || 'Failed to initiate Razorpay payment');
        }
      } else {
        const res = await api.initiateCCAvenuePayment({
          planId: checkoutPlan.id || checkoutPlan._id,
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
              plan: checkoutPlan,
              finalPrice: formattedPrice,
              appliedCoupon: appliedCoupon,
              customMessage: res.message
            });
            setCheckoutPlan(null);
            setShowContactAdminModal(true);
            return;
          }
          throw new Error(res.message || 'Failed to initiate payment');
        }
      }
    } catch (err: any) {
      if (err.requiresKyc || (err.message && err.message.toLowerCase().includes('kyc'))) {
        toast.error(err.message || 'KYC Verification is required before purchasing a plan.');
        setCheckoutPlan(null);
        if (onNavigateToKyc) {
          onNavigateToKyc();
        } else if (onTriggerOnboarding) {
          onTriggerOnboarding();
        }
      } else if (err.message && (err.message.toLowerCase().includes('contact the administrator') || err.message.toLowerCase().includes('not configured'))) {
        setContactAdminData({
          adminContact: profile?.user?.tenant,
          plan: checkoutPlan,
          finalPrice: undefined,
          appliedCoupon: appliedCoupon,
          customMessage: err.message
        });
        setCheckoutPlan(null);
        setShowContactAdminModal(true);
      } else {
        toast.error(err.message || 'Failed to process payment');
      }
    } finally {
      setLoading(false);
    }
  };

  // 2. SUBMIT QR/UPI PROOF (SCREENSHOT & UTR)
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
      let price = checkoutPlan.amount || checkoutPlan.price;
      if (appliedCoupon) {
        if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
        else price = Math.max(0, price - appliedCoupon.discountValue);
      }
      if (gstType === 'EXCLUSIVE') {
        price = price * 1.18;
      }
      const formattedPrice = price.toFixed(2);

      const formData = new FormData();
      formData.append('planId', checkoutPlan.id || checkoutPlan._id);
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

  // 3. SELECT PAYMENT METHOD WITH KYC & AGREEMENT ENFORCEMENT
  const handleSelectPaymentMethod = async (method: 'ONLINE' | 'UPI_QR') => {
    if (kycFirst && !isKycDone) {
      toast.error('KYC Verification is required before purchasing a plan. Redirecting to KYC Center...');
      setCheckoutPlan(null);
      if (onNavigateToKyc) onNavigateToKyc();
      else if (onTriggerOnboarding) onTriggerOnboarding();
      return;
    }

    if (!isAgreementDone) {
      // Prompt for Agreement first, and remember method to auto-redirect after signing!
      setPendingPaymentMethod(method);
      setShowAgreementModal(true);
      return;
    }

    // Agreement is done -> proceed directly to chosen method
    if (method === 'ONLINE') {
      handleOnlineGatewayPurchase();
    } else {
      setCheckoutPaymentMethod('UPI_QR');
    }
  };

  // 4. SIGN AGREEMENT & AUTO-ROUTE TO CHOSEN PAYMENT METHOD
  const handleSignAgreementAndProceed = async () => {
    if (!agreementConsentChecked) {
      toast.error('Please accept the Advisory Agreement terms to proceed.');
      return;
    }

    setIsSigningAgreement(true);
    try {
      const signRes = await api.signAgreement({
        signatureText: profile?.name || `${profile?.user?.firstName || ''} ${profile?.user?.lastName || ''}`.trim() || 'Aadhaar eSign'
      });

      if (signRes.success) {
        setIsLocalAgreementDone(true);
        setShowAgreementModal(false);
        toast.success('Advisory Agreement signed successfully!');

        // AUTO-ROUTE to the method the client clicked!
        const targetMethod = pendingPaymentMethod || 'ONLINE';
        if (targetMethod === 'ONLINE') {
          setTimeout(() => {
            handleOnlineGatewayPurchase();
          }, 350);
        } else {
          setCheckoutPaymentMethod('UPI_QR');
        }
      } else {
        toast.error(signRes.message || 'Failed to sign agreement');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to sign agreement');
    } finally {
      setIsSigningAgreement(false);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      if (paymentStatus === 'success') {
        toast.success('Payment successful! Your subscription is now active.');
        setActiveTab('active');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'failed') {
        toast.error('Payment was not completed or verification failed.');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if (profile?.subscriptions && Array.isArray(profile.subscriptions) && profile.subscriptions.length > 0) {
      const activeFromProp = profile.subscriptions.filter((s: any) => ['ACTIVE', 'active', 'UPCOMING', 'upcoming'].includes(s.status));
      if (activeFromProp.length > 0) {
        const sorted = [...activeFromProp].sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        setActiveSubscriptions(sorted);
      }
    }
  }, [profile]);

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const [subRes, plansRes, couponsRes, gwRes] = await Promise.all([
          api.getClientSubscriptions().catch(() => ({ success: false, data: [] })),
          api.getPlans().catch(() => ({ success: false, data: [] })),
          api.getClientCoupons().catch(() => ({ success: false, data: [] })),
          api.getPaymentGatewayStatus().catch(() => null)
        ]);

        if (gwRes) {
          setGatewayConfig(gwRes);
        }

        let subs: any[] = [];
        if (subRes.success && Array.isArray(subRes.data) && subRes.data.length > 0) {
          subs = subRes.data;
        } else if (profile?.subscriptions && Array.isArray(profile.subscriptions) && profile.subscriptions.length > 0) {
          subs = profile.subscriptions;
        }

        if (subs.length > 0) {
          const activeList = subs.filter((s: any) => ['ACTIVE', 'active', 'UPCOMING', 'upcoming'].includes(s.status));
          const sorted = [...activeList].sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
          setActiveSubscriptions(sorted);
        }

        if (couponsRes && couponsRes.success) setAvailableCoupons(couponsRes.data);
        if (plansRes.success) {
          setAvailablePlans(plansRes.data || []);
          setGstType(plansRes.gstCalculationType || 'INCLUSIVE');
        }
      } catch (err) {
        console.error('Failed to fetch subscriptions/plans', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSub();
  }, [profile]);

  return (
    <div className="space-y-6 font-sans text-premium-text animate-in fade-in duration-500 h-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Subscription Center</h1>
          <p className="text-sm text-premium-text/60 mt-1">Manage your active plans or explore new ones.</p>
        </div>
      </div>

      <div className="flex bg-premium-cards border border-premium-border p-1 rounded-xl w-max">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-premium-primary text-white shadow-md' : 'text-premium-text/60 hover:text-premium-text'}`}
        >
          My Plans
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'browse' ? 'bg-premium-primary text-white shadow-md' : 'text-premium-text/60 hover:text-premium-text'}`}
        >
          Browse Plans
        </button>
      </div>

      {activeTab === 'active' && (
        <div className="max-w-4xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 bg-premium-cards border border-premium-border rounded-3xl">
              <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
              <p className="text-sm text-premium-text/60">Loading subscription details...</p>
            </div>
          ) : activeSubscriptions.length > 0 ? (
            <div className="space-y-6">
              {activeSubscriptions.map((sub, index) => {
                const now = new Date().getTime();
                const start = new Date(sub.startDate).getTime();
                const end = new Date(sub.endDate).getTime();
                const isCurrentlyActive = now >= start && now <= end;
                const isUpcoming = now < start;
                const isExpired = now > end;

                const totalDurationDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
                const daysRemaining = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
                const daysElapsed = Math.max(0, Math.min(totalDurationDays, Math.round((now - start) / (1000 * 60 * 60 * 24))));
                const progressPercent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDurationDays) * 100)));

                let displayPrice = sub.amountPaid || sub.amountTotal;
                if (!displayPrice) {
                  let p = sub.plan?.amount || sub.plan?.price || 0;
                  if (gstType === 'EXCLUSIVE') p = p * 1.18;
                  displayPrice = p.toFixed(2);
                }

                return (
                  <div
                    key={sub.id || sub._id || index}
                    className="relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300"
                  >
                    {/* Top gradient accent line */}
                    <div
                      className={`h-1.5 w-full ${
                        isCurrentlyActive
                          ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
                          : isUpcoming
                          ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
                          : 'bg-slate-400'
                      }`}
                    />

                    <div className="p-6 md:p-8">
                      {/* Top Header Row */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-start gap-4">
                          <div
                            className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                              isCurrentlyActive
                                ? 'bg-gradient-to-br from-emerald-500/15 to-teal-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                : 'bg-gradient-to-br from-indigo-500/15 to-purple-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400 shadow-sm'
                            }`}
                          >
                            {isCurrentlyActive ? (
                              <Zap className="w-7 h-7" />
                            ) : (
                              <Calendar className="w-7 h-7" />
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2.5">
                              <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                                {sub.plan?.name || 'VIP Advisory Plan'}
                              </h2>

                              {isCurrentlyActive && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                  </span>
                                  Active Now
                                </span>
                              )}

                              {isUpcoming && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                  <Clock className="w-3.5 h-3.5" />
                                  Queued · Starts Automatically
                                </span>
                              )}

                              {isExpired && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                  Expired
                                </span>
                              )}

                              {activeSubscriptions.length > 1 && (
                                <span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-md">
                                  Plan #{index + 1}
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              {isCurrentlyActive
                                ? `Active plan valid until ${new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : isUpcoming
                                ? `Sequential plan scheduled to start on ${new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                                : `Expired on ${new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            </p>
                          </div>
                        </div>

                        <div className="text-left md:text-right shrink-0">
                          <div className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            ₹{displayPrice}
                          </div>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            /{sub.billingCycle || (sub.plan?.durationMonths ? `${sub.plan.durationMonths} Months` : 'Full Term')}
                            <span className="ml-1 text-[11px] text-slate-400 font-normal">· GST Compliant</span>
                          </p>
                        </div>
                      </div>

                      {/* Active Progress or Upcoming Callout */}
                      {isCurrentlyActive ? (
                        <div className="mt-5 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs mb-2">
                            <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                              <Sparkles className="w-3.5 h-3.5" />
                              Active Subscription Progress
                            </span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expires today'}
                            </span>
                          </div>
                          <div className="w-full bg-emerald-100/60 dark:bg-emerald-900/40 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(4, Math.min(100, 100 - progressPercent))}%` }}
                            />
                          </div>
                        </div>
                      ) : isUpcoming ? (
                        <div className="mt-5 p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-start sm:items-center gap-3.5">
                          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Clock className="w-5 h-5" />
                          </div>
                          <div className="text-xs">
                            <p className="font-bold text-indigo-950 dark:text-indigo-200 text-sm">
                              Starts sequentially on {new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
                              This subscription is queued and will automatically activate immediately when your preceding plan ends. Continuous advisory guaranteed!
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {/* 3-Column Dates Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-5">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
                            <CreditCard className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Purchased On</p>
                            <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                              {new Date(sub.createdAt || sub.paymentDate || sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <PlayCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valid From</p>
                            <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                              {new Date(sub.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Valid Until</p>
                            <p className="text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                              {new Date(sub.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Included Segments */}
                      <div className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <Shield className="w-3.5 h-3.5 text-premium-primary" />
                          <span>Included Advisory Segments</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const planData = sub.plan || availablePlans.find(p => String(p.id || p._id) === String(sub.planId || sub.plan?.id || sub.plan?._id));
                            const segments = planData?.researchSegments || planData?.segments || sub.segments || sub.researchSegments;
                            if (segments) {
                              const segList = Array.isArray(segments) ? segments : String(segments).split(',');
                              return segList.map((f: string, i: number) => (
                                <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                  {f.trim()}
                                </span>
                              ));
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                All segments included
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Card Footer Bar */}
                      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          SEBI Compliant Research Advisory Coverage
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          Ref: {String(sub.id || sub._id).slice(-8).toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-premium-cards border border-premium-border rounded-3xl max-w-3xl">
              <CreditCard className="w-12 h-12 text-premium-border mb-4" />
              <h3 className="text-xl font-bold mb-2">No Active Subscription</h3>
              <p className="text-sm text-premium-text/60 mb-6">You don't have any active premium plans.</p>
              <button onClick={() => setActiveTab('browse')} className="bg-premium-primary hover:bg-premium-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors">
                Browse Plans
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'browse' && (
        <div className="pt-4">
          {kycFirst && !isKycDone && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm animate-in fade-in duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-amber-500">KYC Verification Required Before Payment</h4>
                  <p className="text-xs text-premium-text/70 mt-0.5">As per SEBI compliance and advisor policy, you must complete your KYC identity verification before purchasing a plan.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (onNavigateToKyc) onNavigateToKyc();
                  else if (onTriggerOnboarding) onTriggerOnboarding();
                }}
                className="shrink-0 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5"
              >
                Complete KYC Now <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-premium-primary animate-spin mb-4" />
              <p className="text-sm text-premium-text/60">Loading available plans...</p>
            </div>
          ) : availablePlans.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-premium-text/40">
              <Shield className="w-12 h-12 mb-4 text-premium-border" />
              <p className="text-sm">No plans are currently available.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {availablePlans.map((plan, index) => {
                const isPopular = index === 1; // Highlight second plan mock
                const Icon = index === 0 ? Star : index === 1 ? Zap : Shield;
                const color = index === 0 ? 'text-premium-primary' : index === 1 ? 'text-premium-warning' : 'text-premium-success';
                const bg = index === 0 ? 'bg-premium-primary/10' : index === 1 ? 'bg-premium-warning/10' : 'bg-premium-success/10';

                return (
                  <div key={plan.id || plan._id} className={`relative bg-premium-cards border ${isPopular ? 'border-premium-warning shadow-lg shadow-premium-warning/10 scale-105 z-10' : 'border-premium-border'} rounded-3xl p-8 flex flex-col hover:border-premium-primary/50 transition-colors`}>
                    {isPopular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-premium-warning text-premium-bg text-xs font-bold uppercase tracking-wider px-4 py-1 rounded-full">
                        Most Popular
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${color}`} />
                      </div>
                      {(plan.category || plan.categoryId) && (
                        <span className="px-3 py-1 bg-premium-bg border border-premium-border text-premium-text/70 text-[10px] font-bold uppercase tracking-widest rounded-lg">
                          {typeof plan.category === 'object' ? plan.category.name : (plan.category?.name || 'PLAN')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold mb-1">{plan.name}</h3>

                    <div className="flex items-baseline gap-1 mt-4 mb-2">
                      <span className="text-4xl font-bold">₹{plan.amount || plan.price}</span>
                      <span className="text-premium-text/60 font-medium">
                        / {plan.durationMonths || plan.duration || '1'} Month(s)
                      </span>
                    </div>
                    <p className="text-[10px] text-premium-text/40 uppercase tracking-widest mb-6">18% GST ({gstType === 'EXCLUSIVE' ? 'Exclusive' : 'Inclusive'})</p>

                    {plan.description && (
                      <div className="mb-6 p-4 bg-premium-bg/50 border border-premium-border/50 rounded-2xl">
                        <div className="text-sm text-premium-text/80 leading-relaxed prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: plan.description }} />
                      </div>
                    )}

                    <div className="space-y-4 mb-8 flex-1">
                      <h4 className="text-xs font-bold text-premium-text/50 uppercase tracking-widest mb-3">Included Segments</h4>
                      <div className="flex flex-wrap gap-2">
                        {plan.researchSegments || plan.segments ? (
                          (Array.isArray(plan.researchSegments || plan.segments) ? (plan.researchSegments || plan.segments) : (plan.researchSegments || plan.segments).split(',')).map((f: string, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-premium-success/10 text-premium-success border border-premium-success/20 rounded-lg text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {f.trim()}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-premium-text/50">All segments</span>
                        )}
                      </div>
                    </div>

                    <button onClick={() => {
                      if (kycFirst && !isKycDone) {
                        toast.error('KYC Verification is required before purchasing a plan. Redirecting to KYC Center...');
                        if (onNavigateToKyc) {
                          onNavigateToKyc();
                        } else if (onTriggerOnboarding) {
                          onTriggerOnboarding();
                        }
                        return;
                      }
                      setCheckoutPlan(plan);
                      setAppliedCoupon(null);
                      setCouponCode('');
                      setCheckoutPaymentMethod(null);
                      setProofSuccess(false);
                      setUpiUtr('');
                      setUpiProofFile(null);
                      setUpiProofPreview('');
                      fetchGatewayStatus();
                    }} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${isPopular
                      ? 'bg-premium-warning text-premium-bg hover:bg-premium-warning/90'
                      : 'bg-premium-primary hover:bg-premium-primary/90 text-white'
                      }`}>
                      {kycFirst && !isKycDone ? 'Complete KYC to Subscribe' : 'Select Plan'} <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* CHECKOUT MODAL */}
          {checkoutPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
              <div className="bg-premium-cards border border-premium-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 my-auto">
                {paymentSuccess ? (
                  <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-20 h-20 bg-premium-success/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 bg-premium-success/20 rounded-full animate-ping" />
                      <CheckCircle2 className="w-10 h-10 text-premium-success relative z-10" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">Thank You!</h2>
                    <p className="text-premium-text/70 mb-8 leading-relaxed text-sm">
                      Your payment was successful and your subscription to <strong className="text-premium-text">{checkoutPlan.name}</strong> is now active. Welcome aboard!
                    </p>
                    <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-premium-success to-emerald-600 hover:from-emerald-500 hover:to-premium-success text-white rounded-xl py-3.5 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2">
                      Go to Dashboard <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : checkoutPaymentMethod === 'UPI_QR' ? (
                  /* VIEW: PAY WITH QR / UPI SCREEN */
                  <div className="space-y-4 animate-in fade-in">
                    {proofSuccess ? (
                      <div className="text-center py-6 animate-in fade-in">
                        <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                          <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Payment Proof Submitted!</h3>
                        <p className="text-premium-text/70 text-xs mb-3">
                          Your screenshot and UTR (<span className="font-mono font-bold text-primary-400">{upiUtr}</span>) for the <strong className="text-premium-text">{checkoutPlan.name}</strong> plan have been sent to Admin for verification.
                        </p>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 my-4 text-xs text-amber-600 dark:text-amber-400 text-left flex items-start gap-2">
                          <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>Status: <strong>Pending Admin Verification</strong>. Once verified, your subscription plan will be automatically activated.</span>
                        </div>
                        <button
                          onClick={() => {
                            setCheckoutPlan(null);
                            setCheckoutPaymentMethod(null);
                            setProofSuccess(false);
                            setUpiUtr('');
                            setUpiProofFile(null);
                            setUpiProofPreview('');
                          }}
                          className="w-full bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl py-3 text-xs font-bold shadow-lg transition-all"
                        >
                          Close
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between border-b border-premium-border pb-3">
                          <button
                            type="button"
                            onClick={() => setCheckoutPaymentMethod(null)}
                            className="flex items-center gap-1 text-xs font-bold text-premium-text/60 hover:text-premium-text transition"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back
                          </button>
                          <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1">
                            <QrCode className="w-3.5 h-3.5" /> Pay with QR / UPI
                          </span>
                        </div>

                        {/* Plan & Payable Amount */}
                        <div className="bg-premium-bg border border-premium-border rounded-2xl p-3 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-premium-text/50 block text-[10px]">PLAN</span>
                            <span className="font-bold text-sm text-premium-text">{checkoutPlan.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-premium-text/50 block text-[10px]">PAYABLE AMOUNT</span>
                            <span className="font-bold text-base text-emerald-400">₹{(() => {
                              let price = checkoutPlan.amount || checkoutPlan.price;
                              if (appliedCoupon) {
                                if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
                                else price = Math.max(0, price - appliedCoupon.discountValue);
                              }
                              if (gstType === 'EXCLUSIVE') price = price * 1.18;
                              return price.toFixed(2);
                            })()}</span>
                          </div>
                        </div>

                        {/* QR Code and UPI ID */}
                        <div className="bg-premium-bg border border-premium-border rounded-2xl p-4 flex flex-col items-center text-center space-y-3">
                          {gatewayConfig?.upiQr?.qrImageUrl ? (
                            <div className="w-44 h-44 bg-white rounded-2xl p-2.5 border border-white/20 shadow-md flex items-center justify-center">
                              <img
                                src={getFullUrl(gatewayConfig.upiQr.qrImageUrl)}
                                alt="UPI QR Code"
                                className="w-full h-full object-contain rounded-xl"
                              />
                            </div>
                          ) : (
                            <div className="w-36 h-36 rounded-2xl border-2 border-dashed border-premium-border flex flex-col items-center justify-center text-premium-text/40">
                              <QrCode className="w-10 h-10 mb-1" />
                              <span className="text-[10px]">Scan with any UPI App</span>
                            </div>
                          )}

                          {gatewayConfig?.upiQr?.payeeName && (
                            <p className="font-bold text-xs text-premium-text">{gatewayConfig.upiQr.payeeName}</p>
                          )}

                          {gatewayConfig?.upiQr?.upiId && (
                            <div className="w-full flex items-center justify-between bg-black/20 border border-premium-border rounded-xl px-3 py-2 text-xs font-mono">
                              <span className="text-premium-text select-all">{gatewayConfig.upiQr.upiId}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (gatewayConfig?.upiQr?.upiId) {
                                    navigator.clipboard.writeText(gatewayConfig.upiQr.upiId);
                                    setCopiedUpi(true);
                                    toast.success('UPI ID copied!');
                                    setTimeout(() => setCopiedUpi(false), 2000);
                                  }
                                }}
                                className="ml-2 text-primary-400 hover:text-primary-300 p-1 flex items-center gap-1 font-sans text-[11px] font-bold"
                              >
                                {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Instruction Alert Banner */}
                        <div className="bg-amber-500/15 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-700 dark:text-amber-300 space-y-1">
                          <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                            <span>⚠️ Payment hone ke baad payment ka screenshot upload karein</span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-300/80">
                            {gatewayConfig?.upiQr?.instructions || 'Please complete payment using any UPI app (Google Pay, PhonePe, Paytm, BHIM). Once paid, enter your 12-digit UTR number and upload the screenshot below.'}
                          </p>
                        </div>

                        {/* Form: UTR & Screenshot */}
                        <div className="space-y-3 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-premium-text/70 mb-1">
                              12-Digit UTR / Transaction Reference <span className="text-rose-400">*</span>
                            </label>
                            <input
                              type="text"
                              value={upiUtr}
                              onChange={e => setUpiUtr(e.target.value.trim())}
                              placeholder="e.g. 423456789012"
                              className="w-full bg-premium-bg border border-premium-border rounded-xl px-3.5 py-2.5 text-xs text-premium-text font-mono focus:border-premium-primary outline-none transition"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-premium-text/70 mb-1">
                              Payment Screenshot Proof <span className="text-rose-400">*</span>
                            </label>
                            {upiProofPreview ? (
                              <div className="relative border border-premium-border rounded-2xl p-2 bg-premium-bg flex items-center gap-3">
                                <img
                                  src={upiProofPreview}
                                  alt="Screenshot Preview"
                                  className="w-16 h-16 object-cover rounded-xl border border-white/10"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate text-premium-text">{upiProofFile?.name}</p>
                                  <p className="text-[10px] text-premium-text/50">{(upiProofFile ? (upiProofFile.size / 1024).toFixed(1) + ' KB' : '')}</p>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUpiProofFile(null);
                                      setUpiProofPreview('');
                                    }}
                                    className="text-[10px] text-rose-400 hover:underline mt-1 block font-bold"
                                  >
                                    Remove / Change
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-premium-border hover:border-premium-primary rounded-2xl cursor-pointer bg-premium-bg/50 transition-all group">
                                <Upload className="w-6 h-6 text-premium-text/40 group-hover:text-premium-primary mb-1 transition-colors" />
                                <span className="text-xs font-bold text-premium-text/70 group-hover:text-premium-text">Click to upload payment screenshot</span>
                                <span className="text-[10px] text-premium-text/40">PNG, JPG, JPEG, WEBP up to 10MB</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={e => {
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

                        {/* Submit Proof Button */}
                        <button
                          type="button"
                          onClick={handleSubmitUpiProof}
                          disabled={submittingProof || !upiUtr.trim() || !upiProofFile}
                          className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                        >
                          {submittingProof ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Submitting Proof...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Submit Payment Proof</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* VIEW: DEFAULT PLAN SUMMARY & PAYMENT OPTIONS */
                  <>
                    <h2 className="text-2xl font-bold mb-2">Confirm Purchase</h2>
                    <p className="text-premium-text/60 text-sm mb-6">You are subscribing to the {checkoutPlan.name} plan.</p>

                    <div className="mb-6 flex gap-2">
                      <div className="flex gap-2 w-full">
                        <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Have a coupon?" className="flex-1 bg-premium-bg border border-premium-border rounded-xl px-4 py-2.5 text-sm uppercase" />
                        <button onClick={handleApplyCoupon} disabled={loading || !couponCode} className="px-4 py-2.5 bg-premium-bg border border-premium-border hover:border-premium-primary rounded-xl text-sm font-bold transition-all">Apply</button>
                      </div>
                    </div>

                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="flex flex-wrap gap-2 mb-4 -mt-3">
                        {availableCoupons.filter(c => {
                          if (c.planId && c.planId !== checkoutPlan.id && c.planId !== checkoutPlan._id) return false;
                          if (c.categoryId && c.categoryId !== checkoutPlan.categoryId) return false;
                          return true;
                        }).map(c => (
                          <button key={c.id} onClick={() => { setCouponCode(c.code); }} className="text-[10px] px-2 py-1 rounded-full bg-premium-primary/10 text-premium-primary border border-premium-primary/20 hover:bg-premium-primary/20 transition-all font-bold tracking-wider">
                            USE {c.code}
                          </button>
                        ))}
                      </div>
                    )}

                    {appliedCoupon && (
                      <p className="text-emerald-500 text-sm mb-4">
                        Coupon Applied: {appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}% off` : `₹${appliedCoupon.discountValue} off`}
                      </p>
                    )}

                    <div className="bg-premium-bg border border-premium-border p-4 rounded-2xl mb-6">
                      <div className="flex justify-between items-center mb-2 text-sm text-premium-text/60">
                        <span>Plan Price</span>
                        <span>₹{checkoutPlan.amount || checkoutPlan.price}</span>
                      </div>
                      {appliedCoupon && (
                        <div className="flex justify-between items-center mb-2 text-sm text-emerald-500">
                          <span>Discount</span>
                          <span>-{appliedCoupon.discountType === 'PERCENTAGE' ? `${appliedCoupon.discountValue}%` : `₹${appliedCoupon.discountValue}`}</span>
                        </div>
                      )}
                      {gstType === 'EXCLUSIVE' && (
                        <div className="flex justify-between items-center mb-2 text-sm text-premium-text/60">
                          <span>GST (18%)</span>
                          <span>₹{(() => {
                            let price = checkoutPlan.amount || checkoutPlan.price;
                            if (appliedCoupon) {
                              if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
                              else price = Math.max(0, price - appliedCoupon.discountValue);
                            }
                            return (price * 0.18).toFixed(2);
                          })()}</span>
                        </div>
                      )}
                      <div className="border-t border-premium-border/50 my-2 pt-2 flex justify-between items-center font-bold text-lg">
                        <span>Total Payable</span>
                        <span>₹{(() => {
                          let price = checkoutPlan.amount || checkoutPlan.price;
                          if (appliedCoupon) {
                            if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
                            else price = Math.max(0, price - appliedCoupon.discountValue);
                          }
                          if (gstType === 'EXCLUSIVE') {
                            price = price * 1.18;
                          }
                          return price.toFixed(2);
                        })()}</span>
                      </div>
                    </div>

                    {/* PAYMENT METHOD BUTTONS MATRIX */}
                    {(() => {
                      const canPayOnline = Boolean(
                        gatewayConfig?.gateway?.enabled !== false &&
                        gatewayConfig?.paymentGatewayEnabled !== false &&
                        gatewayConfig?.gateway?.isConfigured !== false
                      );
                      const canPayUpiQr = Boolean(
                        gatewayConfig?.upiQr?.enabled &&
                        (gatewayConfig?.upiQr?.qrImageUrl || gatewayConfig?.upiQr?.upiId)
                      );

                      if (canPayOnline && canPayUpiQr) {
                        return (
                          <div className="space-y-3">
                            <button
                              type="button"
                              onClick={() => handleSelectPaymentMethod('ONLINE')}
                              disabled={loading}
                              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.01]"
                            >
                              <CreditCard className="w-4 h-4" />
                              <span>Pay Online (Instant Gateway)</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectPaymentMethod('UPI_QR')}
                              disabled={loading}
                              className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.01]"
                            >
                              <QrCode className="w-4 h-4" />
                              <span>Pay with QR / UPI</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setCheckoutPlan(null)}
                              className="w-full py-2.5 text-xs text-premium-text/60 hover:text-premium-text transition text-center font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        );
                      }

                      if (canPayOnline && !canPayUpiQr) {
                        return (
                          <div className="flex gap-3">
                            <button onClick={() => setCheckoutPlan(null)} className="px-5 py-3 bg-premium-bg border border-premium-border hover:border-premium-text/30 rounded-xl font-bold text-xs transition-colors">Cancel</button>
                            <button
                              type="button"
                              onClick={() => handleSelectPaymentMethod('ONLINE')}
                              disabled={loading}
                              className="flex-1 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Pay Online</>}
                            </button>
                          </div>
                        );
                      }

                      if (!canPayOnline && canPayUpiQr) {
                        return (
                          <div className="flex gap-3">
                            <button onClick={() => setCheckoutPlan(null)} className="px-5 py-3 bg-premium-bg border border-premium-border hover:border-premium-text/30 rounded-xl font-bold text-xs transition-colors">Cancel</button>
                            <button
                              type="button"
                              onClick={() => handleSelectPaymentMethod('UPI_QR')}
                              disabled={loading}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                            >
                              <QrCode className="w-4 h-4" />
                              <span>Pay with QR / UPI</span>
                            </button>
                          </div>
                        );
                      }

                      // Neither is available -> Contact Administrator
                      return (
                        <div className="space-y-3">
                          <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs text-center">
                            Online payment is currently disabled. Please contact the administrator to activate this plan.
                          </div>
                          <div className="flex gap-3">
                            <button onClick={() => setCheckoutPlan(null)} className="px-5 py-3 bg-premium-bg border border-premium-border rounded-xl font-bold text-xs">Cancel</button>
                            <button
                              type="button"
                              onClick={() => {
                                let price = checkoutPlan.amount || checkoutPlan.price;
                                if (appliedCoupon) {
                                  if (appliedCoupon.discountType === 'PERCENTAGE') price = price - (price * (appliedCoupon.discountValue / 100));
                                  else price = Math.max(0, price - appliedCoupon.discountValue);
                                }
                                if (gstType === 'EXCLUSIVE') price = price * 1.18;
                                const formattedPrice = price.toFixed(2);

                                setContactAdminData({
                                  adminContact: gatewayConfig?.adminContact || profile?.user?.tenant,
                                  plan: checkoutPlan,
                                  finalPrice: formattedPrice,
                                  appliedCoupon: appliedCoupon,
                                  customMessage: 'Online payment is currently not enabled. Please contact administrator to subscribe.'
                                });
                                setCheckoutPlan(null);
                                setShowContactAdminModal(true);
                              }}
                              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-xs py-3"
                            >
                              Contact Administrator
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          )}

          {/* ADVISORY AGREEMENT SIGNING MODAL (AUTO-ROUTING) */}
          {showAgreementModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">Advisory Agreement</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">SEBI Compliance Advisory Terms &amp; Conditions</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAgreementModal(false)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-4 text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <Shield className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    As per SEBI regulations, you must sign the Advisory Agreement before proceeding.
                    Once signed, you will automatically be routed to <strong>{pendingPaymentMethod === 'UPI_QR' ? 'Pay with QR / UPI' : 'Pay Online'}</strong>.
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px] p-4 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans prose prose-sm dark:prose-invert">
                  <div dangerouslySetInnerHTML={{ __html: agreementHTML }} />
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer select-none text-xs text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={agreementConsentChecked}
                      onChange={e => setAgreementConsentChecked(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>
                      I have read, understood, and agree to all terms and conditions of this Advisory Agreement. I hereby consent to digital eSigning.
                    </span>
                  </label>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setShowAgreementModal(false)}
                      className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSignAgreementAndProceed}
                      disabled={isSigningAgreement || !agreementConsentChecked}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                    >
                      {isSigningAgreement ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Signing Agreement...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>eSign &amp; Proceed to {pendingPaymentMethod === 'UPI_QR' ? 'QR / UPI' : 'Payment'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
      )}
    </div>
  );
}

  
