import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
  CreditCard,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Users,
  Loader2,
  FileText,
  Clock,
  Sparkles,
  Download,
  Check,
  Zap,
  Landmark,
  Copy,
  QrCode,
  CheckCircle,
  RefreshCw,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

export const CompanySubscriptionView: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Payment Options & Offline flow state
  const [paymentOptions, setPaymentOptions] = useState<any>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<any>(null);
  const [showBankQrModal, setShowBankQrModal] = useState(false);
  const [processingGateway, setProcessingGateway] = useState(false);
  const [submittingOffline, setSubmittingOffline] = useState(false);
  const [offlineForm, setOfflineForm] = useState({
    paymentMode: 'QR_UPI' as 'QR_UPI' | 'BANK_TRANSFER',
    offlineTransactionRef: '',
    offlinePaymentDate: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  useEffect(() => {
    fetchSubscription();
    fetchPaymentOptions();
  }, []);

  const fetchPaymentOptions = async () => {
    try {
      const res = await api.getPlatformPaymentOptions();
      if (res.success) {
        setPaymentOptions(res.data);
      }
    } catch (e) {
      console.error('Failed to load platform payment options', e);
    }
  };

  const fetchSubscription = async () => {
    setLoading(true);
    try {
      const res: any = await api.getMyCompanySubscription();
      if (res.success) {
        setData(res.data);
      }
    } catch {
      toast.error('Failed to load company subscription details.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleStartGatewayPayment = async (plan: any) => {
    if (!paymentOptions?.razorpayKeyId) {
      toast.error('Payment gateway is not currently configured by Platform SuperAdmin.');
      return;
    }

    setProcessingGateway(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error('Failed to load Razorpay SDK. Please check your internet connection.');
        return;
      }

      const orderRes = await api.initiateTenantPlatformGatewayOrder(plan._id || plan.id);
      if (!orderRes.success) {
        toast.error(orderRes.message || 'Failed to initiate gateway order.');
        return;
      }

      const order = orderRes.data;

      const options = {
        key: paymentOptions.razorpayKeyId,
        amount: order.amount,
        currency: order.currency || 'INR',
        name: 'Platform Subscription',
        description: `${plan.name} License (${plan.durationDays} Days)`,
        order_id: order.id,
        prefill: {
          name: company?.companyName || '',
          email: company?.email || '',
          contact: company?.phone || ''
        },
        theme: {
          color: '#4f46e5'
        },
        handler: async (response: any) => {
          try {
            const verifyRes = await api.verifyTenantPlatformGatewayPayment({
              planId: plan._id || plan.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            if (verifyRes.success) {
              toast.success('Payment verified successfully! Your platform plan is active.');
              setShowUpgradeModal(false);
              fetchSubscription();
            } else {
              toast.error(verifyRes.message || 'Payment verification failed.');
            }
          } catch (vErr: any) {
            toast.error(vErr.message || 'Failed to verify payment with server.');
          }
        },
        modal: {
          ondismiss: () => {
            toast('Payment checkout closed.', { icon: 'ℹ️' });
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (errResp: any) => {
        toast.error(`Payment failed: ${errResp.error?.description || 'Transaction unsuccessful'}`);
      });
      rzp.open();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during payment.');
    } finally {
      setProcessingGateway(false);
    }
  };

  const handleSubmitOfflinePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offlineForm.offlineTransactionRef.trim()) {
      toast.error('Please enter the transaction reference / UTR number.');
      return;
    }
    setSubmittingOffline(true);
    try {
      const res = await api.submitTenantPlatformOfflinePayment({
        planId: selectedPlanForPayment._id || selectedPlanForPayment.id,
        paymentMode: offlineForm.paymentMode,
        offlineTransactionRef: offlineForm.offlineTransactionRef.trim(),
        offlinePaymentDate: offlineForm.offlinePaymentDate,
        remarks: offlineForm.remarks
      });

      if (res.success) {
        toast.success(res.message || 'Payment reference submitted! Awaiting SuperAdmin verification.');
        setShowBankQrModal(false);
        setShowUpgradeModal(false);
        setSelectedPlanForPayment(null);
        setOfflineForm({
          paymentMode: 'QR_UPI',
          offlineTransactionRef: '',
          offlinePaymentDate: new Date().toISOString().split('T')[0],
          remarks: ''
        });
        fetchSubscription();
      } else {
        toast.error(res.message || 'Failed to submit payment reference.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment details.');
    } finally {
      setSubmittingOffline(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const { isLegacyUnassigned, company, subscription, activeClientsCount, maxActiveClients, availablePlans, invoices } = data || {};
  const isStateMissing = !company?.state || company.state.trim() === '' || company.state === 'N/A';

  // Calculate calendar days remaining
  let daysRemaining = 0;
  if (subscription?.endDate) {
    const end = new Date(subscription.endDate);
    const now = new Date();
    const msLeft = end.getTime() - now.getTime();
    if (msLeft <= 0) {
      daysRemaining = 0;
    } else {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const startOfEndDay = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
      const calDays = Math.round((startOfEndDay - startOfToday) / (1000 * 60 * 60 * 24));
      daysRemaining = Math.max(1, calDays);
    }
  }

  const handleDownloadInvoice = async (invoiceId: string, invoiceNumber?: string) => {
    try {
      await api.downloadPlatformInvoice(invoiceId, invoiceNumber, false);
      toast.success('Tax invoice downloaded successfully.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download invoice PDF.');
    }
  };

  const capacityPct = maxActiveClients && maxActiveClients > 0
    ? Math.min(100, Math.round((activeClientsCount / maxActiveClients) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* Banner if State is missing (Deferred Invoice Alert) */}
      {isStateMissing && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Organization Registered State Not Selected</p>
            <p className="text-slate-600 dark:text-slate-400">
              Your platform tax invoice cannot be finalized without Place of Supply. Please update your <strong>State</strong> under <strong>Organization Profile</strong> to automatically receive your GST Tax Invoice.
            </p>
          </div>
        </div>
      )}

      {/* Banner if Subscription is Pending Approval */}
      {subscription?.status === 'PENDING_APPROVAL' && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-amber-800 dark:text-amber-300 shadow-sm">
          <Clock className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 animate-spin" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Subscription Upgrade Pending SuperAdmin Approval</p>
            <p className="text-slate-600 dark:text-slate-400">
              Your offline payment reference <strong>{subscription.offlineTransactionRef || 'N/A'}</strong> has been submitted. Platform SuperAdmin will verify your payment and activate your subscription shortly. Once approved, your official GST invoice will be generated.
            </p>
          </div>
        </div>
      )}

      {/* Main Plan Status Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
                {isLegacyUnassigned ? 'UNLIMITED LEGACY ACTIVE' : `${subscription?.status || 'ACTIVE'} PLAN`}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {company?.companyName}
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              {isLegacyUnassigned ? 'Legacy Operational License' : subscription?.planName || 'Active SaaS Plan'}
              <Sparkles className="w-5 h-5 text-amber-500" />
            </h2>

            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              {isLegacyUnassigned
                ? 'Your company is operating under grandfathered access with full feature capabilities. You can explore modern subscription tiers to upgrade your advisory client limits.'
                : `Your platform subscription provides enterprise research analyst tools, automated SEBI compliance tracking, and advisory signal delivery.`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-5 py-3 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-500/25 transition flex items-center justify-center gap-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              {isLegacyUnassigned ? 'Explore SaaS Plans' : 'Upgrade / Renew Plan'}
            </button>
          </div>
        </div>

        {/* Quota & Dates Bar */}
        {!isLegacyUnassigned && subscription && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/5 text-xs">
            {/* Active Clients Quota */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400 font-semibold">
                <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-primary-500" /> Active Clients</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {activeClientsCount} / {maxActiveClients === 0 ? '∞' : maxActiveClients}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    capacityPct >= 90 ? 'bg-rose-500' : capacityPct >= 75 ? 'bg-amber-500' : 'bg-primary-600'
                  }`}
                  style={{ width: `${maxActiveClients === 0 ? 10 : capacityPct}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Calculated strictly by active advisory subscribers (Option A).
              </p>
            </div>

            {/* Validity Countdown */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
                <Clock className="w-4 h-4 text-emerald-500" /> Validity Remaining
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white pt-1">
                {daysRemaining} Days
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Expires on {new Date(subscription.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>

            {/* Billing Amount */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
                <CreditCard className="w-4 h-4 text-purple-500" /> Subscription Fee
              </div>
              <p className="text-xl font-extrabold text-slate-900 dark:text-white pt-1">
                ₹{subscription.totalAmount?.toLocaleString('en-IN')}
              </p>
              <p className="text-[10px] text-slate-400">
                {subscription.isGstInclusive ? '(Inclusive of 18% GST)' : `+ GST ₹${subscription.gstAmount?.toLocaleString('en-IN')}`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary-500" /> Platform Tax Invoices
        </h3>

        {(!invoices || invoices.length === 0) ? (
          <p className="text-xs text-slate-400 py-4 text-center">No platform tax invoices issued yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-[11px] text-slate-500 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="py-2.5">Invoice #</th>
                  <th>Invoice Date</th>
                  <th>Plan</th>
                  <th>Taxable Base</th>
                  <th>GST (18%)</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {invoices.map((inv: any) => (
                  <tr key={inv._id}>
                    <td className="py-3 font-mono font-bold text-primary-600">{inv.invoiceNumber}</td>
                    <td>{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</td>
                    <td className="font-semibold">{inv.planName}</td>
                    <td>₹{inv.baseAmount?.toLocaleString('en-IN')}</td>
                    <td>₹{inv.gstAmount?.toLocaleString('en-IN')} ({inv.isInterState ? 'IGST' : 'CGST+SGST'})</td>
                    <td className="font-extrabold text-slate-900 dark:text-white">₹{inv.totalAmount?.toLocaleString('en-IN')}</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                        {inv.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => handleDownloadInvoice(inv._id, inv.invoiceNumber)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-50 hover:bg-primary-100 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400 border border-primary-500/20 transition shadow-sm"
                        title="Download official GST Tax Invoice PDF"
                      >
                        <Download className="w-3.5 h-3.5" /> Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade / Explore Plans Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Available SaaS Plans & Upgrade Options</h3>
                <p className="text-[11px] text-slate-500">Contact SuperAdmin or upgrade your capacity seamlessly</p>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white font-bold text-lg">
                ✕
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              {availablePlans?.map((p: any) => (
                <div key={p._id} className="border border-slate-200 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between space-y-3 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="space-y-2">
                    <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-primary-500/10 text-primary-600">
                      {p.code}
                    </span>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">{p.name}</h4>
                    <p className="text-[11px] text-slate-500 whitespace-pre-line">{p.description || 'Enterprise advisory license'}</p>
                    <div className="text-lg font-black text-slate-900 dark:text-white pt-1">
                      {p.price === 0 ? 'FREE' : `₹${p.price.toLocaleString('en-IN')}`}
                      <span className="text-[10px] text-slate-400 font-normal"> / {p.durationDays}d</span>
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                      <p className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Active Client Capacity: <strong>{p.maxActiveClients === 0 ? 'Unlimited' : `${p.maxActiveClients} Clients`}</strong></span>
                      </p>
                      {Array.isArray(p.features) && p.features.length > 0 ? (
                        p.features.map((feat: string, idx: number) => (
                          <p key={idx} className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </p>
                        ))
                      ) : (
                        <p className="flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Automated SEBI Audits & Compliance Engine</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons based on SuperAdmin Gateway & QR Configuration */}
                  <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                    {p.price === 0 ? (
                      <button
                        onClick={() => {
                          toast('This is a Free Trial tier. Please contact SuperAdmin to activate or adjust trial limits.', { icon: 'ℹ️' });
                        }}
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-center"
                      >
                        Free Trial Tier
                      </button>
                    ) : (() => {
                      const hasGateway = Boolean(paymentOptions?.enableGatewayPayment && paymentOptions?.razorpayKeyId);
                      const hasBankQr = Boolean(paymentOptions?.enableBankQrPayment);

                      if (hasGateway && hasBankQr) {
                        return (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleStartGatewayPayment(p)}
                              disabled={processingGateway}
                              className="w-full py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20"
                            >
                              {processingGateway ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                              ⚡ Pay Online (Gateway)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPlanForPayment(p);
                                setShowBankQrModal(true);
                              }}
                              className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                            >
                              <Landmark className="w-3.5 h-3.5" />
                              📱 Pay with QR / Bank
                            </button>
                          </div>
                        );
                      }

                      if (hasGateway) {
                        return (
                          <button
                            onClick={() => handleStartGatewayPayment(p)}
                            disabled={processingGateway}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-primary-500/20"
                          >
                            {processingGateway ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            ⚡ Pay Online (Gateway)
                          </button>
                        );
                      }

                      if (hasBankQr) {
                        return (
                          <button
                            onClick={() => {
                              setSelectedPlanForPayment(p);
                              setShowBankQrModal(true);
                            }}
                            className="w-full py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                          >
                            <Landmark className="w-3.5 h-3.5" />
                            📱 Pay with QR / Bank
                          </button>
                        );
                      }

                      // Fallback when both are disabled
                      return (
                        <button
                          onClick={() => {
                            toast('Please contact SuperAdmin to purchase or assign this plan.', { icon: 'ℹ️' });
                          }}
                          className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 transition text-center"
                        >
                          Request Plan Upgrade
                        </button>
                      );
                    })()}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAY WITH QR / BANK MODAL */}
      {showBankQrModal && selectedPlanForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  Bank Transfer & UPI QR Payment
                </h3>
                <p className="text-[11px] text-slate-500">
                  Plan: <strong>{selectedPlanForPayment.name}</strong> • Amount: <strong>₹{selectedPlanForPayment.price?.toLocaleString('en-IN')}</strong> ({selectedPlanForPayment.durationDays} Days)
                </p>
              </div>
              <button
                onClick={() => {
                  setShowBankQrModal(false);
                  setSelectedPlanForPayment(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto flex-1 custom-scrollbar text-xs">
              {/* Left Column: QR Code & Bank Account details */}
              <div className="space-y-4">
                {/* UPI QR Display */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl text-center space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Scan UPI QR to Pay
                  </span>
                  <div className="flex justify-center">
                    {paymentOptions?.qrCodeUrl ? (
                      <img
                        src={paymentOptions.qrCodeUrl}
                        alt="UPI QR Code"
                        className="w-36 h-36 object-contain rounded-lg border border-slate-200 dark:border-white/10 bg-white p-1"
                      />
                    ) : paymentOptions?.upiId ? (
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
                          `upi://pay?pa=${paymentOptions.upiId}&pn=${encodeURIComponent(
                            paymentOptions.upiPayeeName || 'Platform'
                          )}&am=${selectedPlanForPayment.price}&cu=INR`
                        )}`}
                        alt="UPI QR Code"
                        className="w-36 h-36 object-contain rounded-lg border border-slate-200 dark:border-white/10 bg-white p-1"
                      />
                    ) : (
                      <div className="w-36 h-36 flex items-center justify-center bg-slate-100 dark:bg-white/5 rounded-lg text-slate-400">
                        <QrCode className="w-12 h-12" />
                      </div>
                    )}
                  </div>

                  {paymentOptions?.upiId && (
                    <div className="pt-1">
                      <div className="text-[11px] font-mono font-bold text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
                        <span>{paymentOptions.upiId}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentOptions.upiId, 'UPI ID')}
                          className="p-1 text-slate-400 hover:text-primary-600"
                          title="Copy UPI ID"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {paymentOptions.upiPayeeName && (
                        <p className="text-[10px] text-slate-500">Payee: {paymentOptions.upiPayeeName}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Bank Account Details */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl space-y-2 text-[11px]">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                    Direct Bank Transfer (NEFT/IMPS/RTGS)
                  </span>

                  {paymentOptions?.bankName && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-white/5">
                      <span className="text-slate-500">Bank Name</span>
                      <span className="font-bold text-slate-900 dark:text-white">{paymentOptions.bankName}</span>
                    </div>
                  )}

                  {paymentOptions?.bankAccountName && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-white/5">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-bold text-slate-900 dark:text-white">{paymentOptions.bankAccountName}</span>
                    </div>
                  )}

                  {paymentOptions?.bankAccountNumber && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-white/5">
                      <span className="text-slate-500">Account Number</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                        <span>{paymentOptions.bankAccountNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentOptions.bankAccountNumber, 'Account Number')}
                          className="text-slate-400 hover:text-primary-600"
                          title="Copy Account Number"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentOptions?.bankIfsc && (
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-slate-500">IFSC Code</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900 dark:text-white">
                        <span>{paymentOptions.bankIfsc}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(paymentOptions.bankIfsc, 'IFSC Code')}
                          className="text-slate-400 hover:text-primary-600"
                          title="Copy IFSC"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Submit Payment Reference Form */}
              <form onSubmit={handleSubmitOfflinePayment} className="space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="p-3 bg-primary-50 dark:bg-primary-500/10 rounded-xl border border-primary-500/20 text-[11px] text-primary-700 dark:text-primary-300">
                    <p className="font-bold">Step 2: Submit Payment Reference</p>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      After sending payment via UPI or Netbanking, enter your Transaction UTR / Ref Number below. Platform SuperAdmin will verify and activate your subscription.
                    </p>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Mode *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOfflineForm({ ...offlineForm, paymentMode: 'QR_UPI' })}
                        className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition ${
                          offlineForm.paymentMode === 'QR_UPI'
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        UPI QR / App
                      </button>
                      <button
                        type="button"
                        onClick={() => setOfflineForm({ ...offlineForm, paymentMode: 'BANK_TRANSFER' })}
                        className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition ${
                          offlineForm.paymentMode === 'BANK_TRANSFER'
                            ? 'bg-primary-600 text-white border-primary-600'
                            : 'border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Bank Transfer
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Transaction UTR / Reference Number *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 423512345678 or UPI Ref ID"
                      value={offlineForm.offlineTransactionRef}
                      onChange={e => setOfflineForm({ ...offlineForm, offlineTransactionRef: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={offlineForm.offlinePaymentDate}
                      onChange={e => setOfflineForm({ ...offlineForm, offlinePaymentDate: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Remarks / Payer Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Paid from HDFC account"
                      value={offlineForm.remarks}
                      onChange={e => setOfflineForm({ ...offlineForm, remarks: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-white/10 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowBankQrModal(false);
                      setSelectedPlanForPayment(null);
                    }}
                    className="flex-1 py-2.5 border border-slate-300 dark:border-white/10 rounded-xl font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingOffline}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                  >
                    {submittingOffline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Submit Reference
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySubscriptionView;
