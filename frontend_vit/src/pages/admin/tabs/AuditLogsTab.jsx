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



export default function AuditLogsTab(props) {
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
    auditSearchQuery,
    auditCategoryFilter,
    auditRoleFilter,
    auditCurrentPage,
    setLoadingAuditLogs,
    loadingAuditLogs,
    setAuditSearchQuery,
    setAuditCurrentPage,
    setAuditCategoryFilter,
    setAuditRoleFilter,
    setSelectedAuditLog,
    selectedAuditLog,
    setShowRawAuditJson,
    showRawAuditJson
  } = admin || {};

  {
    activeTab === 'auditLogs' && (() => {
        const filteredAuditLogs = activityLogs.filter((log) => {
            if (auditSearchQuery.trim()) {
                const q = auditSearchQuery.toLowerCase();
                const matchSearch = (log.title || '').toLowerCase().includes(q) ||
                    (log.description || '').toLowerCase().includes(q) ||
                    (log.action || '').toLowerCase().includes(q) ||
                    (log.category || log.module || '').toLowerCase().includes(q) ||
                    (log.user?.name || '').toLowerCase().includes(q) ||
                    (log.user?.email || '').toLowerCase().includes(q) ||
                    (log.ipAddress || '').toLowerCase().includes(q) ||
                    (log.targetClient?.name || '').toLowerCase().includes(q) ||
                    (log.targetClient?.mobile || '').toLowerCase().includes(q);
                if (!matchSearch)
                    return false;
            }
            if (auditCategoryFilter !== 'ALL') {
                const cat = (log.category || log.module || '').toUpperCase();
                if (auditCategoryFilter === 'PAYMENT' && !['PAYMENT', 'PAYMENTS', 'SUBSCRIPTION'].includes(cat))
                    return false;
                if (auditCategoryFilter === 'KYC_COMPLIANCE' && !['KYC_COMPLIANCE', 'COMPLIANCE', 'KYC'].includes(cat))
                    return false;
                if (auditCategoryFilter === 'STAFF_ACTION' && !['STAFF_ACTION', 'STAFF', 'USERS'].includes(cat))
                    return false;
                if (auditCategoryFilter === 'AUTH' && !['AUTH', 'LOGIN', 'LOGOUT'].includes(cat))
                    return false;
                if (auditCategoryFilter === 'SYSTEM' && !['SYSTEM', 'TENANTS'].includes(cat))
                    return false;
            }
            if (auditRoleFilter !== 'ALL') {
                const role = (log.user?.role || log.actorType || '').toUpperCase();
                if (auditRoleFilter === 'ADMIN' && !role.includes('ADMIN'))
                    return false;
                if (auditRoleFilter === 'STAFF' && (!role.includes('STAFF') && !role.includes('OFFICER') && !role.includes('RESEARCHER')))
                    return false;
                if (auditRoleFilter === 'CLIENT' && !role.includes('CLIENT'))
                    return false;
                if (auditRoleFilter === 'SYSTEM' && !role.includes('SYSTEM'))
                    return false;
            }
            return true;
        });
        const auditPageSize = 25;
        const totalAuditPages = Math.ceil(filteredAuditLogs.length / auditPageSize) || 1;
        const currentSafePage = Math.min(Math.max(1, auditCurrentPage), totalAuditPages);
        const paginatedLogs = filteredAuditLogs.slice((currentSafePage - 1) * auditPageSize, currentSafePage * auditPageSize);
        const exportAuditLogsCSV = () => {
            try {
                const headers = ['Timestamp', 'Source', 'Role', 'User Name', 'User Email', 'Category', 'Action', 'Title', 'Description', 'Status', 'IP Address', 'Device'];
                const rows = filteredAuditLogs.map((l) => [
                    `"${new Date(l.timestamp).toLocaleString('en-IN')}"`,
                    `"${l.source || 'ACTIVITY'}"`,
                    `"${l.user?.role || l.actorType || 'N/A'}"`,
                    `"${(l.user?.name || '').replace(/"/g, '""')}"`,
                    `"${(l.user?.email || '').replace(/"/g, '""')}"`,
                    `"${l.category || l.module || 'GENERAL'}"`,
                    `"${l.action || 'EVENT'}"`,
                    `"${(l.title || '').replace(/"/g, '""')}"`,
                    `"${(l.description || '').replace(/"/g, '""')}"`,
                    `"${l.status || 'SUCCESS'}"`,
                    `"${l.ipAddress || '127.0.0.1'}"`,
                    `"${l.device || 'Desktop'}"`
                ]);
                const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement('a');
                link.setAttribute('href', encodedUri);
                link.setAttribute('download', `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success('Audit logs exported to CSV');
            }
            catch (e) {
                toast.error('Failed to export CSV: ' + e.message);
            }
        };
        const totalStaffActions = activityLogs.filter((l) => {
            const r = (l.user?.role || l.actorType || '').toUpperCase();
            return r.includes('ADMIN') || r.includes('STAFF') || r.includes('OFFICER') || l.source === 'AUDIT';
        }).length;
        const totalPayments = activityLogs.filter((l) => {
            const cat = (l.category || l.module || '').toUpperCase();
            return ['PAYMENT', 'PAYMENTS', 'SUBSCRIPTION'].includes(cat);
        }).length;
        const totalCompliance = activityLogs.filter((l) => {
            const cat = (l.category || l.module || '').toUpperCase();
            return ['KYC_COMPLIANCE', 'COMPLIANCE', 'KYC'].includes(cat);
        }).length;
        return (<div className="w-full space-y-6">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                      <div>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
                            <Activity className="w-5 h-5"/>
                          </div>
                          <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Activity & Audit Logs</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              Tamper-evident trail of administrative updates, staff operations, payments & compliance events
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2.5 self-end sm:self-auto">
                        <button type="button" onClick={() => {
                setLoadingAuditLogs(true);
                api.getTenantAuditLogs()
                    .then(res => {
                    if (res.success && Array.isArray(res.data)) {
                        setActivityLogs(res.data);
                        toast.success(`Loaded ${res.data.length} activity records`);
                    }
                })
                    .catch(() => toast.error('Failed to refresh logs'))
                    .finally(() => setLoadingAuditLogs(false));
            }} disabled={loadingAuditLogs} className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-300 dark:border-white/10 transition shadow-xs disabled:opacity-50" title="Refresh Activity Stream">
                          <RefreshCw className={`w-3.5 h-3.5 ${loadingAuditLogs ? 'animate-spin' : ''}`}/>
                          <span>Refresh</span>
                        </button>

                        <button type="button" onClick={exportAuditLogsCSV} disabled={filteredAuditLogs.length === 0} className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition disabled:opacity-50 active:scale-95" title="Export Filtered Logs to CSV for SEBI Audits">
                          <Download className="w-3.5 h-3.5"/>
                          <span>Export CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Logged Events</span>
                          <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"><Layers className="w-4 h-4"/></span>
                        </div>
                        <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                          {activityLogs.length.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Complete chronological audit ledger</p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Staff & Admin Operations</span>
                          <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400"><Users className="w-4 h-4"/></span>
                        </div>
                        <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                          {totalStaffActions.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-purple-600 dark:text-purple-400 mt-1 font-medium">Internal staff activity trace</p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Payments & Invoicing</span>
                          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CreditCard className="w-4 h-4"/></span>
                        </div>
                        <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                          {totalPayments.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">QR verifications, invoices & plans</p>
                      </div>

                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-4.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Compliance & KYC Audits</span>
                          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldCheck className="w-4 h-4"/></span>
                        </div>
                        <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                          {totalCompliance.toLocaleString()}
                        </div>
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">Checklist updates & penalties</p>
                      </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl p-3.5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"/>
                        <input type="text" value={auditSearchQuery} onChange={e => {
                setAuditSearchQuery(e.target.value);
                setAuditCurrentPage(1);
            }} placeholder="Search action, title, description, user, client, IP..." className="w-full pl-10 pr-9 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                        {auditSearchQuery && (<button type="button" onClick={() => {
                    setAuditSearchQuery('');
                    setAuditCurrentPage(1);
                }} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <X className="w-3.5 h-3.5"/>
                          </button>)}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Category Dropdown */}
                        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10">
                          <Filter className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"/>
                          <select value={auditCategoryFilter} onChange={e => {
                setAuditCategoryFilter(e.target.value);
                setAuditCurrentPage(1);
            }} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer">
                            <option value="ALL">All Categories</option>
                            <option value="STAFF_ACTION">Staff & Admin Actions</option>
                            <option value="PAYMENT">Payments & Billing</option>
                            <option value="KYC_COMPLIANCE">Compliance & KYC</option>
                            <option value="AUTH">Authentication / Logins</option>
                            <option value="SYSTEM">System & Settings</option>
                          </select>
                        </div>

                        {/* Actor Role Dropdown */}
                        <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-white/10">
                          <User className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400"/>
                          <select value={auditRoleFilter} onChange={e => {
                setAuditRoleFilter(e.target.value);
                setAuditCurrentPage(1);
            }} className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer">
                            <option value="ALL">All Actors</option>
                            <option value="ADMIN">Admin Only</option>
                            <option value="STAFF">Staff Only</option>
                            <option value="CLIENT">Clients Only</option>
                            <option value="SYSTEM">System Only</option>
                          </select>
                        </div>

                        {(auditSearchQuery || auditCategoryFilter !== 'ALL' || auditRoleFilter !== 'ALL') && (<button type="button" onClick={() => {
                    setAuditSearchQuery('');
                    setAuditCategoryFilter('ALL');
                    setAuditRoleFilter('ALL');
                    setAuditCurrentPage(1);
                }} className="px-2.5 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition font-medium">
                            Reset
                          </button>)}
                      </div>
                    </div>

                    {/* Results Counter */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                      <span>
                        Showing <strong className="text-slate-900 dark:text-white">{filteredAuditLogs.length === 0 ? 0 : (currentSafePage - 1) * auditPageSize + 1}</strong> to{' '}
                        <strong className="text-slate-900 dark:text-white">{Math.min(currentSafePage * auditPageSize, filteredAuditLogs.length)}</strong> of{' '}
                        <strong className="text-slate-900 dark:text-white">{filteredAuditLogs.length}</strong> activity entries
                      </span>
                      {loadingAuditLogs && (<span className="flex items-center space-x-1 text-blue-500 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                          <span>Updating stream...</span>
                        </span>)}
                    </div>

                    {/* Table View */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xs overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                          <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/10 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
                            <tr>
                              <th className="py-3 px-4">Date & Time</th>
                              <th className="py-3 px-4">Actor</th>
                              <th className="py-3 px-4">Category</th>
                              <th className="py-3 px-4">Action & Summary</th>
                              <th className="py-3 px-4">Origin / IP</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                            {paginatedLogs.length === 0 ? (<tr>
                                <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                                  <div className="flex flex-col items-center justify-center space-y-2">
                                    <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 stroke-[1.5]"/>
                                    <p className="font-semibold text-sm text-slate-600 dark:text-slate-300">No activity logs found</p>
                                    <p className="text-xs text-slate-400">
                                      {auditSearchQuery || auditCategoryFilter !== 'ALL' || auditRoleFilter !== 'ALL'
                    ? 'Try clearing the search or category filters.'
                    : 'All future actions by admin, staff, and clients will automatically be logged here.'}
                                    </p>
                                  </div>
                                </td>
                              </tr>) : (paginatedLogs.map((log, idx) => {
                const logDate = new Date(log.timestamp);
                const isRecent = Date.now() - logDate.getTime() < 3600000;
                const role = (log.user?.role || log.actorType || 'ADMIN').toUpperCase();
                // Category badge style
                const cat = (log.category || log.module || 'SYSTEM').toUpperCase();
                let catColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10';
                if (['PAYMENT', 'PAYMENTS', 'SUBSCRIPTION'].includes(cat)) {
                    catColor = 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/40';
                }
                else if (['KYC_COMPLIANCE', 'COMPLIANCE', 'KYC'].includes(cat)) {
                    catColor = 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/40';
                }
                else if (['STAFF_ACTION', 'STAFF', 'USERS'].includes(cat)) {
                    catColor = 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/40';
                }
                else if (['AUTH', 'LOGIN', 'LOGOUT'].includes(cat)) {
                    catColor = 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800/40';
                }
                // Role badge style
                let roleBadge = 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/40';
                if (role.includes('ADMIN')) {
                    roleBadge = 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/40';
                }
                else if (role.includes('CLIENT')) {
                    roleBadge = 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/40';
                }
                else if (role.includes('SYSTEM')) {
                    roleBadge = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10';
                }
                const isSuccess = (log.status || 'SUCCESS').toUpperCase() === 'SUCCESS';
                return (<tr key={log.id || log._id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                    {/* Date & Time */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <div className="font-semibold text-slate-900 dark:text-white">
                                        {logDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </div>
                                      <div className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                        {logDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                      </div>
                                    </td>

                                    {/* Actor */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <div className="flex items-center space-x-2">
                                        <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-xs shrink-0">
                                          {(log.user?.name || log.actorType || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[130px]" title={log.user?.name || log.user?.email || 'System'}>
                                            {log.user?.name || log.user?.email || 'System'}
                                          </div>
                                          <span className={`inline-block px-1.5 py-0.2 text-[10px] font-bold rounded-md border ${roleBadge}`}>
                                            {role}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Category */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded-md border ${catColor}`}>
                                        {cat}
                                      </span>
                                    </td>

                                    {/* Action & Summary */}
                                    <td className="py-3 px-4 min-w-[240px]">
                                      <div className="flex items-center space-x-1.5">
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                          {log.action}
                                        </span>
                                        {log.source === 'AUDIT' && (<span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-white/5 text-slate-500 border border-slate-200 dark:border-white/10">
                                            AUDIT
                                          </span>)}
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-300 text-xs mt-0.5 line-clamp-1" title={log.title || log.description}>
                                        {log.title || log.description}
                                      </p>
                                      {log.targetClient && (<div className="mt-1 flex items-center space-x-1 text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                                          <User className="w-3 h-3"/>
                                          <span>Target: {log.targetClient.name} ({log.targetClient.mobile || log.targetClient.email})</span>
                                        </div>)}
                                    </td>

                                    {/* Origin / IP */}
                                    <td className="py-3 px-4 whitespace-nowrap">
                                      <div className="font-mono text-slate-600 dark:text-slate-400 text-xs">
                                        {log.ipAddress || '127.0.0.1'}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                        {log.device || 'Desktop'} {log.browser ? `• ${log.browser}` : ''}
                                      </div>
                                    </td>

                                    {/* Status */}
                                    <td className="py-3 px-4 whitespace-nowrap text-center">
                                      {isSuccess ? (<span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                          <CheckCircle2 className="w-3 h-3"/>
                                          <span>SUCCESS</span>
                                        </span>) : (<span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                          <AlertCircle className="w-3 h-3"/>
                                          <span>FAILED</span>
                                        </span>)}
                                    </td>

                                    {/* Actions */}
                                    <td className="py-3 px-4 whitespace-nowrap text-right">
                                      <button type="button" onClick={() => setSelectedAuditLog(log)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 text-slate-600 dark:text-slate-400 transition" title="View Full Audit Payload">
                                        <Eye className="w-4 h-4"/>
                                      </button>
                                    </td>
                                  </tr>);
            }))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Footer */}
                      {totalAuditPages > 1 && (<div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                          <button type="button" onClick={() => setAuditCurrentPage(p => Math.max(1, p - 1))} disabled={currentSafePage <= 1} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                            Previous
                          </button>

                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                            Page <strong className="text-slate-900 dark:text-white">{currentSafePage}</strong> of{' '}
                            <strong className="text-slate-900 dark:text-white">{totalAuditPages}</strong>
                          </span>

                          <button type="button" onClick={() => setAuditCurrentPage(p => Math.min(totalAuditPages, p + 1))} disabled={currentSafePage >= totalAuditPages} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition">
                            Next
                          </button>
                        </div>)}
                    </div>

                    {/* Inspect Audit Log Modal */}
                    {selectedAuditLog && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
                        <div className="bg-white dark:bg-[#0f1523] border border-slate-300 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
                          <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-white/10">
                            <div className="flex items-center space-x-2.5">
                              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <Activity className="w-5 h-5"/>
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">Audit Event Inspector</h3>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">ID: {selectedAuditLog.id || selectedAuditLog._id}</p>
                              </div>
                            </div>
                            <button onClick={() => setSelectedAuditLog(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                              <X className="w-5 h-5"/>
                            </button>
                          </div>

                          <div className="p-5 space-y-4 overflow-y-auto flex-1">
                            {/* Key info summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Action</span>
                                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedAuditLog.action}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Category</span>
                                <span className="font-bold text-slate-900 dark:text-white">{selectedAuditLog.category || selectedAuditLog.module}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Actor Role</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">{selectedAuditLog.user?.role || selectedAuditLog.actorType || 'ADMIN'}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedAuditLog.status || 'SUCCESS'}</span>
                              </div>
                            </div>

                            {(() => {
                    const parseSafe = (val) => {
                        if (!val)
                            return null;
                        if (typeof val === 'object')
                            return val;
                        if (typeof val === 'string') {
                            try {
                                const p = JSON.parse(val);
                                if (typeof p === 'string')
                                    return JSON.parse(p);
                                return p;
                            }
                            catch {
                                return val;
                            }
                        }
                        return val;
                    };
                    const oldObj = parseSafe(selectedAuditLog.parsedOld || selectedAuditLog.oldValue || selectedAuditLog.metadata?.oldValue);
                    const newObj = parseSafe(selectedAuditLog.parsedNew || selectedAuditLog.newValue || selectedAuditLog.metadata?.newValue);
                    let displayNotes = selectedAuditLog.description || selectedAuditLog.title || '';
                    if (typeof displayNotes === 'string' && displayNotes.trim().startsWith('{')) {
                        const parsedDesc = parseSafe(displayNotes);
                        if (parsedDesc && typeof parsedDesc === 'object') {
                            displayNotes = parsedDesc.message || parsedDesc.remarks || parsedDesc.title || selectedAuditLog.title;
                        }
                    }
                    const changes = [];
                    const ignoredKeys = new Set(['_id', '__v', 'tenantId', 'updatedAt', 'createdAt', 'id']);
                    if (oldObj && typeof oldObj === 'object' && newObj && typeof newObj === 'object') {
                        const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)])).filter(k => !ignoredKeys.has(k));
                        allKeys.forEach(key => {
                            const o = oldObj[key];
                            const n = newObj[key];
                            if (JSON.stringify(o) !== JSON.stringify(n)) {
                                changes.push({
                                    field: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                                    oldVal: o !== undefined && o !== null ? (typeof o === 'object' ? JSON.stringify(o) : String(o)) : '—',
                                    newVal: n !== undefined && n !== null ? (typeof n === 'object' ? JSON.stringify(n) : String(n)) : '—'
                                });
                            }
                        });
                    }
                    else if (newObj && typeof newObj === 'object') {
                        Object.keys(newObj).filter(k => !ignoredKeys.has(k)).forEach(key => {
                            const n = newObj[key];
                            if (n !== undefined && n !== null && n !== '') {
                                changes.push({
                                    field: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                                    oldVal: '—',
                                    newVal: typeof n === 'object' ? JSON.stringify(n) : String(n)
                                });
                            }
                        });
                    }
                    return (<>
                                  {/* Human-Readable Details Box */}
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Activity Summary</label>
                                    <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-xs text-slate-800 dark:text-slate-200 space-y-1">
                                      <div className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedAuditLog.title}</div>
                                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                                        {displayNotes}
                                      </p>
                                    </div>
                                  </div>

                                  {/* User & Client details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Triggered By</span>
                                      <div className="font-semibold text-slate-900 dark:text-white">{selectedAuditLog.user?.name || 'System / Admin'}</div>
                                      <div className="text-[11px] text-slate-500 font-mono">{selectedAuditLog.user?.email || 'N/A'}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
                                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Network & Device</span>
                                      <div className="font-mono text-slate-900 dark:text-white">{selectedAuditLog.ipAddress || '127.0.0.1'}</div>
                                      <div className="text-[11px] text-slate-500">{selectedAuditLog.device || 'Desktop'} {selectedAuditLog.browser ? `(${selectedAuditLog.browser})` : ''}</div>
                                    </div>
                                  </div>

                                  {/* Human-Readable Changes Table */}
                                  {changes.length > 0 && (<div className="space-y-1.5">
                                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Updated Details & Values</label>
                                      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden text-xs">
                                        <table className="w-full divide-y divide-slate-200 dark:divide-white/10">
                                          <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 font-bold uppercase text-[10px]">
                                            <tr>
                                              <th className="py-2 px-3 text-left">Property</th>
                                              <th className="py-2 px-3 text-left">Previous State</th>
                                              <th className="py-2 px-3 text-left">Updated Value</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-slate-100 dark:divide-white/5 bg-white dark:bg-slate-900/60 font-medium">
                                            {changes.map((c, i) => (<tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                                <td className="py-2 px-3 font-semibold text-slate-800 dark:text-slate-200">{c.field}</td>
                                                <td className="py-2 px-3 text-slate-500 font-mono text-[11px] break-all">{c.oldVal}</td>
                                                <td className="py-2 px-3 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-bold break-all">{c.newVal}</td>
                                              </tr>))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>)}

                                  {/* Collapsible Technical Payload */}
                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex items-center justify-between">
                                      <button type="button" onClick={() => setShowRawAuditJson(!showRawAuditJson)} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                                        <span>{showRawAuditJson ? '▲ Hide' : '▼ Show'} Raw Technical Payload (For Developers)</span>
                                      </button>
                                      {showRawAuditJson && (<button type="button" onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(selectedAuditLog.metadata || selectedAuditLog, null, 2));
                                toast.success('JSON payload copied to clipboard');
                            }} className="text-[10px] text-blue-500 hover:text-blue-400 font-bold flex items-center space-x-1">
                                          <Copy className="w-3 h-3"/>
                                          <span>Copy JSON</span>
                                        </button>)}
                                    </div>
                                    {showRawAuditJson && (<pre className="p-3.5 bg-slate-950 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-56 border border-slate-800 leading-relaxed animate-in fade-in">
                                        {JSON.stringify(selectedAuditLog.metadata || { oldValue: selectedAuditLog.oldValue, newValue: selectedAuditLog.newValue }, null, 2)}
                                      </pre>)}
                                  </div>
                                </>);
                })()}
                          </div>

                          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end">
                            <button type="button" onClick={() => setSelectedAuditLog(null)} className="px-5 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl transition">
                              Close
                            </button>
                          </div>
                        </div>
                      </div>)}
                  </div>);
    })();
}
}
