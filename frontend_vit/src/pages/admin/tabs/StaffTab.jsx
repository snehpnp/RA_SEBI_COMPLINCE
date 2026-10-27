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



export default function StaffTab(props) {
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
    resetStaffForm,
    setIsStaffModalOpen,
    startEditStaff,
    staffColumns,
    tableCustomStyles,
    isDarkMode,
    fetchResearcherDscPermissions,
    loadingResearcherDsc,
    researcherDscList,
    updatingDscScopeId,
    handleUpdateDscScope,
    isStaffModalOpen,
    handleCreateOrUpdateStaff,
    staffName,
    setStaffName,
    staffUsername,
    setStaffUsername,
    staffEmail,
    setStaffEmail,
    staffMobile,
    setStaffMobile,
    staffRole,
    setStaffRole,
    staffDscScope,
    setStaffDscScope,
    associatedType,
    setAssociatedType,
    customAssociatedRole,
    setCustomAssociatedRole,
    staffNism,
    setStaffNism,
    isNismDuplicate,
    staffNismValidity,
    setStaffNismValidity,
    isParsingStaffNism,
    staffNismParsed,
    handleStaffNismFileChange,
    staffNismFile,
    nismParseMsg,
    isSubmittingStaff,
    showStaffCredsPopup,
    createdStaffCreds,
    setShowStaffCredsPopup,
    setCreatedStaffCreds,
    selectedStaff,
    setSelectedStaff,
    setRevealedStaffPassword,
    isResendingStaffPassword,
    setIsResendingStaffPassword,
    revealedStaffPassword,
    isLoadingStaffPassword,
    setIsLoadingStaffPassword,
    downloadFile
  } = admin || {};

  return (
<div className="space-y-6">
                      {/* Header with "+ Register Staff" button */}
                      <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">Staff Directory2</h3>
                        <div className="flex gap-3">
                          {(!isStaff || hasPermission('EXPORT_DATA')) && (<button onClick={() => import('@/utils/exportCsv').then(m => m.downloadCSV(staff, 'Staff_Members'))} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl text-xs font-bold hover:bg-slate-700 dark:hover:bg-slate-600 transition">
                              <Download className="w-4 h-4"/> Export CSV
                            </button>)}
                          <button onClick={() => {
        resetStaffForm();
        setIsStaffModalOpen(true);
    }} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs uppercase tracking-wide transition flex items-center space-x-2 text-white">
                            <Plus className="h-4 w-4"/>
                            <span>Register Staff</span>
                          </button>
                        </div>
                      </div>

                      {/* NISM Compliance Alert Banner */}
                      {(() => {
        const staffMissingNism = staff.filter((s) => {
            if (s.user?.deletedAt)
                return false;
            const roleName = s.user?.role?.name || s.roleName;
            const roleObj = roles.find((r) => r.name === roleName);
            const requiresNism = roleObj?.requiresNism || s.user?.role?.requiresNism;
            return requiresNism && (!s.nismNumber || !s.nismUpload);
        });
        if (staffMissingNism.length === 0)
            return null;
        return (<div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"/>
                              <div>
                                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                  NISM Compliance Alert: {staffMissingNism.length} staff member(s) missing mandatory NISM certification
                                </p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-300/90 mt-0.5">
                                  Role configuration requires NISM certification for: <span className="font-semibold">{staffMissingNism.map((s) => s.name).join(', ')}</span>. Please add their NISM number and certificate upload.
                                </p>
                              </div>
                            </div>
                            <button type="button" onClick={() => startEditStaff(staffMissingNism[0])} className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm whitespace-nowrap cursor-pointer transition shrink-0">
                              Add NISM Details →
                            </button>
                          </div>);
    })()}

                      {/* Staff directory table */}
                      <div className="rounded-2xl border border-slate-200 dark:border-slate-800/60 overflow-hidden w-full shadow-xl shadow-slate-200/20 dark:shadow-none bg-white dark:bg-[#0F172A]">
                        <div className="overflow-x-auto">
                          <DataTable columns={staffColumns} data={staff} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-8 text-center text-slate-500 dark:text-slate-400 font-medium">No staff members found.</div>}/>
                        </div>
                      </div>

                      {/* RESEARCHER HARDWARE DSC PERMISSIONS PANEL */}
                      {(hasPermission('MANAGE_STAFF_DSC') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800/60 p-6 space-y-5 shadow-xl shadow-slate-200/20 dark:shadow-none">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/5">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                                <Usb className="w-4 h-4"/>
                              </div>
                              <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                Researcher Hardware DSC Permissions (USB Token Signing)
                              </h4>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Configure physical USB DSC token permissions for Research Analysts. Control whether each researcher can sign reports for <strong>Self Login Only</strong> or as a <strong>Master DSC for All Researchers</strong>.
                            </p>
                          </div>
                          <button type="button" onClick={fetchResearcherDscPermissions} disabled={loadingResearcherDsc} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-300 dark:border-slate-700 transition flex items-center gap-1.5 shrink-0">
                            <RefreshCw className={`w-3.5 h-3.5 ${loadingResearcherDsc ? 'animate-spin' : ''}`}/>
                            <span>Refresh Permissions</span>
                          </button>
                        </div>

                        {/* Guidance Alerts Banner */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-1">
                            <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                              🟡 Self Login Only (SELF)
                            </span>
                            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                              Token CN must strictly match their own logged-in account name. Cannot sign on behalf of others.
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-1">
                            <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                              🟢 All Researchers (ALL)
                            </span>
                            <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                              Shared Master DSC. Any active researcher logged in can sign research reports using this connected physical USB token.
                            </p>
                          </div>
                          <div className="p-3.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/40 space-y-1">
                            <span className="font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                              🛡️ Inactive / Deleted Guard
                            </span>
                            <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                              If a researcher is marked Inactive or Deleted, their DSC USB token is automatically blocked immediately.
                            </p>
                          </div>
                        </div>

                        {/* Researcher List Table */}
                        {loadingResearcherDsc && researcherDscList.length === 0 ? (<div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-amber-600"/>
                            <span>Loading researcher DSC permissions...</span>
                          </div>) : researcherDscList.length === 0 ? (<div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                            No staff members with the <span className="font-bold text-amber-600">RESEARCHER</span> role found. Only staff assigned the Researcher role appear here.
                          </div>) : (<div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                    <th className="py-3 px-4">Researcher Name</th>
                                    <th className="py-3 px-4">Username / Email</th>
                                    <th className="py-3 px-4">Account Status</th>
                                    <th className="py-3 px-4">Current DSC Scope</th>
                                    <th className="py-3 px-4 text-right">Configure Permission</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                  {researcherDscList.map((resItem) => {
                const isInactiveOrDeleted = resItem.status !== 'ACTIVE' || !!resItem.deletedAt;
                const currentScope = resItem.dscSigningScope || 'DISABLED';
                const isUpdating = updatingDscScopeId === resItem.id;
                return (<tr key={resItem.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                          <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold flex items-center justify-center text-xs">
                                              {resItem.name ? resItem.name.charAt(0).toUpperCase() : 'R'}
                                            </div>
                                            <div>
                                              <span className="font-bold text-slate-900 dark:text-white block">
                                                {resItem.name}
                                              </span>
                                              <span className="text-[10px] text-slate-400 font-mono">
                                                Role: RESEARCHER
                                              </span>
                                            </div>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                          <div className="space-y-0.5">
                                            <span className="font-mono text-slate-800 dark:text-slate-200 font-bold block text-xs">
                                              @{resItem.username}
                                            </span>
                                            <span className="text-slate-500 text-[11px] block">
                                              {resItem.email}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                          {isInactiveOrDeleted ? (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                                              <AlertTriangle className="w-3 h-3"/>
                                              Inactive / Deactivated (DSC Blocked)
                                            </span>) : (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                                              <CheckCircle2 className="w-3 h-3"/>
                                              Active
                                            </span>)}
                                        </td>
                                        <td className="py-3.5 px-4">
                                          {isInactiveOrDeleted ? (<span className="text-[11px] text-rose-500 font-semibold italic">
                                              Blocked (Account Inactive)
                                            </span>) : currentScope === 'ALL' ? (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                              <ShieldCheck className="w-3.5 h-3.5"/>
                                              ALL (Master DSC)
                                            </span>) : currentScope === 'SELF' ? (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                              <Lock className="w-3.5 h-3.5"/>
                                              SELF (Personal Login Only)
                                            </span>) : (<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                                              DISABLED
                                            </span>)}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                          <div className="inline-flex items-center rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 border border-slate-200 dark:border-slate-700">
                                            {[
                        { id: 'DISABLED', label: 'Disabled', color: 'hover:text-rose-600' },
                        { id: 'SELF', label: 'Self Only', color: 'hover:text-amber-600' },
                        { id: 'ALL', label: 'All (Master)', color: 'hover:text-emerald-600' }
                    ].map((btn) => {
                        const active = currentScope === btn.id;
                        return (<button key={btn.id} type="button" disabled={isUpdating} onClick={() => handleUpdateDscScope(resItem.id, resItem.name, btn.id)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 ${active
                                ? btn.id === 'ALL'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : btn.id === 'SELF'
                                        ? 'bg-amber-600 text-white shadow-sm'
                                        : 'bg-slate-700 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700/60 ' + btn.color} disabled:opacity-50`}>
                                                  {isUpdating && active && <Loader2 className="w-3 h-3 animate-spin"/>}
                                                  <span>{btn.label}</span>
                                                </button>);
                    })}
                                          </div>
                                        </td>
                                      </tr>);
            })}
                                </tbody>
                              </table>
                            </div>
                          </div>)}
                      </div>)}

                      {/* Register/Edit Staff Modal Popup */}
                      {isStaffModalOpen && (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-4 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => {
            setIsStaffModalOpen(false);
            resetStaffForm();
        }} className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white">
                              <X className="h-5 w-5"/>
                            </button>

                            <h3 className="font-bold text-base text-slate-900 dark:text-white">
                              {editingStaff ? 'Edit Staff Member' : 'Register Staff Member'}
                            </h3>


                            <form onSubmit={handleCreateOrUpdateStaff} className="space-y-4 pt-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                                  <input type="text" required value={staffName} onChange={e => setStaffName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="Amit Sharma"/>
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                                    Username (Unique Login ID) *
                                  </label>
                                  <input type="text" required disabled={!!editingStaff} value={staffUsername} onChange={e => setStaffUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))} className={`w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono ${editingStaff ? 'opacity-60 cursor-not-allowed bg-slate-200 dark:bg-slate-800' : ''}`} placeholder="amit_sharma"/>
                                  {editingStaff && (<p className="text-[10px] text-slate-500 mt-1">Username is permanent and cannot be modified.</p>)}
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                                  <input type="email" required value={staffEmail} onChange={e => setStaffEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="amit@company.com"/>
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Mobile Number *</label>
                                  <input type="text" required value={staffMobile} onChange={e => setStaffMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="9811223344"/>
                                </div>

                                <div>
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Assign Role</label>
                                  {editingStaff ? (<input type="text" readOnly value={staffRole.replace(/_/g, ' ')} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono uppercase text-slate-600 dark:text-slate-400 cursor-not-allowed"/>) : (<select value={staffRole} onChange={e => setStaffRole(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono uppercase">
                                      {roles.length > 0 ? (<>
                                          {roles.filter(r => !['SUPER_ADMIN', 'CLIENT', 'ADMIN'].includes(r.name)).map((r) => (<option key={r.id} value={r.name}>{r.name.replace(/_/g, ' ')}</option>))}
                                          <option value="OTHER">OTHER</option>
                                        </>) : (<>
                                          <option value="RESEARCHER">RESEARCHER</option>
                                          <option value="PRINCIPAL_OFFICER">PRINCIPAL OFFICER</option>
                                          <option value="COMPLIANCE_OFFICER">COMPLIANCE OFFICER</option>
                                          <option value="PERSON_ASSOCIATED">PERSON ASSOCIATED WITH RESEARCH</option>
                                          <option value="OTHER">OTHER</option>
                                        </>)}
                                    </select>)}
                                </div>
                              </div>

                              {staffRole === 'RESEARCHER' && (<div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                                    <Usb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"/>
                                    <span>Hardware DSC Token Permission Scope</span>
                                  </div>
                                  <select value={staffDscScope} onChange={e => setStaffDscScope(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-semibold">
                                    <option value="DISABLED">DISABLED (No DSC Signing)</option>
                                    <option value="SELF">SELF (Can only sign in their own login account)</option>
                                    <option value="ALL">ALL (Shared Master DSC - Any researcher can sign)</option>
                                  </select>
                                  <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 leading-relaxed">
                                    Controls whether this researcher&apos;s physical USB DSC token can sign for Self only or acts as a shared Master DSC for all researchers.
                                  </p>
                                </div>)}

                              {staffRole === 'PERSON_ASSOCIATED' && (<div className="space-y-3 bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                  <div>
                                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Associated Type</label>
                                    <select value={associatedType} onChange={e => setAssociatedType(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs">
                                      <option value="SALES">SALES</option>
                                      <option value="MARKETING">MARKETING</option>
                                    </select>
                                  </div>
                                </div>)}

                              {staffRole === 'OTHER' && (<div className="bg-slate-100 dark:bg-white/5 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                  <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Custom Role Name</label>
                                  <input type="text" required value={customAssociatedRole} onChange={e => setCustomAssociatedRole(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. Technical Support"/>
                                </div>)}

                              {(() => {
            const selectedRoleObj = roles.find((r) => r.name === staffRole);
            const roleRequiresNism = selectedRoleObj?.requiresNism === true;
            if (!roleRequiresNism)
                return null;
            return (<div className="border-t border-slate-300 dark:border-white/5 pt-3 space-y-4 animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">NISM Certification</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                        Mandatory for this Role *
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Certificate No *</label>
                                        <input type="text" required value={staffNism} onChange={e => setStaffNism(e.target.value)} className={`w-full bg-slate-100 dark:bg-slate-950 border rounded-xl py-2 px-3 text-xs ${isNismDuplicate ? 'border-red-500 text-red-200' : 'border-slate-400 dark:border-white/10 text-slate-700 dark:text-slate-300'}`} placeholder="NISM-8899"/>
                                        {isNismDuplicate && (<span className="text-red-600 dark:text-red-500 text-[10px] mt-1 block">
                                            Duplicate NISM Certificate Number. Please enter a unique number.
                                          </span>)}
                                      </div>

                                      <div>
                                        <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Validity Expiry *</label>
                                        <input type="date" required value={staffNismValidity} onChange={e => setStaffNismValidity(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-600 dark:text-slate-400"/>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Upload NISM Certificate Document * <span className="text-slate-500 dark:text-slate-500">(PDF auto-fills details)</span></label>
                                      <div className={`border border-dashed rounded-xl p-4 text-center transition relative ${isParsingStaffNism ? 'border-amber-500/30 bg-amber-500/5' : staffNismParsed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10'}`}>
                                        <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleStaffNismFileChange} disabled={isParsingStaffNism} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"/>
                                        {isParsingStaffNism ? (<>
                                            <div className="h-5 w-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-1"/>
                                            <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Reading NISM certificate...</span>
                                          </>) : staffNismParsed ? (<>
                                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1"/>
                                            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-bold">✅ Auto-filled from PDF</span>
                                            <span className="text-[9px] text-slate-600 dark:text-slate-400 block">{staffNismFile?.name}</span>
                                          </>) : staffNismFile ? (<>
                                            <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-1"/>
                                            <span className="text-[10px] text-blue-700 dark:text-blue-300 block">{staffNismFile.name}</span>
                                            <span className="text-[9px] text-slate-600 dark:text-slate-400 block">Please fill in details manually</span>
                                          </>) : (<>
                                            <UploadCloud className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1"/>
                                            <span className="text-[10px] text-slate-700 dark:text-slate-300 block">
                                              Upload certificate PDF for auto-fill (or JPG/PNG)
                                            </span>
                                          </>)}
                                      </div>
                                      {nismParseMsg && (<p className={`text-[10px] mt-1 ${nismParseMsg.startsWith('✅') ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                          {nismParseMsg}
                                        </p>)}
                                      {editingStaff?.nismUpload && (<div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 flex justify-between items-center">
                                          <span>Current certificate:</span>
                                          <a href={`${api.getBaseUrl()}${editingStaff.nismUpload}`} target="_blank" rel="noreferrer" className="underline hover:text-emerald-700 dark:text-emerald-300 font-bold">
                                            View Certificate File
                                          </a>
                                        </div>)}
                                    </div>
                                  </div>);
        })()}

                              <div className="flex space-x-3 pt-2 justify-end text-xs">
                                <button type="button" onClick={() => {
            setIsStaffModalOpen(false);
            resetStaffForm();
        }} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5">
                                  Cancel
                                </button>
                                <button type="submit" disabled={isNismDuplicate || isParsingStaffNism || isSubmittingStaff} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold transition flex items-center space-x-2">
                                  {(isParsingStaffNism || isSubmittingStaff) && <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
                                  <span>{isSubmittingStaff ? 'Saving...' : (editingStaff ? 'Save Changes' : 'Register Staff')}</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>)}

                      {/* Staff Credentials Popup - Shows only ID & Password after registration */}
                      {showStaffCredsPopup && createdStaffCreds && (<div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                          <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-8 space-y-6 relative shadow-2xl shadow-emerald-500/10">
                            {/* Glow effect */}
                            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"/>

                            {/* Header */}
                            <div className="text-center space-y-2">
                              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
                                <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400"/>
                              </div>
                              <h3 className="text-xl font-black text-slate-900 dark:text-white">Staff Registered!</h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400">Save these login credentials. They won't be shown again.</p>
                            </div>

                            {/* Credentials */}
                            <div className="space-y-3">
                              <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-400 dark:border-white/10 rounded-xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Login ID (Username)</span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm text-emerald-700 dark:text-emerald-300 font-bold break-all">
                                    {createdStaffCreds?.username || createdStaffCreds?.staff?.username || createdStaffCreds?.user?.username || createdStaffCreds?.staff?.email || createdStaffCreds?.email || '—'}
                                  </span>
                                  <button onClick={() => navigator.clipboard.writeText(createdStaffCreds?.username || createdStaffCreds?.staff?.username || createdStaffCreds?.user?.username || createdStaffCreds?.staff?.email || createdStaffCreds?.email || '')} className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition font-semibold">Copy</button>
                                </div>
                              </div>

                              <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-400 dark:border-white/10 rounded-xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Registered Email</span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold break-all">{createdStaffCreds?.staff?.email || createdStaffCreds?.email || '—'}</span>
                                  <button onClick={() => navigator.clipboard.writeText(createdStaffCreds?.staff?.email || createdStaffCreds?.email || '')} className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition font-semibold">Copy</button>
                                </div>
                              </div>

                              <div className="bg-slate-100 dark:bg-slate-950/80 border border-slate-400 dark:border-white/10 rounded-xl p-4 space-y-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider block">Password</span>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm text-amber-700 dark:text-amber-300 font-bold tracking-widest">{createdStaffCreds?.generatedPassword || '—'}</span>
                                  <button onClick={() => navigator.clipboard.writeText(createdStaffCreds?.generatedPassword || '')} className="shrink-0 text-[10px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition font-semibold">Copy</button>
                                </div>
                              </div>
                            </div>

                            <p className="text-[10px] text-center text-slate-500 dark:text-slate-500">
                              ⚠️ Share these credentials with the staff member securely.
                            </p>

                            <button onClick={() => {
            setShowStaffCredsPopup(false);
            setCreatedStaffCreds(null);
        }} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-sm">
                              Done — Credentials Saved
                            </button>
                          </div>
                        </div>)}

                      {/* Complete Detail View Modal Popup */}
                      {selectedStaff && (<div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-6 relative max-h-[90vh] overflow-y-auto">
                            <button onClick={() => {
            setSelectedStaff(null);
            setRevealedStaffPassword(null);
        }} className="absolute top-4 right-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white">
                              <X className="h-5 w-5"/>
                            </button>

                            <div>
                              <h3 className="font-bold text-base text-slate-900 dark:text-white">Staff Member Details</h3>
                              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">ID: {selectedStaff.employeeId}</p>
                            </div>

                            <div className="space-y-4">
                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Full Name</span>
                                  <span className="font-bold text-slate-900 dark:text-white">{selectedStaff.name}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Username (Login ID)</span>
                                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">@{selectedStaff.username || selectedStaff.user?.username || '—'}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Email Address</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.email}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Mobile Number</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.mobile}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">SEBI System Role</span>
                                  <span className="px-2 py-0.5 rounded bg-primary-500/10 text-primary-600 dark:text-primary-400 font-mono font-bold uppercase tracking-wider text-[9px]">
                                    {selectedStaff.user?.role?.name || 'N/A'}
                                  </span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Registered On</span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {selectedStaff.user?.createdAt ? new Date(selectedStaff.user.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
                                  </span>
                                </div>

                                {selectedStaff.personAssociated && (<>
                                    <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                      <span className="text-slate-600 dark:text-slate-400">Associated Type</span>
                                      <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.personAssociated.roleType}</span>
                                    </div>
                                    {selectedStaff.personAssociated.roleType === 'OTHER' && (<div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                        <span className="text-slate-600 dark:text-slate-400">Custom Role Name</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{selectedStaff.personAssociated.customRole}</span>
                                      </div>)}
                                  </>)}
                              </div>

                              {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<div className="bg-blue-50/80 dark:bg-blue-950/40 p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 space-y-3 text-xs">
                                  <div className="flex items-center justify-between border-b border-blue-200 dark:border-blue-900/60 pb-2">
                                    <span className="font-bold text-[10px] text-blue-800 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                                      <Lock className="w-3.5 h-3.5"/> Staff Login Credentials (Admin Only)
                                    </span>
                                    <button type="button" disabled={isResendingStaffPassword} onClick={async () => {
                setIsResendingStaffPassword(true);
                try {
                    const res = await api.resendStaffPassword(selectedStaff.id);
                    if (res.success) {
                        toast.success(res.message || 'Login credentials sent to staff email!');
                    }
                    else {
                        toast.error(res.message || 'Failed to resend credentials.');
                    }
                }
                catch (err) {
                    toast.error(err.message || 'Failed to resend credentials.');
                }
                finally {
                    setIsResendingStaffPassword(false);
                }
            }} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[10px] transition disabled:opacity-50 cursor-pointer shadow-sm" title="Send credentials directly to staff registered email">
                                      {isResendingStaffPassword ? (<>
                                          <Loader2 className="w-3 h-3 animate-spin"/>
                                          <span>Sending...</span>
                                        </>) : (<>
                                          <Mail className="w-3 h-3"/>
                                          <span>Resend Password</span>
                                        </>)}
                                    </button>
                                  </div>

                                  <div className="flex justify-between items-center border-b border-blue-100 dark:border-blue-900/30 pb-2">
                                    <span className="text-slate-600 dark:text-slate-400">Assigned Username</span>
                                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                                      @{selectedStaff.username || selectedStaff.user?.username || '—'}
                                    </span>
                                  </div>

                                  <div className="flex justify-between items-center">
                                    <span className="text-slate-600 dark:text-slate-400">Current Login Password</span>
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-slate-900 dark:text-white text-xs bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                                        {revealedStaffPassword ? revealedStaffPassword : '••••••••••••'}
                                      </span>
                                      <button type="button" disabled={isLoadingStaffPassword} onClick={async () => {
                if (revealedStaffPassword) {
                    setRevealedStaffPassword(null);
                    return;
                }
                setIsLoadingStaffPassword(true);
                try {
                    const res = await api.getStaffPassword(selectedStaff.id);
                    if (res.success && res.data?.password) {
                        setRevealedStaffPassword(res.data.password);
                    }
                    else {
                        toast.error('No stored password found. Click "Resend Password" to generate and email credentials.');
                    }
                }
                catch (err) {
                    toast.error(err.message || 'Failed to retrieve password');
                }
                finally {
                    setIsLoadingStaffPassword(false);
                }
            }} className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition cursor-pointer" title={revealedStaffPassword ? "Hide Password" : "View Password"}>
                                        {isLoadingStaffPassword ? (<Loader2 className="w-4 h-4 animate-spin text-blue-600"/>) : revealedStaffPassword ? (<EyeOff className="w-4 h-4 text-slate-600 dark:text-slate-300"/>) : (<Eye className="w-4 h-4 text-blue-600 dark:text-blue-400"/>)}
                                      </button>
                                    </div>
                                  </div>
                                </div>)}

                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">NISM Certification</span>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Certificate No</span>
                                  <span className="font-bold text-slate-900 dark:text-white">{selectedStaff.nismNumber || 'N/A'}</span>
                                </div>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Validity Expiry</span>
                                  <span className="font-bold text-slate-900 dark:text-white">
                                    {selectedStaff.nismValidity ? new Date(selectedStaff.nismValidity).toDateString() : 'N/A'}
                                  </span>
                                </div>

                                <div className="flex justify-between items-center pt-1">
                                  <span className="text-slate-600 dark:text-slate-400">Certificate File</span>
                                  {selectedStaff.nismUpload ? (<button type="button" onClick={() => {
                const fileUrl = `${api.getBaseUrl()}${selectedStaff.nismUpload}`;
                const fileName = selectedStaff.nismUpload.split('/').pop() || 'nism_certificate';
                downloadFile(fileUrl, fileName);
            }} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer bg-transparent border-0">
                                      Download File
                                    </button>) : (<span className="text-slate-500 dark:text-slate-500 font-bold">No file uploaded</span>)}
                                </div>
                              </div>

                              {selectedStaff.nismUpload && (<div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                  <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Certificate Preview</span>

                                  <div className="w-full rounded-lg bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 flex items-center justify-center overflow-hidden min-h-[160px]">
                                    {selectedStaff.nismUpload.toLowerCase().endsWith('.pdf') ? (<iframe src={`${api.getBaseUrl()}${selectedStaff.nismUpload}`} className="w-full h-48 border-0 bg-white" title="NISM Certificate PDF"/>) : (selectedStaff.nismUpload.toLowerCase().endsWith('.png') ||
                selectedStaff.nismUpload.toLowerCase().endsWith('.jpg') ||
                selectedStaff.nismUpload.toLowerCase().endsWith('.jpeg')) ? (<img src={`${api.getBaseUrl()}${selectedStaff.nismUpload}`} alt="NISM Certificate" className="max-w-full max-h-48 object-contain"/>) : (<span className="text-slate-500 dark:text-slate-500 font-bold">Preview not available</span>)}
                                  </div>

                                  <div className="flex gap-3 justify-end pt-1">
                                    <a href={`${api.getBaseUrl()}${selectedStaff.nismUpload}`} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition">
                                      <Eye className="h-3 w-3"/>
                                      Open Full
                                    </a>
                                    <button type="button" onClick={() => {
                const fileUrl = `${api.getBaseUrl()}${selectedStaff.nismUpload}`;
                const fileName = selectedStaff.nismUpload.split('/').pop() || 'nism_certificate';
                downloadFile(fileUrl, fileName);
            }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition cursor-pointer">
                                      <UploadCloud className="h-3 w-3 rotate-180"/>
                                      Download File
                                    </button>
                                  </div>
                                </div>)}

                              <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/5 space-y-3 text-xs">
                                <span className="font-bold text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider block">System Status</span>

                                <div className="flex justify-between border-b border-slate-300 dark:border-white/5 pb-2">
                                  <span className="text-slate-600 dark:text-slate-400">Staff Status</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold ${selectedStaff.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'}`}>
                                    {selectedStaff.status}
                                  </span>
                                </div>

                                <div className="flex justify-between">
                                  <span className="text-slate-600 dark:text-slate-400">Account Access</span>
                                  {selectedStaff.user?.deletedAt ? (<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                                      DELETED (SOFT)
                                    </span>) : (<span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                      ACTIVE MEMBER
                                    </span>)}
                                </div>
                              </div>
                            </div>

                            <div className="flex space-x-3 pt-2 justify-end text-xs">
                              {selectedStaff.user?.deletedAt === null && (<button type="button" onClick={() => {
                setSelectedStaff(null);
                startEditStaff(selectedStaff);
            }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-white transition">
                                  Edit Profile
                                </button>)}
                              <button type="button" onClick={() => {
            setSelectedStaff(null);
            setRevealedStaffPassword(null);
        }} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5">
                                Close Details
                              </button>
                            </div>
                          </div>
                        </div>)}
                    </div>
);
}
