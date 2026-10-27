import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAdmin } from '../AdminContext';
import {
  ShieldAlert, Save, Upload, Tag, Sun, Moon, FileText, FileCheck, Database,
  Download, Edit3, Trash2, Shield, Eye, TrendingUp, Clock, Plus, Filter, Users,
  X, Check, Search, DownloadCloud, Menu, UploadCloud, File, AlertTriangle,
  AlertCircle, RotateCcw, Building, Lock, Landmark, User, ClipboardList,
  CheckCircle, CheckCircle2, RefreshCw, LogOut, ShieldCheck, CheckSquare, Layers,
  Loader2, ArrowRight, ArrowRightLeft, Edit2, RotateCcw as RotateCcwIcon, Settings,
  Activity, LifeBuoy, CreditCard, ExternalLink, Smartphone, ChevronRight, ChevronLeft,
  EyeOff, LayoutGrid, Table as TableIcon, Copy, Briefcase, QrCode, Zap, FolderArchive,
  Folder, HelpCircle, Mail, Bell, Target, Calendar as CalendarIcon, MapPin, Phone,
  Video, Send, RefreshCcw, XCircle, Monitor, Usb, Info
} from 'lucide-react';
import DataTable from 'react-data-table-component';
import api from '@/services/api';
import { formatPan, formatAadhaar } from '@/utils/formatters';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { PaginatedList } from '@/components/ui/PaginatedList';
import ConfirmDialog from '@/components/ConfirmDialog';
import MobilePreview from '@/components/MobilePreview';
import { toast } from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip } from 'recharts';



export default function PaymentsTab(props) {
  const admin = useAdmin();
  const {
    user,
    setUser,
    isStaff,
    hasPermission,
    tenantDetails,
    setTenantDetails,
    dashboardStats,
    setDashboardStats,
    refreshDashboard,
    staff,
    setStaff,
    allStaff,
    editingStaff,
    setEditingStaff,
    clients,
    setClients,
    allClients,
    selectedClient,
    setSelectedClient,
    adminPlans,
    setAdminPlans,
    allPayments,
    setAllPayments,
    checklist,
    setChecklist,
    activityLogs,
    setActivityLogs,
    alerts,
    setAlerts,
    closingAlertId,
    setClosingAlertId,
    handleCloseAlert,
    activeTab,
    setActiveTab,
    adminPagesList,
    setAdminPagesList,
    roles,
    setRoles,
    confirmState,
    setConfirmState,
    showConfirm,
    pdfPreviewModal,
    setPdfPreviewModal,
    showCalendarModal,
    setShowCalendarModal,
    showReportModal,
    setShowReportModal,
    isSetupPrereqModalOpen,
    setIsSetupPrereqModalOpen,
    getPrerequisitesStatus,
    openTimelineModal,
    pendingQrCount,
    setPaymentSubTab,
    paymentSubTab,
    paymentColumns,
    tableCustomStyles,
    isDarkMode,
    setSelectedL2Payment,
    qrVerificationColumns,
    selectedScreenshotModal,
    setSelectedScreenshotModal,
    getFullUrl,
    selectedVerifyPayment,
    verifyReceivedAmount,
    setSelectedVerifyPayment,
    verifyUtr,
    setVerifyReceivedAmount,
    setVerifyCustomDays,
    setVerifyCustomDiscount,
    verifyApprovalMode,
    setVerifyApprovalMode,
    setVerifyUtr,
    verifyCustomDays,
    verifyCustomDiscount,
    verifyRemarks,
    setVerifyRemarks,
    isSubmittingVerify,
    handleSubmitVerificationModal
  } = admin || {};

  {
    activeTab === 'payments' && (() => {
        const qrVerificationsList = allPayments.filter((p) => p.paymentMode === 'UPI_QR' || p.screenshotUrl || p.paymentMode === 'MANUAL_UPI' || p.receiptUrl);
        const pendingQrCountLocal = pendingQrCount;
        return (<div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-300 dark:border-white/5 pb-4">
                          <div>
                            <h2 className="text-2xl font-bold tracking-tight">Payment Desk &amp; Verifications</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
                              Track payment transactions, gateway receipts, and verify QR/UPI screenshot payment proofs.
                            </p>
                          </div>
                          {(!isStaff || hasPermission('EXPORT_DATA')) && (<button onClick={() => {
                    const exportData = allPayments.map(p => ({
                        Payment_ID: p.id,
                        Client: p.client?.name || 'Unknown',
                        Date: new Date(p.createdAt).toLocaleDateString(),
                        Amount: p.amount,
                        Plan: p.plan?.name || 'Unknown',
                        Transaction_Ref: p.transactionRef,
                        Mode: p.paymentMode,
                        Status: p.status || 'SUCCESS'
                    }));
                    import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, 'Admin_Payments'));
                }} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition shadow-sm">
                              <Download className="w-3.5 h-3.5"/>
                              Export CSV
                            </button>)}
                        </div>

                        {/* Sub-tab Switcher */}
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <button type="button" onClick={() => setPaymentSubTab('all')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentSubTab === 'all'
                ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <CreditCard className="w-4 h-4"/>
                            <span>All Transactions</span>
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 dark:bg-white/10 font-mono">
                              {allPayments.length}
                            </span>
                          </button>

                          <button type="button" onClick={() => setPaymentSubTab('l2_pending')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentSubTab === 'l2_pending'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <ShieldCheck className="w-4 h-4 text-amber-300"/>
                            <span>L2 Approvals Queue</span>
                            {allPayments.filter((p) => p.approvalStatus === 'L2_PENDING').length > 0 && (<span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                                {allPayments.filter((p) => p.approvalStatus === 'L2_PENDING').length} PENDING
                              </span>)}
                          </button>

                          {(hasPermission('ACCESS_PAYMENT_QR_VERIFICATION') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<button type="button" onClick={() => setPaymentSubTab('qr_verifications')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${paymentSubTab === 'qr_verifications'
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                              <QrCode className="w-4 h-4"/>
                              <span>QR &amp; Screenshot Verifications</span>
                              {pendingQrCount > 0 ? (<span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black animate-pulse">
                                  {pendingQrCount} PENDING
                                </span>) : (<span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 dark:bg-white/10 font-mono">
                                  {qrVerificationsList.length}
                                </span>)}
                            </button>)}
                        </div>

                        {/* View: All Transactions */}
                        {paymentSubTab === 'all' && (<div className="glassmorphism p-1 rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden">
                            <div className="overflow-x-auto">
                              <DataTable columns={paymentColumns} data={allPayments} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-8 text-center text-slate-500 font-medium">No payment history available.</div>}/>
                            </div>
                          </div>)}

                        {/* View: L2 Pending Approvals Queue */}
                        {paymentSubTab === 'l2_pending' && (<div className="space-y-4">
                            <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-xs text-amber-200">
                              <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0"/>
                                <span>
                                  <strong>L2 Verification Queue:</strong> All payments submitted by staff or assigned directly await second-level authorization. Click <strong>Review &amp; Approve</strong> to modify plan, dates, discount, or reject.
                                </span>
                              </div>
                            </div>

                            <div className="glassmorphism p-1 rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden">
                              <div className="overflow-x-auto">
                                <DataTable columns={[
                    ...paymentColumns,
                    {
                        name: 'L2 Action',
                        width: '140px',
                        cell: (row) => (<button onClick={() => setSelectedL2Payment(row)} className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 transition-all">
                                          <Edit3 className="w-3.5 h-3.5"/>
                                          <span>L2 Review</span>
                                        </button>)
                    }
                ]} data={allPayments.filter((p) => p.approvalStatus === 'L2_PENDING')} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-8 text-center text-slate-500 font-medium">No pending L2 approval requests. All payments are verified.</div>}/>
                              </div>
                            </div>
                          </div>)}

                        {/* View: QR & Screenshot Verifications */}
                        {paymentSubTab === 'qr_verifications' && (hasPermission('ACCESS_PAYMENT_QR_VERIFICATION') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<div className="space-y-4">
                            <div className="flex items-center justify-between bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-500/20 p-4 rounded-2xl text-xs">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
                                  <QrCode className="w-5 h-5"/>
                                </div>
                                <div>
                                  <h4 className="font-bold text-primary-900 dark:text-primary-200">Pay with QR / UPI Screenshot Queue</h4>
                                  <p className="text-primary-700/80 dark:text-primary-300/80 mt-0.5">
                                    Clients who paid via QR/UPI upload their payment screenshot and 12-digit UTR here. Click &quot;Verify &amp; Assign&quot; to activate their subscription immediately.
                                  </p>
                                </div>
                              </div>
                              {pendingQrCount > 0 && (<span className="px-3 py-1 rounded-xl bg-amber-500 text-black font-extrabold text-xs shrink-0 shadow-sm animate-pulse">
                                  {pendingQrCount} Pending Action
                                </span>)}
                            </div>

                            <div className="glassmorphism p-1 rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden">
                              <div className="overflow-x-auto">
                                <DataTable columns={qrVerificationColumns} data={qrVerificationsList} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-12 text-center text-slate-500 font-medium space-y-2">
                                      <QrCode className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2"/>
                                      <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No QR/UPI Screenshot submissions yet</p>
                                      <p className="text-xs text-slate-400">When clients upload payment screenshots, they will appear here for verification.</p>
                                    </div>}/>
                              </div>
                            </div>
                          </div>)}

                        {/* High-Resolution Screenshot Zoom Modal */}
                        {selectedScreenshotModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div>
                                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <QrCode className="w-4 h-4 text-primary-600"/>
                                    Payment Screenshot Proof
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Client: <span className="font-bold text-slate-800 dark:text-slate-200">{selectedScreenshotModal.clientName}</span> | Plan: <span className="font-bold text-primary-600">{selectedScreenshotModal.planName}</span> | Amount: <span className="font-bold text-emerald-600">₹{selectedScreenshotModal.amount}</span>
                                  </p>
                                  {selectedScreenshotModal.utr && (<p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      UTR / Ref: <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-500/20">{selectedScreenshotModal.utr}</span>
                                    </p>)}
                                </div>
                                <button type="button" onClick={() => setSelectedScreenshotModal(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                  <X className="w-5 h-5"/>
                                </button>
                              </div>

                              <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-950 rounded-2xl p-3 border border-slate-800">
                                <img src={getFullUrl(selectedScreenshotModal.url)} alt="Payment Proof Full" className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-lg"/>
                              </div>

                              <div className="flex justify-between items-center pt-2">
                                <a href={getFullUrl(selectedScreenshotModal.url)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 hover:underline">
                                  <ExternalLink className="w-3.5 h-3.5"/>
                                  Open Original in New Tab
                                </a>
                                <button type="button" onClick={() => setSelectedScreenshotModal(null)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition">
                                  Close Viewer
                                </button>
                              </div>
                            </div>
                          </div>)}

                        {/* Smart Payment Verification & Assignment Modal */}
                        {selectedVerifyPayment && (() => {
                const planAmount = Number(selectedVerifyPayment.plan?.amount || selectedVerifyPayment.plan?.price || selectedVerifyPayment.amount || 0);
                const planDays = (selectedVerifyPayment.plan?.durationMonths ? selectedVerifyPayment.plan.durationMonths * 30 : 30);
                const difference = Math.max(0, planAmount - verifyReceivedAmount);
                const isShortPayment = verifyReceivedAmount > 0 && verifyReceivedAmount < planAmount;
                const isFullMatch = verifyReceivedAmount === planAmount && planAmount > 0;
                const isOverAmount = verifyReceivedAmount > planAmount && planAmount > 0;
                const clientName = selectedVerifyPayment.client?.name || selectedVerifyPayment.client?.user?.name || selectedVerifyPayment.clientName || 'Client';
                const planName = selectedVerifyPayment.plan?.name || selectedVerifyPayment.planName || 'Plan';
                const proofUrl = selectedVerifyPayment.screenshotUrl || selectedVerifyPayment.receiptUrl;
                return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                                
                                {/* Header */}
                                <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                  <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                      <CheckCircle2 className="w-5 h-5 text-emerald-600"/>
                                      Verify &amp; Approve Payment
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      Client: <span className="font-bold text-slate-800 dark:text-slate-200">{clientName}</span> | Plan: <span className="font-bold text-primary-600">{planName}</span>
                                    </p>
                                  </div>
                                  <button type="button" onClick={() => setSelectedVerifyPayment(null)} className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <X className="w-5 h-5"/>
                                  </button>
                                </div>

                                {/* Plan Expected vs Proof Overview */}
                                <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-xs">
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plan Standard Price</span>
                                    <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                                      ₹{planAmount.toLocaleString('en-IN')}
                                    </span>
                                    <span className="text-[11px] text-slate-500">Duration: {planDays} Days ({selectedVerifyPayment.plan?.durationMonths || 1} Month)</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Proof Screenshot</span>
                                    {proofUrl ? (<button type="button" onClick={() => setSelectedScreenshotModal({ url: proofUrl, clientName, planName, utr: verifyUtr, amount: verifyReceivedAmount })} className="mt-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5"/> View Screenshot
                                      </button>) : (<span className="text-slate-400 italic text-xs mt-1 block">No image uploaded</span>)}
                                  </div>
                                </div>

                                {/* Actual Received Amount & UTR Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Actual Amount Received in Bank (₹) *
                                      </label>
                                      <span className="text-[10px] font-bold text-slate-400">
                                        Max: ₹{planAmount.toLocaleString('en-IN')}
                                      </span>
                                    </div>
                                    <input type="number" step="any" min={0.01} max={planAmount} value={verifyReceivedAmount || ''} onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === '') {
                            setVerifyReceivedAmount(0);
                            return;
                        }
                        let val = parseFloat(raw);
                        if (isNaN(val))
                            val = 0;
                        if (planAmount > 0 && val > planAmount) {
                            val = planAmount;
                        }
                        setVerifyReceivedAmount(val);
                        const diff = Math.max(0, parseFloat((planAmount - val).toFixed(2)));
                        if (diff > 0) {
                            const prorated = Math.max(1, Math.round((val / planAmount) * planDays));
                            setVerifyCustomDays(prorated);
                            setVerifyCustomDiscount(diff);
                            if (verifyApprovalMode === 'FULL') {
                                setVerifyApprovalMode('PRORATED');
                            }
                        }
                        else {
                            setVerifyApprovalMode('FULL');
                            setVerifyCustomDays(planDays);
                            setVerifyCustomDiscount(0);
                        }
                    }} className={`w-full bg-white dark:bg-slate-800 border rounded-xl py-2 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${isOverAmount
                        ? 'border-rose-500 focus:ring-rose-500 text-rose-600'
                        : 'border-slate-300 dark:border-white/10 focus:ring-primary-500'}`} placeholder={`Max: ₹${planAmount.toLocaleString('en-IN')}`} required/>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                      Maximum allowed: <strong>₹{planAmount.toLocaleString('en-IN')}</strong> (Plan Standard Price)
                                    </p>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                      Verified Bank UTR / Ref *
                                    </label>
                                    <input type="text" value={verifyUtr} onChange={(e) => setVerifyUtr(e.target.value)} className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="12-digit UTR ref" required/>
                                  </div>
                                </div>

                                {/* 3 Approval Options Section */}
                                <div className="space-y-3 pt-1">
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Approval Decision &amp; Service Assignment:
                                  </label>

                                  {/* Over Amount Alert */}
                                  {isOverAmount && (<div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0"/>
                                      <span>
                                        <strong>Amount Exceeded:</strong> Received amount (₹{verifyReceivedAmount.toLocaleString('en-IN')}) cannot exceed the plan price of ₹{planAmount.toLocaleString('en-IN')}.
                                      </span>
                                    </div>)}

                                  {/* Case 1: Full Payment Matched */}
                                  {isFullMatch && (<div onClick={() => setVerifyApprovalMode('FULL')} className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 cursor-pointer">
                                      <input type="radio" name="approvalMode" checked={verifyApprovalMode === 'FULL'} onChange={() => setVerifyApprovalMode('FULL')} className="mt-0.5 text-emerald-600 focus:ring-emerald-500"/>
                                      <div className="space-y-1">
                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-4 h-4 text-emerald-600"/>
                                          Case 1: Full Payment Matched (₹{planAmount.toLocaleString('en-IN')})
                                        </span>
                                        <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                                          Full service of <strong>{planDays} Days ({selectedVerifyPayment.plan?.durationMonths || 1} Month)</strong> will be activated. Standard invoice of ₹{planAmount.toLocaleString('en-IN')} will be generated.
                                        </p>
                                      </div>
                                    </div>)}

                                  {/* Short Payment Alert & Case 2 & 3 Options */}
                                  {isShortPayment && (<div className="space-y-2.5">
                                      <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0"/>
                                        <span>
                                          <strong>Short Payment:</strong> Expected ₹{planAmount.toLocaleString('en-IN')}, Received ₹{verifyReceivedAmount.toLocaleString('en-IN')}. Difference: <strong>₹{difference.toLocaleString('en-IN')}</strong>. Select an approval option:
                                        </span>
                                      </div>

                                      {/* Case 2: Prorated Days Activation */}
                                      <div onClick={() => setVerifyApprovalMode('PRORATED')} className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${verifyApprovalMode === 'PRORATED'
                            ? 'bg-blue-500/10 border-blue-500/40 ring-2 ring-blue-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300'}`}>
                                        <div className="flex items-start gap-3">
                                          <input type="radio" name="approvalMode" checked={verifyApprovalMode === 'PRORATED'} onChange={() => setVerifyApprovalMode('PRORATED')} className="mt-0.5 text-blue-600 focus:ring-blue-500"/>
                                          <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Case 2: Prorated Service Activation (Adjusted Validity)
                                              </span>
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                {verifyCustomDays} Days
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                              Service validity will be prorated proportionally to the received amount ({verifyCustomDays} days). A custom prorated invoice for ₹{verifyReceivedAmount.toLocaleString('en-IN')} will be generated.
                                            </p>

                                            {verifyApprovalMode === 'PRORATED' && (<div className="pt-2 flex items-center gap-2">
                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                  Active Validity Days:
                                                </label>
                                                <input type="number" value={verifyCustomDays} disabled onChange={(e) => setVerifyCustomDays(Math.max(1, parseInt(e.target.value) || 1))} onClick={(e) => e.stopPropagation()} className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg py-1 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                                                <span className="text-[10px] text-slate-400">(Auto-calculated, adjustable)</span>
                                              </div>)}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Case 3: Discount on Remaining Balance */}
                                      <div onClick={() => setVerifyApprovalMode('DISCOUNT')} className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${verifyApprovalMode === 'DISCOUNT'
                            ? 'bg-purple-500/10 border-purple-500/40 ring-2 ring-purple-500/20'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300'}`}>
                                        <div className="flex items-start gap-3">
                                          <input type="radio" name="approvalMode" checked={verifyApprovalMode === 'DISCOUNT'} onChange={() => setVerifyApprovalMode('DISCOUNT')} className="mt-0.5 text-purple-600 focus:ring-purple-500"/>
                                          <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                Case 3: Waive Remaining Balance as Discount (Full Period)
                                              </span>
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                Full {planDays} Days
                                              </span>
                                            </div>
                                            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                              Full subscription access for <strong>{planDays} days ({selectedVerifyPayment.plan?.durationMonths || 1} Month)</strong> will be granted. The invoice will reflect: Standard Price ₹{planAmount.toLocaleString('en-IN')} less Special Discount ₹{verifyCustomDiscount.toLocaleString('en-IN')} = Net Amount Paid ₹{verifyReceivedAmount.toLocaleString('en-IN')}.
                                            </p>

                                            {verifyApprovalMode === 'DISCOUNT' && (<div className="pt-2 flex items-center gap-2">
                                                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0">
                                                  Discount Given (₹):
                                                </label>
                                                <input type="number" step="any" value={verifyCustomDiscount} disabled onChange={(e) => setVerifyCustomDiscount(Math.max(0, parseFloat(e.target.value) || 0))} onClick={(e) => e.stopPropagation()} className="w-28 bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg py-1 px-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"/>
                                                <span className="text-[10px] text-slate-400">(Remaining balance discount)</span>
                                              </div>)}
                                          </div>
                                        </div>
                                      </div>
                                    </div>)}
                                </div>

                                {/* Optional Internal Verification Remarks */}
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Internal Verification Remarks (Optional)
                                  </label>
                                  <input type="text" value={verifyRemarks} onChange={(e) => setVerifyRemarks(e.target.value)} placeholder="e.g. Verified with HDFC statement at 11:45 AM" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"/>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                                  <button type="button" onClick={() => setSelectedVerifyPayment(null)} disabled={isSubmittingVerify} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition">
                                    Cancel
                                  </button>
                                  <button type="button" onClick={handleSubmitVerificationModal} disabled={isSubmittingVerify || verifyReceivedAmount <= 0 || verifyReceivedAmount > planAmount} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition shadow-md flex items-center gap-1.5">
                                    {isSubmittingVerify ? (<>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                                        <span>Approving &amp; Activating...</span>
                                      </>) : (<>
                                        <CheckCircle2 className="w-3.5 h-3.5"/>
                                        <span>
                                          {isFullMatch
                            ? `Approve Full Plan (₹${planAmount.toLocaleString('en-IN')})`
                            : verifyApprovalMode === 'PRORATED'
                                ? `Approve Prorated (${verifyCustomDays} Days)`
                                : `Approve with ₹${verifyCustomDiscount.toLocaleString('en-IN')} Discount`}
                                        </span>
                                      </>)}
                                  </button>
                                </div>
                              </div>
                            </div>);
            })()}
                      </div>);
    })();
}
}
