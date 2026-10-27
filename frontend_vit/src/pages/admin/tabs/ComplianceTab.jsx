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


import ComplianceCalendarModal from '@/components/compliance/ComplianceCalendarModal';


export default function ComplianceTab(props) {
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
    toggleMobilePreview,
    showMobilePreview,
    downloadingReport,
    handleComplianceSweep,
    sweepLoading,
    penalties,
    complaints,
    setComplianceTab,
    complianceTab,
    handleDownloadCSV,
    selectedFinancialYear,
    setSelectedFinancialYear,
    availableFinancialYears,
    alertsSubTab,
    getFinancialYear,
    setAlertsSubTab,
    setAlertViewMode,
    alertViewMode,
    alertColumns,
    tableCustomStyles,
    isDarkMode,
    formatAlertDescription,
    setPenaltyResolveId,
    setPenaltyPayRef,
    setPenaltyProof,
    setPenaltyRemarks,
    handleResolveAlert,
    setDepositTopup,
    setCloseRemarks,
    setAlertProof,
    setIsComplaintModalOpen,
    setComplaintSearchQuery,
    setComplaintFoundClient,
    setShowClientNotFoundAlert,
    setIsManualFillAllowed,
    setComplaintClientName,
    setComplaintEmail,
    setComplaintMobile,
    setComplaintPan,
    setComplaintSubject,
    setComplaintDescription,
    setComplaintReceivedAt,
    activeComplaintsColumns,
    setViewingAuditDetail,
    setPenaltyResolutionType,
    checklistHistory,
    setShowMobilePreview,
    NAV_CONFIG
  } = admin || {};

  return (
<div className="w-full space-y-6">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compliance Desk</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">SEBI compliance monitoring, alerts, checklists & penalty management</p>
                        </div>
                        <div className="flex space-x-2">
                          <button type="button" onClick={toggleMobilePreview} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm mr-2 ${showMobilePreview
        ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="Client Mobile Simulator">
                            <Smartphone className="w-3.5 h-3.5"/>
                            <span>{showMobilePreview ? 'Close Preview' : 'Mobile Preview'}</span>
                          </button>
                            <button onClick={() => setShowReportModal(true)} disabled={downloadingReport} className="px-4 py-2 bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-2 disabled:opacity-50">
                              {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                              <span>Download Periodic Report</span>
                            </button>
                            <button onClick={handleComplianceSweep} disabled={sweepLoading} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-xs font-bold uppercase tracking-wider rounded-xl transition flex items-center space-x-2 disabled:opacity-50">
                              {sweepLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
                              <span>Run Verification Sweep</span>
                            </button>
                          </div>
                        </div>

                        {/* Sub-tabs and Global Filter */}
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                          <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-900/60 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                            {[
        { id: 'overview', label: 'Compliance Overview' },
        { id: 'alerts', label: `Automated Alerts (${alerts.filter(a => a.status === 'OPEN').length})` },
        { id: 'penalties', label: `Penalties (${penalties.filter(p => p.status === 'PENDING_PAYMENT').length} Pending)` },
        { id: 'complaints', label: `Complaints (${complaints.filter(c => c.status === 'OPEN').length} Open)` },
        { id: 'audit_history', label: 'Audit Log' }
    ].map(tab => (<button key={tab.id} onClick={() => setComplianceTab(tab.id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${complianceTab === tab.id ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}>
                                {tab.label}
                              </button>))}
                          </div>
                          <div className="flex items-center space-x-3 bg-white dark:bg-slate-900/40 p-1.5 rounded-xl border border-slate-300 dark:border-white/5 w-fit">
                            {(!isStaff || hasPermission('EXPORT_DATA')) && (<button onClick={() => handleDownloadCSV(complianceTab)} className="px-3 py-1.5 bg-white dark:bg-[#151e32] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold transition flex items-center gap-2 border border-indigo-500/20 mr-2">
                                <Download className="w-3.5 h-3.5"/> Export CSV
                              </button>)}
                            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium px-2">Financial Year:</span>
                            <select value={selectedFinancialYear} onChange={(e) => setSelectedFinancialYear(e.target.value)} className="bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 text-slate-900 dark:text-white text-xs py-1.5 px-3 rounded-lg focus:ring-0 focus:outline-none hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 transition cursor-pointer">
                              <option value="All">All Financial Years</option>
                              {availableFinancialYears.map(fy => (<option key={fy} value={fy}>{fy}</option>))}
                            </select>
                          </div>
                        </div>

                        {/* COMPLIANCE OVERVIEW TAB */}
                        {complianceTab === 'overview' && (<div className="space-y-6">
                            {/* Metrics Row */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                              {/* Complaints Card */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-slate-400 dark:border-white/20 hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Complaints Overview</span>
                                  <p className="text-4xl font-extrabold mt-2 text-slate-900 dark:text-white">{complaints.filter((c) => c.status === 'OPEN').length} <span className="text-sm font-medium text-slate-500 dark:text-slate-500">Open</span></p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Resolved:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">{complaints.filter((c) => c.status === 'CLOSED' || c.status === 'RESOLVED').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Breached SLA:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{complaints.filter((c) => c.status === 'OPEN' && new Date(c.deadlineAt).getTime() <= Date.now()).length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <Users className="h-6 w-6"/>
                                </div>
                              </div>

                              {/* Penalties Card */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-rose-500/30 hover:shadow-[0_8px_30px_rgba(244,63,94,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">BSE Penalties Overview</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">₹{(penalties.filter((p) => p.status === 'PENDING_PAYMENT').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Pending Count:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{penalties.filter((p) => p.status === 'PENDING_PAYMENT').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Total Compliant:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">₹{(penalties.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <FileText className="h-6 w-6"/>
                                </div>
                              </div>

                              {/* SEBI Checklist Score */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_8px_30px_rgba(16,185,129,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Checklist Compliance</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-600">{checklist.length > 0 ? Math.round((checklist.filter((item) => item.audit?.status === 'COMPLIANT').length / checklist.length) * 100) : 0}%</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>Compliant:</span> <strong className="text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 bg-emerald-500/10 rounded">{checklist.filter((item) => item.audit?.status === 'COMPLIANT').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Non-Compliant:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{checklist.filter((item) => item.audit?.status === 'NON_COMPLIANT').length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <ShieldCheck className="h-6 w-6"/>
                                </div>
                              </div>

                              {/* Automated Alerts */}
                              <div className="bg-gradient-to-br from-white dark:from-[#0f1523] to-slate-50 dark:to-[#0a0f18] p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex justify-between items-start transition-all duration-300 hover:border-amber-500/30 hover:shadow-[0_8px_30px_rgba(245,158,11,0.1)] hover:-translate-y-1 relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <div className="relative z-10">
                                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Alerts</span>
                                  <p className="text-4xl font-extrabold mt-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">{alerts.filter((a) => a.status === 'OPEN').length}</p>
                                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-3 space-y-1">
                                    <div className="flex justify-between items-center gap-4"><span>High Severity:</span> <strong className="text-rose-600 dark:text-rose-400 px-1.5 py-0.5 bg-rose-500/10 rounded">{alerts.filter((a) => a.status === 'OPEN' && a.severity === 'HIGH').length}</strong></div>
                                    <div className="flex justify-between items-center gap-4"><span>Medium/Low:</span> <strong className="text-amber-600 dark:text-amber-400 px-1.5 py-0.5 bg-amber-500/10 rounded">{alerts.filter((a) => a.status === 'OPEN' && a.severity !== 'HIGH').length}</strong></div>
                                  </div>
                                </div>
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] relative z-10 group-hover:scale-110 transition-transform duration-300">
                                  <AlertTriangle className="h-6 w-6"/>
                                </div>
                              </div>
                            </div>

                            {/* Dashboard Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Left: Urgent complaints */}
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                                <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Urgent SEBI Complaints (SCORES)</h3>
                                  <button onClick={() => setComplianceTab('complaints')} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300">
                                    View All
                                  </button>
                                </div>
                                <div className="space-y-3">
                                  {complaints.filter((c) => c.status === 'OPEN').map((c) => {
            const daysLeft = Math.ceil((new Date(c.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
            const isBreached = daysLeft < 0;
            const isWarning = daysLeft >= 0 && daysLeft <= 5;
            return (<div key={c.id} className="p-4 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                        <div className="space-y-1">
                                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            {c.clientName}
                                            <span className="text-[10px] text-slate-500 dark:text-slate-500 font-normal">({c.source})</span>
                                          </div>
                                          <div className="text-slate-600 dark:text-slate-400 text-[10px]">{c.subject}</div>
                                        </div>
                                        <div className="text-right">
                                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold ${isBreached ? 'bg-red-500/20 text-red-600 dark:text-red-400' : isWarning ? 'bg-orange-500/20 text-orange-600 dark:text-orange-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'}`}>
                                            {isBreached ? `${Math.abs(daysLeft)} days overdue` : daysLeft === 0 ? 'Due Today' : `${daysLeft} days left`}
                                          </span>
                                        </div>
                                      </div>);
        })}
                                  {complaints.filter((c) => c.status === 'OPEN').length === 0 && (<div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs">No open complaints. Standard SEBI compliance maintained.</div>)}
                                </div>
                              </div>

                              {/* Right: Unpaid penalties & Progress bar */}
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-6">
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Levied BSE Penalties Overview</h3>
                                    <button onClick={() => setComplianceTab('penalties')} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300">
                                      View All
                                    </button>
                                  </div>

                                  {/* Penalty Collection Progress Bar */}
                                  <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-2">
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-600 dark:text-slate-400 font-medium">Penalty Compliant Rate</span>
                                      <strong className="text-emerald-600 dark:text-emerald-400">
                                        {(() => {
            const total = penalties.reduce((acc, p) => acc + p.amount, 0);
            const paid = penalties.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0);
            return total > 0 ? Math.round((paid / total) * 100) : 100;
        })()}% (₹{(penalties.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()} of ₹{(penalties.reduce((acc, p) => acc + p.amount, 0)).toLocaleString()})
                                      </strong>
                                    </div>
                                    <div className="h-2 w-full bg-white dark:bg-slate-900 rounded-full overflow-hidden">
                                      <div className="h-full bg-emerald-400 transition-all duration-500" style={{
            width: `${(() => {
                const total = penalties.reduce((acc, p) => acc + p.amount, 0);
                const paid = penalties.filter((p) => p.status === 'PAID').reduce((acc, p) => acc + p.amount, 0);
                return total > 0 ? Math.round((paid / total) * 100) : 100;
            })()}%`
        }}/>
                                    </div>
                                  </div>

                                  <div className="space-y-3">
                                    <PaginatedList data={penalties.filter((p) => p.status === 'PENDING_PAYMENT')} itemsPerPage={5}>
                                      {(pageData) => (<>
                                          {pageData.map((p) => (<div key={p.id} className="p-4 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs">
                                              <div className="space-y-1 max-w-[70%]">
                                                <div className="font-bold text-slate-900 dark:text-white truncate">{p.audit?.requirement?.requirement || p.reason}</div>
                                                <div className="text-slate-600 dark:text-slate-400 text-[10px] truncate">{p.reason}</div>
                                              </div>
                                              <div className="text-right">
                                                <div className="font-extrabold text-rose-600 dark:text-rose-400 mb-1">₹{p.amount.toLocaleString()}</div>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold uppercase tracking-wider">NON-COMPLIANT</span>
                                              </div>
                                            </div>))}
                                        </>)}
                                    </PaginatedList>
                                    {penalties.filter((p) => p.status === 'PENDING_PAYMENT').length === 0 && (<div className="text-center py-8 text-slate-500 dark:text-slate-500 text-xs">No pending penalties. Excellent audit record!</div>)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>)}


                        {complianceTab === 'alerts' && (() => {
        const displayAlerts = (alertsSubTab === 'active'
            ? alerts.filter((a) => a.status === 'OPEN')
            : alerts.filter((a) => a.status === 'CLOSED'))
            .filter((a) => selectedFinancialYear === 'All' || getFinancialYear(a.createdAt) === selectedFinancialYear);
        return (<div className="space-y-6">
                              <div className="flex justify-between items-center">
                                <div className="flex space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                                  <button onClick={() => setAlertsSubTab('active')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${alertsSubTab === 'active' ? 'bg-amber-600 text-slate-900 dark:text-white shadow-lg shadow-amber-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white'}`}>
                                    Active Alerts ({alerts.filter((a) => a.status === 'OPEN').length})
                                  </button>
                                  <button onClick={() => setAlertsSubTab('history')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${alertsSubTab === 'history' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}>
                                    Resolved History ({alerts.filter((a) => a.status === 'CLOSED').length})
                                  </button>
                                </div>

                                <div className="flex items-center space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl border border-slate-300 dark:border-white/5 shadow-sm">
                                  <button onClick={() => setAlertViewMode('card')} className={`p-1.5 rounded-lg transition ${alertViewMode === 'card' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-slate-800'}`} title="Card View">
                                    <LayoutGrid className="w-4 h-4"/>
                                  </button>
                                  <button onClick={() => setAlertViewMode('table')} className={`p-1.5 rounded-lg transition ${alertViewMode === 'table' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-slate-800'}`} title="Table View">
                                    <TableIcon className="w-4 h-4"/>
                                  </button>
                                </div>
                              </div>

                              <PaginatedList data={displayAlerts} itemsPerPage={10}>
                                {(pageData) => (alertViewMode === 'table' ? (<div className="overflow-x-auto bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-sm">
                                      <DataTable columns={alertColumns} data={pageData} customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-8 text-center text-slate-500">No alerts found.</div>}/>
                                    </div>) : (<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {pageData.map((a) => {
                    let cardColor = "bg-amber-500/5 border-amber-500/15 text-slate-700 dark:text-slate-300";
                    let titleColor = "text-amber-200";
                    let severityBadge = "bg-rose-500/20 text-rose-700 dark:text-rose-300";
                    let resolveBtnColor = "bg-amber-600/20 border-amber-500/30 hover:bg-amber-600/30 text-amber-200";
                    let statusBadge = a.status === 'CLOSED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-400/5 text-amber-600 dark:text-amber-400 border-amber-400/15';
                    let descColor = "text-slate-700 dark:text-slate-300";
                    if (a.severity === 'HIGH') {
                        cardColor = "bg-gradient-to-b from-rose-950/40 to-slate-50 dark:to-[#0a0f18] border-rose-500/20 border-t-rose-500/80 border-t-4 shadow-[0_5px_15px_rgba(244,63,94,0.05)] text-rose-200";
                        titleColor = "text-slate-900 dark:text-white";
                        severityBadge = "bg-rose-500/20 text-rose-700 dark:text-rose-300 font-extrabold";
                        resolveBtnColor = "bg-rose-600 border border-rose-500 hover:bg-rose-500 text-slate-900 dark:text-white shadow-lg shadow-rose-500/20";
                        descColor = "text-slate-700 dark:text-slate-300";
                    }
                    else if (a.severity === 'MEDIUM') {
                        cardColor = "bg-gradient-to-b from-orange-950/40 to-slate-50 dark:to-[#0a0f18] border-orange-500/20 border-t-orange-500/80 border-t-4 shadow-[0_5px_15px_rgba(249,115,22,0.05)] text-orange-200";
                        titleColor = "text-slate-900 dark:text-white";
                        severityBadge = "bg-orange-500/20 text-orange-700 dark:text-orange-300 font-extrabold";
                        resolveBtnColor = "bg-orange-600 border border-orange-500 hover:bg-orange-500 text-slate-900 dark:text-white shadow-lg shadow-orange-500/20";
                        descColor = "text-slate-700 dark:text-slate-300";
                    }
                    else if (a.severity === 'LOW') {
                        cardColor = "bg-gradient-to-b from-yellow-950/30 to-slate-50 dark:to-[#0a0f18] border-yellow-500/20 border-t-yellow-500/80 border-t-4 shadow-[0_5px_15px_rgba(234,179,8,0.05)] text-yellow-200";
                        titleColor = "text-slate-900 dark:text-white";
                        severityBadge = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 font-extrabold";
                        resolveBtnColor = "bg-yellow-600 border border-yellow-500 hover:bg-yellow-500 text-slate-900 dark:text-white shadow-lg shadow-yellow-500/20";
                        descColor = "text-slate-700 dark:text-slate-300";
                    }
                    return (<div key={a.id} className={`p-6 rounded-2xl flex flex-col justify-between gap-5 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${cardColor}`}>
                                            <div className="space-y-3">
                                              <div className="flex items-center justify-between">
                                                <span className={`font-black text-sm tracking-wide ${titleColor}`}>{a.alertType === 'PENALTY_LEVIED' ? 'PENALTY RISK' : a.alertType.replace(/_/g, ' ')}</span>
                                                <div className="flex items-center space-x-2">
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${severityBadge}`}>{a.severity}</span>
                                                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${statusBadge}`}>{a.status}</span>
                                                </div>
                                              </div>
                                              <p className={`text-[13px] leading-relaxed ${descColor}`}>{formatAlertDescription(a.description)}</p>
                                            </div>

                                            <div className="flex justify-between items-center pt-2 border-t border-slate-300 dark:border-white/5 text-[10px] text-slate-600 dark:text-slate-400">
                                              <span>Created: {new Date(a.createdAt).toLocaleDateString()}</span>
                                              {a.status === 'OPEN' && (<button onClick={() => {
                                if (a.alertType === 'PENALTY_LEVIED' && a.penaltyId) {
                                    setPenaltyResolveId(a.penaltyId);
                                    setPenaltyPayRef('');
                                    setPenaltyProof(null);
                                    setPenaltyRemarks('');
                                }
                                else if (['KYC_MISSING', 'KYC_FAILED', 'AGREEMENT_MISSING', 'PAN_MISSING'].includes(a.alertType)) {
                                    handleResolveAlert(a.id, a.alertType);
                                }
                                else {
                                    setClosingAlertId(a.id);
                                    setDepositTopup(a.alertType === 'DEPOSIT_LOW' ? '50000' : '');
                                    setCloseRemarks('');
                                    setAlertProof(null);
                                }
                            }} className={`px-3 py-1.5 border rounded font-semibold transition ${resolveBtnColor}`}>
                                                  Resolve Alert
                                                </button>)}
                                            </div>
                                          </div>);
                })}
                                    </div>))}
                              </PaginatedList>
                              {displayAlerts.length === 0 && (<div className="col-span-full text-center py-12 text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/5">
                                  {alertsSubTab === 'active' ? '✅ No active compliance alerts. Excellent!' : 'No resolved alerts in history.'}
                                </div>)}
                            </div>);
    })()}

                        {/* COMPLAINTS TAB */}
                        {complianceTab === 'complaints' && (<div className="space-y-6">
                            {/* Summary Dashboard */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex items-center space-x-4">
                                <div className="p-4 bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full"><AlertTriangle className="h-6 w-6"/></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Total Open Complaints</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c) => c.status === 'OPEN').length}</p></div>
                              </div>
                              <div className="glassmorphism p-6 rounded-2xl border border-orange-500/30 flex items-center space-x-4">
                                <div className="p-4 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full"><AlertTriangle className="h-6 w-6"/></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Approaching Deadline</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c) => c.status === 'OPEN' && new Date(c.deadlineAt).getTime() - Date.now() < 5 * 24 * 3600 * 1000 && new Date(c.deadlineAt).getTime() > Date.now()).length}</p></div>
                              </div>
                              <div className="glassmorphism p-6 rounded-2xl border border-red-500/30 flex items-center space-x-4">
                                <div className="p-4 bg-red-500/20 text-red-600 dark:text-red-400 rounded-full"><CheckCircle className="h-6 w-6"/></div>
                                <div><p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Resolved Complaints</p><p className="text-2xl font-bold text-slate-900 dark:text-white">{complaints.filter((c) => c.status === 'CLOSED' || c.status === 'RESOLVED').length}</p></div>
                              </div>
                            </div>

                            <div className="flex justify-between items-center">
                              <h3 className="text-lg font-bold">SEBI Grievances (SCORES)</h3>
                              <button onClick={() => {
            setIsComplaintModalOpen(true);
            setComplaintSearchQuery('');
            setComplaintFoundClient(null);
            setShowClientNotFoundAlert(false);
            setIsManualFillAllowed(false);
            setComplaintClientName('');
            setComplaintEmail('');
            setComplaintMobile('');
            setComplaintPan('');
            setComplaintSubject('');
            setComplaintDescription('');
            setComplaintReceivedAt('');
        }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl text-sm font-bold flex items-center"><Plus className="h-4 w-4 mr-2"/> Log Complaint</button>
                            </div>

                            <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                              <PaginatedList data={complaints.filter((c) => selectedFinancialYear === 'All' || getFinancialYear(c.receivedAt) === selectedFinancialYear)} itemsPerPage={10}>
                                {(pageData) => (<DataTable columns={activeComplaintsColumns} data={pageData} customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="px-6 py-8 text-center text-slate-600 dark:text-slate-400">No complaints logged.</div>}/>)}
                              </PaginatedList>
                            </div>
                          </div>)}


                        {/* PENALTIES TAB */}
                        {complianceTab === 'penalties' && (<div className="rounded-3xl glassmorphism border border-slate-300 dark:border-white/10 overflow-hidden w-full shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]">
                            <DataTable columns={[
            {
                name: 'Requirement',
                cell: (p) => (<div className="py-2">
                                      <div className="font-bold text-slate-900 dark:text-white text-sm max-w-[200px] truncate" title={p.audit?.requirement?.requirement || '-'}>{p.audit?.requirement?.requirement || '-'}</div>
                                      <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-1" title={p.reason}>BSE suggested Penalty: ₹{p.amount.toLocaleString()}</div>
                                    </div>),
            },
            {
                name: 'Overdue Date',
                cell: (p) => <div className="text-slate-500 dark:text-slate-500 font-medium">{(p.audit?.dueDate || p.audit?.createdAt) ? new Date(p.audit.dueDate || p.audit.createdAt).toLocaleDateString() : 'N/A'}</div>
            },
            {
                name: 'Resolved Date',
                cell: (p) => <div className="text-slate-500 dark:text-slate-500 font-medium">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '-'}</div>
            },
            {
                name: 'Remarks',
                cell: (p) => <div className="text-slate-500 dark:text-slate-500 font-medium"><span className="block max-w-[150px] truncate" title={p.remarks || '-'}>{p.remarks || '-'}</span></div>
            },
            {
                name: 'Proof / Details',
                cell: (p) => (<div className="text-sm py-2">
                                      <button type="button" onClick={() => setViewingAuditDetail({
                        requirement: p.audit?.requirement || { requirement: p.reason },
                        status: p.status,
                        officerRemarks: p.remarks || p.reason,
                        proofDocumentUrl: p.proofUrl,
                        paymentReference: p.paymentReference,
                        paidAt: p.paidAt,
                        amount: p.amount,
                        isPenalty: true,
                        reason: p.reason,
                        dueDate: p.audit?.dueDate || p.audit?.createdAt
                    })} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:text-indigo-300 flex items-center gap-1 font-semibold text-xs px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition">
                                        <Eye className="w-3.5 h-3.5"/> View Details
                                      </button>
                                    </div>)
            },
            {
                name: 'Status',
                cell: (p) => (<span className={`px-3 py-1 text-[10px] font-black rounded-lg border uppercase tracking-wider ${p.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.1)]'}`}>{p.status === 'PENDING_PAYMENT' ? 'NON-COMPLIANT' : p.status === 'PAID' ? 'COMPLIANT' : p.status.replace('_', ' ')}</span>)
            },
            ...(user.role === 'COMPLIANCE_OFFICER' ? [{
                    name: 'Action',
                    right: true,
                    cell: (p) => (<div className="text-center">
                                      {p.status === 'PENDING_PAYMENT' ? (<button onClick={() => { setPenaltyResolveId(p.id); setPenaltyResolutionType(''); setPenaltyPayRef(''); setPenaltyProof(null); setPenaltyRemarks(''); }} className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition shadow-lg shadow-emerald-500/20 hover:-translate-y-0.5 hover:shadow-emerald-500/40">Submit Proof</button>) : (<span className="text-slate-500 dark:text-slate-500 text-xs font-semibold px-4 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg">Resolved</span>)}
                                    </div>)
                }] : [])
        ]} data={penalties.filter((p) => selectedFinancialYear === 'All' || getFinancialYear(p.createdAt || p.audit?.createdAt) === selectedFinancialYear)} pagination highlightOnHover responsive theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="text-center py-16 text-slate-500 dark:text-slate-500 font-medium">
                                  No penalties levied. Great job!
                                </div>}/>
                          </div>)}

                        {/* AUDIT LOG TAB */}
                        {complianceTab === 'audit_history' && (() => {
        const combinedHistory = [
            ...alerts.filter(a => a.status === 'CLOSED').map(a => ({
                id: a.id,
                type: 'ALERT_RESOLVED',
                title: `Alert Resolved: ${a.alertType.replace(/_/g, ' ')}`,
                desc: a.remarks || 'Alert closed',
                date: new Date(a.closedAt || a.updatedAt),
                proofUrl: a.proofUrl
            })),
            ...penalties.filter(p => p.status === 'PAID').map(p => ({
                id: p.id,
                type: 'PENALTY_PAID',
                title: `Penalty Paid: ₹${p.amount.toLocaleString()}`,
                desc: p.remarks || 'Payment verified',
                date: new Date(p.paidAt || p.updatedAt),
                proofUrl: p.proofUrl
            })),
            ...checklistHistory.map(h => ({
                id: h.id,
                type: 'CHECKLIST_UPDATE',
                title: `Checklist Update: ${h.requirement?.requirement || 'Requirement'}`,
                desc: `Status changed to ${h.newStatus}. ${h.officerRemarks || ''}`,
                date: new Date(h.createdAt),
                proofUrl: h.proofDocumentUrl
            }))
        ].sort((a, b) => b.date.getTime() - a.date.getTime())
            .filter((item) => selectedFinancialYear === 'All' || getFinancialYear(item.date.toISOString()) === selectedFinancialYear);
        return (<div className="space-y-6">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-400 dark:border-white/10">
                                <h3 className="font-bold text-slate-800 dark:text-slate-200">Complete Compliance History</h3>
                              </div>
                              <PaginatedList data={combinedHistory} itemsPerPage={10}>
                                {(pageData) => (<div className="space-y-4">
                                    {pageData.length > 0 ? pageData.map((item) => (<div key={item.id} className="p-4 bg-white dark:bg-slate-900/40 border border-slate-300 dark:border-white/5 rounded-xl flex items-start gap-4 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                        <div className={`p-2 rounded-lg mt-1 shrink-0 ${item.type === 'ALERT_RESOLVED' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        item.type === 'PENALTY_PAID' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                            'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
                                          {item.type === 'ALERT_RESOLVED' && <AlertTriangle className="h-4 w-4"/>}
                                          {item.type === 'PENALTY_PAID' && <FileText className="h-4 w-4"/>}
                                          {item.type === 'CHECKLIST_UPDATE' && <ShieldCheck className="h-4 w-4"/>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{item.title}</h4>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{item.desc}</p>
                                          <div className="text-[10px] text-slate-500 dark:text-slate-500 mt-2 font-medium">{item.date.toLocaleString('en-IN')}</div>
                                        </div>
                                        {item.proofUrl && (<a href={item.proofUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600/20 hover:bg-primary-600/40 text-primary-600 dark:text-primary-400 text-[10px] font-bold rounded-lg transition shrink-0">
                                            <ExternalLink className="h-3 w-3"/>
                                            View Proof (SS)
                                          </a>)}
                                      </div>)) : (<div className="text-center py-12 text-slate-500 dark:text-slate-500 bg-slate-100 dark:bg-white/5 rounded-2xl border border-slate-300 dark:border-white/5">
                                        No compliance history recorded yet.
                                      </div>)}
                                  </div>)}
                              </PaginatedList>
                            </div>);
    })()}
                        {showMobilePreview && (<div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setShowMobilePreview(false)}/>
                            <div className="relative w-full max-w-[400px] bg-slate-900 border-l border-white/10 shadow-2xl p-4 flex flex-col h-full z-10 animate-in slide-in-from-right duration-200">
                              <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/10">
                                <div className="flex items-center space-x-2">
                                  <Smartphone className="w-4 h-4 text-blue-400"/>
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">Client Mobile Simulator</span>
                                </div>
                                <button type="button" onClick={() => setShowMobilePreview(false)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition" title="Close Preview">
                                  <X className="w-4 h-4"/>
                                </button>
                              </div>
                              <div className="flex-1 overflow-y-auto overflow-x-hidden flex justify-center py-2">
                                <MobilePreview mode="COMPLIANCE" complianceItems={complianceTab === 'overview' ? [
            { _isOverview: true, title: 'Complaints', value: `${complaints.filter((c) => c.status === 'OPEN').length}`, suffix: `Open (${complaints.filter((c) => c.status === 'CLOSED').length} Resolved)`, colorType: 'primary' },
            { _isOverview: true, title: 'BSE Penalties', value: `₹${(penalties.filter((p) => p.status === 'PENDING_PAYMENT').reduce((acc, p) => acc + p.amount, 0)).toLocaleString()}`, suffix: `${penalties.filter((p) => p.status === 'PENDING_PAYMENT').length} Pending`, colorType: 'rose' },
            { _isOverview: true, title: 'Checklist', value: `${checklist.length > 0 ? Math.round((checklist.filter((item) => item.audit?.status === 'COMPLIANT').length / checklist.length) * 100) : 0}%`, suffix: `${checklist.filter((item) => item.audit?.status === 'COMPLIANT').length} Compliant`, colorType: 'emerald' },
            { _isOverview: true, title: 'Active Alerts', value: `${alerts.filter((a) => a.status === 'OPEN').length}`, suffix: `${alerts.filter((a) => a.status === 'OPEN' && a.severity === 'HIGH').length} High Severity`, colorType: 'amber' }
        ] :
            complianceTab === 'alerts' ? alerts :
                complianceTab === 'penalties' ? penalties :
                    complianceTab === 'complaints' ? complaints :
                        checklistHistory} title={NAV_CONFIG.find(n => n.tab === activeTab)?.label}/>
                              </div>
                            </div>
                          </div>)}
                      </div>
);
}
