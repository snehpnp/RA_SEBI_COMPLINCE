'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Calendar, CreditCard, ShieldCheck, Clock, ArrowRight, Loader2, X, Edit3 } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface L2PaymentReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
  plans?: any[];
  onSuccess?: () => void;
  onApproved?: () => void;
}

export default function L2PaymentReviewModal({
  isOpen,
  onClose,
  payment,
  plans = [],
  onSuccess,
  onApproved
}: L2PaymentReviewModalProps) {
  const [internalPlans, setInternalPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [finalAmount, setFinalAmount] = useState<string>('');
  const [finalDays, setFinalDays] = useState<string>('');
  const [finalDiscount, setFinalDiscount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState('');
  const [serviceStartDate, setServiceStartDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectMode, setIsRejectMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Self-heal: Fetch plans if not provided or empty
  useEffect(() => {
    if (isOpen && (!plans || plans.length === 0)) {
      api.getAdminPlans()
        .then((res: any) => {
          if (res?.success && Array.isArray(res.data)) {
            setInternalPlans(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, plans]);

  const safePlans = (Array.isArray(plans) && plans.length > 0) ? plans : internalPlans;

  useEffect(() => {
    if (payment) {
      const pDoc = payment.planId ? safePlans.find((p: any) => String(p.id || p._id) === String(payment.planId)) : null;
      setSelectedPlanId(payment.planId ? String(payment.planId) : (safePlans[0]?.id || safePlans[0]?._id || ''));
      setFinalAmount(String(payment.amount || pDoc?.price || '0'));
      setFinalDays(String(payment.planValidityDays || (pDoc?.durationMonths ? pDoc.durationMonths * 30 : 30)));
      setFinalDiscount(String(payment.discountApplied || payment.discount || '0'));

      const pDateStr = payment.paymentDate
        ? new Date(payment.paymentDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setPaymentDate(pDateStr);

      const sDateStr = payment.serviceStartDate
        ? new Date(payment.serviceStartDate).toISOString().split('T')[0]
        : pDateStr;
      setServiceStartDate(sDateStr);

      setRemarks(payment.remarks || '');
      setIsRejectMode(false);
      setRejectionReason('');
    }
  }, [payment, safePlans]);

  if (!isOpen || !payment) return null;

  const notifySuccess = () => {
    if (onSuccess) onSuccess();
    if (onApproved) onApproved();
  };

  // L1 details fallback
  const l1 = payment.l1Details || {
    submittedByName: payment.assignedByAdminName || payment.assignedByStaffName || 'L1 Staff',
    planName: payment.plan?.name || safePlans.find((p) => String(p.id || p._id) === String(payment.planId))?.name || 'N/A',
    amount: payment.amount,
    validityDays: payment.planValidityDays || 30,
    discount: payment.discountApplied || 0,
    paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString('en-IN') : 'N/A',
    serviceStartDate: payment.serviceStartDate ? new Date(payment.serviceStartDate).toLocaleDateString('en-IN') : 'N/A',
    remarks: payment.remarks || 'No remarks provided',
    submittedAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN') : 'N/A'
  };

  const handleApprove = async () => {
    // Validate serviceStartDate >= paymentDate
    if (serviceStartDate && paymentDate && serviceStartDate < paymentDate) {
      toast.error('Validation Error: Service start date cannot be earlier than payment date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post(`/admin/payments/${payment.id || payment._id}/l2-action`, {
        action: 'APPROVED',
        planId: selectedPlanId,
        amount: Number(finalAmount),
        validityDays: Number(finalDays),
        discount: Number(finalDiscount),
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-6 border-b border-white/10 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white">L2 Payment Verification &amp; Plan Activation</h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded bg-amber-400 text-slate-950 border border-amber-300 font-mono">
                  L2 Approval Stage
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Client: <strong className="text-white">{payment.client?.name || 'Client'}</strong> (PAN: {payment.client?.pan || 'N/A'}) • Txn: {payment.transactionRef}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body: Side-by-Side L1 vs L2 */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* Rejection Alert if reject mode active */}
          {isRejectMode ? (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-400 text-sm font-black">
                <AlertTriangle className="w-5 h-5" />
                <span>Confirm Rejection of Payment Request</span>
              </div>
              <p className="text-xs text-slate-300">
                Please state the clear reason for rejecting this payment request. This will be recorded in the audit trail.
              </p>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Enter rejection reason (e.g. UTR mismatch, fake screenshot, incorrect amount)..."
                className="w-full bg-slate-950 border border-rose-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-400 placeholder:text-slate-600"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRejectMode(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleReject}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirm Rejection</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* LEFT COLUMN: L1 Staff Submission (Audit Trail) */}
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-700/60 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" /> L1 Submission Record
                </span>
                <span className="text-[10px] font-mono text-slate-400">{l1.submittedAt}</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Submitted By</span>
                  <span className="text-white font-bold text-sm">{l1.submittedByName || 'Staff Member'}</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Requested Plan</span>
                    <span className="text-indigo-300 font-bold">{l1.planName || 'Plan'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Amount</span>
                    <span className="text-emerald-400 font-mono font-black text-sm">₹{Number(l1.amount).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Validity Days</span>
                    <span className="text-white font-bold">{l1.validityDays} Days</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Discount Applied</span>
                    <span className="text-slate-200 font-mono font-bold">₹{l1.discount || 0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Payment Date</span>
                    <span className="text-white font-mono font-bold">{l1.paymentDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Service Start Date</span>
                    <span className="text-amber-300 font-mono font-bold">{l1.serviceStartDate}</span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">L1 Remarks</span>
                  <p className="text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-white/10 text-xs italic">
                    &ldquo;{l1.remarks}&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: L2 Approval & Modification Controls */}
            <div className="p-5 rounded-2xl bg-indigo-950/40 border-2 border-indigo-500/50 space-y-4">
              <div className="flex items-center justify-between border-b border-indigo-500/30 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" /> L2 Authority Review &amp; Edits
                </span>
                <span className="text-[10px] text-emerald-300 font-black uppercase bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded">
                  Editable
                </span>
              </div>

              <div className="space-y-3.5">
                {/* Plan Dropdown */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">Service Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedPlanId(newId);
                      const p = safePlans.find((x) => String(x.id || x._id) === newId);
                      if (p) {
                        setFinalAmount(String(p.price));
                        setFinalDays(String(p.durationMonths ? p.durationMonths * 30 : 30));
                      }
                    }}
                    className="w-full bg-slate-950 border border-white/30 rounded-xl py-2 px-3 text-xs text-white font-semibold focus:outline-none focus:border-indigo-400"
                  >
                    {(safePlans || []).map((p) => (
                      <option key={p.id || p._id} value={p.id || p._id}>
                        {p.name} (₹{p.price}) • {p.durationMonths}M
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount & Validity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">Final Amount (₹)</label>
                    <input
                      type="number"
                      value={finalAmount}
                      onChange={(e) => setFinalAmount(e.target.value)}
                      className="w-full bg-slate-950 border border-white/30 rounded-xl py-2 px-3 text-xs text-emerald-300 font-mono font-bold focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">Service Days</label>
                    <input
                      type="number"
                      value={finalDays}
                      onChange={(e) => setFinalDays(e.target.value)}
                      className="w-full bg-slate-950 border border-white/30 rounded-xl py-2 px-3 text-xs text-white font-mono font-semibold focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                {/* Discount */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">Discount (₹)</label>
                  <input
                    type="number"
                    value={finalDiscount}
                    onChange={(e) => setFinalDiscount(e.target.value)}
                    className="w-full bg-slate-950 border border-white/30 rounded-xl py-2 px-3 text-xs text-white font-mono font-semibold focus:outline-none focus:border-indigo-400"
                  />
                </div>

                {/* Dates with validation: Service Date >= Payment Date */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/90 border border-indigo-500/40">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-200 mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => {
                        const newPDate = e.target.value;
                        setPaymentDate(newPDate);
                        if (serviceStartDate && serviceStartDate < newPDate) {
                          setServiceStartDate(newPDate);
                        }
                      }}
                      className="w-full bg-slate-900 border border-white/20 rounded-xl py-1.5 px-2.5 text-xs text-white font-mono font-semibold focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-300 mb-1">Service Start Date *</label>
                    <input
                      type="date"
                      min={paymentDate || undefined}
                      value={serviceStartDate}
                      onChange={(e) => {
                        const newSDate = e.target.value;
                        if (paymentDate && newSDate < paymentDate) {
                          toast.error('Service start date cannot be earlier than payment date');
                          return;
                        }
                        setServiceStartDate(newSDate);
                      }}
                      className="w-full bg-slate-900 border border-amber-400/50 rounded-xl py-1.5 px-2.5 text-xs text-amber-200 font-mono font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">L2 Approver Remarks</label>
                  <input
                    type="text"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="e.g. Verified with bank statement, approved by compliance head"
                    className="w-full bg-slate-950 border border-white/30 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-400 placeholder:text-slate-500 font-medium"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setIsRejectMode(!isRejectMode)}
            className="px-4 py-2.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-black transition-colors"
          >
            <XCircle className="w-4 h-4 inline mr-1.5" /> Reject Request
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleApprove}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition-all transform hover:scale-[1.02]"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>Approve &amp; Activate Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
