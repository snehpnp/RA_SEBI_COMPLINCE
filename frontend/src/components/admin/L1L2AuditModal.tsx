'use client';

import React from 'react';
import { 
  X, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  CreditCard 
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

// Format dates safely without creating "Invalid Date"
const formatComparableDate = (d: any) => {
  if (!d || d === 'N/A' || d === 'null' || d === 'undefined') return 'N/A';
  if (typeof d === 'string') {
    const trimmed = d.trim();
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed)) return trimmed;
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-IN');
    return trimmed;
  }
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleDateString('en-IN');
    return String(d);
  } catch {
    return String(d);
  }
};

const formatDateTime = (d: any) => {
  if (!d || d === 'N/A' || d === 'null' || d === 'undefined') return 'N/A';
  if (typeof d === 'string' && /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(d)) return d;
  try {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toLocaleString('en-IN');
    return String(d);
  } catch {
    return String(d);
  }
};

interface L1L2AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: any;
}

export default function L1L2AuditModal({
  isOpen,
  onClose,
  payment
}: L1L2AuditModalProps) {
  if (!isOpen || !payment) return null;

  const clientName = payment.client?.name || payment.client?.user?.name || payment.clientName || 'Client';
  const clientEmail = payment.client?.user?.email || payment.client?.email || payment.clientEmail || 'N/A';
  const clientMobile = payment.client?.user?.mobile || payment.client?.mobile || 'N/A';
  const clientPan = payment.client?.pan || payment.client?.user?.pan || payment.client?.profile?.panNumber || 'N/A';

  // L1 details with graceful fallback for legacy records
  const l1 = {
    submittedByName: (payment.l1Details?.submittedByName && !payment.l1Details.submittedByName.includes('@'))
      ? payment.l1Details.submittedByName
      : (payment.assignedByStaffName || payment.assignedByAdminName || payment.verifiedByStaffName || payment.l1Details?.submittedByName || 'Alpha Admin'),
    submittedAt: formatDateTime(payment.l1Details?.submittedAt || payment.createdAt),
    planName: payment.l1Details?.planName || payment.plan?.name || payment.planName || 'Assigned Plan',
    amount: payment.l1Details?.amount ?? payment.amount,
    validityDays: payment.l1Details?.validityDays ?? (payment.planValidityDays || 30),
    discount: payment.l1Details?.discount ?? (payment.discountApplied || payment.discount || 0),
    couponCode: payment.l1Details?.couponCode || payment.couponCode || '',
    paymentDate: formatComparableDate(payment.l1Details?.paymentDate || payment.paymentDate),
    serviceStartDate: formatComparableDate(payment.l1Details?.serviceStartDate || payment.serviceStartDate),
    remarks: payment.l1Details?.remarks || payment.remarks || 'Verified by Compliance Staff',
    receiptUrl: payment.receiptUrl || payment.screenshotUrl || null
  };

  // L2 details with graceful fallback
  const l2 = {
    reviewedByName: (payment.l2Details?.reviewedByName && !payment.l2Details.reviewedByName.includes('@'))
      ? payment.l2Details.reviewedByName
      : (payment.approvedByName || payment.l2Details?.reviewedByName || (payment.approvalStatus === 'APPROVED' ? 'Admin / Approver' : (payment.approvalStatus === 'REJECTED' ? 'L2 Authority' : 'Pending Review'))),
    reviewedAt: formatDateTime(payment.l2Details?.reviewedAt || payment.updatedAt),
    action: payment.l2Details?.action || payment.approvalStatus || 'L2_PENDING',
    finalPlanName: payment.l2Details?.finalPlanName || payment.plan?.name || payment.planName || l1.planName,
    finalAmount: payment.l2Details?.finalAmount ?? (payment.amount ?? l1.amount),
    finalValidityDays: payment.l2Details?.finalValidityDays ?? (payment.planValidityDays ?? l1.validityDays),
    finalDiscount: payment.l2Details?.finalDiscount ?? (payment.discountApplied ?? l1.discount),
    finalPaymentDate: formatComparableDate(payment.l2Details?.finalPaymentDate || payment.paymentDate || l1.paymentDate),
    finalServiceStartDate: formatComparableDate(payment.l2Details?.finalServiceStartDate || payment.serviceStartDate || l1.serviceStartDate),
    remarks: payment.l2Details?.remarks || payment.l2Remarks || payment.adminRemarks || (payment.approvalStatus === 'APPROVED' ? 'Approved by L2 Reviewer' : 'Awaiting clearance'),
    rejectionReason: payment.l2Details?.rejectionReason || payment.rejectionReason || payment.l2Remarks || payment.adminRemarks || payment.remarks || 'Payment authorization was rejected by reviewer'
  };

  const isL2Pending = payment.approvalStatus === 'L2_PENDING';
  const isL2Approved = payment.approvalStatus === 'APPROVED';
  const isL2Rejected = payment.approvalStatus === 'REJECTED';
  const isDirectApproved = payment.approvalStatus === 'DIRECT_APPROVED';



  const l1ServiceDate = formatComparableDate(l1.serviceStartDate);
  const l2ServiceDate = formatComparableDate(l2.finalServiceStartDate || payment.serviceStartDate);

  // Detect differences
  const isPlanModified = l2.finalPlanName && l1.planName && String(l2.finalPlanName).trim() !== String(l1.planName).trim();
  const isAmountModified = l2.finalAmount !== undefined && l1.amount !== undefined && Number(l2.finalAmount) !== Number(l1.amount);
  const isValidityModified = l2.finalValidityDays !== undefined && l1.validityDays !== undefined && Number(l2.finalValidityDays) !== Number(l1.validityDays);
  const isServiceDateModified = l1ServiceDate !== 'N/A' && l2ServiceDate !== 'N/A' && l1ServiceDate !== l2ServiceDate;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-300 dark:border-white/10 relative my-8">
        
        {/* Top colored accent bar */}
        <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-3xl ${
          isL2Approved 
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500' 
            : isL2Rejected 
            ? 'bg-gradient-to-r from-rose-500 to-red-600' 
            : 'bg-gradient-to-r from-amber-500 to-orange-500'
        }`} />

        {/* Header */}
        <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                isL2Approved
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20'
                  : isL2Rejected
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-500/20'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-500/20'
              }`}>
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <span>
                    {isL2Rejected
                      ? 'L1 Submission vs L2 Rejection Audit'
                      : isL2Approved
                      ? 'L1 vs L2 Approval & Verification Audit'
                      : 'L1 Submission Audit (Awaiting L2)'}
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                  {isL2Rejected
                    ? 'Complete audit of initial Level 1 staff submission details and Level 2 rejection reasons.'
                    : 'Side-by-side audit of Level 1 staff submission versus Level 2 approver modifications.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
              isL2Approved
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700'
                : isL2Rejected
                ? 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700 font-black'
                : 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700'
            }`}>
              {isL2Approved ? '✓ L2 APPROVED' : isL2Rejected ? '✗ L2 REJECTED' : isDirectApproved ? '✓ DIRECT APPROVED' : '⏳ AWAITING L2'}
            </span>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* L2 Rejection Alert Banner */}
        {isL2Rejected && (
          <div className="p-4 my-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-300 dark:border-rose-800 flex items-start gap-3 shadow-sm">
            <div className="p-2 rounded-xl bg-rose-200/80 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 shrink-0 mt-0.5">
              <XCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-black text-sm text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                  L2 Payment Rejection Clearance Record
                </span>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 font-bold border border-rose-300 dark:border-rose-700">
                  Rejected At: {l2.reviewedAt}
                </span>
              </div>
              <p className="text-xs text-rose-950 dark:text-rose-200 font-semibold bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-rose-200 dark:border-rose-900/40 mt-1">
                <strong className="text-rose-700 dark:text-rose-400">Rejection Reason:</strong> &quot;{l2.rejectionReason}&quot;
              </p>
              <div className="text-[11px] text-rose-800 dark:text-rose-300/90 flex items-center justify-between flex-wrap gap-2 pt-1 font-medium">
                <span>Declined by Approver: <strong className="font-bold underline">{l2.reviewedByName}</strong></span>
                <span>Initially Forwarded by L1 Maker: <strong className="font-bold underline">{l1.submittedByName}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Client & Transaction Overview Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Client</span>
            <div className="font-bold text-slate-900 dark:text-white truncate">{clientName}</div>
            <div className="text-[10px] text-slate-500 font-mono truncate">{clientEmail}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Mobile &amp; PAN</span>
            <div className="font-bold text-slate-900 dark:text-white font-mono">{clientMobile}</div>
            <div className="text-[10px] text-slate-500 font-mono">PAN: {clientPan}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Txn / UTR Ref</span>
            <div className="font-bold font-mono text-slate-900 dark:text-white truncate">
              {payment.transactionRef || payment.paymentRefId || 'N/A'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono uppercase">{payment.paymentMode || 'MANUAL_UPI'}</div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Agreement Status</span>
            <div>
              {payment.invoiceStatus === 'PENDING_AGREEMENT' ? (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                  ⏳ Agreement Pending
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
                  ✓ Agreement Signed / Active
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          
          {/* LEVEL 1: Submission Column */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800/40 space-y-3.5">
            <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-800/40 pb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-blue-600 text-white font-mono font-black text-[11px]">
                  LEVEL 1
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Initial Submission
                </span>
              </div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-mono font-medium">
                Maker Details
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Submitted By:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {l1.submittedByName || 'Staff / Maker'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Submission Time:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {l1.submittedAt || (payment.createdAt ? new Date(payment.createdAt).toLocaleString('en-IN') : 'N/A')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Plan Assigned:</span>
                <span className="font-bold text-blue-700 dark:text-blue-300 font-mono">
                  {l1.planName || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Plan Amount:</span>
                <span className="font-black text-slate-900 dark:text-white font-mono text-sm">
                  ₹{Number(l1.amount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Validity Period:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                  {l1.validityDays} Days
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Payment Date:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatComparableDate(l1.paymentDate)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Service Start Date:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {l1ServiceDate}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-blue-100 dark:border-blue-900/30">
                <span className="text-slate-500 dark:text-slate-400">Coupon / Discount:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {l1.couponCode ? `${l1.couponCode} (₹${l1.discount || 0} off)` : (l1.discount ? `₹${l1.discount} off` : 'None')}
                </span>
              </div>

              <div className="pt-1">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Maker / Staff Remarks:</span>
                <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-slate-700 dark:text-slate-300 text-xs italic">
                  "{l1.remarks || 'No remarks entered'}"
                </div>
              </div>

              {l1.receiptUrl && (
                <div className="pt-1 flex items-center justify-between p-2.5 rounded-xl bg-blue-100/60 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/40">
                  <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200">
                    Payment Screenshot Proof:
                  </span>
                  <a
                    href={l1.receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-sm transition"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View Proof Image</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* LEVEL 2: Review & Approval Column */}
          <div className={`p-4 rounded-2xl border-2 space-y-3.5 ${
            isL2Approved
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40'
              : isL2Rejected
              ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/40'
              : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/40'
          }`}>
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-white font-mono font-black text-[11px] ${
                  isL2Approved ? 'bg-emerald-600' : isL2Rejected ? 'bg-rose-600' : 'bg-amber-600'
                }`}>
                  LEVEL 2
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  Review &amp; Clearance
                </span>
              </div>
              <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-400">
                Checker Details
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Reviewed By:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">
                  {l2.reviewedByName || (isL2Pending ? '⏳ Awaiting L2 Approver' : 'Approver')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Review Time:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {isL2Pending ? 'Pending' : (l2.reviewedAt || 'N/A')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Final Plan:</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {l2.finalPlanName || l1.planName}
                  </span>
                  {isPlanModified && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-300">
                      ✏️ Modified by L2
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Final Amount:</span>
                <div className="text-right">
                  <span className="font-black text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                    ₹{Number(l2.finalAmount ?? l1.amount ?? 0).toLocaleString('en-IN')}
                  </span>
                  {isAmountModified && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                      ✏️ Changed from ₹{l1.amount}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Final Validity:</span>
                <div className="text-right">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {l2.finalValidityDays ?? l1.validityDays} Days
                  </span>
                  {isValidityModified && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                      ✏️ Changed from {l1.validityDays}d
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Payment Date:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {formatComparableDate(l2.finalPaymentDate || payment.paymentDate)}
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Final Service Start Date:</span>
                <div className="text-right">
                  <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
                    {l2ServiceDate}
                  </span>
                  {isServiceDateModified && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-300">
                      ✏️ Modified by L2
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/10">
                <span className="text-slate-500 dark:text-slate-400">Final Discount:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {l2.finalDiscount ? `₹${l2.finalDiscount} off` : 'None'}
                </span>
              </div>

              {/* L2 Remarks or Rejection Reason */}
              <div className="pt-1">
                {isL2Rejected ? (
                  <div>
                    <span className="text-rose-600 dark:text-rose-400 font-bold block text-[11px] mb-1 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Rejection Reason:
                    </span>
                    <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 text-xs font-semibold">
                      "{l2.rejectionReason || l2.remarks || 'Payment authorization was rejected by reviewer'}"
                    </div>
                  </div>
                ) : (
                  <div>
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Approver Remarks:</span>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-xs italic">
                      "{l2.remarks || 'No additional remarks entered by L2 approver'}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Highlight Summary Notice */}
        {(isPlanModified || isAmountModified || isValidityModified || isServiceDateModified) && (
          <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/50 flex items-start gap-2 text-xs text-amber-900 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div>
              <span className="font-bold">L2 Approver Modifications Detected:</span> The L2 checker altered parameters from the initial L1 submission before granting clearance (highlighted with ✏️ tags above).
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 flex-wrap">
            {isL2Approved && (
              <button
                type="button"
                onClick={() => {
                  const pId = payment.id || payment._id;
                  api.downloadInvoicePdf(pId, `Invoice_${payment.transactionRef || pId}.pdf`)
                    .catch((err: any) => toast.error(err?.message || 'Failed to download invoice'));
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Download Official Invoice PDF</span>
              </button>
            )}

            {payment.receiptUrl && (
              <button
                type="button"
                onClick={() => {
                  window.open(payment.receiptUrl, '_blank');
                }}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-blue-200"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View Payment Proof</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
