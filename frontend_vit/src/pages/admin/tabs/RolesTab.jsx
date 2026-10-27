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



export default function RolesTab(props) {
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
    setNewRoleName,
    setNewRoleDesc,
    setIsRoleModalOpen,
    selectedRole,
    setSelectedRole,
    setEditRoleId,
    setEditRoleName,
    setEditRoleDesc,
    setEditRoleRequiresNism,
    setEditRoleTwoFactorAuth,
    setIsEditRoleModalOpen,
    handleDeleteRole,
    triggerConfirm,
    loadData,
    permissionSearchQuery,
    setPermissionSearchQuery,
    NAV_CONFIG,
    renderPermissionCheckbox,
    handleSavePermissions,
    savingPermissions,
    isRoleModalOpen,
    handleCreateRole,
    newRoleName,
    newRoleDesc,
    newRoleRequiresNism,
    setNewRoleRequiresNism,
    newRoleTwoFactorAuth,
    setNewRoleTwoFactorAuth,
    roleModalLoading,
    isEditRoleModalOpen,
    handleEditRole,
    editRoleName,
    editRoleDesc,
    editRoleRequiresNism,
    editRoleTwoFactorAuth,
    editRoleModalLoading
  } = admin || {};

  return (
<>
                  {activeTab === 'roles' && hasPermission('ACCESS_ROLES') && (<div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">Access Control & Role Permissions</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Configure permission access matrices for default and custom roles in the platform</p>
                        </div>
                        {hasPermission('ACCESS_ROLES') && (<button onClick={() => {
                setNewRoleName('');
                setNewRoleDesc('');
                setIsRoleModalOpen(true);
            }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center shadow-lg shadow-primary-500/20 shrink-0">
                            <Plus className="h-4 w-4 mr-1.5"/> Create Custom Role
                          </button>)}
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        {/* Roles List Sidebar (Left Column) */}
                        <div className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-6">
                          <div className="bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/60">
                              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Available Roles</h3>
                              <span className="text-[10px] font-mono font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">
                                {roles.filter((r) => !(user?.role === 'ADMIN' && r.name === 'SUPER_ADMIN')).length} Roles
                              </span>
                            </div>

                            <div className="space-y-2.5 max-h-[480px] overflow-y-auto custom-scrollbar pr-1.5">
                              {roles.filter((r) => !(user?.role === 'ADMIN' && r.name === 'SUPER_ADMIN')).map((r) => {
            const isSelected = selectedRole?.id === r.id;
            const isSystemRole = ['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'].includes(r.name);
            return (<button key={r.id} onClick={() => setSelectedRole(r)} className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col ${isSelected
                    ? 'bg-primary-50/80 dark:bg-primary-950/40 border-primary-500 ring-1 ring-primary-500/40 shadow-md shadow-primary-500/10'
                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 hover:border-primary-500/40 hover:bg-white dark:hover:bg-slate-800/60'}`}>
                                    <div className="flex items-center justify-between w-full mb-1.5">
                                      <span className={`font-bold text-xs tracking-wide font-mono uppercase truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-900 dark:text-slate-100'}`}>
                                        {r.name.replace(/_/g, ' ')}
                                      </span>
                                      {isSystemRole ? (<span className="text-[9px] bg-slate-500/10 border border-slate-500/20 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">System</span>) : (<span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono shrink-0">Custom</span>)}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2">{r.description || 'Access controls and dashboard view'}</p>
                                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                      <div className="flex items-center">
                                        <ShieldCheck className={`h-3.5 w-3.5 mr-1.5 ${isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`}/>
                                        <span>{r.permissions?.length || 0} perms</span>
                                      </div>
                                      <ChevronRight className={`h-3.5 w-3.5 transition-transform ${isSelected ? 'text-primary-600 dark:text-primary-400 translate-x-0.5' : 'text-slate-300 dark:text-slate-600'}`}/>
                                    </div>
                                  </button>);
        })}
                            </div>
                          </div>
                        </div>

                        {/* Permissions Configuration (Right Column) */}
                        <div className="lg:col-span-8 xl:col-span-9 space-y-6">
                          {!selectedRole ? (<div className="bg-white dark:bg-[#0F172A] p-12 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none text-center flex flex-col items-center justify-center space-y-4">
                              <ShieldCheck className="h-16 w-16 text-slate-400 dark:text-slate-600 animate-pulse"/>
                              <div>
                                <h3 className="font-bold text-base text-slate-700 dark:text-slate-300">Select a Role</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm">Choose a system or custom role from the left panel to configure its access controls and dashboard page visibility.</p>
                              </div>
                            </div>) : (<div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                              <div className="pb-5 border-b border-slate-200 dark:border-slate-800/60 flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-lg font-bold font-mono tracking-wide">{selectedRole.name.replace(/_/g, ' ')}</h3>
                                    <span className="px-2 py-0.5 rounded bg-primary-500/15 border border-primary-500/30 text-[10px] font-bold text-primary-600 dark:text-primary-400">Permissions Matrix</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{selectedRole.description || 'Manage user portal access controls.'}</p>
                                </div>

                                {['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) ? (<div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 max-w-xs text-[11px] text-amber-700 dark:text-amber-300">
                                    <strong>Read-Only Access:</strong> Admin and Super Admin roles hold absolute permissions which cannot be disabled.
                                  </div>) : !['SUPER_ADMIN', 'ADMIN', 'PRINCIPAL_OFFICER', 'COMPLIANCE_OFFICER', 'RESEARCHER', 'PERSON_ASSOCIATED', 'CLIENT'].includes(selectedRole.name) && (<div className="flex flex-col items-end space-y-1 bg-slate-100 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-300 dark:border-white/5">
                                    <div className="flex space-x-2">
                                      <button onClick={() => {
                    setEditRoleId(selectedRole.id);
                    setEditRoleName(selectedRole.name);
                    setEditRoleDesc(selectedRole.description || '');
                    setEditRoleRequiresNism(!!selectedRole.requiresNism);
                    setEditRoleTwoFactorAuth(selectedRole.twoFactorAuth || 'DISABLED');
                    setIsEditRoleModalOpen(true);
                }} disabled={selectedRole.isAssigned} className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white border border-slate-400 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed" title={selectedRole.isAssigned ? "This role is currently assigned to users and cannot be modified." : "Edit this custom role's name and description"}>
                                        <Edit2 className="h-3 w-3 mr-1"/> Edit Role
                                      </button>
                                      <button onClick={() => handleDeleteRole(selectedRole.id)} disabled={selectedRole.isAssigned} className="px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center bg-red-950/40 border border-red-500/30 text-red-600 dark:text-red-400 hover:text-slate-900 dark:text-white hover:bg-red-900/40 disabled:opacity-50 disabled:cursor-not-allowed" title={selectedRole.isAssigned ? "This role is currently assigned to users and cannot be deleted." : "Delete this custom role"}>
                                        <Trash2 className="h-3 w-3 mr-1"/> Delete Role
                                      </button>
                                    </div>
                                    {selectedRole.isAssigned && (<span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">
                                        Cannot edit/delete: Assigned to staff
                                      </span>)}
                                  </div>)}
                              </div>

                              {/* Login & Compliance Settings */}
                              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                                <div className="border-b border-slate-200 dark:border-slate-800/60 pb-3">
                                  <h4 className="font-bold text-xs uppercase tracking-wider text-primary-600 dark:text-primary-400">Role Security & Compliance Settings</h4>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Configure device login constraints, NISM certification enforcement, and 2-Step verification.</p>
                                </div>

                                {/* Multi-Device Login */}
                                <div className="flex items-center justify-between">
                                  <div className="pr-4">
                                    <p className="text-sm font-semibold">Allow Multi-Device Login</p>
                                    <p className="text-xs text-slate-500">If disabled, users can only log in from one device at a time. New logins will automatically log out older sessions.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input type="checkbox" className="sr-only peer" checked={!!selectedRole.allowMultiDeviceLogin} onChange={(e) => {
                const newValue = e.target.checked;
                triggerConfirm({
                    title: 'Update Login Constraint',
                    message: `Are you sure you want to set the login constraint for ${selectedRole.name} to ${newValue ? 'Multi-Device' : 'Single-Device'}?`,
                    variant: 'warning',
                    confirmLabel: 'Yes, Update',
                    cancelLabel: 'Cancel',
                    onConfirm: async () => {
                        const prevValue = selectedRole.allowMultiDeviceLogin;
                        setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: newValue });
                        try {
                            const res = await api.updateRole(selectedRole.id, { allowMultiDeviceLogin: newValue });
                            if (res.success) {
                                const rReq = await api.getRoles();
                                if (rReq.success) {
                                    setRoles(rReq.data);
                                    const updated = rReq.data.find((r) => r.id === selectedRole.id);
                                    if (updated)
                                        setSelectedRole(updated);
                                }
                                if (user?.role === selectedRole.name) {
                                    const updatedUser = { ...user, allowMultiDeviceLogin: newValue };
                                    setUser(updatedUser);
                                    localStorage.setItem('user', JSON.stringify(updatedUser));
                                }
                            }
                            else {
                                setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: prevValue });
                            }
                        }
                        catch (err) {
                            setSelectedRole({ ...selectedRole, allowMultiDeviceLogin: prevValue });
                        }
                    }
                });
            }}/>
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500"></div>
                                  </label>
                                </div>

                                {/* NISM Requirement Toggle */}
                                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-4">
                                  <div className="pr-4">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold">Require NISM Certification</p>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedRole.requiresNism ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {selectedRole.requiresNism ? 'Required' : 'Not Required'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">When enabled, staff assigned this role must submit NISM certificate number, validity date, and document upload.</p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                    <input type="checkbox" className="sr-only peer" checked={!!selectedRole.requiresNism} onChange={async (e) => {
                const newValue = e.target.checked;
                const prevValue = selectedRole.requiresNism;
                setSelectedRole({ ...selectedRole, requiresNism: newValue });
                try {
                    const res = await api.updateRole(selectedRole.id, { requiresNism: newValue });
                    if (res.success) {
                        toast.success(`NISM certification requirement ${newValue ? 'enabled' : 'disabled'} for ${selectedRole.name}.`);
                        const rReq = await api.getRoles();
                        if (rReq.success) {
                            setRoles(rReq.data);
                            const updated = rReq.data.find((r) => r.id === selectedRole.id);
                            if (updated)
                                setSelectedRole(updated);
                        }
                        loadData();
                    }
                    else {
                        setSelectedRole({ ...selectedRole, requiresNism: prevValue });
                    }
                }
                catch {
                    setSelectedRole({ ...selectedRole, requiresNism: prevValue });
                }
            }}/>
                                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-amber-500"></div>
                                  </label>
                                </div>

                                {/* Two-Step Verification (2FA) */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-4 gap-3">
                                  <div className="pr-4">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-semibold">Two-Step Verification (2FA)</p>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedRole.twoFactorAuth && selectedRole.twoFactorAuth !== 'DISABLED' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                        {selectedRole.twoFactorAuth || 'DISABLED'}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">Control whether staff/admin in this role must verify an OTP upon login.</p>
                                  </div>
                                  <select value={selectedRole.twoFactorAuth || 'DISABLED'} onChange={async (e) => {
                const newValue = e.target.value;
                const prevValue = selectedRole.twoFactorAuth;
                setSelectedRole({ ...selectedRole, twoFactorAuth: newValue });
                try {
                    const res = await api.updateRole(selectedRole.id, { twoFactorAuth: newValue });
                    if (res.success) {
                        toast.success(`Two-step verification set to ${newValue} for ${selectedRole.name}.`);
                        const rReq = await api.getRoles();
                        if (rReq.success) {
                            setRoles(rReq.data);
                            const updated = rReq.data.find((r) => r.id === selectedRole.id);
                            if (updated)
                                setSelectedRole(updated);
                        }
                    }
                    else {
                        setSelectedRole({ ...selectedRole, twoFactorAuth: prevValue });
                    }
                }
                catch {
                    setSelectedRole({ ...selectedRole, twoFactorAuth: prevValue });
                }
            }} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-white shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="DISABLED">Disabled (Direct Login)</option>
                                    <option value="EMAIL_OTP">Email OTP Verification</option>
                                    <option value="SMS_OTP">Mobile SMS OTP Verification</option>
                                    <option value="BOTH">Both (Email & SMS OTP)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Module Permissions Toolbar */}
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">Module & Action Permissions</h4>
                                  <p className="text-[10px] text-slate-500 mt-0.5">Define what sections and actions this role can access.</p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                  {/* Search Input */}
                                  <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
                                    <input type="text" placeholder="Search modules..." value={permissionSearchQuery} onChange={e => setPermissionSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs w-full sm:w-48 focus:outline-none focus:ring-1 focus:ring-primary-500"/>
                                  </div>

                                  {!['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) && (<div className="flex items-center gap-2">
                                      <button onClick={() => {
                    const allPerms = [];
                    NAV_CONFIG.forEach(mod => {
                        if (tenantDetails?.complianceFeaturesEnabled === false && ['compliance', 'checklist', 'penalty-matrix'].includes(mod.tab))
                            return;
                        allPerms.push(mod.accessKey);
                        if (mod.subPermissions)
                            mod.subPermissions.forEach(sp => allPerms.push(sp.code));
                    });
                    setSelectedRole({ ...selectedRole, permissions: [...new Set(allPerms)] });
                }} className="px-3 py-1.5 text-[11px] font-bold bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-500/20 transition flex items-center">
                                        <CheckSquare className="w-3.5 h-3.5 mr-1"/> Select All
                                      </button>
                                      <button onClick={() => setSelectedRole({ ...selectedRole, permissions: [] })} className="px-3 py-1.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center">
                                        <X className="w-3.5 h-3.5 mr-1"/> Unselect All
                                      </button>
                                    </div>)}
                                </div>
                              </div>

                              {/* AUTO-GENERATED from NAV_CONFIG — add new modules in NAV_CONFIG at the top of this file */}
                              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {NAV_CONFIG.filter(mod => {
                if (tenantDetails?.complianceFeaturesEnabled === false && ['compliance', 'checklist', 'penalty-matrix'].includes(mod.tab))
                    return false;
                if (!permissionSearchQuery)
                    return true;
                const q = permissionSearchQuery.toLowerCase();
                return mod.moduleLabel.toLowerCase().includes(q) ||
                    mod.moduleDesc.toLowerCase().includes(q) ||
                    (mod.subPermissions && mod.subPermissions.some(sp => sp.label.toLowerCase().includes(q) || sp.desc.toLowerCase().includes(q)));
            }).map(mod => {
                const hasSub = mod.subPermissions && mod.subPermissions.length > 0;
                return (<div key={mod.tab} className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 transition-all hover:border-slate-300 dark:hover:border-slate-700">
                                      <div className={`flex flex-col lg:flex-row lg:items-start justify-between gap-5 ${hasSub ? 'border-b border-slate-200 dark:border-slate-800/60 pb-5 mb-5' : ''}`}>
                                        <div className="flex-1 pr-4">
                                          <div className="flex items-center space-x-2">
                                            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{mod.moduleLabel}</h4>
                                          </div>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">{mod.moduleDesc}</p>
                                        </div>
                                        <div className="shrink-0 w-full lg:w-72">
                                          {renderPermissionCheckbox(mod.accessKey, 'Enable Module', 'Toggle access to this entire tab')}
                                        </div>
                                      </div>

                                      {hasSub && (<div className="space-y-3">
                                          <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Granular Permissions (Module Actions)</h5>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white dark:bg-[#0F172A] p-4 rounded-xl border border-slate-100 dark:border-slate-800/40">
                                            {mod.subPermissions
                            .filter(sp => {
                            if (sp.code === 'ADD_RESEARCH' && selectedRole?.permissions?.includes('OWN_RESEARCH'))
                                return false;
                            if (sp.code === 'OWN_RESEARCH' && selectedRole?.permissions?.includes('ADD_RESEARCH'))
                                return false;
                            if (sp.code === 'VIEW_ALL_TICKETS' && selectedRole?.permissions?.includes('VIEW_OWN_TICKETS'))
                                return false;
                            if (sp.code === 'VIEW_OWN_TICKETS' && selectedRole?.permissions?.includes('VIEW_ALL_TICKETS'))
                                return false;
                            return true;
                        })
                            .map(sp => (renderPermissionCheckbox(sp.code, sp.label, sp.desc, mod.accessKey)))}
                                          </div>
                                        </div>)}
                                    </div>);
            })}
                              </div>

                              {!['SUPER_ADMIN', 'ADMIN'].includes(selectedRole.name) && (<div className="pt-6 border-t border-slate-200 dark:border-slate-800/60 flex justify-end">
                                  <button onClick={handleSavePermissions} disabled={savingPermissions} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium text-white text-xs transition flex items-center disabled:opacity-50">
                                    {savingPermissions ? (<>
                                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-2"/> Saving...
                                      </>) : ('Save Access Permissions')}
                                  </button>
                                </div>)}
                            </div>)}
                        </div>

                      </div>
                    </div>)}
              {isRoleModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Create Custom Role</h3>
                      <button onClick={() => setIsRoleModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5"/></button>
                    </div>
                    <div className="p-6">
                      <form id="roleForm" onSubmit={handleCreateRole} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role Name</label>
                          <input type="text" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Sales Executive"/>
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">Name will automatically convert to UPPERCASE format (e.g. SALES_EXECUTIVE).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <textarea value={newRoleDesc} onChange={e => setNewRoleDesc(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm min-h-[80px]" placeholder="Describe role responsibilities..."/>
                        </div>

                        {/* NISM Requirement */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-xl">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Require NISM Certification</span>
                            <span className="text-[11px] text-slate-500 block">Mandates NISM certificate & doc upload for staff</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" className="sr-only peer" checked={newRoleRequiresNism} onChange={e => setNewRoleRequiresNism(e.target.checked)}/>
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500"></div>
                          </label>
                        </div>

                        {/* Two-Step Verification */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Two-Step Verification (2FA)</label>
                          <select value={newRoleTwoFactorAuth} onChange={e => setNewRoleTwoFactorAuth(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-sm">
                            <option value="DISABLED">Disabled (Direct login with Username & Password)</option>
                            <option value="EMAIL_OTP">Email OTP (Send OTP to registered email)</option>
                            <option value="SMS_OTP">Mobile SMS OTP (Send OTP to registered mobile)</option>
                            <option value="BOTH">Both (Require both Email & SMS OTP)</option>
                          </select>
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsRoleModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="roleForm" disabled={roleModalLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {roleModalLoading ? 'Creating...' : 'Create Role'}
                      </button>
                    </div>
                  </div>
                </div>)}

              {/* Edit Role Modal */}
              {isEditRoleModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Edit Custom Role</h3>
                      <button onClick={() => setIsEditRoleModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5"/></button>
                    </div>
                    <div className="p-6">
                      <form id="editRoleForm" onSubmit={handleEditRole} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Role Name</label>
                          <input type="text" value={editRoleName} onChange={e => setEditRoleName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Sales Executive"/>
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-1">Name will automatically convert to UPPERCASE format (e.g. SALES_EXECUTIVE).</p>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <textarea value={editRoleDesc} onChange={e => setEditRoleDesc(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm min-h-[80px]" placeholder="Describe role responsibilities..."/>
                        </div>

                        {/* NISM Requirement */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 rounded-xl">
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Require NISM Certification</span>
                            <span className="text-[11px] text-slate-500 block">Mandates NISM certificate & doc upload for staff</span>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input type="checkbox" className="sr-only peer" checked={editRoleRequiresNism} onChange={e => setEditRoleRequiresNism(e.target.checked)}/>
                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-500"></div>
                          </label>
                        </div>

                        {/* Two-Step Verification */}
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Two-Step Verification (2FA)</label>
                          <select value={editRoleTwoFactorAuth} onChange={e => setEditRoleTwoFactorAuth(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-sm">
                            <option value="DISABLED">Disabled (Direct login with Username & Password)</option>
                            <option value="EMAIL_OTP">Email OTP (Send OTP to registered email)</option>
                            <option value="SMS_OTP">Mobile SMS OTP (Send OTP to registered mobile)</option>
                            <option value="BOTH">Both (Require both Email & SMS OTP)</option>
                          </select>
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsEditRoleModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="editRoleForm" disabled={editRoleModalLoading} className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 text-white dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {editRoleModalLoading ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </div>)}

</>
);
}
