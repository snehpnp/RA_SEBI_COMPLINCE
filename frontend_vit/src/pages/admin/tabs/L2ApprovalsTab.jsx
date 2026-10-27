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



export default function L2ApprovalsTab(props) {
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
    l2FilterTab,
    setL2FilterTab,
    setSelectedL2Payment,
    setSelectedL1L2Diff,
    tableCustomStyles,
    isDarkMode
  } = admin || {};

  {
    activeTab === 'l2-approvals' && (() => {
        const l2PendingPayments = allPayments.filter((p) => p.approvalStatus === 'L2_PENDING');
        const l2ApprovedPayments = allPayments.filter((p) => p.approvalStatus === 'APPROVED' || p.approvalStatus === 'DIRECT_APPROVED');
        const l2RejectedPayments = allPayments.filter((p) => p.approvalStatus === 'REJECTED');
        const currentL2List = l2FilterTab === 'PENDING'
            ? l2PendingPayments
            : l2FilterTab === 'APPROVED'
                ? l2ApprovedPayments
                : l2RejectedPayments;
        return (<div className="space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 border-b border-slate-300 dark:border-white/5 pb-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-500/20">
                                <ShieldCheck className="w-7 h-7"/>
                              </div>
                              <div>
                                <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                                  <span>L2 Payment Verification Desk</span>
                                  <span className="text-[11px] px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 uppercase tracking-wider font-mono font-bold">
                                    Multi-Level Clearance
                                  </span>
                                </h2>
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                  Review, verify original L1 submissions, modify plan parameters, and compare L1 vs L2 clearance audits.
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button onClick={() => {
                api.getAdminPayments().then(res => { if (res.success)
                    setAllPayments(res.data); }).catch(() => { });
            }} className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-sm">
                              <RefreshCw className="w-3.5 h-3.5"/>
                              <span>Refresh Queue</span>
                            </button>
                          </div>
                        </div>

                        {/* Interactive Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div onClick={() => setL2FilterTab('PENDING')} className={`cursor-pointer transition p-5 rounded-2xl border-2 shadow-sm ${l2FilterTab === 'PENDING'
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-400/50'
                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-500/30 hover:border-amber-400'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-300">Awaiting L2 Approval</span>
                              <span className="p-2 rounded-xl bg-amber-200/80 dark:bg-amber-500/20 text-amber-900 dark:text-amber-300"><Clock className="w-4 h-4"/></span>
                            </div>
                            <div className="text-3xl font-black text-amber-950 dark:text-white mt-2 font-mono">{l2PendingPayments.length}</div>
                            <p className="text-xs font-bold text-amber-800 dark:text-amber-300/90 mt-1">Pending Second-Level Clearance</p>
                          </div>

                          <div onClick={() => setL2FilterTab('APPROVED')} className={`cursor-pointer transition p-5 rounded-2xl border-2 shadow-sm ${l2FilterTab === 'APPROVED'
                ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-400/50'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-500/30 hover:border-emerald-400'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">L2 Approved / Active</span>
                              <span className="p-2 rounded-xl bg-emerald-200/80 dark:bg-emerald-500/20 text-emerald-900 dark:text-emerald-300"><CheckCircle2 className="w-4 h-4"/></span>
                            </div>
                            <div className="text-3xl font-black text-emerald-950 dark:text-white mt-2 font-mono">{l2ApprovedPayments.length}</div>
                            <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300/90 mt-1">Authorized &amp; Dispatched</p>
                          </div>

                          <div onClick={() => setL2FilterTab('REJECTED')} className={`cursor-pointer transition p-5 rounded-2xl border-2 shadow-sm ${l2FilterTab === 'REJECTED'
                ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-400/50'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-500/30 hover:border-rose-400'}`}>
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-black uppercase tracking-wider text-rose-900 dark:text-rose-300">L2 Rejected</span>
                              <span className="p-2 rounded-xl bg-rose-200/80 dark:bg-rose-500/20 text-rose-900 dark:text-rose-300"><X className="w-4 h-4"/></span>
                            </div>
                            <div className="text-3xl font-black text-rose-950 dark:text-white mt-2 font-mono">{l2RejectedPayments.length}</div>
                            <p className="text-xs font-bold text-rose-800 dark:text-rose-300/90 mt-1">Declined by Approver</p>
                          </div>
                        </div>

                        {/* Sub-tab Filter Switcher */}
                        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                          <button type="button" onClick={() => setL2FilterTab('PENDING')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${l2FilterTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <Clock className="w-4 h-4"/>
                            <span>Awaiting L2 Approval</span>
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 dark:bg-white/10 font-mono">
                              {l2PendingPayments.length}
                            </span>
                          </button>

                          <button type="button" onClick={() => setL2FilterTab('APPROVED')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${l2FilterTab === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <CheckCircle2 className="w-4 h-4"/>
                            <span>L2 Approved / Active</span>
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 dark:bg-white/10 font-mono">
                              {l2ApprovedPayments.length}
                            </span>
                          </button>

                          <button type="button" onClick={() => setL2FilterTab('REJECTED')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${l2FilterTab === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
                            <X className="w-4 h-4"/>
                            <span>L2 Rejected</span>
                            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/20 dark:bg-white/10 font-mono">
                              {l2RejectedPayments.length}
                            </span>
                          </button>
                        </div>

                        {/* Queue Table */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-300 dark:border-white/10 overflow-hidden shadow-sm">
                          <div className="overflow-x-auto">
                            <DataTable columns={[
                {
                    name: 'Payment Date',
                    width: '130px',
                    selector: (row) => row.paymentDate || row.createdAt,
                    cell: (row) => (<span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                                      {row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : new Date(row.createdAt).toLocaleDateString()}
                                    </span>)
                },
                {
                    name: 'Service Start Date',
                    width: '160px',
                    cell: (row) => (<span className="inline-block px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 border border-blue-300 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-700 font-mono font-bold text-xs">
                                      {row.serviceStartDate ? new Date(row.serviceStartDate).toLocaleDateString() : 'Matches Payment Date'}
                                    </span>)
                },
                {
                    name: 'Client Details',
                    grow: 2,
                    cell: (row) => (<div className="py-2">
                                      <div className="font-bold text-slate-900 dark:text-white text-sm">{row.client?.name || 'Unknown Client'}</div>
                                      {row.client?.email && <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{row.client.email}</div>}
                                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">{row.client?.user?.mobile || row.client?.mobile || 'N/A'}</div>
                                    </div>)
                },
                {
                    name: 'Plan',
                    width: '150px',
                    cell: (row) => (<span className="inline-block px-2.5 py-1 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-300 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-700 font-bold text-xs font-mono">
                                      {row.plan?.name || 'Custom Plan'}
                                    </span>)
                },
                {
                    name: 'Amount',
                    width: '120px',
                    cell: (row) => (<span className="font-black font-mono text-base text-emerald-700 dark:text-emerald-400">
                                      ₹{Number(row.amount || 0).toLocaleString('en-IN')}
                                    </span>)
                },
                {
                    name: 'Mode',
                    width: '130px',
                    cell: (row) => (<span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-300 dark:border-white/10 inline-block">
                                      {row.paymentMode || 'MANUAL_UPI'}
                                    </span>)
                },
                {
                    name: 'Approval Status',
                    width: '140px',
                    cell: (row) => {
                        if (row.approvalStatus === 'APPROVED' || row.approvalStatus === 'DIRECT_APPROVED') {
                            return (<span className="inline-block px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-bold text-xs uppercase tracking-wider font-mono">
                                          ✓ L2 Approved
                                        </span>);
                        }
                        if (row.approvalStatus === 'REJECTED') {
                            return (<span className="inline-block px-2.5 py-1 rounded-full bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-bold text-xs uppercase tracking-wider font-mono">
                                          ✗ L2 Rejected
                                        </span>);
                        }
                        return (<span className="inline-block px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-bold text-xs uppercase tracking-wider font-mono">
                                        Pending L2
                                      </span>);
                    }
                },
                {
                    name: 'Actions',
                    width: '210px',
                    right: true,
                    cell: (row) => (<div className="flex items-center gap-1.5 flex-wrap justify-end">
                                      {row.approvalStatus === 'L2_PENDING' ? (<button onClick={() => setSelectedL2Payment(row)} className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black text-xs shadow-md shadow-amber-600/30 inline-flex items-center gap-1.5 transition-all transform hover:scale-105">
                                          <ShieldCheck className="w-4 h-4"/>
                                          <span>Review (L2)</span>
                                        </button>) : (<>
                                          <button onClick={() => setSelectedL1L2Diff(row)} className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-white/10 inline-flex items-center gap-1 transition" title="View L1 vs L2 details">
                                            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"/>
                                            <span>L1 vs L2</span>
                                          </button>
                                          {(row.approvalStatus === 'APPROVED' || row.approvalStatus === 'DIRECT_APPROVED') && (<button onClick={() => {
                                    api.downloadInvoicePdf(row.id || row._id, `Invoice_${row.transactionRef}.pdf`)
                                        .catch((err) => toast.error(err?.message || 'Failed to download invoice'));
                                }} className="px-2.5 py-1.5 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold text-xs border border-primary-200 dark:border-primary-800 inline-flex items-center gap-1 transition" title="Download Tax Invoice">
                                              <FileText className="w-3.5 h-3.5"/>
                                              <span>Invoice</span>
                                            </button>)}
                                        </>)}
                                    </div>)
                }
            ]} data={currentL2List} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-12 text-center text-slate-500 dark:text-slate-400 font-medium">
                                  {l2FilterTab === 'PENDING'
                    ? 'No pending L2 approval requests. Queue is fully cleared.'
                    : l2FilterTab === 'APPROVED'
                        ? 'No L2 approved payments recorded yet.'
                        : 'No L2 rejected payments recorded.'}
                                </div>}/>
                          </div>
                        </div>
                      </div>);
    })();
}
}
