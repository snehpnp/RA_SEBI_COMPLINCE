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


import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { CKEditor } from '@ckeditor/ckeditor5-react';


export default function PlansTab(props) {
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
    setPlanManagementTab,
    planManagementTab,
    requireSetupPrerequisites,
    setIsCategoryModalOpen,
    categories,
    handleToggleCategoryStatus,
    setShowDeletedPlans,
    showDeletedPlans,
    setEditingPlan,
    setPlanName,
    setPlanDesc,
    setPlanPrice,
    setPlanDuration,
    setPlanCategoryId,
    setIsPlanModalOpen,
    setSelectedCategoryFilter,
    selectedCategoryFilter,
    gstEnabled,
    gstCalculationType,
    handleTogglePlanStatus,
    handleDeletePlan,
    handleRestorePlan,
    isPlanModalOpen,
    editingPlan,
    planCategoryId,
    planDuration,
    planDesc,
    planPrice,
    loadData,
    isCategoryModalOpen,
    handleCreateCategory,
    catName,
    setCatName,
    catSegments,
    setCatSegments
  } = admin || {};

  return (
<>
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
                                Please configure all 8 core firm settings in Admin Settings before creating or editing service plans.
                              </p>
                            </div>
                          </div>
                          <button type="button" onClick={() => {
            setPrereqActionTarget('Create or Manage Plans');
            setIsSetupPrereqModalOpen(true);
        }} className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm shrink-0 self-end sm:self-center">
                            <Settings className="w-3.5 h-3.5"/>
                            <span>View Missing Setup</span>
                          </button>
                        </div>)}
                      <div className="flex space-x-4 border-b border-slate-400 dark:border-white/10 pb-4">
                        <button onClick={() => setPlanManagementTab('categories')} className={`px-4 py-2 rounded-lg font-bold text-sm ${planManagementTab === 'categories' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>Categories</button>
                        <button onClick={() => setPlanManagementTab('plans')} className={`px-4 py-2 rounded-lg font-bold text-sm ${planManagementTab === 'plans' ? 'bg-primary-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>Plans</button>
                      </div>

                      {planManagementTab === 'categories' && (<div>
                          <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">Category Management</h2>
                            {(!isStaff || hasPermission('CREATE_PLANS')) && (<button onClick={() => {
                if (!requireSetupPrerequisites('Create Plan Category'))
                    return;
                setIsCategoryModalOpen(true);
            }} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm flex items-center space-x-2">
                                <Plus className="h-4 w-4"/> <span>Create Category</span>
                              </button>)}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {categories.map(cat => (<div key={cat.id} className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg ${cat.status === 'ACTIVE' ? 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 shadow-sm' : 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-500/20'} overflow-hidden group`}>
                                {cat.status === 'ACTIVE' && (<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-primary-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>)}
                                <div className="flex justify-between items-start mb-4">
                                  <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cat.name}</h3>
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${cat.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'}`}>{cat.status}</span>
                                </div>
                                <div className="mb-6">
                                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Segments</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {(cat.segments || '').split(',').map((seg, idx) => (<span key={idx} className="px-2 py-1 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-[10px] rounded-md font-bold border border-slate-200 dark:border-slate-700">{seg.trim()}</span>))}
                                  </div>
                                </div>
                                <button onClick={() => handleToggleCategoryStatus(cat.id)} className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-600 shadow-sm transition-all">Toggle Status</button>
                              </div>))}
                          </div>
                        </div>)}

                      {planManagementTab === 'plans' && (<div className="space-y-6">
                          <div className="flex justify-between items-center border-b border-slate-300 dark:border-white/10 pb-4">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Subscription Plans</h3>
                            <div className="flex space-x-3">
                              <button onClick={() => setShowDeletedPlans(!showDeletedPlans)} className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 border ${showDeletedPlans ? 'bg-rose-500 text-white border-rose-500' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'}`}>
                                <Trash2 className="h-4 w-4"/> <span>{showDeletedPlans ? 'View Active Plans' : 'View Deleted Plans'}</span>
                              </button>
                              {(!isStaff || hasPermission('CREATE_PLANS')) && (<button onClick={() => {
                if (!requireSetupPrerequisites('Create Research Service Plan'))
                    return;
                setEditingPlan(null);
                setPlanName('');
                setPlanDesc('');
                setPlanPrice('');
                setPlanDuration('1');
                setPlanCategoryId(categories[0]?.id || categories[0]?._id || '');
                setIsPlanModalOpen(true);
            }} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl text-xs transition flex items-center space-x-2">
                                  <Plus className="h-4 w-4"/> <span>Create New Plan</span>
                                </button>)}
                            </div>
                          </div>

                          {/* Category Filter Pills - Multi-line Flex Wrap (No scroll required) & Active Categories Only */}
                          <div className="flex flex-wrap gap-2.5 mb-6">
                            <button onClick={() => setSelectedCategoryFilter('ALL')} className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategoryFilter === 'ALL' ? 'bg-[#E1F13D] text-slate-950 shadow-sm font-extrabold' : 'bg-transparent border border-slate-400 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}>
                              All Plans
                            </button>
                            {categories
            .filter(cat => cat.status === 'ACTIVE' || (!cat.status && !cat.deletedAt))
            .map(cat => (<button key={cat.id || cat._id} onClick={() => setSelectedCategoryFilter(cat.id || cat._id)} className={`px-5 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategoryFilter === (cat.id || cat._id) ? 'bg-[#E1F13D] text-slate-950 shadow-sm font-extrabold' : 'bg-transparent border border-slate-400 dark:border-white/20 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5'}`}>
                                  {cat.name}
                                </button>))}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {adminPlans.filter(plan => {
            const isDeleted = plan.deletedAt !== null && plan.deletedAt !== undefined;
            if (showDeletedPlans && !isDeleted)
                return false;
            if (!showDeletedPlans && isDeleted)
                return false;
            if (selectedCategoryFilter !== 'ALL' && plan.categoryId !== selectedCategoryFilter)
                return false;
            return true;
        }).map(plan => {
            const isDeleted = plan.deletedAt !== null && plan.deletedAt !== undefined;
            return (<div key={plan.id} className={`relative p-6 rounded-2xl border transition-all duration-300 hover:shadow-xl ${isDeleted ? 'opacity-70 bg-slate-50 dark:bg-slate-900/40 border-rose-200 dark:border-rose-500/20' : plan.status === 'ACTIVE' ? 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800 shadow-sm hover:border-primary-300 dark:hover:border-primary-500/50' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 opacity-80'} flex flex-col group overflow-hidden`}>
                                  {plan.status === 'ACTIVE' && !isDeleted && (<div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#E1F13D] to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>)}

                                  <div className="flex justify-between items-start mb-4">
                                    <div className="pr-4">
                                      <span className="inline-block px-2 py-1 rounded-md bg-primary-50 dark:bg-primary-900/20 text-[10px] font-bold text-primary-700 dark:text-primary-400 tracking-wider mb-2">{plan.category?.name || 'UNCATEGORIZED'}</span>
                                      <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{plan.name}</h3>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <div className="text-2xl font-black text-slate-900 dark:text-white">₹{plan.price.toLocaleString()}</div>
                                      {gstEnabled && (<span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium block mt-0.5">
                                          {gstCalculationType === 'EXCLUSIVE' ? '+ 18% GST (Exc)' : '18% GST (Inc)'}
                                        </span>)}
                                    </div>
                                  </div>

                                  <div className="flex items-center space-x-2 mb-4">
                                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${isDeleted ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400' : plan.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'}`}>
                                      {isDeleted ? 'DELETED' : plan.status}
                                    </span>
                                  </div>

                                  <div className="text-sm text-slate-600 dark:text-slate-400 mb-6 flex-grow line-clamp-3 leading-relaxed" dangerouslySetInnerHTML={{ __html: plan.description }}/>

                                  <div className="space-y-3 mb-6 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Duration</span>
                                      <strong className="text-sm text-slate-900 dark:text-white">{plan.durationMonths} Month(s)</strong>
                                    </div>
                                    <div className="h-px w-full bg-slate-200 dark:bg-slate-700/50"></div>
                                    <div className="flex justify-between items-start">
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium pt-0.5">Segments</span>
                                      <div className="flex flex-wrap justify-end gap-1 ml-4">
                                        {(plan.researchSegments || '').split(',').map((seg, idx) => (<span key={idx} className="text-[10px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400 font-bold">{seg.trim()}</span>))}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex space-x-3 mt-auto pt-2">
                                    {!isDeleted ? (<>
                                        {(!isStaff || hasPermission('EDIT_PLANS')) && (<button onClick={() => {
                            if (!requireSetupPrerequisites('Edit Research Service Plan'))
                                return;
                            setEditingPlan(plan);
                            setPlanName(plan.name);
                            setPlanDesc(plan.description);
                            setPlanPrice(plan.price.toString());
                            setPlanDuration(plan.durationMonths.toString());
                            setPlanCategoryId(plan.categoryId || '');
                            setIsPlanModalOpen(true);
                        }} className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all">
                                            <Edit2 className="h-3.5 w-3.5"/> <span>Edit</span>
                                          </button>)}
                                        {(!isStaff || hasPermission('EDIT_PLANS')) && (<button onClick={() => handleTogglePlanStatus(plan.id)} className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition-all">
                                            <span>Toggle</span>
                                          </button>)}
                                        {(!isStaff || hasPermission('DELETE_PLANS')) && (<button onClick={() => handleDeletePlan(plan.id)} className="flex-none flex items-center justify-center p-2.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl transition-all border border-rose-200 dark:border-rose-500/20" title="Delete Plan">
                                            <Trash2 className="h-4 w-4"/>
                                          </button>)}
                                      </>) : (<>
                                        {(!isStaff || hasPermission('DELETE_PLANS')) && (<button onClick={() => handleRestorePlan(plan.id)} className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 rounded-xl text-sm font-bold transition border border-emerald-200 dark:border-emerald-500/20">
                                            <RotateCcw className="h-4 w-4"/> <span>Restore Plan</span>
                                          </button>)}
                                      </>)}
                                  </div>
                                </div>);
        })}
                          </div>
                        </div>)}
                    </div>
              {/* Plan Modal */}
              {isPlanModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">{editingPlan ? 'Edit Plan' : 'Create New Plan'}</h3>
                      <button onClick={() => setIsPlanModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5"/></button>
                    </div>
                    <div className="p-6 overflow-y-auto">
                      <form id="planForm" onSubmit={async (e) => {
            e.preventDefault();
            try {
                const selectedCat = categories.find(c => String(c.id || c._id) === String(planCategoryId));
                const getDurationLabel = (m) => {
                    const num = parseInt(String(m)) || 1;
                    switch (num) {
                        case 1: return 'Monthly';
                        case 2: return '2 Months';
                        case 3: return 'Quarterly';
                        case 6: return 'Half-Yearly';
                        case 12: return 'Yearly';
                        default: return `${num} Months`;
                    }
                };
                const autoName = selectedCat ? `${selectedCat.name} - ${getDurationLabel(planDuration)}` : (editingPlan?.name || 'PLAN');
                const payload = { categoryId: planCategoryId, name: autoName, description: planDesc, price: planPrice, durationMonths: planDuration };
                const res = editingPlan ? await api.updatePlan(editingPlan.id, payload) : await api.createPlan(payload);
                if (res.success) {
                    setIsPlanModalOpen(false);
                    loadData();
                }
                else {
                    toast(res.message);
                }
            }
            catch (err) {
                toast(err.message);
            }
        }} className="space-y-5">

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Plan Category</label>
                          <select value={planCategoryId} onChange={e => setPlanCategoryId(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold">
                            <option value="">Select Category</option>
                            {categories.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name} ({c.segments})</option>)}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-5">
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Duration / Validity</label>
                            <select value={planDuration} onChange={e => setPlanDuration(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold">
                              <option value="1">Monthly (1 Month)</option>
                              <option value="2">2 Months</option>
                              <option value="3">Quarterly (3 Months)</option>
                              <option value="6">Half-Yearly (6 Months)</option>
                              <option value="12">Yearly (12 Months)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Price (₹)</label>
                            <input type="number" step="any" value={planPrice} onChange={e => setPlanPrice(e.target.value)} required min="0.01" className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-semibold" placeholder="e.g. 15000"/>
                          </div>
                        </div>

                        {(() => {
            const selectedCat = categories.find(c => String(c.id || c._id) === String(planCategoryId));
            const getDurationLabel = (m) => {
                const num = parseInt(String(m)) || 1;
                switch (num) {
                    case 1: return 'Monthly';
                    case 2: return '2 Months';
                    case 3: return 'Quarterly';
                    case 6: return 'Half-Yearly';
                    case 12: return 'Yearly';
                    default: return `${num} Months`;
                }
            };
            const computedName = selectedCat ? `${selectedCat.name} - ${getDurationLabel(planDuration)}` : (editingPlan?.name || '');
            if (!computedName)
                return null;
            return (<div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-white/10 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-0.5">Plan Name (Auto-Generated)</span>
                                <span className="text-sm font-extrabold text-slate-900 dark:text-white">{computedName}</span>
                              </div>
                              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#E1F13D] text-slate-950 shadow-sm">Auto-Derived</span>
                            </div>);
        })()}

                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Description</label>
                          <div className="text-black bg-white rounded-xl overflow-hidden">
                            {ClassicEditor && (<CKEditor editor={ClassicEditor} data={planDesc} onChange={(event, editor) => {
                const data = editor.getData();
                setPlanDesc(data);
            }}/>)}
                          </div>
                        </div>

                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsPlanModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="planForm" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20">{editingPlan ? 'Update Plan' : 'Create Plan'}</button>
                    </div>
                  </div>
                </div>)}

              {/* Category Modal */}
              {isCategoryModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
                    <div className="p-6 border-b border-slate-400 dark:border-white/10 flex justify-between items-center bg-slate-100 dark:bg-slate-800/50">
                      <h3 className="text-xl font-bold">Create Category</h3>
                      <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition"><X className="h-5 w-5"/></button>
                    </div>
                    <div className="p-6">
                      <form id="catForm" onSubmit={handleCreateCategory} className="space-y-5">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Category Name</label>
                          <input type="text" value={catName} onChange={e => setCatName(e.target.value)} required className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm" placeholder="e.g. Equity Premium"/>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider">Segments</label>
                          <div className="grid grid-cols-2 gap-2">
                            {['CASH', 'FUTURE', 'OPTION', 'COMMODITY'].map(seg => (<label key={seg} className="flex items-center space-x-2 text-sm bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-300 dark:border-white/5">
                                <input type="checkbox" checked={catSegments.includes(seg)} onChange={e => {
                if (e.target.checked)
                    setCatSegments([...catSegments, seg]);
                else
                    setCatSegments(catSegments.filter(s => s !== seg));
            }} className="rounded bg-white dark:bg-slate-900 border-slate-400 dark:border-white/10 text-primary-600 dark:text-primary-500"/>
                                <span>{seg}</span>
                              </label>))}
                          </div>
                        </div>
                      </form>
                    </div>
                    <div className="p-6 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-800/50 flex justify-end space-x-3">
                      <button onClick={() => setIsCategoryModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 transition">Cancel</button>
                      <button type="submit" form="catForm" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl font-bold text-sm transition shadow-lg shadow-emerald-500/20">Create Category</button>
                    </div>
                  </div>
                </div>)}

</>
);
}
