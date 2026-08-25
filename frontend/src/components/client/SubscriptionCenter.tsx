'use client';

import { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Star, Zap, Shield, ChevronRight, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function SubscriptionCenter({ profile, onTriggerOnboarding }: { profile?: any, onTriggerOnboarding?: () => void }) {
  const [activeTab, setActiveTab] = useState<'active' | 'browse'>('active');
  const [activeSubscriptions, setActiveSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [gstType, setGstType] = useState<string>('INCLUSIVE');
  
  const isFullyOnboarded = profile?.status === 'PAYMENT_PENDING' || profile?.status === 'ACTIVE';
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setLoading(true);
    try {
      const res = await api.applyCoupon(couponCode);
      if (res.success) {
        setAppliedCoupon(res.data);
        alert('Coupon applied!');
      }
    } catch (err: any) {
      alert(err.message || 'Invalid coupon');
      setAppliedCoupon(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!checkoutPlan) return;
    
    // Check KYC First setting
    const kycFirst = profile?.user?.tenant?.kycFirst !== false; // Default true
    const isKycDone = profile?.kycStatus === 'VERIFIED' || profile?.kycStatus === 'APPROVED' || profile?.status === 'ACTIVE' || profile?.status === 'PAYMENT_PENDING' || profile?.status === 'AGREEMENT_PENDING';
    const isAgreementDone = !!profile?.agreementSigned || profile?.status === 'ACTIVE' || profile?.status === 'PAYMENT_PENDING';
    
    if (kycFirst && (!isKycDone || !isAgreementDone)) {
      alert('Please complete your Identity KYC and Legal Agreement before making a payment.');
      setCheckoutPlan(null);
      if (onTriggerOnboarding) {
        onTriggerOnboarding();
      }
      return;
    }

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

      const res = await api.initiateCCAvenuePayment({
        planId: checkoutPlan.id || checkoutPlan._id,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined
      });
      
      if (res.success && res.url) {
        // Create dynamic form and submit to CCAvenue
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
    } catch (err: any) {
      alert(err.message || 'Failed to select plan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const [subRes, plansRes, couponsRes] = await Promise.all([
          api.getClientSubscriptions().catch(() => ({ success: false, data: [] })),
          api.getPlans().catch(() => ({ success: false, data: [] })),
          api.getClientCoupons().catch(() => ({ success: false, data: [] }))
        ]);

        if (subRes.success && subRes.data && subRes.data.length > 0) {
          setActiveSubscriptions(subRes.data.filter((s: any) => s.status === 'ACTIVE' || s.status === 'active'));
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
  }, []);

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
            <div className="space-y-4">
              {activeSubscriptions.map((sub, index) => (
                <div key={index} className="bg-premium-cards border border-premium-border p-5 md:p-6 rounded-2xl">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-premium-warning/10 flex items-center justify-center border border-premium-warning/20">
                        <Zap className="w-6 h-6 text-premium-warning" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold">{sub.plan?.name || 'Premium Plan'}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-premium-success/20 text-premium-success`}>
                            {sub.status || 'ACTIVE'}
                          </span>
                          <span className="text-xs text-premium-text/60">
                            Expires: {new Date(sub.endDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-xl font-bold text-premium-text">₹{(() => {
                        if (sub.amountPaid) return sub.amountPaid;
                        if (sub.amountTotal) return sub.amountTotal;
                        let displayPrice = sub.plan?.amount || sub.plan?.price || 0;
                        if (gstType === 'EXCLUSIVE') displayPrice = displayPrice * 1.18;
                        return displayPrice.toFixed(2);
                      })()}</p>
                      <p className="text-xs text-premium-text/50">/{sub.billingCycle || sub.plan?.durationMonths + ' Months' || 'term'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-premium-bg/50 border border-premium-border/50 p-4 rounded-xl mb-5">
                    <div>
                      <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Start Date</p>
                      <p className="text-sm font-semibold">{new Date(sub.startDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">End Date</p>
                      <p className="text-sm font-semibold">{new Date(sub.endDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Receipt No</p>
                      <p className="text-sm font-semibold">{sub.receiptNo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-premium-text/50 uppercase tracking-wider mb-1">Auto-Renew</p>
                      <p className="text-sm font-semibold text-premium-text/60">Disabled</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button className="px-6 py-2 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-lg text-sm font-bold transition-colors">
                      Renew Plan
                    </button>
                    <button className="px-6 py-2 bg-premium-bg border border-premium-border hover:border-premium-text/30 text-premium-text rounded-lg text-sm font-bold transition-colors">
                      Upgrade
                    </button>
                  </div>
                </div>
              ))}
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
                      if (isFullyOnboarded) {
                        setCheckoutPlan(plan);
                        setAppliedCoupon(null);
                        setCouponCode('');
                      } else {
                        onTriggerOnboarding && onTriggerOnboarding();
                      }
                    }} className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                      isPopular 
                      ? 'bg-premium-warning text-premium-bg hover:bg-premium-warning/90' 
                      : 'bg-premium-primary hover:bg-premium-primary/90 text-white'
                    }`}>
                      Select Plan <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {checkoutPlan && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-premium-cards border border-premium-border rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300">
                {paymentSuccess ? (
                  <div className="text-center py-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-24 h-24 bg-premium-success/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                      <div className="absolute inset-0 bg-premium-success/20 rounded-full animate-ping" />
                      <CheckCircle2 className="w-12 h-12 text-premium-success relative z-10" />
                    </div>
                    <h2 className="text-3xl font-bold mb-3">Thank You!</h2>
                    <p className="text-premium-text/70 mb-8 leading-relaxed">
                      Your payment was successful and your subscription to <strong className="text-premium-text">{checkoutPlan.name}</strong> is now active. Welcome aboard!
                    </p>
                    <button onClick={() => window.location.reload()} className="w-full bg-gradient-to-r from-premium-success to-emerald-600 hover:from-emerald-500 hover:to-premium-success text-white rounded-xl py-4 font-bold shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2">
                      Go to Dashboard <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold mb-2">Confirm Purchase</h2>
                    <p className="text-premium-text/60 text-sm mb-6">You are subscribing to the {checkoutPlan.name} plan.</p>
                    
                    <div className="mb-6 flex gap-2">

                    <div className="flex gap-2">
                      <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder="Have a coupon?" className="flex-1 bg-premium-bg border border-premium-border rounded-xl px-4 py-2.5 text-sm uppercase" />
                      <button onClick={handleApplyCoupon} disabled={loading || !couponCode} className="px-4 py-2.5 bg-premium-bg border border-premium-border hover:border-premium-primary rounded-xl text-sm font-bold transition-all">Apply</button>
                    </div>
                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="flex flex-wrap gap-2 mt-2">
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
  
                    </div>
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
                        <span>Total</span>
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

                    <div className="flex gap-4">
                      <button onClick={() => setCheckoutPlan(null)} className="px-6 py-3 bg-premium-bg border border-premium-border hover:border-premium-text/30 rounded-xl font-bold transition-colors">Cancel</button>
                      <button onClick={handleConfirmPurchase} disabled={loading} className="flex-1 bg-premium-primary hover:bg-premium-primary/90 text-white rounded-xl font-bold flex items-center justify-center shadow-[0_0_15px_var(--tw-colors-premium-primary)] transition-all">
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Pay Now'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
