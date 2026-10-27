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


import ClientTimelineModal from '@/components/admin/ClientTimelineModal';


export default function ClientsTab(props) {
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
    setPrereqActionTarget,
    clientSubTab,
    deletedClients,
    statusFilter,
    kraFilter,
    esignFilter,
    sourceFilter,
    clientStartDate,
    clientEndDate,
    clientSearch,
    requireSetupPrerequisites,
    setClientName,
    setClientEmail,
    setClientMobile,
    setClientPassword,
    setClientPan,
    setClientAadhaar,
    setClientCategory,
    setClientOccupation,
    setClientAddress,
    setClientCity,
    setClientState,
    setClientZip,
    setIsClientModalOpen,
    setClientSubTab,
    setClientSearch,
    setStatusFilter,
    setKraFilter,
    setEsignFilter,
    setSourceFilter,
    setClientStartDate,
    setClientEndDate,
    clientColumns,
    tableCustomStyles,
    isDarkMode,
    isAssignPlanModalOpen,
    assignPlanClient,
    setIsAssignPlanModalOpen,
    handleAssignPlan,
    isLoadingFeeSummary,
    assignPlanFeeSummary,
    assignPlanCategoryId,
    setAssignPlanCategoryId,
    setAssignPlanId,
    categories,
    assignPlanId,
    setAssignCustomAmount,
    setAssignCustomDays,
    setAssignServiceStartDate,
    gstEnabled,
    gstCalculationType,
    assignCouponCode,
    setAssignCouponCode,
    getPlanAmountWithCoupon,
    assignCustomAmount,
    assignCustomDays,
    coupons,
    assignPaymentRefId,
    setAssignPaymentRefId,
    assignPaymentDate,
    setAssignPaymentDate,
    assignServiceStartDate,
    assignPlanRemarks,
    setAssignPlanRemarks,
    assignPlanLoading,
    isClientModalOpen,
    setClientDuplicateField,
    setClientDuplicateError,
    clientEmail,
    clientDuplicateField,
    clientDuplicateError,
    clientMobile,
    clientPassword,
    clientName,
    clientCategory,
    clientOccupation,
    availableOccupations,
    clientModalLoading,
    setClientModalLoading,
    loadData,
    isEditClientModalOpen,
    editingClient,
    setIsEditClientModalOpen,
    handleUpdateClientSubmit,
    editClientName,
    setEditClientName,
    editClientEmail,
    setEditClientEmail,
    editClientMobile,
    setEditClientMobile,
    editClientOccupation,
    setEditClientOccupation,
    editClientPan,
    setEditClientPan,
    editClientAadhaar,
    setEditClientAadhaar,
    editClientCategory,
    setEditClientCategory,
    editClientAddress,
    setEditClientAddress,
    editClientState,
    setEditClientState,
    setEditClientCity,
    states,
    editClientCity,
    editClientCities,
    editClientZip,
    setEditClientZip,
    editClientModalLoading,
    isViewClientModalOpen,
    setIsViewClientModalOpen,
    clientDetailsTab,
    setClientDetailsTab,
    viewClientIsTelegramTradeEnabled,
    viewClientTelegramChatId,
    viewClientIsSmsTradeEnabled,
    setViewClientIsTelegramTradeEnabled,
    setViewClientTelegramChatId,
    viewClientTelegramUsername,
    setViewClientTelegramUsername,
    setViewClientIsSmsTradeEnabled,
    handleSaveClientTradeChannels,
    savingClientChannels,
    showDigioConfirmPopup,
    fetchDigioResult,
    setShowDigioConfirmPopup,
    fetchDigioSaveMode,
    setFetchDigioSaveMode,
    fetchDigioKycId,
    fetchDigioEsignId,
    setFetchDigioResult,
    camsPanInput,
    camsDobInput,
    camsEditMode,
    setCamsEditMode,
    fetchCamsLoading,
    setCamsPanInput,
    setFetchCamsError,
    setCamsDobInput,
    setFetchCamsLoading,
    fetchCamsError,
    showManualDigioFetch,
    setShowManualDigioFetch,
    fetchDigioIdInput,
    setFetchDigioIdInput,
    setFetchDigioError,
    fetchDigioLoading,
    setFetchDigioLoading,
    fetchDigioError,
    calculateSegmentExpiries,
    getDisplayStatus,
    clientCommunications,
    setSelectedTimelineClient,
    setIsTimelineModalOpen,
    startEditClient
  } = admin || {};

  return (
<div className="space-y-6">
                      {!getPrerequisitesStatus().isAllComplete && (<div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                              <AlertTriangle className="w-5 h-5"/>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                                Firm Setup Incomplete ({getPrerequisitesStatus().completedCount}/8 Foundation Settings Configured)
                              </p>
                              <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5">
                                Please configure all 8 core firm settings in Admin Settings before adding or updating client records.
                              </p>
                            </div>
                          </div>
                          <button type="button" onClick={() => {
            setPrereqActionTarget('Add or Manage Clients');
            setIsSetupPrereqModalOpen(true);
        }} className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0 self-end sm:self-center">
                            <Settings className="w-3.5 h-3.5"/>
                            <span>View Missing Setup</span>
                          </button>
                        </div>)}
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Client Management</h2>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">View and manage all clients registered under your RA company</p>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                            <Users className="h-4 w-4 text-primary-600 dark:text-primary-400"/>
                            <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{clients.length} Clients</span>
                          </div>

                          <button onClick={() => {
        try {
            let rawList = clientSubTab === 'deleted' ? deletedClients : clients.filter((cl) => !cl.user?.deletedAt);
            // Apply active filters
            if (statusFilter !== 'ALL') {
                rawList = rawList.filter((cl) => {
                    if (statusFilter === 'INACTIVE')
                        return !['ACTIVE', 'PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(cl.user?.status);
                    return cl.user?.status === statusFilter;
                });
            }
            if (kraFilter !== 'ALL') {
                rawList = rawList.filter((cl) => {
                    const isFailed = cl.complianceAlerts?.some((a) => a.alertType === 'KYC_FAILED');
                    const kraStatusStr = isFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                    return kraStatusStr === kraFilter;
                });
            }
            if (esignFilter !== 'ALL') {
                rawList = rawList.filter((cl) => {
                    const isSigned = cl.agreements?.some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                    return esignFilter === 'SIGNED' ? isSigned : !isSigned;
                });
            }
            if (sourceFilter !== 'ALL') {
                rawList = rawList.filter((cl) => {
                    const srcType = cl.createdByInfo?.type || (cl.createdById ? 'STAFF' : 'SELF');
                    return srcType === sourceFilter;
                });
            }
            if (clientStartDate) {
                rawList = rawList.filter((cl) => new Date(cl.user?.createdAt) >= new Date(clientStartDate));
            }
            if (clientEndDate) {
                const endDate = new Date(clientEndDate);
                endDate.setHours(23, 59, 59, 999);
                rawList = rawList.filter((cl) => new Date(cl.user?.createdAt) <= endDate);
            }
            if (clientSearch.trim()) {
                const lowerSearch = clientSearch.toLowerCase();
                rawList = rawList.filter((cl) => (cl.name || '').toLowerCase().includes(lowerSearch) ||
                    (cl.email || '').toLowerCase().includes(lowerSearch) ||
                    (cl.mobile || '').includes(lowerSearch) ||
                    (cl.pan || '').toLowerCase().includes(lowerSearch) ||
                    (cl.aadhaar || '').replace(/\s+/g, '').includes(lowerSearch.replace(/\s+/g, '')));
            }
            const listToExport = rawList;
            if (!listToExport || listToExport.length === 0) {
                import('react-hot-toast').then(m => m.default.error('No client data available to export'));
                return;
            }
            const headers = [
                'Sr No',
                'Client ID',
                'Client Name',
                'Email',
                'Mobile',
                'PAN',
                'Aadhaar',
                'Category',
                'Occupation',
                'City',
                'State',
                'Registered On',
                'Status',
                'Added By / Source',
                'KRA Status',
                'eSign Status',
                'Active Plan'
            ];
            const rows = listToExport.map((cl, idx) => {
                const deleteSuffix = `_deleted_${cl.id}`;
                const name = (cl.name || '').replace(deleteSuffix, '');
                const email = (cl.email || '').replace(deleteSuffix, '');
                const mobile = (cl.mobile || '').replace(deleteSuffix, '');
                const pan = (cl.pan || '').replace(deleteSuffix, '');
                const aadhaar = (cl.aadhaar || '').replace(deleteSuffix, '');
                const isKraFailed = cl.complianceAlerts?.some((a) => a.alertType === 'KYC_FAILED');
                const kraStatus = isKraFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                const isSigned = cl.agreements?.some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                const activeSub = cl.subscriptions?.find((s) => s.status === 'ACTIVE');
                let sourceLabel = 'Self Signup';
                if (cl.createdByInfo?.label) {
                    sourceLabel = cl.createdByInfo.label;
                }
                else if (cl.createdById) {
                    sourceLabel = 'Added by Staff/Admin';
                }
                const registeredOn = cl.user?.createdAt
                    ? new Date(cl.user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : 'N/A';
                return [
                    idx + 1,
                    `"${cl.id || ''}"`,
                    `"${name.replace(/"/g, '""')}"`,
                    `"${email.replace(/"/g, '""')}"`,
                    `"${mobile}"`,
                    `"${pan}"`,
                    `"${aadhaar}"`,
                    `"${cl.category || 'INDIVIDUAL'}"`,
                    `"${cl.occupation || 'N/A'}"`,
                    `"${cl.profile?.city || 'N/A'}"`,
                    `"${cl.profile?.state || 'N/A'}"`,
                    `"${registeredOn}"`,
                    `"${cl.user?.status || cl.status || 'N/A'}"`,
                    `"${sourceLabel.replace(/"/g, '""')}"`,
                    `"${kraStatus}"`,
                    `"${isSigned ? 'SIGNED' : 'PENDING'}"`,
                    `"${activeSub?.plan?.name || 'None'}"`
                ].join(',');
            });
            const csvString = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${clientSubTab === 'deleted' ? 'Deleted_Clients_Report' : 'Complete_Clients_Report'}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            import('react-hot-toast').then(m => m.default.success('Client CSV report downloaded successfully!'));
        }
        catch (err) {
            console.error('CSV Export Error:', err);
            import('react-hot-toast').then(m => m.default.error('Failed to export CSV: ' + err.message));
        }
    }} className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition inline-flex items-center gap-1.5 shadow-md cursor-pointer">
                            <Download className="h-4 w-4"/>
                            Download CSV
                          </button>

                          {(!isStaff || hasPermission('CREATE_CLIENTS')) && (<button onClick={() => {
            if (!requireSetupPrerequisites('Add New Client'))
                return;
            setClientName('');
            setClientEmail('');
            setClientMobile('');
            setClientPassword('');
            setClientPan('');
            setClientAadhaar('');
            setClientCategory('INDIVIDUAL');
            setClientOccupation('');
            setClientAddress('');
            setClientCity('');
            setClientState('');
            setClientZip('');
            setIsClientModalOpen(true);
        }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs transition inline-flex items-center shadow-lg shadow-primary-500/20">
                              <Plus className="h-4 w-4 mr-1.5"/>
                              Add Client
                            </button>)}
                        </div>
                      </div>

                      <div className="flex space-x-2 border-b border-slate-400 dark:border-white/10 mb-4">
                        <button onClick={() => setClientSubTab('active')} className={`pb-3 px-2 text-sm font-bold transition border-b-2 ${clientSubTab === 'active' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}>
                          Active & Pending
                        </button>
                        <button onClick={() => setClientSubTab('deleted')} className={`pb-3 px-2 text-sm font-bold transition border-b-2 ${clientSubTab === 'deleted' ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}>
                          Deleted Accounts
                        </button>
                      </div>

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-3 mb-4 w-full">
                        <div className="relative w-full md:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                          <input type="text" placeholder="Search name, PAN, email..." value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white"/>
                        </div>

                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white">
                          <option value="ALL">All Status</option>
                          <option value="ACTIVE">Active</option>
                          <option value="PENDING_APPROVAL">Pending Approval</option>
                          <option value="PAYMENT_PENDING">Payment Pending</option>
                          <option value="INACTIVE">Inactive/Other</option>
                        </select>

                        <select value={kraFilter} onChange={(e) => setKraFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white">
                          <option value="ALL">All KRA</option>
                          <option value="VERIFIED">Verified</option>
                          <option value="FAILED">Failed</option>
                          <option value="PENDING">Pending</option>
                        </select>

                        <select value={esignFilter} onChange={(e) => setEsignFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white">
                          <option value="ALL">All eSign</option>
                          <option value="SIGNED">Signed</option>
                          <option value="PENDING">Pending</option>
                        </select>

                        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white font-medium">
                          <option value="ALL">All Sources</option>
                          <option value="SELF">Self Signup</option>
                          <option value="ADMIN">Added by Admin</option>
                          <option value="STAFF">Added by Staff</option>
                        </select>

                        <div className="flex items-center gap-2">
                          <input type="date" value={clientStartDate} onChange={(e) => setClientStartDate(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white" title="Start Date"/>
                          <span className="text-slate-500">to</span>
                          <input type="date" value={clientEndDate} onChange={(e) => setClientEndDate(e.target.value)} className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-primary-500 text-slate-800 dark:text-slate-900 dark:text-white" title="End Date"/>
                        </div>
                        {clientSubTab === 'deleted' && (<button onClick={async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/exports/deleted-clients`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok)
                    throw new Error('Export failed');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `deleted-clients-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
            }
            catch (err) {
                console.error('Failed to download CSV:', err);
                toast.error('Failed to download deleted clients CSV.');
            }
        }} className="ml-auto flex items-center gap-2 bg-slate-800 dark:bg-white/10 hover:bg-slate-700 dark:hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm border border-slate-700 dark:border-white/10">
                            <Download className="h-4 w-4"/>
                            Download CSV
                          </button>)}
                      </div>

                      {(() => {
        let displayClients = clientSubTab === 'active'
            ? clients.filter((cl) => !cl.user?.deletedAt)
            : deletedClients;
        // Filter by Status
        if (statusFilter !== 'ALL') {
            displayClients = displayClients.filter((cl) => {
                if (statusFilter === 'INACTIVE')
                    return !['ACTIVE', 'PENDING_APPROVAL', 'PAYMENT_PENDING'].includes(cl.user?.status);
                return cl.user?.status === statusFilter;
            });
        }
        // Filter by KRA
        if (kraFilter !== 'ALL') {
            displayClients = displayClients.filter((cl) => {
                const isFailed = cl.complianceAlerts?.some((a) => a.alertType === 'KYC_FAILED');
                const kraStatusStr = isFailed ? 'FAILED' : (cl.status && cl.status !== 'PENDING_ONBOARDING' && cl.status !== 'KYC_PENDING' && cl.status !== 'KYC_FAILED') ? 'VERIFIED' : 'PENDING';
                return kraStatusStr === kraFilter;
            });
        }
        // Filter by eSign
        if (esignFilter !== 'ALL') {
            displayClients = displayClients.filter((cl) => {
                const isSigned = cl.agreements?.some((a) => a.status === 'SIGNED' || a.status === 'ACTIVE');
                return esignFilter === 'SIGNED' ? isSigned : !isSigned;
            });
        }
        // Filter by Source / Creator
        if (sourceFilter !== 'ALL') {
            displayClients = displayClients.filter((cl) => {
                const srcType = cl.createdByInfo?.type || (cl.createdById ? 'STAFF' : 'SELF');
                return srcType === sourceFilter;
            });
        }
        // Filter by Date
        if (clientStartDate) {
            displayClients = displayClients.filter((cl) => new Date(cl.user?.createdAt) >= new Date(clientStartDate));
        }
        if (clientEndDate) {
            const endDate = new Date(clientEndDate);
            endDate.setHours(23, 59, 59, 999);
            displayClients = displayClients.filter((cl) => new Date(cl.user?.createdAt) <= endDate);
        }
        // Filter by Search Text
        if (clientSearch.trim()) {
            const lowerSearch = clientSearch.toLowerCase();
            displayClients = displayClients.filter((cl) => (cl.name || '').toLowerCase().includes(lowerSearch) ||
                (cl.email || '').toLowerCase().includes(lowerSearch) ||
                (cl.mobile || '').includes(lowerSearch) ||
                (cl.pan || '').toLowerCase().includes(lowerSearch) ||
                (cl.aadhaar || '').replace(/\s+/g, '').includes(lowerSearch.replace(/\s+/g, '')));
        }
        return (<PaginatedList data={displayClients} itemsPerPage={10}>
                            {(paginatedClients) => (<div className="glassmorphism rounded-2xl border border-slate-300 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto">
                                  <DataTable columns={clientColumns} data={paginatedClients} customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="text-center py-12 text-slate-500 dark:text-slate-500">
                                        <Users className="h-8 w-8 mx-auto mb-2 opacity-30"/>
                                        <p>No clients registered yet.</p>
                                        <p className="text-[10px] mt-1 text-slate-600">Click "Add Client" to register your first client.</p>
                                      </div>}/>
                                </div>
                              </div>)}
                          </PaginatedList>);
    })()}


                      {/* -- ASSIGN PLAN BY ADMIN MODAL -- */}
                      {isAssignPlanModalOpen && assignPlanClient && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-slate-400 dark:border-white/10 bg-violet-500/5">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-violet-500/20 rounded-xl border border-violet-500/30">
                                  <CreditCard className="h-4 w-4 text-violet-400"/>
                                </div>
                                <div>
                                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Assign Plan to Client</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Client: <span className="text-violet-300 font-semibold">{assignPlanClient.name}</span></p>
                                </div>
                              </div>
                              <button onClick={() => setIsAssignPlanModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                                <X className="h-5 w-5"/>
                              </button>
                            </div>

                            <form onSubmit={handleAssignPlan} className="px-6 py-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                              {/* Client Info strip */}
                              <div className="bg-slate-100 dark:bg-slate-800/60 border border-slate-300 dark:border-white/5 rounded-xl p-3 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-white">{assignPlanClient.name}</div>
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px]">{assignPlanClient.email}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-slate-600 dark:text-slate-400 text-[10px]">Current Plan</div>
                                  <div className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px]">
                                    {assignPlanClient.subscriptions?.find((s) => s.status === 'ACTIVE')?.plan?.name || 'No Active Plan'}
                                  </div>
                                </div>
                              </div>

                              {/* SEBI Annual Fee Cap Banner */}
                              {isLoadingFeeSummary ? (<div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs flex items-center gap-2 text-slate-500">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin"/> Verifying SEBI annual fee limit...
                                </div>) : assignPlanFeeSummary ? (<div className={`p-3 rounded-xl border text-xs space-y-1.5 ${assignPlanFeeSummary.isQuotaFull
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                : assignPlanFeeSummary.totalBasePaid >= 130000
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'}`}>
                                  <div className="flex items-center justify-between font-bold">
                                    <span className="flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5 text-current"/>
                                      <span>SEBI Fee Limit ({assignPlanFeeSummary.fyLabel}):</span>
                                    </span>
                                    <span className="font-mono">
                                      ₹{assignPlanFeeSummary.totalBasePaid.toLocaleString('en-IN')} / ₹1,51,000 Base
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-current/15">
                                    <div>
                                      <span className="text-slate-500 dark:text-slate-400">Approved Paid: </span>
                                      <span className="font-semibold font-mono">₹{assignPlanFeeSummary.totalApprovedBasePaid?.toLocaleString('en-IN') || 0}</span>
                                    </div>
                                    <div>
                                      <span className="text-amber-600 dark:text-amber-400">Pending in L2: </span>
                                      <span className="font-semibold font-mono">₹{assignPlanFeeSummary.totalPendingBaseFee?.toLocaleString('en-IN') || 0}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-current/15">
                                    <span className="font-medium">Remaining Permissible Limit:</span>
                                    <span className={`font-bold font-mono ${assignPlanFeeSummary.remainingBaseQuota <= 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                                      ₹{assignPlanFeeSummary.remainingBaseQuota.toLocaleString('en-IN')} (+ GST)
                                    </span>
                                  </div>
                                  {assignPlanFeeSummary.isQuotaFull ? (<p className="text-[10px] text-rose-600 dark:text-rose-300 font-bold pt-0.5">
                                      ⚠️ SEBI Annual Fee Limit Reached: Paid plan assignment is disabled. Only free promotional plans (100% coupon discount) can be assigned.
                                    </p>) : assignPlanFeeSummary.totalBasePaid >= 130000 ? (<p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold pt-0.5">
                                      ⚠️ High Quota Utilization: You can only charge up to ₹{assignPlanFeeSummary.remainingBaseQuota.toLocaleString('en-IN')} (+ GST) for this client in this financial year.
                                    </p>) : null}
                                </div>) : null}

                              {/* Category selector */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                  Select Category <span className="text-rose-600 dark:text-rose-400">*</span>
                                </label>
                                <select value={assignPlanCategoryId} onChange={e => {
            setAssignPlanCategoryId(e.target.value);
            setAssignPlanId(''); // Reset plan selection
        }} required className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition">
                                  <option value="">-- Select a category --</option>
                                  {categories.filter((c) => c.status === 'ACTIVE').map((c) => (<option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>))}
                                </select>
                              </div>

                              {/* Plan selector (Visible only if category is selected) */}
                              {assignPlanCategoryId && (<div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Select Active Plan <span className="text-rose-600 dark:text-rose-400">*</span>
                                  </label>
                                  {(() => {
                const selectedCat = categories.find((c) => String(c.id || c._id) === String(assignPlanCategoryId) || String(c.name).toUpperCase() === String(assignPlanCategoryId).toUpperCase());
                const selectedCatName = (selectedCat?.name || '').toUpperCase();
                const filteredPlans = adminPlans.filter((p) => {
                    const pCatId = typeof p.categoryId === 'object' && p.categoryId ? String(p.categoryId._id || p.categoryId.id) : String(p.categoryId || '');
                    const pCatObjId = p.category ? (typeof p.category === 'object' ? String(p.category.id || p.category._id) : String(p.category)) : '';
                    const pCatName = (p.category?.name || (typeof p.categoryId === 'object' ? p.categoryId.name : '') || '').toUpperCase();
                    const matchesCategory = pCatId === String(assignPlanCategoryId) ||
                        pCatObjId === String(assignPlanCategoryId) ||
                        (selectedCatName && (pCatName === selectedCatName || pCatId === selectedCatName)) ||
                        (pCatName && pCatName === String(assignPlanCategoryId).toUpperCase());
                    return matchesCategory && p.status === 'ACTIVE' && !p.deletedAt;
                });
                return filteredPlans.length === 0 ? (<div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center">
                                        No active plans found in this category.
                                      </div>) : (<div className="grid grid-cols-1 gap-2 max-h-[180px] overflow-y-auto pr-1">
                                        {filteredPlans.map((p) => {
                        const isSelected = assignPlanId === p.id;
                        return (<div key={p.id} onClick={() => {
                                setAssignPlanId(p.id);
                                setAssignCustomAmount('');
                                setAssignCustomDays('');
                                const clickedSub = assignPlanClient?.subscriptions?.find((s) => {
                                    const sPId = String(s.planId?._id || s.planId?.id || s.planId || '');
                                    return sPId === String(p.id) && (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date();
                                });
                                if (clickedSub) {
                                    const exp = new Date(clickedSub.endDate);
                                    const nextD = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate() + 1);
                                    setAssignServiceStartDate(nextD.toISOString().split('T')[0]);
                                }
                            }} className={`cursor-pointer p-3 rounded-xl border text-left transition relative ${isSelected ? 'bg-violet-600/15 border-violet-500 shadow-md shadow-violet-500/5' : 'bg-slate-100 dark:bg-slate-800/40 border-slate-300 dark:border-white/5 hover:border-slate-400 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-slate-800/60'}`}>
                                              <div className="flex justify-between items-start">
                                                <div>
                                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{p.name}</h4>
                                                  <div className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 max-w-[200px] truncate" dangerouslySetInnerHTML={{ __html: p.description || '' }}/>
                                                </div>
                                                <div className="text-right flex flex-col items-end text-[10px] min-w-[120px]">
                                                  {!gstEnabled ? (<div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                                      <div className="flex justify-between gap-2 text-violet-400 font-extrabold"><span>Price:</span> <span>₹{p.price.toLocaleString()}</span></div>
                                                      <div className="flex justify-between gap-2"><span>GST:</span> <span className="text-slate-500 dark:text-slate-500">Exempt</span></div>
                                                    </div>) : gstCalculationType === 'EXCLUSIVE' ? (<div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                                      <div className="flex justify-between gap-2"><span>Base:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{p.price.toLocaleString()}</span></div>
                                                      <div className="flex justify-between gap-2 border-b border-slate-300 dark:border-white/5 pb-0.5"><span>GST (18%):</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{Math.round(p.price * 0.18).toLocaleString()}</span></div>
                                                      <div className="flex justify-between gap-2 text-violet-400 font-extrabold pt-0.5"><span>Total:</span> <span>₹{Math.round(p.price * 1.18).toLocaleString()}</span></div>
                                                    </div>) : (<div className="space-y-0.5 text-slate-600 dark:text-slate-400">
                                                      <div className="flex justify-between gap-2"><span>Base:</span> <span className="font-semibold text-slate-700 dark:text-slate-300">₹{p.price.toLocaleString()}</span></div>
                                                      <div className="flex justify-between gap-2 border-b border-slate-300 dark:border-white/5 pb-0.5"><span>GST:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">Inclusive</span></div>
                                                      <div className="flex justify-between gap-2 text-violet-400 font-extrabold pt-0.5"><span>Total:</span> <span>₹{p.price.toLocaleString()}</span></div>
                                                    </div>)}
                                                  <span className="text-[9px] text-slate-500 dark:text-slate-500 mt-1">{p.durationMonths} month{p.durationMonths > 1 ? 's' : ''}</span>
                                                </div>
                                              </div>
                                              {isSelected && (<div className="absolute top-2 right-2 bg-violet-500 rounded-full p-0.5">
                                                  <CheckCircle className="h-3 w-3 text-slate-900 dark:text-white"/>
                                                </div>)}
                                            </div>);
                    })}
                                      </div>);
            })()}
                                </div>)}

                              {/* Coupon Input with Datalist */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Apply Coupon (Optional)</label>
                                <input type="text" list="active-coupons-list" value={assignCouponCode} placeholder="Type or select a coupon code" onChange={e => {
            const newCode = e.target.value;
            setAssignCouponCode(newCode);
            // Recalculate custom amount if custom days is present, or vice versa
            if (assignPlanId) {
                const p = adminPlans.find((x) => x.id === assignPlanId);
                if (p) {
                    const totalAmt = getPlanAmountWithCoupon(p.price, p.durationMonths, newCode);
                    const totalDays = p.durationMonths * 30;
                    if (assignCustomAmount) {
                        let val = Number(assignCustomAmount);
                        if (val > totalAmt)
                            val = totalAmt;
                        setAssignCustomAmount(val.toString());
                        if (totalAmt > 0) {
                            setAssignCustomDays(Math.round(val / (totalAmt / totalDays)).toString());
                        }
                    }
                    else if (assignCustomDays) {
                        let dVal = Number(assignCustomDays);
                        if (dVal > totalDays)
                            dVal = totalDays;
                        setAssignCustomDays(dVal.toString());
                        if (totalDays > 0) {
                            setAssignCustomAmount(parseFloat((dVal * (totalAmt / totalDays)).toFixed(2)).toString());
                        }
                    }
                }
            }
        }} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition uppercase"/>
                                <datalist id="active-coupons-list">
                                  {coupons.filter(c => c.status === 'ACTIVE').map(c => (<option key={c.id} value={c.code}>{c.code} ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue}`})</option>))}
                                </datalist>
                              </div>

                              {/* Payment Details */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Ref ID *</label>
                                  <input type="text" required value={assignPaymentRefId} onChange={e => setAssignPaymentRefId(e.target.value)} placeholder="e.g. UTR/Txn Number" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Payment Date *</label>
                                  <input type="date" required max={new Date().toISOString().split('T')[0]} value={assignPaymentDate} onChange={e => {
            const pVal = e.target.value;
            setAssignPaymentDate(pVal);
            if (assignServiceStartDate && assignServiceStartDate < pVal) {
                setAssignServiceStartDate(pVal);
            }
        }} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"/>
                                </div>
                                {(() => {
            const assignActiveSubForPlan = assignPlanClient?.subscriptions?.find((s) => {
                const sPId = String(s.planId?._id || s.planId?.id || s.planId || '');
                return sPId === String(assignPlanId) && (s.status === 'ACTIVE' || s.status === 'active') && new Date(s.endDate) > new Date();
            });
            const assignExpDate = assignActiveSubForPlan ? new Date(assignActiveSubForPlan.endDate) : null;
            const assignNextDay = assignExpDate ? new Date(assignExpDate.getFullYear(), assignExpDate.getMonth(), assignExpDate.getDate() + 1) : null;
            const assignMinDateStr = assignNextDay ? assignNextDay.toISOString().split('T')[0] : (assignPaymentDate || undefined);
            return (<div>
                                      <label className="block text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1.5">Service Start Date *</label>
                                      <input type="date" required min={assignMinDateStr} value={assignServiceStartDate || (assignMinDateStr || assignPaymentDate)} onChange={e => {
                    const sVal = e.target.value;
                    if (assignActiveSubForPlan && assignMinDateStr && sVal < assignMinDateStr) {
                        toast.error(`Service start date cannot be earlier than ${assignNextDay?.toLocaleDateString('en-IN')} (Current active plan expires on ${assignExpDate?.toLocaleDateString('en-IN')}).`);
                        return;
                    }
                    if (assignPaymentDate && sVal < assignPaymentDate) {
                        toast.error('Service start date cannot be earlier than payment date');
                        return;
                    }
                    setAssignServiceStartDate(sVal);
                }} className="w-full bg-slate-100 dark:bg-slate-800 border border-indigo-500/40 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"/>
                                      {assignActiveSubForPlan && assignExpDate && assignNextDay ? (<div className="mt-1.5 p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 text-[11px] text-amber-900 dark:text-amber-300">
                                          <strong>Sequential Plan Renewal:</strong> Client already has an active subscription for this plan expiring on <strong>{assignExpDate.toLocaleDateString('en-IN')}</strong>.
                                          Service date defaults to <strong>{assignNextDay.toLocaleDateString('en-IN')}</strong> (day after expiry) and cannot be earlier.
                                        </div>) : (<span className="text-[10px] text-slate-500 mt-0.5 block">Cannot be earlier than payment date</span>)}
                                    </div>);
        })()}
                              </div>

                              {/* Custom Fields */}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Custom Amount (₹)</label>
                                  <input type="number" step="any" min="0" value={assignCustomAmount} onChange={e => {
            let val = e.target.value;
            if (!val || !assignPlanId) {
                setAssignCustomAmount(val);
                setAssignCustomDays('');
                return;
            }
            const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
            if (selectedPlan) {
                const totalDays = selectedPlan.durationMonths * 30;
                const basePrice = selectedPlan.price;
                const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, assignCouponCode);
                let numericVal = parseFloat(val);
                if (!isNaN(numericVal)) {
                    if (numericVal > totalAmt) {
                        numericVal = totalAmt;
                        val = numericVal.toString();
                    }
                    setAssignCustomAmount(val);
                    if (totalAmt > 0) {
                        const costPerDay = totalAmt / totalDays;
                        setAssignCustomDays(Math.max(1, Math.round(numericVal / costPerDay)).toString());
                    }
                }
                else {
                    setAssignCustomAmount(val);
                }
            }
            else {
                setAssignCustomAmount(val);
            }
        }} placeholder="e.g. 500" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Custom Days</label>
                                  <input type="number" min="1" value={assignCustomDays} onChange={e => {
            let val = e.target.value;
            if (!val || !assignPlanId) {
                setAssignCustomDays(val);
                setAssignCustomAmount('');
                return;
            }
            const selectedPlan = adminPlans.find((p) => p.id === assignPlanId);
            if (selectedPlan) {
                const totalDays = selectedPlan.durationMonths * 30;
                const basePrice = selectedPlan.price;
                const totalAmt = getPlanAmountWithCoupon(basePrice, selectedPlan.durationMonths, assignCouponCode);
                let numericVal = Number(val);
                if (numericVal > totalDays)
                    numericVal = totalDays;
                val = numericVal.toString();
                setAssignCustomDays(val);
                if (totalDays > 0) {
                    const costPerDay = totalAmt / totalDays;
                    setAssignCustomAmount(parseFloat((numericVal * costPerDay).toFixed(2)).toString());
                }
            }
            else {
                setAssignCustomDays(val);
            }
        }} placeholder="e.g. 15" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"/>
                                </div>
                              </div>

                              {/* Remarks */}
                              <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Remarks (optional)</label>
                                <textarea value={assignPlanRemarks} onChange={e => setAssignPlanRemarks(e.target.value)} rows={3} placeholder="e.g. Complimentary plan for trial period..." className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 resize-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/30 transition"/>
                              </div>

                              {/* Info note */}
                              <div className="flex items-start gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-700 dark:text-amber-300">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0"/>
                                <span>This will <strong>immediately activate</strong> the selected plan. Any existing active subscription will be cancelled. A payment record with <strong>"Assigned by Admin"</strong> remark will be created in the payment history.</span>
                              </div>

                              {/* Actions */}
                              <div className="flex gap-3 pt-1 justify-end">
                                <button type="button" onClick={() => setIsAssignPlanModalOpen(false)} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">
                                  Cancel
                                </button>
                                {(() => {
            const selPlan = adminPlans.find(p => p.id === assignPlanId);
            const rawBase = selPlan ? getPlanAmountWithCoupon(selPlan.price, selPlan.durationMonths, assignCouponCode) : 0;
            const finalBase = assignCustomAmount ? (gstEnabled && gstCalculationType === 'EXCLUSIVE' ? Number(assignCustomAmount) / 1.18 : Number(assignCustomAmount)) : rawBase;
            const isFeeExceeded = assignPlanFeeSummary && finalBase > 0 && (assignPlanFeeSummary.isQuotaFull ||
                (assignPlanFeeSummary.totalBasePaid + finalBase > assignPlanFeeSummary.maxBaseFeeCap) ||
                (finalBase > assignPlanFeeSummary.remainingBaseQuota));
            const isFreePromo = finalBase === 0 && Boolean(assignPlanId);
            return (<button type="submit" disabled={assignPlanLoading || !assignPlanId || isFeeExceeded} className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${isFeeExceeded
                    ? 'bg-rose-800 text-rose-200 cursor-not-allowed opacity-60'
                    : isFreePromo
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-violet-600 hover:bg-violet-500 disabled:bg-violet-900 disabled:opacity-50 disabled:cursor-not-allowed text-white'}`}>
                                      {assignPlanLoading ? (<><Loader2 className="h-3.5 w-3.5 animate-spin"/> Assigning...</>) : isFeeExceeded ? (<>{assignPlanFeeSummary?.isQuotaFull ? '⚠️ Annual Quota Full (Limit ₹1,51,000)' : `⚠️ Exceeds Remaining Limit (Max ₹${assignPlanFeeSummary?.remainingBaseQuota.toLocaleString('en-IN')})`}</>) : isFreePromo ? (<><Check className="h-3.5 w-3.5"/> Assign Free Promotional Plan (₹0)</>) : (<><CreditCard className="h-3.5 w-3.5"/> Assign Plan Now</>)}
                                    </button>);
        })()}
                              </div>
                            </form>
                          </div>
                        </div>)}

                      {/* Add Client Modal */}
                      {isClientModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10">
                              <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Register New Client</h3>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Quick Direct Onboarding • Zero Manual KYC Paperwork</p>
                              </div>
                              <button onClick={() => {
            setIsClientModalOpen(false);
            setClientDuplicateField(null);
            setClientDuplicateError(null);
        }} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                                <X className="h-5 w-5"/>
                              </button>
                            </div>

                            <div className="px-8 py-6 space-y-5">
                              {/* SEBI DigiLocker Notice */}
                              <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start space-x-3">
                                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0"/>
                                <div className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                  <span className="font-bold">DigiLocker KYC Compliance:</span> Full Legal Name, PAN, Aadhaar, DOB, and Address will be automatically fetched directly from DigiLocker when the client logs in. Admin direct registration requires no manual KYC paperwork or OTP verification.
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                {/* Email */}
                                <div className="col-span-2 sm:col-span-1">
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                                    Email Address *
                                  </label>
                                  <input type="email" value={clientEmail} onChange={e => {
            setClientEmail(e.target.value);
            if (clientDuplicateField === 'email') {
                setClientDuplicateField(null);
                setClientDuplicateError(null);
            }
        }} className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition ${clientDuplicateField === 'email' ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-white/10 focus:border-primary-500'}`} placeholder="client@example.com"/>
                                  {clientDuplicateField === 'email' && (<p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>)}
                                </div>

                                {/* Mobile */}
                                <div className="col-span-2 sm:col-span-1">
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                                    Mobile Number *
                                  </label>
                                  <input type="tel" value={clientMobile} onChange={e => {
            setClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
            if (clientDuplicateField === 'mobile') {
                setClientDuplicateField(null);
                setClientDuplicateError(null);
            }
        }} className={`w-full bg-slate-100 dark:bg-slate-800 border rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition ${clientDuplicateField === 'mobile' ? 'border-red-500 focus:border-red-500' : 'border-slate-300 dark:border-white/10 focus:border-primary-500'}`} placeholder="10-digit mobile number" maxLength={10}/>
                                  {clientDuplicateField === 'mobile' && (<p className="text-[10px] text-red-600 dark:text-red-400 mt-1 font-semibold animate-pulse">{clientDuplicateError}</p>)}
                                </div>

                                {/* Password */}
                                <div className="col-span-2">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                      Password *
                                    </label>
                                    <button type="button" onClick={() => {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
            let pwd = 'Pass@';
            for (let i = 0; i < 5; i++) {
                pwd += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            setClientPassword(pwd);
            toast.success(`Generated password: ${pwd}`);
        }} className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1">
                                      <span>🎲 Generate Password</span>
                                    </button>
                                  </div>
                                  <input type="text" value={clientPassword} onChange={e => setClientPassword(e.target.value)} maxLength={15} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary-500 focus:outline-none transition font-mono" placeholder="8 - 15 characters (e.g. Pass@12345)"/>
                                </div>

                                {/* Full Name (Optional) */}
                                <div className="col-span-2">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                                      Full Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                    </label>
                                    <span className="text-[10px] text-slate-400">Synced from DigiLocker on KYC</span>
                                  </div>
                                  <input value={clientName} onChange={e => setClientName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-primary-500 focus:outline-none transition" placeholder="e.g. Rahul Sharma"/>
                                </div>

                                {/* Category */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                                    Category
                                  </label>
                                  <select value={clientCategory} onChange={e => setClientCategory(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none transition cursor-pointer">
                                    <option value="INDIVIDUAL">INDIVIDUAL</option>
                                    <option value="HUF">HUF</option>
                                    <option value="COMPANY">COMPANY</option>
                                    <option value="PARTNERSHIP">PARTNERSHIP / LLP</option>
                                  </select>
                                </div>

                                {/* Occupation */}
                                <div>
                                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-1.5">
                                    Occupation
                                  </label>
                                  <select value={clientOccupation} onChange={e => setClientOccupation(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none transition cursor-pointer">
                                    <option value="">Select Occupation</option>
                                    {availableOccupations.map((o) => (<option key={o.id || o._id} value={o.name}>
                                        {o.name}
                                      </option>))}
                                  </select>
                                </div>
                              </div>
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-slate-200 dark:border-white/10 flex space-x-3">
                              <button onClick={() => {
            setIsClientModalOpen(false);
            setClientDuplicateField(null);
            setClientDuplicateError(null);
        }} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition">
                                Cancel
                              </button>
                              <button disabled={clientModalLoading} onClick={async () => {
            const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRx.test(clientEmail.trim())) {
                toast.error('Please enter a valid email address.');
                return;
            }
            if (!/^\d{10}$/.test(clientMobile.trim())) {
                toast.error('Mobile number must be exactly 10 digits.');
                return;
            }
            if (!clientPassword || clientPassword.length < 8 || clientPassword.length > 15) {
                toast.error('Password must be between 8 and 15 characters.');
                return;
            }
            setClientModalLoading(true);
            setClientDuplicateField(null);
            setClientDuplicateError(null);
            try {
                const payload = {
                    tenantId: user.tenantId,
                    name: clientName.trim() || clientEmail.split('@')[0],
                    email: clientEmail.trim().toLowerCase(),
                    mobile: clientMobile.trim(),
                    password: clientPassword,
                    category: clientCategory || 'INDIVIDUAL',
                    occupation: clientOccupation || undefined,
                    createdById: user.id
                };
                const r = await api.registerClient(payload);
                if (r.success) {
                    setIsClientModalOpen(false);
                    setClientName('');
                    setClientEmail('');
                    setClientMobile('');
                    setClientPassword('');
                    setClientOccupation('');
                    setClientCategory('INDIVIDUAL');
                    loadData();
                    toast.success(`Client "${payload.name}" registered successfully!\nStatus: KYC Pending\nThey can now login and complete DigiLocker KYC.`);
                }
            }
            catch (e) {
                if (e.duplicateField) {
                    setClientDuplicateField(e.duplicateField);
                    const msg = e.duplicateField === 'email'
                        ? 'This email address is already registered.'
                        : 'This mobile number is already registered.';
                    setClientDuplicateError(msg);
                    toast.error(msg);
                }
                else {
                    toast.error(e.message || (e.errors && e.errors[0]) || 'Failed to register client.');
                }
            }
            finally {
                setClientModalLoading(false);
            }
        }} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-600/20">
                                {clientModalLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Plus className="h-4 w-4"/>}
                                <span>{clientModalLoading ? 'Registering...' : 'Register Client'}</span>
                              </button>
                            </div>
                          </div>
                        </div>)}

                      {/* Edit Client Modal */}
                      {isEditClientModalOpen && editingClient && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                          <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-400 dark:border-white/10">
                              <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Client Details</h3>
                                <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Modify information for client: {editingClient.name}</p>
                              </div>
                              <button onClick={() => setIsEditClientModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                                <X className="h-5 w-5"/>
                              </button>
                            </div>

                            <form onSubmit={handleUpdateClientSubmit}>
                              <div className="px-8 py-6 space-y-5">
                                {(() => {
            const isKycLocked = Boolean(editingClient?.kycStatus === 'VERIFIED' ||
                editingClient?.agreementSigned === true ||
                editingClient?.kraVerified === true ||
                editingClient?.digilockerData ||
                editingClient?.profile?.isDigiLockerLocked ||
                (editingClient?.agreements && editingClient.agreements.some((a) => a.status === 'SIGNED')));
            return (<>
                                      {isKycLocked ? (<div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                                          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"/>
                                          <div className="space-y-0.5">
                                            <span className="font-bold">Aadhaar KYC &amp; Agreement Verified Client</span>
                                            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
                                              Identity details (Full Name, PAN, Aadhaar) and Address (Line, State, City, ZIP) are verified from official Aadhaar KYC / DigiLocker and locked from editing as per SEBI compliance. You can update Mobile Number, Email, and Notification preferences.
                                            </p>
                                          </div>
                                        </div>) : (<div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                          <Info className="w-4 h-4 text-blue-500 shrink-0"/>
                                          <span><strong>Manual Client Entry:</strong> KYC verification is pending. You can manually enter or edit all personal, KYC, and address details.</span>
                                        </div>)}
                                    </>);
        })()}

                                {/* Personal Info */}
                                <div>
                                  <p className="text-[10px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest mb-3">Personal Information</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                      {(() => {
            const isKycLocked = Boolean(editingClient?.kycStatus === 'VERIFIED' ||
                editingClient?.agreementSigned === true ||
                editingClient?.kraVerified === true ||
                editingClient?.digilockerData ||
                editingClient?.profile?.isDigiLockerLocked ||
                (editingClient?.agreements && editingClient.agreements.some((a) => a.status === 'SIGNED')));
            return (<>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">Full Name *</label>
                                              {isKycLocked && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1"><Lock className="w-3 h-3"/> Locked (Aadhaar Verified)</span>}
                                            </div>
                                            <input required disabled={isKycLocked} value={editClientName} onChange={e => setEditClientName(e.target.value)} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`}/>
                                          </>);
        })()}
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Email *</label>
                                      <input type="email" required value={editClientEmail} onChange={e => setEditClientEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition"/>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Mobile *</label>
                                      <input type="tel" required value={editClientMobile} onChange={e => setEditClientMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-primary-500 focus:outline-none transition" maxLength={10}/>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Occupation</label>
                                      <select value={editClientOccupation} onChange={e => setEditClientOccupation(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-primary-500 focus:outline-none transition cursor-pointer">
                                        <option value="">Select Occupation</option>
                                        {editClientOccupation && !availableOccupations.some((o) => o.name === editClientOccupation) && (<option value={editClientOccupation}>{editClientOccupation} (Saved)</option>)}
                                        {availableOccupations.map((o) => (<option key={o.id || o._id} value={o.name}>
                                            {o.name}
                                          </option>))}
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* KYC Info */}
                                <div>
                                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest mb-3">KYC Documents</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    {(() => {
            const isKycLocked = Boolean(editingClient?.kycStatus === 'VERIFIED' ||
                editingClient?.agreementSigned === true ||
                editingClient?.kraVerified === true ||
                editingClient?.digilockerData ||
                editingClient?.profile?.isDigiLockerLocked ||
                (editingClient?.agreements && editingClient.agreements.some((a) => a.status === 'SIGNED')));
            return (<>
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">PAN Number *</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified</span>}
                                            </div>
                                            <input required disabled={isKycLocked} value={editClientPan} onChange={e => setEditClientPan(formatPan(e.target.value))} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`} maxLength={10}/>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">Aadhaar Number *</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified (Masked)</span>}
                                            </div>
                                            <input required disabled={isKycLocked} value={editClientAadhaar} onChange={e => setEditClientAadhaar(formatAadhaar(e.target.value))} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white font-mono placeholder-slate-600 focus:border-emerald-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`} maxLength={18}/>
                                          </div>
                                        </>);
        })()}
                                    <div>
                                      <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wide">Category</label>
                                      <select value={editClientCategory} onChange={e => setEditClientCategory(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white focus:border-emerald-500 focus:outline-none transition">
                                        <option value="INDIVIDUAL">INDIVIDUAL</option>
                                        <option value="NON_INDIVIDUAL">NON-INDIVIDUAL</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Address */}
                                <div>
                                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-widest mb-3">Address</p>
                                  <div className="grid grid-cols-2 gap-4">
                                    {(() => {
            const isKycLocked = Boolean(editingClient?.kycStatus === 'VERIFIED' ||
                editingClient?.agreementSigned === true ||
                editingClient?.kraVerified === true ||
                editingClient?.digilockerData ||
                editingClient?.profile?.isDigiLockerLocked ||
                (editingClient?.agreements && editingClient.agreements.some((a) => a.status === 'SIGNED')));
            return (<>
                                          <div className="col-span-2">
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">Address Line 1</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified</span>}
                                            </div>
                                            <input disabled={isKycLocked} value={editClientAddress} onChange={e => setEditClientAddress(e.target.value)} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`}/>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">State</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified</span>}
                                            </div>
                                            <select disabled={isKycLocked} value={editClientState} onChange={e => {
                    setEditClientState(e.target.value);
                    setEditClientCity('');
                }} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition appearance-none ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`}>
                                              <option value="">Select State</option>
                                              {states.map((s) => (<option key={s.id} value={s.name}>{s.name}</option>))}
                                            </select>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">City</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified</span>}
                                            </div>
                                            <input disabled={isKycLocked} value={editClientCity} onChange={e => setEditClientCity(e.target.value)} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`} placeholder="Select or type city" list="edit-client-city-options"/>
                                            <datalist id="edit-client-city-options">
                                              {editClientCities.map((c, i) => (<option key={i} value={c.name}/>))}
                                            </datalist>
                                          </div>
                                          <div>
                                            <div className="flex items-center justify-between mb-1">
                                              <label className="block text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wide">ZIP Code</label>
                                              {isKycLocked && <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5"><Lock className="w-2.5 h-2.5"/> Verified</span>}
                                            </div>
                                            <input disabled={isKycLocked} value={editClientZip} onChange={e => setEditClientZip(e.target.value.replace(/\D/g, '').slice(0, 6))} className={`w-full border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none transition ${isKycLocked ? 'bg-slate-200/70 dark:bg-slate-800/80 cursor-not-allowed opacity-80' : 'bg-slate-100 dark:bg-slate-800'}`} maxLength={6}/>
                                          </div>
                                        </>);
        })()}
                                </div>
                              </div>
                              </div>


                              {/* Footer */}
                              <div className="px-8 py-5 border-t border-slate-400 dark:border-white/10 flex space-x-3">
                                <button type="button" onClick={() => setIsEditClientModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-400 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition">
                                  Cancel
                                </button>
                                <button type="submit" disabled={editClientModalLoading} className="flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-bold transition">
                                  {editClientModalLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4 text-slate-950"/>}
                                  <span>{editClientModalLoading ? 'Saving...' : 'Save Changes'}</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>)}

                      {/* Official SEBI / CAMS KRA Status Mapping:
        07 -> KYC VALIDATED
        02 -> KYC REGISTERED
        01 -> UNDER PROCESS
        03 -> ON HOLD
        04 -> KYC REJECTED
        05 -> NOT AVAILABLE
        06 -> DEACTIVATED
    */}
                      {(() => { return null; })()}

                      {/* View Client Details Modal */}
                      {isViewClientModalOpen && selectedClient && (() => {
        const CAMS_KRA_STATUS_CONFIG = {
            '07': { code: '07', label: 'KYC VALIDATED', isVerified: true, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', theme: 'emerald', icon: '✓', desc: 'SEBI KYC Validated (Aadhaar / DigiLocker validated across all intermediaries)' },
            '7': { code: '07', label: 'KYC VALIDATED', isVerified: true, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', theme: 'emerald', icon: '✓', desc: 'SEBI KYC Validated (Aadhaar / DigiLocker validated across all intermediaries)' },
            '02': { code: '02', label: 'KYC REGISTERED', isVerified: true, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', theme: 'emerald', icon: '✓', desc: 'KYC Registered in KRA Database' },
            '2': { code: '02', label: 'KYC REGISTERED', isVerified: true, badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700', theme: 'emerald', icon: '✓', desc: 'KYC Registered in KRA Database' },
            '01': { code: '01', label: 'UNDER PROCESS', isVerified: false, badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700', theme: 'blue', icon: '🔄', desc: 'KYC Application is currently under process in KRA registry' },
            '1': { code: '01', label: 'UNDER PROCESS', isVerified: false, badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 border-blue-300 dark:border-blue-700', theme: 'blue', icon: '🔄', desc: 'KYC Application is currently under process in KRA registry' },
            '03': { code: '03', label: 'ON HOLD', isVerified: false, badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700', theme: 'amber', icon: '⏳', desc: 'KYC is On Hold due to pending documents or clarification' },
            '3': { code: '03', label: 'ON HOLD', isVerified: false, badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700', theme: 'amber', icon: '⏳', desc: 'KYC is On Hold due to pending documents or clarification' },
            '04': { code: '04', label: 'KYC REJECTED', isVerified: false, badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300 dark:border-rose-700', theme: 'rose', icon: '❌', desc: 'KYC Application has been rejected by KRA' },
            '4': { code: '04', label: 'KYC REJECTED', isVerified: false, badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300 border-rose-300 dark:border-rose-700', theme: 'rose', icon: '❌', desc: 'KYC Application has been rejected by KRA' },
            '05': { code: '05', label: 'NOT AVAILABLE', isVerified: false, badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700', theme: 'amber', icon: '⚠️', desc: 'KYC Record Not Available in KRA Registry (Fresh KYC required)' },
            '5': { code: '05', label: 'NOT AVAILABLE', isVerified: false, badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700', theme: 'amber', icon: '⚠️', desc: 'KYC Record Not Available in KRA Registry (Fresh KYC required)' },
            '06': { code: '06', label: 'DEACTIVATED', isVerified: false, badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700', theme: 'slate', icon: '🚫', desc: 'KYC Record has been deactivated by KRA' },
            '6': { code: '06', label: 'DEACTIVATED', isVerified: false, badgeClass: 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700', theme: 'slate', icon: '🚫', desc: 'KYC Record has been deactivated by KRA' }
        };
        const getKraConfig = (statusStr) => {
            if (!statusStr)
                return { code: '', label: 'PENDING', isVerified: false, badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-300 dark:border-slate-700', theme: 'slate', icon: '⏱️', desc: 'Verification Pending' };
            const trimmed = String(statusStr).trim();
            if (CAMS_KRA_STATUS_CONFIG[trimmed])
                return CAMS_KRA_STATUS_CONFIG[trimmed];
            const match = trimmed.match(/\b(0[1-7]|[1-7])\b/);
            if (match && CAMS_KRA_STATUS_CONFIG[match[1]])
                return CAMS_KRA_STATUS_CONFIG[match[1]];
            const upper = trimmed.toUpperCase();
            if (upper.includes('VALIDATED'))
                return CAMS_KRA_STATUS_CONFIG['07'];
            if (upper.includes('REGISTERED'))
                return CAMS_KRA_STATUS_CONFIG['02'];
            if (upper.includes('UNDER PROCESS') || upper.includes('PROCESS'))
                return CAMS_KRA_STATUS_CONFIG['01'];
            if (upper.includes('ON HOLD') || upper.includes('HOLD'))
                return CAMS_KRA_STATUS_CONFIG['03'];
            if (upper.includes('REJECTED'))
                return CAMS_KRA_STATUS_CONFIG['04'];
            if (upper.includes('NOT AVAILABLE') || upper.includes('NOT FOUND'))
                return CAMS_KRA_STATUS_CONFIG['05'];
            if (upper.includes('DEACTIVATED'))
                return CAMS_KRA_STATUS_CONFIG['06'];
            return { code: trimmed, label: trimmed, isVerified: false, badgeClass: 'bg-slate-100 text-slate-700 border-slate-300', theme: 'slate', icon: 'ℹ️', desc: trimmed };
        };
        const headerKraCode = selectedClient.camsKraData?.kycData?.[0]?.status || selectedClient.kraStatusCode || selectedClient.kraStatus;
        const headerKraCfg = getKraConfig(headerKraCode);
        return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-6">
                          <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                            {/* Modal Header */}
                            <div className="px-6 sm:px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/50 backdrop-blur-sm">
                              <div className="flex items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3.5">
                                  {/* Client Avatar Initials */}
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white font-bold text-base flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 tracking-wider">
                                    {(selectedClient.name || 'CL').slice(0, 2).toUpperCase()}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                      <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        {selectedClient.name}
                                      </h3>
                                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${selectedClient.user?.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20'}`}>
                                        {selectedClient.user?.status || selectedClient.status || 'ACTIVE'}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                        {selectedClient.category || 'INDIVIDUAL'}
                                      </span>
                                      {/* KRA Pill */}
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${headerKraCfg.badgeClass}`}>
                                        <span>{headerKraCfg.icon}</span> {headerKraCfg.label} ({headerKraCfg.code || 'PENDING'})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                      <span>ID: {selectedClient.id || selectedClient._id}</span>
                                      <button type="button" onClick={() => {
                navigator.clipboard.writeText(selectedClient.id || selectedClient._id);
                toast.success('Client ID copied!');
            }} className="p-1 hover:text-slate-800 dark:hover:text-white rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition" title="Copy Client ID">
                                        <Copy className="w-3 h-3"/>
                                      </button>
                                      {selectedClient.createdAt && (<span className="font-sans text-slate-400">
                                          • Registered: {new Date(selectedClient.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>)}
                                    </div>
                                  </div>
                                </div>

                                <button onClick={() => {
                setIsViewClientModalOpen(false);
                setSelectedClient(null);
            }} className="w-8 h-8 rounded-xl bg-slate-200/60 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition shrink-0">
                                  <X className="h-4 w-4"/>
                                </button>
                              </div>
                            </div>

                            {/* Modal Tabs Selection */}
                            <div className="flex px-6 sm:px-8 border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-slate-900/80 p-2 space-x-1.5 text-xs overflow-x-auto">
                              {[
                { id: 'profile', label: 'Profile Overview', icon: User },
                { id: 'kyc', label: 'KYC & Documents', icon: ShieldCheck },
                { id: 'subscriptions', label: 'Subscription Logs', icon: CreditCard },
                { id: 'communications', label: 'Communications', icon: Mail },
                { id: 'timeline', label: 'Activity Timeline', icon: Clock }
            ].map(tab => {
                const Icon = tab.icon;
                const isActive = clientDetailsTab === tab.id;
                return (<button key={tab.id} onClick={() => setClientDetailsTab(tab.id)} className={`px-3.5 py-2 font-semibold transition rounded-xl whitespace-nowrap flex items-center gap-2 ${isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'}`}>
                                    <Icon className="w-3.5 h-3.5"/>
                                    <span>{tab.label}</span>
                                    {tab.id === 'kyc' && (selectedClient.camsKraData || selectedClient.kraVerified) && (<span className={`w-2 h-2 rounded-full ${selectedClient.kraVerified || selectedClient.camsKraData?.kycData?.[0]?.status === '07' ? 'bg-emerald-400' : 'bg-amber-400'}`}/>)}
                                  </button>);
            })}
                            </div>

                            {/* Modal Scrollable Content */}
                            <div className="p-6 sm:p-8 overflow-y-auto flex-grow space-y-6">
                              {clientDetailsTab === 'profile' && (<div className="space-y-6">
                                  {/* Top 4 Quick Metric / Compliance Cards */}
                                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {/* 1. Account Status */}
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Account Status</span>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/>
                                      </div>
                                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {selectedClient.user?.status || selectedClient.status || 'ACTIVE'}
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        Type: {selectedClient.category || 'INDIVIDUAL'}
                                      </p>
                                    </div>

                                    {/* 2. KRA Verification */}
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SEBI KRA Status</span>
                                        <Shield className="w-3.5 h-3.5 text-blue-500"/>
                                      </div>
                                      <div className="text-xs font-bold truncate">
                                        {(() => {
                    const kraCode = selectedClient.camsKraData?.kycData?.[0]?.status || selectedClient.kraStatusCode || selectedClient.kraStatus;
                    const kraCfg = getKraConfig(kraCode);
                    const colorClass = kraCfg.isVerified
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : (kraCfg.theme === 'rose'
                            ? 'text-rose-600 dark:text-rose-400'
                            : (kraCfg.theme === 'blue'
                                ? 'text-blue-600 dark:text-blue-400'
                                : 'text-amber-600 dark:text-amber-400'));
                    return (<span className={colorClass}>
                                              {kraCfg.label} ({kraCfg.code || 'PENDING'})
                                            </span>);
                })()}
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        Agency: {selectedClient.camsKraData?.kycData?.[0]?.kraInfo || 'CAMS KRA'}
                                      </p>
                                    </div>

                                    {/* 3. Service Agreement */}
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Service Agreement</span>
                                        <FileCheck className="w-3.5 h-3.5 text-indigo-500"/>
                                      </div>
                                      <div className="text-xs font-bold">
                                        {selectedClient.agreementSigned || (selectedClient.agreements && selectedClient.agreements.length > 0) ? (<span className="text-emerald-600 dark:text-emerald-400">SIGNED &amp; EXECUTED</span>) : (<span className="text-rose-500 dark:text-rose-400">NOT SIGNED</span>)}
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        SEBI Mandated eSign
                                      </p>
                                    </div>

                                    {/* 4. Subscriptions */}
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Subscriptions</span>
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-500"/>
                                      </div>
                                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {(selectedClient.subscriptions || []).filter((s) => new Date(s.endDate) > new Date()).length} Active Plans
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        {(selectedClient.subscriptions || []).length} Total Subscribed
                                      </p>
                                    </div>
                                  </div>

                                  {/* Contact & Identity Details Card */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4 shadow-xs">
                                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                                        <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <User className="w-3.5 h-3.5"/> Contact &amp; Identity
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Verified Client Attributes</span>
                                      </div>

                                      <div className="space-y-3 text-xs">
                                        {/* Email */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                                            <Mail className="w-3.5 h-3.5 text-slate-400"/> Email
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <strong className="text-slate-900 dark:text-white font-mono text-xs">
                                              {selectedClient.email?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.email || '—'}
                                            </strong>
                                            {selectedClient.email && (<button onClick={() => {
                        navigator.clipboard.writeText(selectedClient.email?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.email);
                        toast.success('Email copied!');
                    }} className="p-1 text-slate-400 hover:text-blue-600 transition" title="Copy Email">
                                                <Copy className="w-3 h-3"/>
                                              </button>)}
                                          </div>
                                        </div>

                                        {/* Mobile */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                                            <Phone className="w-3.5 h-3.5 text-slate-400"/> Mobile
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <strong className="text-slate-900 dark:text-white font-mono text-xs">
                                              {selectedClient.mobile?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.mobile || '—'}
                                            </strong>
                                            {selectedClient.mobile && (<button onClick={() => {
                        navigator.clipboard.writeText(selectedClient.mobile?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.mobile);
                        toast.success('Mobile copied!');
                    }} className="p-1 text-slate-400 hover:text-blue-600 transition" title="Copy Mobile">
                                                <Copy className="w-3 h-3"/>
                                              </button>)}
                                          </div>
                                        </div>

                                        {/* PAN */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                                            <Shield className="w-3.5 h-3.5 text-slate-400"/> PAN Number
                                          </span>
                                          <div className="flex items-center gap-1.5">
                                            <strong className="text-slate-900 dark:text-white font-mono text-xs font-bold">
                                              {selectedClient.pan?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.pan || <span className="text-slate-400 italic font-normal">Not Provided</span>}
                                            </strong>
                                            {selectedClient.pan && (<button onClick={() => {
                        navigator.clipboard.writeText(selectedClient.pan?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.pan);
                        toast.success('PAN copied!');
                    }} className="p-1 text-slate-400 hover:text-blue-600 transition" title="Copy PAN">
                                                <Copy className="w-3 h-3"/>
                                              </button>)}
                                          </div>
                                        </div>

                                        {/* Aadhaar */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                                            <Shield className="w-3.5 h-3.5 text-slate-400"/> Aadhaar No.
                                          </span>
                                          <strong className="text-slate-900 dark:text-white font-mono text-xs">
                                            {selectedClient.aadhaar?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.aadhaar || <span className="text-slate-400 italic font-normal">Not Provided</span>}
                                          </strong>
                                        </div>

                                        {/* Occupation */}
                                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 text-[11px]">
                                            <Briefcase className="w-3.5 h-3.5 text-slate-400"/> Occupation
                                          </span>
                                          <strong className="text-slate-900 dark:text-white text-xs">
                                            {selectedClient.occupation || <span className="text-slate-400 italic font-normal">Not Specified</span>}
                                          </strong>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Address Details Card */}
                                    <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4 shadow-xs">
                                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                                        <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <MapPin className="w-3.5 h-3.5"/> Address &amp; Location
                                        </h4>
                                        <span className="text-[10px] text-slate-400">Residential / Office</span>
                                      </div>

                                      <div className="space-y-3 text-xs">
                                        {/* Street Address */}
                                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 space-y-0.5">
                                          <span className="text-slate-400 uppercase font-semibold text-[9px] block">Street Address</span>
                                          <p className="text-slate-900 dark:text-white text-xs font-medium">
                                            {selectedClient.address || selectedClient.profile?.addressLine1 || <span className="text-slate-400 italic font-normal">Not Provided</span>}
                                          </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                            <span className="text-slate-400 uppercase font-semibold text-[9px] block">City</span>
                                            <strong className="text-slate-900 dark:text-white text-xs">
                                              {selectedClient.city || selectedClient.profile?.city || <span className="text-slate-400 italic font-normal">—</span>}
                                            </strong>
                                          </div>

                                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                            <span className="text-slate-400 uppercase font-semibold text-[9px] block">State</span>
                                            <strong className="text-slate-900 dark:text-white text-xs">
                                              {selectedClient.state || selectedClient.profile?.state || <span className="text-slate-400 italic font-normal">—</span>}
                                            </strong>
                                          </div>

                                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                            <span className="text-slate-400 uppercase font-semibold text-[9px] block">ZIP / Pincode</span>
                                            <strong className="text-slate-900 dark:text-white font-mono text-xs">
                                              {selectedClient.zipCode || selectedClient.profile?.zipCode || <span className="text-slate-400 italic font-normal">—</span>}
                                            </strong>
                                          </div>

                                          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5">
                                            <span className="text-slate-400 uppercase font-semibold text-[9px] block">Country</span>
                                            <strong className="text-slate-900 dark:text-white text-xs">
                                              {selectedClient.profile?.country || 'India'}
                                            </strong>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* ── Trade Delivery Channels & Bot Setup (View Client Modal) ── */}
                                  <div className="bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-white/10 p-5 space-y-4 shadow-xs">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 gap-2">
                                      <div>
                                        <h4 className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                                          <Send className="w-3.5 h-3.5"/> Trade Delivery Channels &amp; Bot Setup
                                        </h4>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                          Manage live trade signal dispatch preferences and direct bot connectivity for this client.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${viewClientIsTelegramTradeEnabled && viewClientTelegramChatId
                    ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30'
                    : viewClientIsTelegramTradeEnabled
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                          <Send className="w-2.5 h-2.5"/>
                                          {viewClientIsTelegramTradeEnabled ? (viewClientTelegramChatId ? 'TG Active' : 'TG (No Chat ID)') : 'TG Off'}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border flex items-center gap-1 ${viewClientIsSmsTradeEnabled && (selectedClient.mobile || selectedClient.user?.mobile)
                    ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
                    : viewClientIsSmsTradeEnabled
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                                          <Smartphone className="w-2.5 h-2.5"/>
                                          {viewClientIsSmsTradeEnabled ? 'SMS Active' : 'SMS Off'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/30 flex items-center gap-1">
                                          <Monitor className="w-2.5 h-2.5"/> Panel Active
                                        </span>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Telegram Direct Bot Delivery Card */}
                                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                          <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="checkbox" checked={viewClientIsTelegramTradeEnabled} onChange={e => setViewClientIsTelegramTradeEnabled(e.target.checked)} className="h-4 w-4 rounded accent-[#d4f23b] border-gray-300"/>
                                            <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                              <Send className="w-3.5 h-3.5 text-sky-500"/> Telegram Trade Delivery
                                            </span>
                                          </label>
                                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${viewClientIsTelegramTradeEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                            {viewClientIsTelegramTradeEnabled ? 'ENABLED' : 'DISABLED'}
                                          </span>
                                        </div>

                                        <div className="space-y-2 pt-1">
                                          <div>
                                            <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                                              Telegram Chat ID <span className="text-rose-500">*</span>
                                            </label>
                                            <input type="text" value={viewClientTelegramChatId} onChange={e => setViewClientTelegramChatId(e.target.value.trim())} placeholder="e.g. 123456789" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-900 dark:text-white font-mono focus:border-sky-500 focus:outline-none transition"/>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                              Company Bot se 1-on-1 direct DM trade bhejne ke liye numeric Chat ID enter karein.
                                            </p>
                                          </div>

                                          <div>
                                            <label className="block text-[10px] text-slate-600 dark:text-slate-400 mb-1 font-semibold uppercase tracking-wider">
                                              Telegram Username (Optional)
                                            </label>
                                            <input type="text" value={viewClientTelegramUsername} onChange={e => setViewClientTelegramUsername(e.target.value.trim())} placeholder="@username" className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1.5 px-3 text-xs text-slate-900 dark:text-white focus:border-sky-500 focus:outline-none transition"/>
                                          </div>
                                        </div>
                                      </div>

                                      {/* SMS Text Message Delivery Card */}
                                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/5 space-y-3 flex flex-col justify-between">
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                              <input type="checkbox" checked={viewClientIsSmsTradeEnabled} onChange={e => setViewClientIsSmsTradeEnabled(e.target.checked)} className="h-4 w-4 rounded accent-[#d4f23b] border-gray-300"/>
                                              <span className="text-xs font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                                                <Smartphone className="w-3.5 h-3.5 text-indigo-500"/> SMS Text Message Delivery
                                              </span>
                                            </label>
                                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${viewClientIsSmsTradeEnabled
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                              {viewClientIsSmsTradeEnabled ? 'ENABLED' : 'DISABLED'}
                                            </span>
                                          </div>

                                          <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 space-y-1 text-xs">
                                            <span className="text-[10px] text-slate-500 uppercase font-semibold block">Registered Mobile Number</span>
                                            <strong className="font-mono text-slate-900 dark:text-white">
                                              {selectedClient.mobile?.replace(new RegExp(`_deleted_${selectedClient.id}$`), '') || selectedClient.mobile || selectedClient.user?.mobile || 'No mobile number found'}
                                            </strong>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                              Global SMS dispatch on hone par is mobile par DLT trade text alerts bheje jayenge.
                                            </p>
                                          </div>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-violet-500/5 border border-violet-500/20 text-[10px] text-violet-700 dark:text-violet-300 flex items-center gap-1.5">
                                          <Monitor className="w-3 h-3 text-violet-500 shrink-0"/>
                                          <span>In-App Web &amp; Client Panel feed active subscription par hamesha on rehti hai.</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
                                      <button type="button" onClick={handleSaveClientTradeChannels} disabled={savingClientChannels} className="px-5 py-2.5 bg-[#d4f23b] text-black hover:bg-[#c3e031] font-bold rounded-xl text-xs transition shadow-md shadow-[#d4f23b]/20 flex items-center gap-2 disabled:opacity-50">
                                        {savingClientChannels ? <RefreshCcw className="w-3.5 h-3.5 animate-spin"/> : <Save className="w-3.5 h-3.5"/>}
                                        {savingClientChannels ? 'Saving Channel Settings...' : 'Save Channel Preferences'}
                                      </button>
                                    </div>
                                  </div>
                                </div>)}

                              {clientDetailsTab === 'kyc' && (<div className="space-y-6">

                                  {/* ── Fetch by Digio ID ─────────────────────────────── */}

                                  {/* CONFIRMATION POPUP MODAL */}
                                  {showDigioConfirmPopup && fetchDigioResult && (<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-violet-200 dark:border-violet-500/30 w-full max-w-lg max-h-[85vh] overflow-y-auto">
                                        {/* Header */}
                                        <div className="sticky top-0 bg-white dark:bg-slate-900 p-5 border-b border-slate-200 dark:border-white/5 rounded-t-2xl z-10">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                              <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                                                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                              </div>
                                              <div>
                                                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Digio se Fetched Data</h3>
                                                <p className="text-[10px] text-slate-500 mt-0.5">Neeche details verify karein — Confirm karne ke baad client profile update hoga</p>
                                              </div>
                                            </div>
                                            <button onClick={() => setShowDigioConfirmPopup(false)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-red-500 transition text-lg font-bold">✕</button>
                                          </div>
                                          {/* Fetch type badges */}
                                          <div className="flex gap-2 mt-3 flex-wrap">
                                            {fetchDigioResult.fetchTypes?.kycFetched && (<span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">✓ KYC Data Fetched</span>)}
                                            {fetchDigioResult.fetchTypes?.esignFetched && (<span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">✓ eSign/Agreement Fetched</span>)}
                                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-white/5">Status: {fetchDigioResult.digioStatus}</span>
                                          </div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-5 space-y-5">
                                          {/* KYC Details */}
                                          {Object.values(fetchDigioResult.extracted || {}).some(Boolean) && (<div>
                                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">📄 KYC Details (Digio se)</p>
                                              <div className="grid grid-cols-2 gap-2">
                                                {[
                            ['Aadhaar Name', fetchDigioResult.extracted?.aadhaarName],
                            ['PAN Name', fetchDigioResult.extracted?.panName],
                            ['PAN Number', fetchDigioResult.extracted?.panNumber],
                            ['Masked Aadhaar', fetchDigioResult.extracted?.maskedAadhaar],
                            ['Date of Birth', fetchDigioResult.extracted?.dob],
                            ['Gender', fetchDigioResult.extracted?.gender],
                            ['Father Name', fetchDigioResult.extracted?.fatherName],
                            ['City', fetchDigioResult.extracted?.city],
                            ['State', fetchDigioResult.extracted?.state],
                            ['ZIP Code', fetchDigioResult.extracted?.zipCode],
                        ].filter(([, v]) => v).map(([label, value]) => (<div key={label} className="flex flex-col gap-0.5 p-2.5 bg-violet-50 dark:bg-slate-800/60 rounded-xl border border-violet-100 dark:border-violet-500/10">
                                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
                                                    <strong className="text-slate-800 dark:text-white font-mono text-[11px]">{value}</strong>
                                                  </div>))}
                                                {fetchDigioResult.extracted?.address && (<div className="col-span-2 flex flex-col gap-0.5 p-2.5 bg-violet-50 dark:bg-slate-800/60 rounded-xl border border-violet-100 dark:border-violet-500/10">
                                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider">Full Address</span>
                                                    <strong className="text-slate-800 dark:text-white font-mono text-[11px]">{fetchDigioResult.extracted.address}</strong>
                                                  </div>)}
                                              </div>
                                            </div>)}

                                          {/* Agreement info */}
                                          {fetchDigioResult.fetchTypes?.esignFetched && (<div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                                              <div className="flex items-start gap-2.5">
                                                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                                <div>
                                                  <p className="text-[11px] font-bold text-blue-700 dark:text-blue-300">eSign Agreement Record</p>
                                                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">Confirm karne ke baad Digio se signed PDF download hoga aur Agreement record create hoga.</p>
                                                </div>
                                              </div>
                                            </div>)}

                                          {/* Warning */}
                                          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2.5">
                                            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                            <p className="text-[10px] text-amber-700 dark:text-amber-300">Confirm karne ke baad client profile permanently update ho jayega. Kya aap sure hain?</p>
                                          </div>
                                        </div>

                                        {/* Footer buttons */}
                                        <div className="sticky bottom-0 bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-white/5 rounded-b-2xl flex gap-3">
                                          <button onClick={() => setShowDigioConfirmPopup(false)} className="flex-1 py-2.5 rounded-xl border border-slate-300 dark:border-white/10 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                                            ✕ Cancel
                                          </button>
                                          <button disabled={fetchDigioSaveMode} onClick={async () => {
                        setFetchDigioSaveMode(true);
                        try {
                            const payload = {
                                kycDigioId: fetchDigioKycId || undefined,
                                esignDigioId: fetchDigioEsignId || undefined,
                                clientId: selectedClient._id || selectedClient.id,
                                saveToClient: true
                            };
                            const res = await api.fetchDigioRecord(payload);
                            if (res?.success) {
                                setFetchDigioResult({ ...res });
                                setShowDigioConfirmPopup(false);
                                toast.success(res.agreementCreated ? '✅ Profile + Agreement saved!' : '✅ KYC details saved!');
                                try {
                                    const updated = await api.getAdminClients();
                                    const found = (updated?.clients || updated?.data || []).find((c) => String(c._id || c.id) === String(selectedClient._id || selectedClient.id));
                                    if (found)
                                        setSelectedClient(found);
                                }
                                catch { }
                            }
                            else {
                                toast.error(res?.message || 'Failed to save');
                            }
                        }
                        catch (err) {
                            toast.error(err.message || 'Failed');
                        }
                        finally {
                            setFetchDigioSaveMode(false);
                        }
                    }} className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 transition">
                                            {fetchDigioSaveMode ? (<><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Confirm & Save to Profile</>)}
                                          </button>
                                        </div>
                                      </div>
                                    </div>)}

                                  {/* ── CAMS KRA Auto PAN Download & Verification ─────────────────────────── */}
                                  {(() => {
                    const camsRaw = selectedClient.camsKraData?.kycData?.[0] || selectedClient.camsKraData?.PAN?.[0] || {};
                    const kraPan = selectedClient.pan || camsRaw.pan || camsPanInput;
                    const kraName = selectedClient.panName || selectedClient.name || camsRaw.name || '';
                    const kraDob = selectedClient.dob
                        ? (typeof selectedClient.dob === 'string'
                            ? (selectedClient.dob.includes('/') ? selectedClient.dob : selectedClient.dob.split('T')[0])
                            : new Date(selectedClient.dob).toISOString().split('T')[0])
                        : (camsRaw.dob || camsDobInput || '');
                    const kraGender = selectedClient.gender || (camsRaw.gender === 'M' ? 'MALE' : camsRaw.gender === 'F' ? 'FEMALE' : camsRaw.gender) || '';
                    const kraFather = selectedClient.fatherName || camsRaw.firtName || camsRaw.father_name || '';
                    const kraMobile = selectedClient.mobile || camsRaw.mobileNo || camsRaw.mobile || '';
                    const kraEmail = selectedClient.email || camsRaw.email || '';
                    const rawStatusCode = String(camsRaw.status || selectedClient.kraStatusCode || selectedClient.kraStatus || '').trim();
                    const hasKycData = Boolean(selectedClient.camsKraData);
                    // Map to standard SEBI / CAMS KRA status code table:
                    // 07 -> KYC VALIDATED
                    // 02 -> KYC REGISTERED
                    // 01 -> UNDER PROCESS
                    // 03 -> ON HOLD
                    // 04 -> KYC REJECTED
                    // 05 -> NOT AVAILABLE
                    // 06 -> DEACTIVATED
                    const kraConfig = getKraConfig(rawStatusCode);
                    const isTrulyVerified = kraConfig.isVerified;
                    const kraAgency = camsRaw.kraInfo || selectedClient.camsKraData?.panSummary?.otherKraCode || 'CAMS KRA';
                    const kraAppNo = camsRaw.appNo || '';
                    const kraAddress = selectedClient.address || [camsRaw.corAddress1, camsRaw.corAddress2, camsRaw.corCity, camsRaw.corPincode].filter(Boolean).join(', ') || selectedClient.profile?.addressLine1 || '';
                    const kraPdfUrl = selectedClient.camsKraPdfUrl
                        ? (selectedClient.camsKraPdfUrl.startsWith('http') ? selectedClient.camsKraPdfUrl : `${api.getBaseUrl()}${selectedClient.camsKraPdfUrl}`)
                        : `${api.getBaseUrl()}/api/v1/admin/cams-kra/pdf/${selectedClient._id || selectedClient.id}`;
                    // ── STATE 1: SEBI KRA Fully Verified (07: KYC VALIDATED / 02: KYC REGISTERED) ──
                    if (hasKycData && isTrulyVerified && !camsEditMode) {
                        return (<div className="glassmorphism p-5 rounded-2xl border border-emerald-400/40 dark:border-emerald-500/30 space-y-4 bg-gradient-to-br from-emerald-50/60 via-teal-50/40 to-blue-50/50 dark:from-emerald-950/20 dark:via-teal-950/15 dark:to-blue-950/20 shadow-sm">
                                          {/* Header */}
                                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-emerald-200/60 dark:border-emerald-500/20 pb-3">
                                            <div className="flex items-center gap-2.5">
                                              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/20 text-base">
                                                ✓
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                                                    CAMS KRA — {kraConfig.label} ({kraConfig.code})
                                                  </h4>
                                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-600 flex items-center gap-1">
                                                    <Check className="w-2.5 h-2.5"/> {kraConfig.label} ({kraConfig.code})
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                  Live verification confirmed via {kraAgency} • {kraConfig.desc}
                                                </p>
                                              </div>
                                            </div>

                                            <button onClick={() => setCamsEditMode(true)} className="px-2.5 py-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-400 transition flex items-center gap-1.5 shadow-sm" title="Re-verify or edit PAN/DOB">
                                              <RefreshCw className="w-3 h-3"/> Re-Verify / Re-Sync
                                            </button>
                                          </div>

                                          {/* Verified Details Grid */}
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">PAN Number</span>
                                              <strong className="font-mono text-slate-900 dark:text-white text-xs tracking-wider">{kraPan || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Verified Name</span>
                                              <strong className="text-slate-900 dark:text-white text-xs truncate block" title={kraName}>{kraName || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Date of Birth</span>
                                              <strong className="text-slate-900 dark:text-white text-xs">{kraDob || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Gender</span>
                                              <strong className="text-slate-900 dark:text-white text-xs">{kraGender || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Father Name</span>
                                              <strong className="text-slate-900 dark:text-white text-xs truncate block" title={kraFather}>{kraFather || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Mobile</span>
                                              <strong className="text-slate-900 dark:text-white text-xs font-mono">{kraMobile || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Email</span>
                                              <strong className="text-slate-900 dark:text-white text-xs truncate block font-mono" title={kraEmail}>{kraEmail || '—'}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">KRA Agency</span>
                                              <strong className="text-slate-900 dark:text-white text-xs truncate block">{kraAgency} {kraAppNo ? `• #${kraAppNo}` : ''}</strong>
                                            </div>
                                          </div>

                                          {kraAddress && (<div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-emerald-100 dark:border-emerald-500/10 text-xs shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block mb-0.5">Verified Address (KRA Records)</span>
                                              <span className="text-slate-800 dark:text-slate-200">{kraAddress}</span>
                                            </div>)}

                                          {/* Official Generated KRA PDF Vault Card */}
                                          <div className="p-4 bg-gradient-to-r from-blue-900/90 via-indigo-900/90 to-slate-900 text-white rounded-xl shadow-lg border border-blue-500/30 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-400/40 flex items-center justify-center flex-shrink-0 text-red-300">
                                                <FileText className="w-6 h-6"/>
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold text-white tracking-wide">Official SEBI KRA Verification Report (PDF)</span>
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                                    Archived in Vault
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-blue-200/80 mt-0.5">
                                                  File: <span className="font-mono text-white font-medium">CAMS_KRA_KYC_{kraPan || 'CLIENT'}.pdf</span> • Stored in <strong className="text-blue-300">Client Vault / Folder 05 (KYC Documents)</strong>
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                              <a href={kraPdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-md shadow-blue-500/30 flex items-center justify-center gap-2 transition">
                                                <Eye className="w-4 h-4"/> View / Download PDF
                                              </a>
                                              <button type="button" onClick={() => {
                                setIsViewClientModalOpen(false);
                                setActiveTab('vaults');
                                window.location.hash = '#vaults';
                                toast.success('Client Vault folder 05 (KYC Documents) me CAMS KRA PDF available hai');
                            }} className="flex-1 md:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition">
                                                📁 Open in Vault
                                              </button>
                                            </div>
                                          </div>
                                        </div>);
                    }
                    // ── STATE 2: KYC Record Found But Not Validated (01: Under Process, 03: On Hold, 04: Rejected, 05: Not Available, 06: Deactivated) ──
                    if (hasKycData && !isTrulyVerified && !camsEditMode) {
                        const isRejected = kraConfig.code === '04';
                        const isUnderProcess = kraConfig.code === '01';
                        const isNotAvail = kraConfig.code === '05';
                        const cardGradient = isRejected
                            ? 'from-rose-50/70 via-red-50/40 to-orange-50/50 dark:from-rose-950/20 dark:via-red-950/15 dark:to-orange-950/20 border-rose-400/40 dark:border-rose-500/30'
                            : isUnderProcess
                                ? 'from-blue-50/70 via-indigo-50/40 to-sky-50/50 dark:from-blue-950/20 dark:via-indigo-950/15 dark:to-sky-950/20 border-blue-400/40 dark:border-blue-500/30'
                                : 'from-amber-50/70 via-yellow-50/40 to-orange-50/50 dark:from-amber-950/20 dark:via-yellow-950/15 dark:to-orange-950/20 border-amber-400/40 dark:border-amber-500/30';
                        const iconBg = isRejected ? 'bg-rose-500' : isUnderProcess ? 'bg-blue-600' : 'bg-amber-500';
                        return (<div className={`glassmorphism p-5 rounded-2xl border space-y-4 bg-gradient-to-br shadow-sm ${cardGradient}`}>
                                          {/* Header */}
                                          <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-white/10 pb-3">
                                            <div className="flex items-center gap-2.5">
                                              <div className={`w-10 h-10 rounded-xl text-white flex items-center justify-center font-bold shadow-md text-base ${iconBg}`}>
                                                {kraConfig.icon}
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                                    CAMS KRA — {kraConfig.label} ({kraConfig.code})
                                                  </h4>
                                                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border flex items-center gap-1 ${kraConfig.badgeClass}`}>
                                                    <span>{kraConfig.icon}</span> STATUS {kraConfig.code}: {kraConfig.label}
                                                  </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                  Agency: {kraAgency} • Batch: {selectedClient.camsKraData?.panSummary?.otherKraBatch || 'Live'}
                                                </p>
                                              </div>
                                            </div>

                                            <button onClick={() => setCamsEditMode(true)} className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 bg-white/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-lg hover:border-blue-400 transition flex items-center gap-1.5 shadow-sm" title="Re-query or edit PAN">
                                              <RefreshCw className="w-3 h-3"/> Re-Sync with CAMS KRA
                                            </button>
                                          </div>

                                          {/* Notice Alert */}
                                          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 border ${isRejected
                                ? 'bg-rose-100/70 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/50 text-rose-900 dark:text-rose-200'
                                : isUnderProcess
                                    ? 'bg-blue-100/70 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50 text-blue-900 dark:text-blue-200'
                                    : 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200'}`}>
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                                            <div>
                                              <strong>KRA Status "{kraConfig.code} — {kraConfig.label}":</strong> {kraConfig.desc}. {isNotAvail
                                ? 'KRA database me is PAN ka KYC record nahi mila. Client se documents le kar fresh CKYC / KRA registration karwayein.'
                                : isUnderProcess
                                    ? 'KRA registry me processing poori hone par re-sync karein.'
                                    : 'Client dwara KRA portal par documents update karne ke baad yahan Re-Sync karein.'}
                                            </div>
                                          </div>

                                          {/* Summary Details Grid */}
                                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">PAN Number</span>
                                              <strong className="font-mono text-slate-900 dark:text-white text-xs tracking-wider">{kraPan}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Registry Status</span>
                                              <strong className="text-xs font-mono">{kraConfig.code} — {kraConfig.label}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">KRA Agency</span>
                                              <strong className="text-slate-900 dark:text-white text-xs">{kraAgency}</strong>
                                            </div>
                                            <div className="p-2.5 bg-white/90 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-white/10 shadow-xs">
                                              <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-semibold tracking-wider block">Query Timestamp</span>
                                              <strong className="text-slate-900 dark:text-white text-xs">{selectedClient.camsKraData?.panSummary?.responseDate || new Date().toLocaleString()}</strong>
                                            </div>
                                          </div>

                                          {/* Official Generated KRA PDF Vault Card */}
                                          <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-950 text-white rounded-xl shadow-lg border border-slate-700/50 flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                              <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-300">
                                                <FileText className="w-6 h-6"/>
                                              </div>
                                              <div>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-xs font-bold text-white tracking-wide">Official KRA Query Audit Dossier (PDF)</span>
                                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                                    Status {kraConfig.code} ({kraConfig.label}) Archived
                                                  </span>
                                                </div>
                                                <p className="text-[11px] text-slate-300 mt-0.5">
                                                  File: <span className="font-mono text-white font-medium">CAMS_KRA_KYC_{kraPan || 'CLIENT'}.pdf</span> • Stored in <strong className="text-blue-300">Client Vault / Folder 05 (KYC Documents)</strong>
                                                </p>
                                              </div>
                                            </div>

                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                              <a href={kraPdfUrl} target="_blank" rel="noopener noreferrer" className="flex-1 md:flex-none px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center justify-center gap-2 transition">
                                                <Eye className="w-4 h-4"/> View / Download PDF
                                              </a>
                                              <button type="button" onClick={() => {
                                setIsViewClientModalOpen(false);
                                setActiveTab('vaults');
                                window.location.hash = '#vaults';
                                toast.success('Client Vault folder 05 (KYC Documents) me KRA Audit PDF available hai');
                            }} className="flex-1 md:flex-none px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition">
                                                📁 Open in Vault
                                              </button>
                                            </div>
                                          </div>
                                        </div>);
                    }
                    // ── STATE 3: No KRA Data or In Edit Mode ──
                    return (<div className="glassmorphism p-5 rounded-2xl border border-blue-400/30 dark:border-blue-500/20 space-y-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/20 dark:to-indigo-950/20 shadow-sm">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 text-blue-600 dark:text-blue-400 font-bold">
                                              🏢
                                            </div>
                                            <div>
                                              <h4 className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                                                <span>CAMS KRA — Auto PAN Download & Verification</span>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-200/70 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 font-semibold">SEBI KRA API</span>
                                              </h4>
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                PAN aur DOB verify karein — live CAMS KRA se verified details fetch hongi, official PDF generate hoke Vault me save ho jayega.
                                              </p>
                                            </div>
                                          </div>
                                          {camsEditMode && (<button onClick={() => setCamsEditMode(false)} className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-white px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 transition">
                                              ✕ Cancel
                                            </button>)}
                                        </div>

                                        {/* Input Fields */}
                                        {(() => {
                            const isPanValid = camsPanInput.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(camsPanInput);
                            const isPanIncomplete = camsPanInput.length > 0 && camsPanInput.length < 10;
                            const isDobValid = !camsDobInput || (/^\d{4}-\d{2}-\d{2}$/.test(camsDobInput) &&
                                !isNaN(new Date(camsDobInput).getTime()) &&
                                new Date(camsDobInput) <= new Date() &&
                                new Date(camsDobInput).getFullYear() >= 1920);
                            const isDobFuture = Boolean(camsDobInput && new Date(camsDobInput) > new Date());
                            const canSubmit = isPanValid && isDobValid && !fetchCamsLoading;
                            return (<>
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* PAN Input Field */}
                                                <div>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                      PAN Number <span className="text-red-500">*</span>
                                                    </label>
                                                    <span className="text-[9px] font-mono font-bold text-slate-400">
                                                      {camsPanInput.length}/10
                                                    </span>
                                                  </div>
                                                  <input type="text" placeholder="ABCDE1234F" value={camsPanInput} maxLength={10} onChange={e => {
                                    const formatted = formatPan(e.target.value);
                                    setCamsPanInput(formatted);
                                    setFetchCamsError('');
                                }} className={`w-full px-3 py-2 text-xs rounded-lg border font-mono tracking-widest font-extrabold transition-all uppercase ${isPanValid
                                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                                    : 'border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40'}`}/>
                                                  {/* Real-time PAN format guide */}
                                                  <div className="mt-1 min-h-[16px]">
                                                    {isPanValid && (<p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                                        <span>✓</span> Valid PAN format (5 letters + 4 digits + 1 letter)
                                                      </p>)}
                                                    {isPanIncomplete && (<p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                        {10 - camsPanInput.length} character{10 - camsPanInput.length > 1 ? 's' : ''} remaining ({camsPanInput.length < 5 ? 'Letters [A-Z]' : camsPanInput.length < 9 ? 'Digits [0-9]' : 'Final Letter [A-Z]'})
                                                      </p>)}
                                                    {!camsPanInput && (<p className="text-[10px] text-slate-400">
                                                        Enter 10-digit PAN (5 Letters + 4 Digits + 1 Letter)
                                                      </p>)}
                                                  </div>
                                                </div>

                                                {/* Date of Birth (DOB) Field */}
                                                <div>
                                                  <div className="flex items-center justify-between mb-1">
                                                    <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                      Date of Birth (DOB) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                                                    </label>
                                                    {camsDobInput && (<button type="button" onClick={() => {
                                        setCamsDobInput('');
                                        setFetchCamsError('');
                                    }} className="text-[10px] text-rose-500 hover:text-rose-700 hover:underline">
                                                        Clear
                                                      </button>)}
                                                  </div>
                                                  <input type="date" max={new Date().toISOString().split('T')[0]} min="1920-01-01" value={camsDobInput} onChange={e => {
                                    setCamsDobInput(e.target.value);
                                    setFetchCamsError('');
                                }} className={`w-full px-3 py-2 text-xs rounded-lg border font-mono transition-all ${isDobFuture
                                    ? 'border-rose-500 bg-rose-50/20 text-rose-900 ring-2 ring-rose-500/20'
                                    : camsDobInput
                                        ? 'border-emerald-400 bg-emerald-50/20 dark:bg-emerald-950/20 text-slate-800 dark:text-slate-200'
                                        : 'border-blue-300 dark:border-blue-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/40'}`}/>
                                                  {/* Real-time DOB guide */}
                                                  <div className="mt-1 min-h-[16px]">
                                                    {isDobFuture ? (<p className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
                                                        ⚠ DOB cannot be a future date!
                                                      </p>) : camsDobInput && isDobValid ? (<p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                        <span>✓</span> Selected: {new Date(camsDobInput).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                      </p>) : (<p className="text-[10px] text-slate-400">
                                                        Pick Date from calendar for exact KRA record match
                                                      </p>)}
                                                  </div>
                                                </div>
                                              </div>

                                              {/* 1-Click Action Button */}
                                              <button disabled={!canSubmit} onClick={async () => {
                                    if (!isPanValid) {
                                        toast.error('Kripya valid 10-digit PAN format enter karein (e.g. ABCDE1234F)');
                                        return;
                                    }
                                    if (camsDobInput && !isDobValid) {
                                        toast.error('Kripya valid Date of Birth select karein');
                                        return;
                                    }
                                    setFetchCamsLoading(true);
                                    setFetchCamsError('');
                                    try {
                                        const res = await api.fetchCamsRecord({
                                            pan: camsPanInput.trim().toUpperCase(),
                                            dob: camsDobInput.trim() || undefined,
                                            clientId: selectedClient._id || selectedClient.id,
                                            saveToClient: true
                                        });
                                        if (res?.success) {
                                            toast.success('✅ CAMS KRA details verified & Official PDF saved to Client Vault!');
                                            setCamsEditMode(false);
                                            try {
                                                const updated = await api.getAdminClients();
                                                const found = (updated?.clients || updated?.data || []).find((c) => String(c._id || c.id) === String(selectedClient._id || selectedClient.id));
                                                if (found)
                                                    setSelectedClient(found);
                                                await loadData(true);
                                            }
                                            catch { }
                                        }
                                        else {
                                            setFetchCamsError(res?.message || 'CAMS KRA fetch failed');
                                            toast.error(res?.message || 'Failed to fetch from CAMS KRA');
                                        }
                                    }
                                    catch (err) {
                                        const msg = err?.response?.data?.message || err?.message || 'Failed to communicate with CAMS KRA';
                                        setFetchCamsError(msg);
                                        toast.error(msg);
                                    }
                                    finally {
                                        setFetchCamsLoading(false);
                                    }
                                }} className={`w-full py-2.5 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition cursor-pointer shadow-md ${canSubmit
                                    ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-700 hover:via-indigo-700 hover:to-emerald-700 text-white shadow-blue-500/20'
                                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-slate-700'}`} title={!isPanValid ? 'Enter valid 10-digit PAN (5 letters, 4 digits, 1 letter)' : ''}>
                                                {fetchCamsLoading ? (<><Loader2 className="w-4 h-4 animate-spin"/> Verifying CAMS &amp; Generating Vault PDF...</>) : (<>⚡ Auto-Verify via CAMS KRA &amp; Generate Vault PDF</>)}
                                              </button>
                                            </>);
                        })()}

                                        {/* Error alert */}
                                        {fetchCamsError && (<div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-400">
                                            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                                            <div>
                                              <strong>CAMS KRA Error:</strong> {fetchCamsError}
                                            </div>
                                          </div>)}
                                      </div>);
                })()}

                                  {(() => {
                    const hasSignedAgreement = Boolean(selectedClient.agreementSigned ||
                        (selectedClient.agreements && selectedClient.agreements.some((a) => a.status === 'SIGNED' || a.agreementUrl)));
                    const signedAgreementRecord = (selectedClient.agreements || []).find((a) => a.status === 'SIGNED' || a.agreementUrl);
                    const isKycVerified = Boolean(['VERIFIED', 'APPROVED', 'COMPLETED'].includes(selectedClient.kycStatus) ||
                        selectedClient.camsKraData?.panSummary?.isKycValidated ||
                        selectedClient.kraStatusCode === '07');
                    const bothKycAndAgreementComplete = hasSignedAgreement && isKycVerified;
                    if (bothKycAndAgreementComplete && !showManualDigioFetch) {
                        return (<div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-900/10 flex items-center justify-between flex-wrap gap-3">
                                          <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                                              <CheckCircle2 className="w-5 h-5"/>
                                            </div>
                                            <div>
                                              <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-2">
                                                <span>KYC &amp; Service Agreement Verified</span>
                                                <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-200 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 font-extrabold">All Records Stored</span>
                                              </h4>
                                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                Client KYC verification complete &amp; signed Service Agreement (v{signedAgreementRecord?.version || '1'}) is already verified and archived on file.
                                              </p>
                                            </div>
                                          </div>
                                          <button type="button" onClick={() => setShowManualDigioFetch(true)} className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline px-3 py-1.5 rounded-lg border border-violet-200 dark:border-violet-500/30 bg-white dark:bg-slate-800 transition shadow-xs">
                                            ⚙️ Manual Digio Re-fetch (Optional)
                                          </button>
                                        </div>);
                    }
                    return (<div className="glassmorphism p-5 rounded-xl border border-violet-400/30 dark:border-violet-500/20 space-y-4 bg-violet-50/50 dark:bg-violet-900/5">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                              <svg className="w-4 h-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"/></svg>
                                            </div>
                                            <div>
                                              <h4 className="text-xs font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider">⭐ Fetch by Digio ID</h4>
                                              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Digio se KYC/eSign ID enter karo — details auto-fetch ho jayenge aur client profile update ho jayegi.</p>
                                            </div>
                                          </div>
                                          {bothKycAndAgreementComplete && (<button type="button" onClick={() => setShowManualDigioFetch(false)} className="text-[10px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 transition">
                                              ✕ Collapse
                                            </button>)}
                                        </div>

                                        {/* Info note */}
                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-500/20 rounded-lg text-[10px] text-blue-700 dark:text-blue-300 space-y-1">
                                          <div><strong>KYC ID</strong> (KYC...) → Aadhaar Name, PAN, DOB, Gender, Father Name, Address, City, State, ZIP</div>
                                          <div><strong>eSign ID</strong> (DID...) → Agreement PDF download + Agreement record create</div>
                                          <div className="text-blue-500 dark:text-blue-400">💡 Jo document pending ho sirf wahi ID enter karein.</div>
                                        </div>

                                        {/* Status Indicators & Input fields */}
                                        <div className="grid grid-cols-1 gap-2.5">
                                          {/* KYC Section */}
                                          {isKycVerified ? (<div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>
                                                KYC already verified ({selectedClient.kraStatusCode || selectedClient.kycStatus || 'Validated'}) — KYC ID fetch not required.
                                              </span>
                                            </div>) : (<div className="flex gap-2 items-center">
                                              <span className="text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">KYC ID</span>
                                              <input type="text" placeholder="KYC2024... (Aadhaar/PAN details)" value={(() => { try {
                            return JSON.parse(fetchDigioIdInput || '{}').kycId || '';
                        }
                        catch {
                            return /^KYC/i.test(fetchDigioIdInput) ? fetchDigioIdInput : '';
                        } })()} onChange={e => {
                                const esignPart = (() => { try {
                                    return JSON.parse(fetchDigioIdInput || '{}').esignId || '';
                                }
                                catch {
                                    return /^DID/i.test(fetchDigioIdInput) ? fetchDigioIdInput : '';
                                } })();
                                setFetchDigioIdInput(JSON.stringify({ kycId: e.target.value.trim(), esignId: esignPart }));
                                setFetchDigioResult(null);
                                setFetchDigioError('');
                            }} className="flex-1 px-3 py-2 text-xs rounded-lg border border-violet-300 dark:border-violet-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono"/>
                                            </div>)}

                                          {/* Agreement Section */}
                                          {hasSignedAgreement ? (<div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                                              <span className="flex items-center gap-1.5 font-semibold text-[11px]">
                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0"/>
                                                Service Agreement already signed &amp; stored on file (v{signedAgreementRecord?.version || '1'}) — eSign ID fetch not required.
                                              </span>
                                              {signedAgreementRecord?.agreementUrl && (<a href={api.getDownloadUrl(signedAgreementRecord.agreementUrl)} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold text-[10px] shrink-0 ml-2">
                                                  View Agreement
                                                </a>)}
                                            </div>) : (<div className="flex gap-2 items-center">
                                              <span className="text-[10px] font-bold text-slate-500 w-16 flex-shrink-0">eSign ID</span>
                                              <input type="text" placeholder="DID2024... (eSign/Agreement)" value={(() => { try {
                            return JSON.parse(fetchDigioIdInput || '{}').esignId || '';
                        }
                        catch {
                            return /^DID/i.test(fetchDigioIdInput) ? fetchDigioIdInput : '';
                        } })()} onChange={e => {
                                const kycPart = (() => { try {
                                    return JSON.parse(fetchDigioIdInput || '{}').kycId || '';
                                }
                                catch {
                                    return /^KYC/i.test(fetchDigioIdInput) ? fetchDigioIdInput : '';
                                } })();
                                setFetchDigioIdInput(JSON.stringify({ kycId: kycPart, esignId: e.target.value.trim() }));
                                setFetchDigioResult(null);
                                setFetchDigioError('');
                            }} className="flex-1 px-3 py-2 text-xs rounded-lg border border-violet-300 dark:border-violet-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 font-mono"/>
                                            </div>)}
                                        </div>

                                    <button disabled={fetchDigioLoading || (() => { try {
                        const p = JSON.parse(fetchDigioIdInput || '{}');
                        return !p.kycId && !p.esignId;
                    }
                    catch {
                        return !fetchDigioIdInput.trim();
                    } })()} onClick={async () => {
                            setFetchDigioLoading(true);
                            setFetchDigioResult(null);
                            setFetchDigioError('');
                            try {
                                let payload = {};
                                try {
                                    const p = JSON.parse(fetchDigioIdInput || '{}');
                                    if (p.kycId)
                                        payload.kycDigioId = p.kycId;
                                    if (p.esignId)
                                        payload.esignDigioId = p.esignId;
                                }
                                catch {
                                    payload.digioId = fetchDigioIdInput.trim();
                                }
                                const res = await api.fetchDigioRecord(payload);
                                if (res?.success) {
                                    setFetchDigioResult(res);
                                }
                                else {
                                    setFetchDigioError(res?.message || 'Fetch failed');
                                }
                            }
                            catch (err) {
                                setFetchDigioError(err.message || 'Failed');
                            }
                            finally {
                                setFetchDigioLoading(false);
                            }
                        }} className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition">
                                      {fetchDigioLoading ? (<><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Fetching from Digio...</>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>Digio se Fetch Karo</>)}
                                    </button>

                                    {/* Error */}
                                    {fetchDigioError && (<div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-lg text-xs text-red-700 dark:text-red-400">
                                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
                                        <span>{fetchDigioError}</span>
                                      </div>)}

                                    {/* Result Preview */}
                                    {fetchDigioResult && (<div className="space-y-3">
                                        {/* Status badges */}
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {fetchDigioResult.fetchTypes?.kycFetched && (<span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">✓ KYC Fetched</span>)}
                                            {fetchDigioResult.fetchTypes?.esignFetched && (<span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">✓ eSign Fetched</span>)}
                                            <span className="text-[9px] font-bold text-slate-500 uppercase">Status: {fetchDigioResult.digioStatus}</span>
                                          </div>
                                          <button onClick={() => { setFetchDigioResult(null); setFetchDigioIdInput(''); }} className="text-[9px] text-slate-400 hover:text-red-500 transition">✕ Clear</button>
                                        </div>

                                        {/* Extracted fields from Digio */}
                                        {Object.values(fetchDigioResult.extracted || {}).some(Boolean) && (<div>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">📄 Digio se Extracted Data</p>
                                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                              {[
                                    ['Aadhaar Name', fetchDigioResult.extracted?.aadhaarName],
                                    ['PAN Name', fetchDigioResult.extracted?.panName],
                                    ['PAN Number', fetchDigioResult.extracted?.panNumber],
                                    ['Masked Aadhaar', fetchDigioResult.extracted?.maskedAadhaar],
                                    ['Date of Birth', fetchDigioResult.extracted?.dob],
                                    ['Gender', fetchDigioResult.extracted?.gender],
                                    ['Father Name', fetchDigioResult.extracted?.fatherName],
                                    ['City', fetchDigioResult.extracted?.city],
                                    ['State', fetchDigioResult.extracted?.state],
                                    ['ZIP Code', fetchDigioResult.extracted?.zipCode],
                                ].filter(([, v]) => v).map(([label, value]) => (<div key={label} className="flex flex-col gap-0.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
                                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
                                                  <strong className="text-slate-800 dark:text-white font-mono text-[11px]">{value}</strong>
                                                </div>))}
                                              {fetchDigioResult.extracted?.address && (<div className="col-span-2 flex flex-col gap-0.5 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5">
                                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Full Address</span>
                                                  <strong className="text-slate-800 dark:text-white font-mono text-[11px]">{fetchDigioResult.extracted.address}</strong>
                                                </div>)}
                                            </div>
                                          </div>)}

                                        {/* Client snapshot from DB */}
                                        {fetchDigioResult.clientSnapshot && (<div>
                                            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">👤 Client Full Profile (DB + Digio Merged)</p>
                                            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                                              {[
                                    ['Name', fetchDigioResult.clientSnapshot.name],
                                    ['Email', fetchDigioResult.clientSnapshot.email],
                                    ['Mobile', fetchDigioResult.clientSnapshot.mobile],
                                    ['PAN', fetchDigioResult.clientSnapshot.pan],
                                    ['Aadhaar', fetchDigioResult.clientSnapshot.aadhaar],
                                    ['DOB', fetchDigioResult.clientSnapshot.dob],
                                    ['Gender', fetchDigioResult.clientSnapshot.gender],
                                    ['Father Name', fetchDigioResult.clientSnapshot.fatherName],
                                    ['City', fetchDigioResult.clientSnapshot.city],
                                    ['State', fetchDigioResult.clientSnapshot.state],
                                    ['ZIP Code', fetchDigioResult.clientSnapshot.zipCode],
                                ].filter(([, v]) => v).map(([label, value]) => (<div key={label} className="flex flex-col gap-0.5 p-2 bg-emerald-50/50 dark:bg-slate-900 rounded-lg border border-emerald-200/50 dark:border-white/5">
                                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</span>
                                                  <strong className="text-slate-800 dark:text-white font-mono text-[11px] break-all">{value}</strong>
                                                </div>))}
                                              {fetchDigioResult.clientSnapshot.address && (<div className="col-span-2 flex flex-col gap-0.5 p-2 bg-emerald-50/50 dark:bg-slate-900 rounded-lg border border-emerald-200/50 dark:border-white/5">
                                                  <span className="text-[9px] text-slate-500 uppercase tracking-wider">Address</span>
                                                  <strong className="text-slate-800 dark:text-white font-mono text-[11px]">{fetchDigioResult.clientSnapshot.address}</strong>
                                                </div>)}
                                            </div>

                                            {/* Agreements */}
                                            {(fetchDigioResult.clientSnapshot.agreements?.length > 0 || fetchDigioResult.agreementCreated) && (<div className="mt-2">
                                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">📜 Agreements</p>
                                                {fetchDigioResult.agreementCreated && (<div className="flex items-center gap-2 p-2 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mb-1.5">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                                    New Agreement record created successfully!
                                                  </div>)}
                                                {fetchDigioResult.clientSnapshot.agreements.map((agr) => (<div key={agr.id} className="flex items-center justify-between p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-white/5 text-[10px]">
                                                    <div>
                                                      <span className={`font-bold ${agr.status === 'SIGNED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600'}`}>{agr.status}</span>
                                                      <span className="text-slate-500 ml-2">{agr.esignMode}</span>
                                                      {agr.signedAt && <span className="text-slate-400 ml-2">{new Date(agr.signedAt).toLocaleDateString('en-IN')}</span>}
                                                    </div>
                                                    {agr.agreementUrl && (<a href={agr.agreementUrl} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700 font-semibold underline ml-2">View PDF</a>)}
                                                  </div>))}
                                              </div>)}
                                          </div>)}

                                        {/* Save button */}
                                        {fetchDigioResult.savedToClient ? (<div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                                            Client profile successfully updated with Digio data!
                                            {fetchDigioResult.agreementCreated && <span className="ml-1 text-blue-500">+ Agreement created.</span>}
                                          </div>) : (<button disabled={fetchDigioSaveMode} onClick={async () => {
                                    setFetchDigioSaveMode(true);
                                    try {
                                        let payload = { clientId: selectedClient._id || selectedClient.id, saveToClient: true };
                                        try {
                                            const p = JSON.parse(fetchDigioIdInput || '{}');
                                            if (p.kycId)
                                                payload.kycDigioId = p.kycId;
                                            if (p.esignId)
                                                payload.esignDigioId = p.esignId;
                                        }
                                        catch {
                                            payload.digioId = fetchDigioIdInput.trim();
                                        }
                                        const res = await api.fetchDigioRecord(payload);
                                        if (res?.success) {
                                            setFetchDigioResult({ ...res });
                                            toast.success(res.agreementCreated ? 'Profile + Agreement saved!' : 'KYC details saved to client profile!');
                                            try {
                                                const updated = await api.getAdminClients();
                                                const found = (updated?.clients || updated?.data || []).find((c) => String(c._id || c.id) === String(selectedClient._id || selectedClient.id));
                                                if (found)
                                                    setSelectedClient(found);
                                            }
                                            catch { }
                                        }
                                        else {
                                            toast.error(res?.message || 'Failed to save');
                                        }
                                    }
                                    catch (err) {
                                        toast.error(err.message || 'Failed to save');
                                    }
                                    finally {
                                        setFetchDigioSaveMode(false);
                                    }
                                }} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition">
                                            {fetchDigioSaveMode ? (<><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</>) : (<><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>Client Profile + Agreement Save Karo</>)}
                                          </button>)}
                                      </div>)}
                                  </div>);
                })()}

                                  {/* Verification status and files */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">KYC Verification Status</h4>
                                    <div className="flex items-center space-x-3 text-xs mb-2">
                                      <span className="text-slate-600 dark:text-slate-400">KYC Status:</span>
                                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${['VERIFIED', 'APPROVED', 'COMPLETED'].includes(selectedClient.kycStatus)
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                    : ['REJECTED', 'FAILED'].includes(selectedClient.kycStatus)
                        ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>
                                        {(selectedClient.kycStatus || 'PENDING')?.replace(/_/g, ' ')}
                                      </span>
                                    </div>

                                    <div className="space-y-3">
                                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase block tracking-wider mt-4">KYC Proof Documents</span>
                                      {(() => {
                    const docs = [...(selectedClient.documents || [])];
                    if (selectedClient.camsKraPdfUrl && !docs.some((d) => d.docType === 'CAMS_KRA_KYC_REPORT')) {
                        docs.unshift({
                            id: 'cams-kra-pdf',
                            docType: 'CAMS_KRA_KYC_REPORT',
                            fileName: `CAMS_KRA_KYC_${selectedClient.pan || 'REPORT'}.pdf`,
                            fileUrl: selectedClient.camsKraPdfUrl,
                            status: 'VERIFIED'
                        });
                    }
                    if (docs.length === 0) {
                        return (<div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">
                                              No KYC proof documents uploaded by client.
                                            </div>);
                    }
                    return (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {docs.map((doc) => (<div key={doc.id} className="p-3 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-lg flex items-center justify-between text-xs">
                                                <div>
                                                  <strong className="text-slate-800 dark:text-slate-200 block font-mono">{doc.docType?.replace(/_/g, ' ')}</strong>
                                                  <span className="text-[10px] text-slate-500 dark:text-slate-500 block truncate max-w-[180px]">{doc.fileName}</span>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${doc.status === 'VERIFIED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'}`}>{doc.status}</span>
                                                  <a href={doc.fileUrl.startsWith('http') ? doc.fileUrl : `${api.getBaseUrl()}${doc.fileUrl}`} target="_blank" rel="noreferrer" className="p-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-primary-600 dark:text-primary-400 hover:text-slate-900 dark:text-white transition"><Eye className="h-3 w-3"/></a>
                                                </div>
                                              </div>))}
                                          </div>);
                })()}
                                    </div>
                                  </div>

                                  {/* Agreements status */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Client Service Agreements</h4>
                                    {selectedClient.agreements && selectedClient.agreements.length > 0 ? (<div className="space-y-3">
                                        {selectedClient.agreements.map((agr) => (<div key={agr.id} className="p-3.5 bg-slate-100 dark:bg-slate-950/40 border border-slate-300 dark:border-white/5 rounded-lg flex items-center justify-between text-xs">
                                            <div className="space-y-1">
                                              <div className="flex items-center space-x-2">
                                                <strong className="text-slate-900 dark:text-white">Service Agreement v{agr.version}</strong>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20 uppercase">{agr.status}</span>
                                              </div>
                                              <div className="text-[10px] text-slate-500 dark:text-slate-500">Signed on {new Date(agr.signedAt).toLocaleDateString('en-IN')} via {agr.esignMode}</div>
                                            </div>
                                            <a href={api.getDownloadUrl(agr.agreementUrl)} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-400 dark:border-white/10 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 transition">
                                              <Eye className="h-3.5 w-3.5"/>
                                              <span>View Agreement</span>
                                            </a>
                                          </div>))}
                                      </div>) : (<div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">No signed service agreement on file.</div>)}
                                  </div>
                                </div>)}

                              {clientDetailsTab === 'subscriptions' && (<div className="space-y-6">
                                  {/* Segment-wise Expiry Overview */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-violet-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Segment-wise Expiry Overview</h4>
                                    <div className="overflow-x-auto rounded-xl border border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-slate-950/20">
                                      <DataTable columns={[
                    {
                        name: 'Service Name',
                        selector: (row) => row.name,
                        cell: (row) => <span className="font-bold text-slate-800 dark:text-slate-200">{row.name}</span>
                    },
                    {
                        name: 'Expiry Date',
                        right: true,
                        cell: (row) => {
                            const now = new Date();
                            const isActive = row.date && row.date > now;
                            const isExpired = row.date && row.date <= now;
                            return (<span className="font-mono">
                                                  {isActive ? (<span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                                      {row.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>) : isExpired ? (<span className="text-rose-600 dark:text-rose-400 line-through opacity-60">
                                                      {row.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Expired)
                                                    </span>) : (<span className="text-slate-500 dark:text-slate-500">Not Subscribed</span>)}
                                                </span>);
                        }
                    }
                ]} data={Object.entries(calculateSegmentExpiries(selectedClient.subscriptions || [])).map(([name, date]) => ({ name, date }))} theme={isDarkMode ? 'dark' : 'default'}/>
                                    </div>
                                  </div>

                                  {/* Active subscriptions cards */}
                                  <div className="glassmorphism p-5 rounded-xl border border-slate-300 dark:border-white/5 space-y-4">
                                    <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Active Services Overview</h4>
                                    {selectedClient.subscriptions && selectedClient.subscriptions.filter((s) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date()).length > 0 ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {selectedClient.subscriptions.filter((s) => s.status === 'ACTIVE' && new Date(s.endDate) > new Date()).map((sub) => {
                        const planStdPrice = !gstEnabled ? (sub.plan?.price || 0) : (gstCalculationType === 'EXCLUSIVE' ? Math.round((sub.plan?.price || 0) * 1.18) : (sub.plan?.price || 0));
                        const isCustomAmount = sub.amountTotal != null && Math.abs(sub.amountTotal - planStdPrice) > 2;
                        const defaultDays = (sub.plan?.durationMonths || 1) * 30;
                        const actualDays = Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24));
                        const isCustomDays = Math.abs(actualDays - defaultDays) > 4;
                        const isCustom = isCustomAmount || isCustomDays;
                        return (<div key={sub.id} className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-xs space-y-2">
                                              <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-2">
                                                  <strong className="text-slate-900 dark:text-white text-sm uppercase">{sub.plan?.name}</strong>
                                                  {isCustom && <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>}
                                                </div>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold uppercase">ACTIVE</span>
                                              </div>
                                              <div className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                                <div className="flex justify-between">
                                                  <span>Purchase Price:</span>
                                                  <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    ₹{(sub.amountTotal ?? (!gstEnabled ? sub.plan?.price : (gstCalculationType === 'EXCLUSIVE' ? Math.round(sub.plan?.price * 1.18) : sub.plan?.price))).toLocaleString()}
                                                  </span>
                                                </div>
                                                <div className="flex justify-between"><span>Start Date:</span> <span className="font-mono text-slate-700 dark:text-slate-300">{new Date(sub.startDate).toLocaleDateString('en-IN')}</span></div>
                                                <div className="flex justify-between"><span>Expiry Date:</span> <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{new Date(sub.endDate).toLocaleDateString('en-IN')}</span></div>
                                              </div>
                                            </div>);
                    })}
                                      </div>) : (<div className="text-slate-500 dark:text-slate-500 text-xs py-4 text-center border border-dashed border-slate-400 dark:border-white/10 rounded-lg">No active subscriptions currently.</div>)}
                                  </div>

                                  {/* Full log table */}
                                  <div className="glassmorphism rounded-xl border border-slate-300 dark:border-white/5 overflow-hidden">
                                    <div className="p-4 border-b border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-slate-800/40">
                                      <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Purchase History Logs</h4>
                                    </div>
                                    <DataTable columns={[
                    {
                        name: 'S.No',
                        width: '60px',
                        cell: (row, index) => <span className="font-mono text-slate-500">{index !== undefined ? index + 1 : 0}</span>
                    },
                    {
                        name: 'Plan Name',
                        cell: (sub) => {
                            const planStdPrice = !gstEnabled ? (sub.plan?.price || 0) : (gstCalculationType === 'EXCLUSIVE' ? Math.round((sub.plan?.price || 0) * 1.18) : (sub.plan?.price || 0));
                            const isCustomAmount = sub.amountTotal != null && Math.abs(sub.amountTotal - planStdPrice) > 2;
                            const defaultDays = (sub.plan?.durationMonths || 1) * 30;
                            const actualDays = Math.round((new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime()) / (1000 * 60 * 60 * 24));
                            const isCustomDays = Math.abs(actualDays - defaultDays) > 4;
                            const isCustom = isCustomAmount || isCustomDays;
                            return (<div className="flex items-center space-x-2">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{sub.plan?.name}</span>
                                                {isCustom && <span className="px-1.5 py-0.5 rounded text-[8px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold uppercase border border-amber-500/20">CUSTOM</span>}
                                              </div>);
                        }
                    },
                    {
                        name: 'Amount',
                        cell: (sub) => (<>
                                              {!gstEnabled ? (<div className="text-xs">
                                                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(sub.amountTotal ?? sub.plan?.price)?.toLocaleString()}</span>
                                                  <span className="text-[8px] text-slate-500 dark:text-slate-500 block mt-0.5">(Non-GST)</span>
                                                </div>) : gstCalculationType === 'EXCLUSIVE' ? (<div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 leading-tight py-2">
                                                  <div>Base: ₹{(sub.amountBase ?? sub.plan?.price)?.toLocaleString()}</div>
                                                  <div>GST: ₹{(sub.amountGst ?? Math.round((sub.plan?.price || 0) * 0.18))?.toLocaleString()}</div>
                                                  <div className="font-bold text-slate-800 dark:text-slate-200">Total: ₹{(sub.amountTotal ?? Math.round((sub.plan?.price || 0) * 1.18))?.toLocaleString()}</div>
                                                </div>) : (<div className="text-xs">
                                                  <span className="font-semibold text-slate-800 dark:text-slate-200">₹{(sub.amountTotal ?? sub.plan?.price)?.toLocaleString()}</span>
                                                  <span className="text-[8px] text-slate-500 dark:text-slate-500 block mt-0.5">(GST Incl.)</span>
                                                </div>)}
                                            </>)
                    },
                    {
                        name: 'Start Date',
                        cell: (sub) => <span className="font-mono text-slate-600 dark:text-slate-400">{new Date(sub.startDate).toLocaleDateString('en-IN')}</span>
                    },
                    {
                        name: 'Expiry Date',
                        cell: (sub) => <span className="font-mono text-slate-600 dark:text-slate-400">{new Date(sub.endDate).toLocaleDateString('en-IN')}</span>
                    },
                    {
                        name: 'Status',
                        right: true,
                        cell: (sub) => {
                            const displayStatus = getDisplayStatus(sub);
                            const statusClass = displayStatus === 'ACTIVE'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                : displayStatus === 'EXPIRED'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-500/20';
                            return <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${statusClass}`}>{displayStatus}</span>;
                        }
                    }
                ]} data={selectedClient.subscriptions || []} pagination highlightOnHover responsive theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="text-center py-6 text-slate-500 dark:text-slate-500">No subscriptions purchased yet.</div>}/>
                                  </div>
                                </div>)}

                              {clientDetailsTab === 'communications' && (<div className="space-y-4">
                                  <h4 className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider border-b border-slate-300 dark:border-white/5 pb-2">Communication Logs</h4>
                                  {clientCommunications.length === 0 ? (<p className="text-xs text-slate-500">No communications found for this client.</p>) : (<div className="space-y-3">
                                      {clientCommunications.map((log) => (<div key={log.id} className="p-4 rounded-xl glassmorphism border border-slate-200 dark:border-white/10 relative">
                                          <div className="flex justify-between items-start mb-2">
                                            <div>
                                              <h5 className="font-bold text-sm text-slate-800 dark:text-slate-100">{log.title}</h5>
                                              <p className="text-xs text-slate-500 mt-1">To: {log.recipient} • {new Date(log.createdAt).toLocaleString()}</p>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${log.status === 'SENT' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            log.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                              {log.status}
                                            </span>
                                          </div>
                                          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{log.message}</p>
                                        </div>))}
                                    </div>)}
                                </div>)}

                              {clientDetailsTab === 'timeline' && (<div className="space-y-4">
                                  <div className="glassmorphism p-6 rounded-2xl border border-slate-300 dark:border-white/10 text-center space-y-4">
                                    <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20 shadow-sm">
                                      <Clock className="w-7 h-7"/>
                                    </div>
                                    <div>
                                      <h4 className="text-base font-bold text-slate-900 dark:text-white">Client Activity Timeline & Audit</h4>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                        Review complete onboarding lifecycle, DigiLocker KYC, Aadhaar eSign, login sessions, IP addresses, payment events, and staff changes for {selectedClient.name}.
                                      </p>
                                    </div>
                                    <div className="pt-2">
                                      <button onClick={() => {
                    setSelectedTimelineClient({ id: selectedClient.id, name: selectedClient.name });
                    setIsTimelineModalOpen(true);
                }} className="px-5 py-2.5 rounded-xl font-bold text-xs bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/30 transition inline-flex items-center gap-2">
                                        <Clock className="w-4 h-4"/>
                                        <span>Launch Full Interactive Timeline</span>
                                        <ExternalLink className="w-3.5 h-3.5"/>
                                      </button>
                                    </div>
                                  </div>
                                </div>)}
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 sm:px-8 py-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                <span>SEBI RA Compliance Master Dossier • Confidential</span>
                              </div>

                              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                                <button onClick={() => {
                setIsViewClientModalOpen(false);
                setSelectedClient(null);
            }} className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition">
                                  Close Details
                                </button>
                                {selectedClient.user?.deletedAt === null && (!isStaff || hasPermission('EDIT_CLIENTS')) && (<button onClick={() => {
                    setIsViewClientModalOpen(false);
                    startEditClient(selectedClient);
                }} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl font-bold text-white shadow-md shadow-blue-500/25 transition flex items-center gap-1.5">
                                    <Edit2 className="w-3.5 h-3.5"/>
                                    <span>Edit Client Details</span>
                                  </button>)}
                              </div>
                            </div>
                          </div>
                        </div>);
    })()}
                    </div>
);
}
