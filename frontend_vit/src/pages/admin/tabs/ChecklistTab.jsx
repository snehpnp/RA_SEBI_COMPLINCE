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



export default function ChecklistTab(props) {
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
    checklistStatusFilter,
    toggleMobilePreview,
    showMobilePreview,
    tenantCutoffDate,
    setChecklistSubTab,
    checklistSubTab,
    checklistHistory,
    setChecklistStatusFilter,
    activeChecklistColumns,
    tableCustomStyles,
    isDarkMode,
    loading,
    loadData,
    historyFilterText,
    setHistoryFilterText,
    selectedFinancialYear,
    setSelectedFinancialYear,
    availableFinancialYears,
    checklistHistoryColumns,
    historyPagination,
    setShowMobilePreview,
    NAV_CONFIG
  } = admin || {};

  {
    activeTab === 'checklist' && (() => {
        // These serial numbers are auto-monitored by the system
        // Alerts + penalties fire automatically when breached
        const AUTO_MONITORED_SERIALS = [4, 5, 6, 12, 17, 48];
        const manualChecklist = checklist.filter((item) => !AUTO_MONITORED_SERIALS.includes(item.serialNo));
        let activeList = manualChecklist.filter((item) => !item.audit || item.audit.status === 'PENDING' || item.audit.status === 'OVERDUE' || item.audit.status === 'NON_COMPLIANT');
        if (checklistStatusFilter === 'OVERDUE') {
            activeList = activeList.filter((item) => item.audit?.status === 'OVERDUE' || item.audit?.status === 'NON_COMPLIANT' || (item.currentPeriod?.dueDate && new Date(item.currentPeriod.dueDate).getTime() < Date.now()));
        }
        else if (checklistStatusFilter === 'PENDING') {
            activeList = activeList.filter((item) => (!item.audit || item.audit.status === 'PENDING') && !(item.currentPeriod?.dueDate && new Date(item.currentPeriod.dueDate).getTime() < Date.now()));
        }
        const now = Date.now();
        const oneMonth = 30 * 24 * 60 * 60 * 1000;
        activeList.sort((a, b) => {
            const aDate = a.currentPeriod?.dueDate ? new Date(a.currentPeriod.dueDate).getTime() : Infinity;
            const bDate = b.currentPeriod?.dueDate ? new Date(b.currentPeriod.dueDate).getTime() : Infinity;
            const aRequiresAction = aDate - now <= oneMonth || !a.currentPeriod?.dueDate;
            const bRequiresAction = bDate - now <= oneMonth || !b.currentPeriod?.dueDate;
            if (aRequiresAction && !bRequiresAction)
                return -1;
            if (!aRequiresAction && bRequiresAction)
                return 1;
            return aDate - bDate;
        });
        return (<div className="w-full space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">SEBI Checklist</h2>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Manage and track your compliance checklist</p>
                          </div>
                          <div className="flex items-center space-x-2.5">
                            <button type="button" onClick={() => setShowCalendarModal(true)} className="flex items-center space-x-2 px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition active:scale-95">
                              <CalendarIcon className="w-4 h-4 text-white"/>
                              <span>Calendar View</span>
                            </button>
                            <button type="button" onClick={toggleMobilePreview} className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition shadow-sm ${showMobilePreview
                ? 'bg-blue-600 text-white border-blue-500 shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="Client Mobile Simulator">
                              <Smartphone className="w-3.5 h-3.5"/>
                              <span>{showMobilePreview ? 'Close Preview' : 'Mobile Preview'}</span>
                            </button>
                          </div>
                        </div>
 
                          {tenantCutoffDate && new Date() < new Date(tenantCutoffDate) && (<div className="flex items-center gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 text-blue-800 dark:text-blue-300">
                              <div className="p-2 bg-blue-500/20 rounded-xl shrink-0">
                                <span className="text-base">🚀</span>
                              </div>
                              <div className="text-xs">
                                <span className="font-bold">Production Go-Live Cycle Scheduled:</span> Since the portal was activated on Day 19 (between 15th-31st Oct), routine compliance tasks & monthly checklists officially commence on <strong>{new Date(tenantCutoffDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>. All October test periods are auto-waived (₹0 penalty).
                              </div>
                            </div>)}

                          {/* Info banner about auto-monitored items */}
                          <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-500/5 border border-primary-500/20">
                            <div className="p-2 bg-primary-500/10 rounded-xl shrink-0 mt-0.5">
                              <ShieldCheck className="h-4 w-4 text-primary-600 dark:text-primary-400"/>
                            </div>
                            <div>
                              <p className="text-xs font-bold text-primary-700 dark:text-primary-300">Auto-Monitored Items Excluded</p>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                The following are <span className="text-slate-900 dark:text-white font-semibold">auto-tracked by the system</span> — alerts &amp; penalties fire automatically when conditions are breached. View them under the <span className="text-primary-700 dark:text-primary-300 font-bold">Automated Alerts</span> tab:
                              </p>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {[
                { no: 4, label: 'NISM Certification Expiry' },
                { no: 5, label: 'SEBI Certificate Renewal' },
                { no: 6, label: 'Net Worth / Deposit Threshold' },
                { no: 12, label: 'Part-Time RA Client Limit' },
                { no: 17, label: 'SEBI Fee Cap Rs.1,51,000/client/FY' },
                { no: 48, label: 'PAN Collection (Active + KYC done)' },
            ].map(a => (<span key={a.no} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20 text-[10px] text-primary-700 dark:text-primary-300 font-semibold">
                                    <span className="bg-primary-500/20 rounded px-1 font-mono">SR.{a.no}</span>
                                    {a.label}
                                  </span>))}
                              </div>
                            </div>
                          </div>

                          {/* Sub-tab selection */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex space-x-1 bg-white dark:bg-slate-900/40 p-1 rounded-xl w-fit border border-slate-300 dark:border-white/5">
                              <button onClick={() => setChecklistSubTab('active')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${checklistSubTab === 'active' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}>
                                Active Checklist ({activeList.length})
                              </button>
                              <button onClick={() => setChecklistSubTab('history')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${checklistSubTab === 'history' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-white '}`}>
                                Checklist History ({checklistHistory.length})
                              </button>
                              <button onClick={() => setChecklistSubTab('penalties')} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${checklistSubTab === 'penalties' ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-amber-500 hover:bg-amber-500/10'}`}>
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0"/>
                                <span>SEBI Penalties Master (78 Rules)</span>
                              </button>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button onClick={() => setChecklistSubTab('penalties')} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border shadow-sm ${checklistSubTab === 'penalties' ? 'bg-amber-500 text-slate-950 border-amber-600 font-extrabold' : 'bg-gradient-to-r from-amber-500/10 to-rose-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'}`}>
                                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0"/>
                                <span>View SEBI Penalty Matrix (All 78 Penalties)</span>
                              </button>
                            </div>
                          </div>

                          {/* ACTIVE CHECKLIST VIEW */}
                          {checklistSubTab === 'active' && (<div className="space-y-4">
                              <div className="flex gap-2">
                                <button onClick={() => setChecklistStatusFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'ALL' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>All Tasks</button>
                                <button onClick={() => setChecklistStatusFilter('PENDING')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'PENDING' ? 'bg-amber-600 text-slate-900 dark:text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>Pending</button>
                                <button onClick={() => setChecklistStatusFilter('OVERDUE')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${checklistStatusFilter === 'OVERDUE' ? 'bg-rose-600 text-slate-900 dark:text-white ' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white border border-slate-300 dark:border-white/5'}`}>Non-Compliant</button>
                              </div>
                              <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                  <DataTable columns={activeChecklistColumns} data={activeList} pagination paginationPerPage={10} highlightOnHover responsive customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={checklist.length === 0 && loading ? (<div className="flex flex-col items-center justify-center space-y-3 text-slate-500 dark:text-slate-400 p-8">
                                          <Loader2 className="w-8 h-8 animate-spin text-primary-500"/>
                                          <p className="font-medium text-sm animate-pulse">Loading compliance checklist...</p>
                                        </div>) : checklist.length === 0 && !loading ? (<div className="flex flex-col items-center justify-center space-y-4 p-8">
                                          <p className="text-sm text-slate-500 dark:text-slate-400">No checklist items found for this period.</p>
                                          <button onClick={() => loadData(false)} className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center space-x-2 shadow-sm hover:shadow">
                                            <RefreshCw className="w-4 h-4"/>
                                            <span>Reload Checklist</span>
                                          </button>
                                        </div>) : activeList.length === 0 && checklist.length > 0 ? (<div className="flex flex-col items-center justify-center space-y-2 p-8">
                                          <CheckSquare className="h-10 w-10 text-emerald-600 dark:text-emerald-400 animate-bounce"/>
                                          <p className="text-sm font-bold text-slate-900 dark:text-white">🎉 All compliance tasks completed!</p>
                                          <p className="text-xs text-slate-600 dark:text-slate-400">There are no pending manual compliance tasks for the current period.</p>
                                        </div>) : (<div className="p-8 text-center text-slate-500">No checklist items found.</div>)}/>
                                </div>
                              </div>
                            </div>)}

                          {/* CHECKLIST HISTORY VIEW */}
                          {checklistSubTab === 'history' && (() => {
                return (<div className="space-y-4">
                                {/* History Search/Filter Bar */}
                                <div className="flex items-center space-x-3 w-full max-w-2xl">
                                  <div className="flex flex-1 items-center bg-slate-100 dark:bg-slate-800/50 rounded-xl px-3 border border-slate-400 dark:border-white/10">
                                    <input type="text" placeholder="Filter history by requirement description..." value={historyFilterText} onChange={(e) => setHistoryFilterText(e.target.value)} className="bg-transparent border-0 text-slate-900 dark:text-white text-xs py-2 w-full focus:ring-0 focus:outline-none"/>
                                    {historyFilterText && (<button onClick={() => setHistoryFilterText('')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white text-xs">Clear</button>)}
                                  </div>
                                  <select value={selectedFinancialYear} onChange={(e) => setSelectedFinancialYear(e.target.value)} className="bg-slate-100 dark:bg-slate-800/50 border border-slate-400 dark:border-white/10 text-slate-900 dark:text-white text-xs py-2 px-3 rounded-xl focus:ring-0 focus:outline-none">
                                    <option value="All">All Financial Years</option>
                                    {availableFinancialYears.map(fy => (<option key={fy} value={fy}>{fy}</option>))}
                                  </select>
                                </div>

                                <div className="glassmorphism rounded-2xl border border-slate-400 dark:border-white/10 overflow-x-auto w-full">
                                  <DataTable columns={checklistHistoryColumns} data={historyPagination.currentData} customStyles={tableCustomStyles} theme={isDarkMode ? 'dark' : 'default'} noDataComponent={<div className="p-8 text-center text-slate-500">{historyFilterText ? 'No matching history records found.' : 'No audit history records yet.'}</div>}/>
                                </div>

                                <Pagination currentPage={historyPagination.currentPage} totalPages={historyPagination.totalPages} totalItems={historyPagination.totalItems} itemsPerPage={historyPagination.itemsPerPage} onPageChange={historyPagination.goToPage} onItemsPerPageChange={historyPagination.setItemsPerPage}/>
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
                                <MobilePreview mode="CHECKLIST" checklistItems={checklistSubTab === 'history' ? checklistHistory : activeList} title={NAV_CONFIG.find(n => n.tab === activeTab)?.label}/>
                              </div>
                            </div>
                          </div>)}

                        {/* SEBI PENALTIES MATRIX VIEW */}
                        {checklistSubTab === 'penalties' && (<SebiPenaltiesMatrixView onClose={() => setChecklistSubTab('active')} onOpenChecklistCalendar={() => setShowCalendarModal(true)}/>)}
                      </div>);
    })();
}
}
