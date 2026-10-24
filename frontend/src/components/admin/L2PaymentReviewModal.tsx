'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, CheckCircle2, XCircle, AlertTriangle, CreditCard, ShieldCheck, Clock, Loader2, X, Tag, UserCheck, Calendar, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface L2PaymentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  plans?: any[];
  categories?: any[];
  coupons?: any[];
  currentUser?: any;
  onSuccess?: () => void;
  onApproved?: () => void;
}

export default function L2PaymentReviewModal({
  isOpen,
  onClose,
  payment,
  plans = [],
  categories = [],
  coupons = [],
  currentUser,
  onSuccess,
  onApproved
}: L2PaymentReviewModalProps) {
  const [internalPlans, setInternalPlans] = useState<any[]>([]);
  const [internalCategories, setInternalCategories] = useState<any[]>([]);
  const [internalCoupons, setInternalCoupons] = useState<any[]>([]);

  // L2 Form States (Editable & Autofilled from L1)
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentRefId, setPaymentRefId] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [remarks, setRemarks] = useState('');

  // Rejection & Submitting state
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feeSummary, setFeeSummary] = useState<any>(null);

  // Fallback user from localStorage if not passed
  const activeUser = currentUser || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {});
  const approverName = `${activeUser.firstName || ''} ${activeUser.lastName || ''}`.trim() || activeUser.name || activeUser.email || 'L2 Approver';

  // Self-heal: Fetch missing lists if needed
  useEffect(() => {
    if (isOpen) {
      if (!plans || plans.length === 0) {
        api.getAdminPlans()
          .then((res: any) => {
            if (res?.success && Array.isArray(res.data)) setInternalPlans(res.data);
          })
          .catch(() => {});
      }
      if (!categories || categories.length === 0) {
        api.getAdminCategories()
          .then((res: any) => {
            if (res?.success && Array.isArray(res.data)) setInternalCategories(res.data);
          })
          .catch(() => {});
      }
      if (!coupons || coupons.length === 0) {
        api.getCoupons()
          .then((res: any) => {
            if (res?.success && Array.isArray(res.data)) setInternalCoupons(res.data);
            else if (Array.isArray(res)) setInternalCoupons(res);
          })
          .catch(() => {});
      }
    }
  }, [isOpen, plans, categories, coupons]);

  const allPlans = (Array.isArray(plans) && plans.length > 0) ? plans : internalPlans;
  const allCategories = (Array.isArray(categories) && categories.length > 0) ? categories : internalCategories;
  const allCoupons = (Array.isArray(coupons) && coupons.length > 0) ? coupons : internalCoupons;

  // L1 Submission Details fallback
  const l1 = {
    submittedByName: (payment?.l1Details?.submittedByName && !payment.l1Details.submittedByName.includes('@'))
      ? payment.l1Details.submittedByName
      : (payment?.assignedByAdminName || payment?.assignedByStaffName || payment?.l1Details?.submittedByName || 'Staff (Maker)'),
    planId: payment?.l1Details?.planId || payment?.planId,
    planName: payment?.l1Details?.planName || payment?.plan?.name || allPlans.find((p) => String(p.id || p._id) === String(payment?.l1Details?.planId || payment?.planId))?.name || 'Assigned Plan',
    categoryId: payment?.l1Details?.categoryId || payment?.plan?.categoryId,
    amount: payment?.l1Details?.amount ?? payment?.amount,
    validityDays: payment?.l1Details?.validityDays ?? (payment?.planValidityDays || 30),
    discount: payment?.l1Details?.discount ?? (payment?.discountApplied || 0),
    couponCode: payment?.l1Details?.couponCode || payment?.couponCode || '',
    transactionRef: payment?.l1Details?.transactionRef || payment?.transactionRef || payment?.paymentRefId || 'N/A',
    paymentDate: payment?.l1Details?.paymentDate ? new Date(payment.l1Details.paymentDate).toLocaleDateString('en-IN') : (payment?.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : 'N/A'),
    serviceStartDate: payment?.l1Details?.serviceStartDate ? new Date(payment.l1Details.serviceStartDate).toLocaleDateString('en-IN') : (payment?.serviceStartDate ? new Date(payment.serviceStartDate).toLocaleDateString('en-IN') : 'N/A'),
    remarks: payment?.l1Details?.remarks || payment?.remarks || 'Verified by Compliance Staff',
    submittedAt: payment?.l1Details?.submittedAt ? new Date(payment.l1Details.submittedAt).toLocaleString('en-IN') : (payment?.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN') : 'N/A')
  };

  // Find L1 category name & plan
  const l1PlanDoc = allPlans.find((p: any) => String(p.id || p._id) === String(l1.planId || payment?.planId));
  const l1CatId = l1.categoryId || (l1PlanDoc ? (typeof l1PlanDoc.categoryId === 'object' && l1PlanDoc.categoryId ? (l1PlanDoc.categoryId._id || l1PlanDoc.categoryId.id) : (l1PlanDoc.categoryId || l1PlanDoc.category)) : null);
  const l1CategoryDoc = allCategories.find((c: any) => String(c.id || c._id) === String(l1CatId) || String(c.name).toUpperCase() === String(l1CatId).toUpperCase());

  // Autofill L2 form on modal open with L1 submitted values
  useEffect(() => {
    if (payment && isOpen) {
      const cId = payment.clientId?._id || payment.clientId?.id || payment.clientId;
      if (cId) {
        api.get(`/admin/clients/${cId}/fee-summary`)
          .then((res: any) => { if (res.data?.success) setFeeSummary(res.data.data); })
          .catch(() => setFeeSummary(null));
      }

      const pPlanId = payment.planId ? String(payment.planId) : (payment.plan?.id || payment.plan?._id || '');
      setSelectedPlanId(pPlanId);

      const pDoc = allPlans.find((p: any) => String(p.id || p._id) === pPlanId);
      if (pDoc) {
        const catId = typeof pDoc.categoryId === 'object' && pDoc.categoryId
          ? String(pDoc.categoryId._id || pDoc.categoryId.id)
          : String(pDoc.categoryId || pDoc.category || '');
        setSelectedCategoryId(catId || (allCategories[0]?.id || ''));
      } else if (l1CatId) {
        setSelectedCategoryId(String(l1CatId));
      } else if (allCategories.length > 0 && !selectedCategoryId) {
        setSelectedCategoryId(String(allCategories[0]?.id || allCategories[0]?._id || ''));
      }

      setCouponCode(payment.couponCode || l1.couponCode || '');
      setPaymentRefId(payment.transactionRef || payment.paymentRefId || '');

      const pDateStr = payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split('T')[0]
        : (payment.createdAt ? new Date(payment.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentDate(pDateStr);

      const clientSubs = payment.client?.subscriptions || [];
      const activeSub = clientSubs.find((s: any) => {
        const pId = String(s.planId?._id || s.planId?.id || s.planId || '');
        return pId === pPlanId && (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date();
      });

      let initialStartDate = payment.serviceStartDate
        ? new Date(payment.serviceStartDate).toISOString().split('T')[0]
        : pDateStr;

      if (activeSub) {
        const exp = new Date(activeSub.endDate);
        const nextD = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() + 1);
        const minStr = nextD.toISOString().split('T')[0];
        if (!initialStartDate || initialStartDate < minStr) {
          initialStartDate = minStr;
        }
      }
      setServiceStartDate(initialStartDate);

      setCustomAmount(String(payment.amount || pDoc?.price || l1.amount || '0'));
      setCustomDays(String(payment.planValidityDays || (pDoc?.durationMonths ? pDoc.durationMonths * 30 : l1.validityDays || 30)));
      setRemarks(payment.remarks || l1.remarks || '');

      setIsRejectMode(false);
      setRejectionReason('');
    }
  }, [payment, isOpen, allPlans.length, allCategories.length]);

  if (!isOpen || !payment) return null;

  const notifySuccess = () => {
    if (onSuccess) onSuccess();
    if (onApproved) onApproved();
  };

  // Coupon calculation helper
  const getPlanAmountWithCoupon = (basePrice: number, durationMonths: number, code: string) => {
    let finalBase = basePrice;
    if (code && allCoupons.length > 0) {
      const coupon = allCoupons.find((c: any) => String(c.code).toUpperCase() === String(code).toUpperCase() && c.status === 'ACTIVE');
      if (coupon) {
        let disc = 0;
        if (coupon.discountType === 'FLAT') {
          disc = Number(coupon.discountValue || 0);
        } else if (coupon.discountType === 'PERCENTAGE') {
          disc = (finalBase * Number(coupon.discountValue || 0)) / 100;
        }
        finalBase = Math.max(0, finalBase - disc);
      }
    }
    return parseFloat(finalBase.toFixed(2));
  };

  // Filter plans for L2 selection
  const activeCategories = allCategories.filter((c: any) => c.status === 'ACTIVE' || !c.status);
  const selectedCatObj = activeCategories.find((c: any) => String(c.id || c._id) === String(selectedCategoryId) || String(c.name).toUpperCase() === String(selectedCategoryId).toUpperCase());
  const selectedCatName = (selectedCatObj?.name || '').toUpperCase();

  const filteredPlans = allPlans.filter((p: any) => {
    if (p.deletedAt || p.status === 'INACTIVE') return false;
    if (!selectedCategoryId) return true;
    const pCatId = typeof p.categoryId === 'object' && p.categoryId ? String(p.categoryId._id || p.categoryId.id) : String(p.categoryId || '');
    const pCatObjId = p.category ? (typeof p.category === 'object' ? String(p.category.id || p.category._id) : String(p.category)) : '';
    const pCatName = (p.category?.name || (typeof p.categoryId === 'object' ? p.categoryId.name : '') || '').toUpperCase();

    return (
      pCatId === String(selectedCategoryId) ||
      pCatObjId === String(selectedCategoryId) ||
      (selectedCatName && (pCatName === selectedCatName || pCatId === selectedCatName)) ||
      (pCatName && pCatName === String(selectedCategoryId).toUpperCase())
    );
  });

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlanId) {
      toast.error('Please select an active plan.');
      return;
    }

    if (!paymentDate) {
      toast.error('Please enter payment date.');
      return;
    }

    if (!serviceStartDate) {
      toast.error('Please enter service start date.');
      return;
    }

    // Strict validation: serviceStartDate >= paymentDate
    if (serviceStartDate < paymentDate) {
      toast.error('Validation Error: Service start date cannot be earlier than payment date.');
      return;
    }

    if (activeSubForPlan && minServiceStartDateStr && serviceStartDate < minServiceStartDateStr) {
      toast.error(`Validation Error: Client has an active plan expiring on ${expDate?.toLocaleDateString('en-IN')}. Service start date cannot be earlier than ${nextDay?.toLocaleDateString('en-IN')}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedPlan = allPlans.find((p: any) => String(p.id || p._id) === String(selectedPlanId));
      const basePrice = selectedPlan ? Number(selectedPlan.price) : Number(customAmount || 0);
      const discountedBase = selectedPlan ? getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, couponCode) : Number(customAmount || 0);
      const calculatedDiscount = Math.max(0, parseFloat((basePrice - discountedBase).toFixed(2)));

      const finalAmountToSubmit = customAmount !== '' && !isNaN(Number(customAmount))
        ? parseFloat(Number(customAmount).toFixed(2))
        : parseFloat(discountedBase.toFixed(2));

      if (feeSummary && finalAmountToSubmit > 0) {
        if (feeSummary.isQuotaFull || (feeSummary.totalBasePaid + finalAmountToSubmit > feeSummary.maxBaseFeeCap)) {
          toast.error(`SEBI Annual Fee Limit Exceeded: Approving this payment of ₹${finalAmountToSubmit} would exceed client's annual limit of ₹1,51,000 (+ GST) in ${feeSummary.fyLabel}. Remaining quota: ₹${feeSummary.remainingBaseQuota.toLocaleString('en-IN')}.`);
          return;
        }
      }

      const res = await api.post(`/admin/payments/${payment.id || payment._id}/l2-action`, {
        action: 'APPROVED',
        planId: selectedPlanId,
        amount: finalAmountToSubmit,
        validityDays: Number(customDays || (selectedPlan?.durationMonths ? selectedPlan.durationMonths * 30 : 30)),
        discount: calculatedDiscount,
        paymentRefId: paymentRefId.trim(),
        transactionRef: paymentRefId.trim(),
        paymentDate,
        serviceStartDate,
        remarks: remarks.trim()
      });

      if (res.data?.success) {
        toast.success(res.data.message || 'Payment approved and plan activated successfully by L2!');
        notifySuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve L2 payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please enter a rejection reason.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/admin/payments/${payment.id || payment._id}/l2-action`, {
        action: 'REJECTED',
        rejectionReason: rejectionReason.trim()
      });

      if (res.data?.success) {
        toast.success('Payment request has been rejected.');
        notifySuccess();
        onClose();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reject L2 payment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clientName = payment.client?.name || payment.clientName || 'Client';
  const clientEmail = payment.client?.email || payment.clientEmail || 'N/A';
  const clientMobile = payment.client?.user?.mobile || payment.client?.mobile || 'N/A';
  const clientPan = payment.client?.pan || 'N/A';

  const clientSubs: any[] = payment.client?.subscriptions || [];
  const activeSubForPlan = clientSubs.find((s: any) => {
    const pId = String(s.planId?._id || s.planId?.id || s.planId || '');
    const curId = String(selectedPlanId || payment.planId || '');
    return pId === curId && (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date();
  });

  const expDate = activeSubForPlan ? new Date(activeSubForPlan.endDate) : null;
  const nextDay = expDate ? new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate() + 1) : null;
  const minServiceStartDateStr = nextDay ? nextDay.toISOString().split('T')[0] : (paymentDate || undefined);

  const anyActiveSub = clientSubs.find((s: any) => (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date());
  const activeSubName = activeSubForPlan
    ? `${activeSubForPlan.plan?.name || 'Active Plan'} (Expires: ${expDate?.toLocaleDateString('en-IN')})`
    : anyActiveSub
    ? `${anyActiveSub.plan?.name || 'Active Plan'} (Expires: ${new Date(anyActiveSub.endDate).toLocaleDateString('en-IN')})`
    : null;
  const requestDateFormatted = payment.createdAt
    ? new Date(payment.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    : (l1.submittedAt || 'N/A');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-500/10 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-2xl border border-violet-500/20">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">L2 Payment Verification &amp; Plan Approval</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 font-mono">
                  L2 Verification Stage
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Side-by-Side Review: Verify L1 submission, modify parameters if required, and grant L2 clearance.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Client Top Strip */}
        <div className="px-6 py-3 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Client Name</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{clientName}</span>
            </div>
            <div className="hidden sm:block border-l border-slate-300 dark:border-white/10 h-7" />
            <div className="hidden sm:block">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">Email &amp; Mobile</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">{clientEmail} • {clientMobile}</span>
            </div>
            <div className="hidden md:block border-l border-slate-300 dark:border-white/10 h-7" />
            <div className="hidden md:block">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">PAN</span>
              <span className="text-slate-700 dark:text-slate-300 font-mono font-bold uppercase">{clientPan}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[10px] uppercase block font-semibold">Current Active Plan</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
              {activeSubName || 'No Active Plan'}
            </span>
          </div>
          {feeSummary && (
            <div className="text-right border-l border-slate-300 dark:border-white/10 pl-4 hidden sm:block">
              <span className="text-slate-500 text-[10px] uppercase block font-semibold">SEBI FY Quota ({feeSummary.fyLabel})</span>
              <span className={`font-mono font-bold text-xs ${
                feeSummary.isQuotaFull
                  ? 'text-rose-600 dark:text-rose-400'
                  : feeSummary.totalBasePaid >= 130000
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-violet-600 dark:text-violet-400'
              }`}>
                Paid: ₹{feeSummary.totalBasePaid.toLocaleString('en-IN')} / ₹1,51,000 (Bal: ₹{feeSummary.remainingBaseQuota.toLocaleString('en-IN')})
              </span>
            </div>
          )}
        </div>

        {/* Scrollable Side-by-Side Body */}
        <form onSubmit={handleApprove} className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-6">
          {/* Rejection Alert Box */}
          {isRejectMode && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 text-sm font-black">
                <AlertTriangle className="w-5 h-5" />
                <span>Confirm Rejection of Payment Request</span>
              </div>
              <p className="text-xs text-rose-800 dark:text-slate-300">
                Please enter the exact reason for rejecting this payment request. This will be permanently recorded in the audit trail.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g. UTR mismatch, invalid screenshot proof, incorrect amount..."
                className="w-full bg-white dark:bg-slate-950 border border-rose-400 dark:border-rose-500/40 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-rose-500 font-medium"
              />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRejectMode(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleReject}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1.5 shadow-md shadow-rose-600/30"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ========================================================= */}
            {/* LEFT COLUMN: L1 REQUEST SUBMISSION RECORD (Read-Only)     */}
            {/* ========================================================= */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Clock className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      L1 Request Submission
                    </h4>
                    <span className="text-[10px] text-slate-500">Original Submission Details</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  Read Only
                </span>
              </div>

              {/* Submitter & Request Date Identification */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Submitted By (L1)</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{l1.submittedByName || 'Alpha Admin'}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Request Date &amp; Time</span>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {requestDateFormatted}
                    </span>
                  </div>
                </div>
              </div>

              {/* L1 Category & Plan Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Selected Category</span>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>{l1CategoryDoc?.name || l1.categoryId || 'General Category'}</span>
                    <span className="text-[10px] font-mono text-slate-500">L1 Choice</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Selected Plan</span>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-900 dark:text-white text-xs">{l1.planName}</span>
                      <span className="font-extrabold text-violet-600 dark:text-violet-400 font-mono text-xs">
                        ₹{Number(l1PlanDoc?.price || l1.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                    {l1PlanDoc?.description && (
                      <div className="text-[10px] text-slate-500 line-clamp-2" dangerouslySetInnerHTML={{ __html: l1PlanDoc.description }} />
                    )}
                    <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                      <span>Duration: {l1PlanDoc?.durationMonths || Math.round(l1.validityDays / 30)} month(s)</span>
                      <span>Validity: {l1.validityDays} Days</span>
                    </div>
                  </div>
                </div>

                {/* Coupon Applied */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Coupon Applied</span>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {l1.couponCode ? l1.couponCode : 'No Coupon Applied'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      {l1.discount > 0 ? `-₹${l1.discount} Discount` : '₹0 Discount'}
                    </span>
                  </div>
                </div>

                {/* Payment Proof Screenshot if available */}
                {(payment.receiptUrl || payment.screenshotUrl) && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Payment Proof Screenshot</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 flex items-center gap-3">
                      <a
                        href={payment.receiptUrl || payment.screenshotUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 cursor-pointer group shrink-0 shadow-sm hover:ring-2 hover:ring-primary-500"
                        title="Click to view full screenshot"
                      >
                        <img
                          src={payment.receiptUrl || payment.screenshotUrl}
                          alt="Payment Proof"
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </a>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Attached Payment Proof</span>
                        <a
                          href={payment.receiptUrl || payment.screenshotUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                        >
                          <span>Open Screenshot in Full Tab ↗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* UTR & Payment Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Payment Ref ID / UTR</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 font-mono font-bold text-slate-900 dark:text-white truncate">
                      {l1.transactionRef || payment.transactionRef || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Payment Date</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 font-mono text-slate-800 dark:text-slate-200">
                      {l1.paymentDate}
                    </div>
                  </div>
                </div>

                {/* Service Start Date */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Service Start Date</span>
                  <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-700/40 font-mono font-bold text-blue-900 dark:text-blue-300">
                    {l1.serviceStartDate}
                  </div>
                </div>

                {/* Amount & Validity Days */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Submitted Amount</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 font-mono font-black text-emerald-700 dark:text-emerald-400 text-sm">
                      ₹{Number(l1.amount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">Validity Days</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      {l1.validityDays} Days
                    </div>
                  </div>
                </div>

                {/* L1 Remarks */}
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1">L1 Remarks</span>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-[11px] italic text-slate-700 dark:text-slate-300">
                    &ldquo;{l1.remarks}&rdquo;
                  </div>
                </div>
              </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT COLUMN: L2 APPROVER REVIEW & EDITS (100% Editable)  */}
            {/* ========================================================= */}
            <div className="p-5 rounded-2xl bg-violet-50/40 dark:bg-slate-800/60 border-2 border-violet-400/60 dark:border-violet-500/40 space-y-4">
              <div className="flex items-center justify-between border-b border-violet-200 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400">
                    <ShieldCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      L2 Approver Actions &amp; Edits
                    </h4>
                    <span className="text-[10px] text-violet-700 dark:text-violet-300">Autofilled from L1 • Fully Editable</span>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40">
                  Editable
                </span>
              </div>

              {/* Approver & Action Date Strip */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-violet-200 dark:border-white/10 space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">L2 Approver Identity</span>
                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mt-0.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{approverName}</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">L2 Action Date</span>
                    <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                      {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Editable Form Controls */}
              <div className="space-y-3.5">
                {/* 1. Category Selector */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Select Category <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      setSelectedCategoryId(newCatId);
                      setSelectedPlanId('');
                      setCustomAmount('');
                      setCustomDays('');
                    }}
                    required
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-medium focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                  >
                    <option value="">-- Select a category --</option>
                    {activeCategories.map((c: any) => (
                      <option key={c.id || c._id} value={c.id || c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Plan Selector */}
                {selectedCategoryId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Select Active Plan <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>

                    {filteredPlans.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-center">
                        No active plans in this category.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 max-h-[170px] overflow-y-auto pr-1">
                        {filteredPlans.map((p: any) => {
                          const isSelected = selectedPlanId === String(p.id || p._id);
                          return (
                            <div
                              key={p.id || p._id}
                              onClick={() => {
                                const pId = String(p.id || p._id);
                                setSelectedPlanId(pId);
                                const totalAmt = getPlanAmountWithCoupon(p.price, p.durationMonths, couponCode);
                                setCustomAmount(String(totalAmt));
                                setCustomDays(String(p.durationMonths ? p.durationMonths * 30 : 30));

                                const clickedActiveSub = clientSubs.find((s: any) => {
                                  const sPId = String(s.planId?._id || s.planId?.id || s.planId || '');
                                  return sPId === pId && (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date();
                                });
                                if (clickedActiveSub) {
                                  const exp = new Date(clickedActiveSub.endDate);
                                  const nextD = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() + 1);
                                  setServiceStartDate(nextD.toISOString().split('T')[0]);
                                }
                              }}
                              className={`cursor-pointer p-2.5 rounded-xl border text-left transition relative ${
                                isSelected
                                  ? 'bg-violet-600/15 border-violet-500 shadow-sm'
                                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/5 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                                  {p.description && (
                                    <div
                                      className="text-[10px] text-slate-500 dark:text-slate-400 max-w-[180px] truncate"
                                      dangerouslySetInnerHTML={{ __html: p.description }}
                                    />
                                  )}
                                </div>
                                <div className="text-right flex flex-col items-end text-[10px] min-w-[110px]">
                                  <span className="text-violet-600 dark:text-violet-400 font-extrabold text-xs">
                                    ₹{Number(p.price).toLocaleString('en-IN')}
                                  </span>
                                  <span className="text-[9px] text-slate-500 mt-0.5">
                                    {p.durationMonths}M ({p.durationMonths * 30} days)
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-violet-600 rounded-full p-0.5 text-white">
                                  <CheckCircle className="h-3 w-3" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Coupon Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Apply / Edit Coupon (Optional)
                  </label>
                  <input
                    type="text"
                    list="active-coupons-list"
                    value={couponCode}
                    placeholder="TYPE OR SELECT COUPON CODE"
                    onChange={(e) => {
                      const newCode = e.target.value.toUpperCase();
                      setCouponCode(newCode);

                      if (selectedPlanId) {
                        const p = allPlans.find((x: any) => String(x.id || x._id) === String(selectedPlanId));
                        if (p) {
                          const totalAmt = getPlanAmountWithCoupon(p.price, p.durationMonths, newCode);
                          const totalDays = p.durationMonths * 30;
                          if (customAmount) {
                            let val = parseFloat(customAmount);
                            if (!isNaN(val)) {
                              if (val > totalAmt) val = totalAmt;
                              setCustomAmount(val.toString());
                              if (totalAmt > 0) {
                                setCustomDays(Math.max(1, Math.round(val / (totalAmt / totalDays))).toString());
                              }
                            }
                          } else if (customDays) {
                            let dVal = Number(customDays);
                            if (dVal > totalDays) dVal = totalDays;
                            setCustomDays(dVal.toString());
                            if (totalDays > 0) {
                              setCustomAmount(parseFloat((dVal * (totalAmt / totalDays)).toFixed(2)).toString());
                            }
                          }
                        }
                      }
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white uppercase focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-medium transition"
                  />
                  <datalist id="active-coupons-list">
                    {allCoupons.filter((c: any) => c.status === 'ACTIVE' || !c.status).map((c: any) => (
                      <option key={c.id || c._id} value={c.code}>
                        {c.code} ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`})
                      </option>
                    ))}
                  </datalist>
                </div>

                {/* 4. Payment Ref ID & Payment Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Ref ID *
                    </label>
                    <input
                      type="text"
                      required
                      value={paymentRefId}
                      onChange={(e) => setPaymentRefId(e.target.value)}
                      placeholder="e.g. UTR/Txn Number"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Payment Date *
                    </label>
                    <input
                      type="date"
                      required
                      max={new Date().toISOString().split('T')[0]}
                      value={paymentDate}
                      onChange={(e) => {
                        const pVal = e.target.value;
                        setPaymentDate(pVal);
                        if (serviceStartDate && serviceStartDate < pVal) {
                          setServiceStartDate(pVal);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                </div>

                {/* 5. Service Start Date with strict date validation */}
                <div>
                  <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    Service Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={activeSubForPlan ? minServiceStartDateStr : (paymentDate || undefined)}
                    value={serviceStartDate || (activeSubForPlan ? minServiceStartDateStr : paymentDate)}
                    onChange={(e) => {
                      const sVal = e.target.value;
                      if (activeSubForPlan && minServiceStartDateStr && sVal < minServiceStartDateStr) {
                        toast.error(`Validation Error: Service start date cannot be earlier than ${nextDay?.toLocaleDateString('en-IN')} (Active plan expires on ${expDate?.toLocaleDateString('en-IN')}).`);
                        return;
                      }
                      if (paymentDate && sVal < paymentDate) {
                        toast.error('Validation Error: Service start date cannot be earlier than payment date.');
                        return;
                      }
                      setServiceStartDate(sVal);
                    }}
                    className="w-full bg-white dark:bg-slate-950 border border-indigo-500/40 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-bold font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                  {activeSubForPlan && expDate && nextDay ? (
                    <div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] text-amber-900 dark:text-amber-300 flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div>
                        <strong>Sequential Plan Renewal:</strong> Client already has an active subscription for this plan expiring on <strong>{expDate.toLocaleDateString('en-IN')}</strong>.
                        Service date defaults to <strong>{nextDay.toLocaleDateString('en-IN')}</strong> (day after expiry) and cannot be set earlier. If a later date is chosen, service will only activate on that start date.
                      </div>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Must be greater than or equal to Payment Date
                    </span>
                  )}
                </div>

                {/* 6. Custom Amount & Custom Days with two-way auto calculation */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={customAmount}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val || !selectedPlanId) {
                          setCustomAmount(val);
                          setCustomDays('');
                          return;
                        }
                        const selectedPlan = allPlans.find((p) => String(p.id || p._id) === String(selectedPlanId));
                        if (selectedPlan) {
                          const totalDays = selectedPlan.durationMonths * 30;
                          const basePrice = selectedPlan.price;
                          const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, couponCode);

                          let numericVal = parseFloat(val);
                          if (!isNaN(numericVal)) {
                            if (numericVal > totalAmt) {
                              numericVal = totalAmt;
                              val = numericVal.toString();
                            }
                            setCustomAmount(val);

                            if (totalAmt > 0) {
                              const costPerDay = totalAmt / totalDays;
                              setCustomDays(Math.max(1, Math.round(numericVal / costPerDay)).toString());
                            }
                          } else {
                            setCustomAmount(val);
                          }
                        } else {
                          setCustomAmount(val);
                        }
                      }}
                      placeholder="e.g. 500"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Custom Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customDays}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (!val || !selectedPlanId) {
                          setCustomDays(val);
                          setCustomAmount('');
                          return;
                        }
                        const selectedPlan = allPlans.find((p) => String(p.id || p._id) === String(selectedPlanId));
                        if (selectedPlan) {
                          const totalDays = selectedPlan.durationMonths * 30;
                          const basePrice = selectedPlan.price;
                          const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, couponCode);

                          let numericVal = Number(val);
                          if (numericVal > totalDays) numericVal = totalDays;
                          val = numericVal.toString();
                          setCustomDays(val);

                          if (totalDays > 0) {
                            const costPerDay = totalAmt / totalDays;
                            const calculatedAmt = parseFloat((numericVal * costPerDay).toFixed(2));
                            setCustomAmount(calculatedAmt.toString());
                          }
                        } else {
                          setCustomDays(val);
                        }
                      }}
                      placeholder="e.g. 15"
                      className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-mono font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition"
                    />
                  </div>
                </div>

                {/* 7. Remarks */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    L2 Approver Remarks (Optional)
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={2}
                    placeholder="e.g. Verified with bank statement, approved by compliance head..."
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white resize-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition font-medium"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsRejectMode(!isRejectMode)}
              className="px-4 py-2.5 border-2 border-rose-300 dark:border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>Reject Request</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedPlanId}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black shadow-lg shadow-violet-600/30 flex items-center gap-2 transition transform hover:scale-[1.02]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Processing L2 Approval...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Approve &amp; Activate Plan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
