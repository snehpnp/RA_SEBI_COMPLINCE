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



export default function DashboardTab(props) {
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
    upcomingAlerts,
    overdueAlerts,
    handleComplianceSweep,
    sweepLoading,
    dashboardMetric,
    setDashboardMetric,
    setDashboardTimeframe,
    dashboardTimeframe,
    salesAndClientChartData,
    exportRange,
    setExportRange,
    exportStartDate,
    setExportStartDate,
    exportEndDate,
    setExportEndDate,
    handleBulkExport,
    exportLoading
  } = admin || {};

  return (
<div className="space-y-8">
                      {/* Stats Widgets */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {(!isStaff || hasPermission('ACCESS_RESEARCH')) && (<div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Research Calls' : 'Published Recommendations'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.researchCount}
                              </p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                              <TrendingUp className="h-5 w-5"/>
                            </div>
                          </div>)}

                        {(!isStaff || hasPermission('ACCESS_STAFF')) && (<div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Staff Directory1</span>
                              <p className="text-3xl font-extrabold mt-1">{dashboardStats.staffCount}</p>
                            </div>
                            <div className="p-2 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400">
                              <Users className="h-5 w-5"/>
                            </div>
                          </div>)}

                        {(!isStaff || hasPermission('ACCESS_CLIENTS') || hasPermission('VIEW_OWN_CLIENTS') || hasPermission('VIEW_ALL_CLIENTS')) && (<div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Onboarded Clients' : 'Total Client Directory'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.clientCount}
                              </p>
                            </div>
                            <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-600 dark:text-blue-400">
                              <Users className="h-5 w-5"/>
                            </div>
                          </div>)}

                        {(!isStaff || hasPermission('ACCESS_PLANS') || hasPermission('VIEW_OWN_PLANS') || hasPermission('VIEW_ALL_PLANS')) && (<div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                                {isStaff ? 'My Created Plans' : 'Subscription Plans'}
                              </span>
                              <p className="text-3xl font-extrabold mt-1">
                                {dashboardStats.planCount}
                              </p>
                            </div>
                            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400">
                              <ClipboardList className="h-5 w-5"/>
                            </div>
                          </div>)}

                        {isStaff && (<div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 glassmorphism flex justify-between items-start">
                            <div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">Assigned SEBI Role</span>
                              <p className="text-sm font-extrabold mt-3 uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                {user.role.replace(/_/g, ' ')}
                              </p>
                            </div>
                            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="h-5 w-5"/>
                            </div>
                          </div>)}
                      </div>

                      {/* Compliance Action Center (Upcoming & Overdue Alerts) */}
                      {tenantDetails?.complianceFeaturesEnabled !== false && (!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2 glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-slate-900 dark:text-white text-lg">Upcoming Compliance Alerts (Next 7 Days)</h3>
                              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-lg text-[10px] font-bold">
                                {upcomingAlerts.length} Action(s) Required
                              </span>
                            </div>
                            <div className="flex-grow space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                              {upcomingAlerts.length > 0 ? (<>
                                  {upcomingAlerts.slice(0, 10).map((alert) => {
                const daysLeft = Math.ceil((new Date(alert.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                return (<div key={alert.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 transition">
                                        <div>
                                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200" title={alert.description}>{(alert.description || '').substring(0, 80)}{alert.description?.length > 80 ? '...' : ''}</h4>
                                          <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">{alert.title}</p>
                                        </div>
                                        <div className="text-right whitespace-nowrap ml-4">
                                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${daysLeft <= 2 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                                            Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                                          </span>
                                        </div>
                                      </div>);
            })}
                                  {upcomingAlerts.length > 10 && (<button onClick={() => window.dispatchEvent(new CustomEvent('nav-to-upcoming'))} className="w-full text-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white py-2 mt-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-white/10 border border-slate-300 dark:border-white/5 rounded-lg transition">
                                      View all {upcomingAlerts.length} upcoming alerts <ArrowRight className="inline h-3 w-3 ml-1"/>
                                    </button>)}
                                </>) : (<div className="h-full flex items-center justify-center text-sm text-slate-500 dark:text-slate-500">
                                  No upcoming alerts for the next 7 days.
                                </div>)}
                            </div>
                          </div>
                          <div className="glassmorphism p-6 rounded-2xl border border-rose-500/30 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-rose-500/5 transition group" onClick={() => {
            // Navigate to Compliance Desk -> Automated Alerts -> Active
            if (typeof window !== 'undefined')
                window.location.hash = 'compliance';
            // State setters will be called by the hash listener or directly here
            // But since we are already on dashboard, we can just call setters directly too
            setTimeout(() => {
                const btn = document.getElementById('btn-compliance-tab');
                if (btn)
                    btn.click();
                // We might not have access to setAlertsSubTab directly here if it's deep inside, 
                // wait, we are in AdminPortal component, we don't have setComplianceTab in scope here?
                // Let's just use the hash! The hash change to #compliance will switch the tab.
                // And we can trigger a custom event or just let them navigate to compliance.
                window.dispatchEvent(new CustomEvent('nav-to-overdue'));
            }, 0);
        }}>
                            <div className="p-4 bg-rose-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                              <AlertTriangle className="h-8 w-8 text-rose-600 dark:text-rose-500"/>
                            </div>
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Overdue Alerts</h3>
                            <p className="text-5xl font-extrabold text-rose-600 dark:text-rose-500 my-2">{overdueAlerts.length}</p>
                            <span className="text-[10px] text-rose-600 dark:text-rose-400/80 group-hover:text-rose-600 dark:text-rose-400 flex items-center mt-2">
                              Click to view all overdue <ArrowRight className="h-3 w-3 ml-1"/>
                            </span>
                          </div>
                        </div>)}

                      {/* Dashboard grid (Compliance Analytics & Penalty Matrix) */}
                      {tenantDetails?.complianceFeaturesEnabled !== false && (!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (() => {
        // Compute data for compliance health
        const compliantCount = checklist.filter((item) => item.audit?.status === 'COMPLIANT').length;
        const nonCompliantCount = checklist.filter((item) => item.audit?.status === 'NON_COMPLIANT').length;
        const pendingCount = checklist.filter((item) => !item.audit || item.audit?.status === 'PENDING').length;
        const overdueCount = checklist.filter((item) => item.audit?.status === 'OVERDUE').length;
        const resolvedCount = checklist.filter((item) => item.audit?.status === 'PENALTY_RESOLVED').length;
        const complianceChartData = [
            { name: 'Compliant', value: compliantCount, fill: 'url(#colorCompliant)' },
            { name: 'Resolved', value: resolvedCount, fill: 'url(#colorResolved)' },
            { name: 'Pending', value: pendingCount, fill: 'url(#colorPending)' },
            { name: 'Overdue', value: overdueCount, fill: 'url(#colorOverdue)' },
            { name: 'Non-Compliant', value: nonCompliantCount, fill: 'url(#colorNonCompliant)' }
        ];
        // Penalty Matrix Candlestick Data
        const penaltyCandleData = [
            { name: 'Low (Conduct)', min: 2000, max: 10000, body: [5000, 8000], label: '₹2K - ₹10K' },
            { name: 'Medium (Reports)', min: 10000, max: 50000, body: [20000, 40000], label: '₹10K - ₹50K' },
            { name: 'High (KUA/Pan)', min: 50000, max: 200000, body: [80000, 150000], label: '₹50K - ₹200K' },
            { name: 'Critical (Defaults)', min: 200000, max: 1000000, body: [350000, 800000], label: '₹200K - ₹1M' }
        ];
        return (<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Compliance Health Overview */}
                            <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                              <div className="flex justify-between items-center pb-2 border-b border-slate-300 dark:border-white/5">
                                <div>
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">SEBI Compliance Registry Health</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Real-time status distribution of active regulatory requirements</p>
                                </div>
                                <button onClick={handleComplianceSweep} disabled={sweepLoading} className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:text-primary-300 flex items-center space-x-1.5 disabled:opacity-50">
                                  {sweepLoading ? <Loader2 className="h-3 animate-spin"/> : <RefreshCw className="h-3 w-3"/>}
                                  <span>Sweep Audits</span>
                                </button>
                              </div>

                              <div className="h-[220px] w-full flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={complianceChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                      </linearGradient>
                                      <linearGradient id="colorNonCompliant" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false}/>
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} allowDecimals={false}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '11px' }} labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}/>
                                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={36}>
                                      {complianceChartData.map((entry, index) => (<Cell key={`compliance-cell-${index}`} fill={entry.fill}/>))}
                                    </Bar>
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>

                              <div className="grid grid-cols-5 gap-2 pt-2 text-center border-t border-slate-300 dark:border-white/5">
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">✅ Compliant</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{compliantCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-500 font-semibold block">Paid</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{resolvedCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold block">Pending</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{pendingCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-amber-600 dark:text-amber-500 font-semibold block">Overdue</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{overdueCount}</strong>
                                </div>
                                <div className="space-y-1">
                                  <span className="text-[10px] text-red-600 dark:text-red-400 font-semibold block">Levied</span>
                                  <strong className="text-sm text-slate-900 dark:text-white">{nonCompliantCount}</strong>
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Sales & Client Growth Analytics */}
                            <div className="glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-2 border-b border-slate-300 dark:border-white/5">
                                <div>
                                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">Sales & Client Growth</h3>
                                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">Track research service revenue and user onboarding progress</p>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center space-x-2">
                                  {/* Metric Selector */}
                                  <select value={dashboardMetric} onChange={e => setDashboardMetric(e.target.value)} className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg py-1 px-2.5 text-[11px] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary-500">
                                    <option value="sales">💰 Sales Revenue</option>
                                    <option value="clients">👥 Client Growth</option>
                                  </select>

                                  {/* Timeframe Selector */}
                                  <div className="flex bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-lg p-0.5">
                                    <button type="button" onClick={() => setDashboardTimeframe('monthly')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${dashboardTimeframe === 'monthly' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}>
                                      Month
                                    </button>
                                    <button type="button" onClick={() => setDashboardTimeframe('yearly')} className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${dashboardTimeframe === 'yearly' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}>
                                      Year
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="h-[220px] w-full flex items-center justify-center relative">
                                <ResponsiveContainer width="100%" height="100%">
                                  <AreaChart data={salesAndClientChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                                    <defs>
                                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                                      </linearGradient>
                                      <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.1}/>
                                      </linearGradient>
                                    </defs>
                                    <XAxis dataKey="period" stroke="#64748b" fontSize={10} tickLine={false}/>
                                    <YAxis stroke="#64748b" fontSize={10} tickLine={false} tickFormatter={(v) => dashboardMetric === 'sales' ? `₹${(v / 1000).toLocaleString()}K` : v}/>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }} itemStyle={{ color: '#fff', fontSize: '11px' }} labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }} formatter={(value) => [
                dashboardMetric === 'sales' ? `₹${value.toLocaleString()}` : `${value} Clients`,
                dashboardMetric === 'sales' ? 'Revenue' : 'New Onboards'
            ]}/>
                                    <Area type="monotone" dataKey="value" stroke={dashboardMetric === 'sales' ? '#8b5cf6' : '#06b6d4'} strokeWidth={2} fill={dashboardMetric === 'sales' ? 'url(#colorSales)' : 'url(#colorClients)'}/>
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>

                              {/* Summary Footer */}
                              <div className="flex justify-between items-center text-[10px] text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-300 dark:border-white/5 font-medium">
                                <span>
                                  Total {dashboardMetric === 'sales' ? 'Revenue' : 'Clients'}:{' '}
                                  <strong className="text-slate-900 dark:text-white">
                                    {dashboardMetric === 'sales'
                ? `₹${salesAndClientChartData.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}`
                : `${clients.length > 0 ? clients.length : salesAndClientChartData.reduce((acc, curr) => acc + curr.value, 0)}`}
                                  </strong>
                                </span>
                                <span>
                                  Current {dashboardTimeframe === 'monthly' ? 'Month' : 'Year'}:{' '}
                                  <strong className={dashboardMetric === 'sales' ? 'text-purple-600 dark:text-purple-400' : 'text-cyan-600 dark:text-cyan-400'}>
                                    {salesAndClientChartData.length > 0
                ? dashboardMetric === 'sales'
                    ? `₹${salesAndClientChartData[salesAndClientChartData.length - 1].value.toLocaleString()}`
                    : `${salesAndClientChartData[salesAndClientChartData.length - 1].value} Onboarded`
                : (dashboardMetric === 'clients' && clients.length > 0 ? `${clients.length} Onboarded` : '—')}
                                  </strong>
                                </span>
                              </div>
                            </div>
                          </div>);
    })()}

                      {/* Closing Alert Modal removed from dashboard tab block */}

                      {/* Bulk Exports Section */}
                      {(hasPermission('ACCESS_BULK_EXPORTS') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<div className="mt-8 glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Download className="w-5 h-5 text-indigo-500"/>
                                Bulk Data Exports
                              </h3>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Download complete records for compliance and record-keeping.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-300 dark:border-white/5">
                              <select value={exportRange} onChange={(e) => setExportRange(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500">
                                <option value="all">All Time</option>
                                <option value="date">Date Range</option>
                              </select>

                              {exportRange === 'date' && (<div className="flex items-center gap-2">
                                  <input type="date" value={exportStartDate} onChange={(e) => setExportStartDate(e.target.value)} className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none"/>
                                  <span className="text-slate-500 text-xs">to</span>
                                  <input type="date" value={exportEndDate} onChange={(e) => setExportEndDate(e.target.value)}/>
                                </div>)}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
                            <button onClick={() => handleBulkExport('invoices', true)} disabled={exportLoading === 'invoices'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-indigo-500"/><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">All Client Invoices (ZIP)</span></div>
                              {exportLoading === 'invoices' ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500"/>}
                            </button>

                            <button onClick={() => handleBulkExport('agreements', true)} disabled={exportLoading === 'agreements'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><FileCheck className="w-4 h-4 text-emerald-500"/><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">All Client Agreements (ZIP)</span></div>
                              {exportLoading === 'agreements' ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500"/>}
                            </button>

                            <button onClick={() => handleBulkExport('kra', true)} disabled={exportLoading === 'kra'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div className="flex items-center gap-3"><Database className="w-4 h-4 text-blue-500"/><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">All KRA Documents (ZIP)</span></div>
                              {exportLoading === 'kra' ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500"/>}
                            </button>

                            <button onClick={() => handleBulkExport('clients', false)} disabled={exportLoading === 'clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">All Clients List</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'clients' ? <Loader2 className="w-5 h-5 animate-spin text-amber-500"/> : <Download className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors"/>}
                            </button>

                            <button onClick={() => handleBulkExport('deleted-clients', false)} disabled={exportLoading === 'deleted-clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">Deleted Clients</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'deleted-clients' ? <Loader2 className="w-5 h-5 animate-spin text-rose-500"/> : <Download className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors"/>}
                            </button>

                            <button onClick={() => handleBulkExport('payments', false)} disabled={exportLoading === 'payments'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">Payments Report</div>
                                <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                              </div>
                              {exportLoading === 'payments' ? <Loader2 className="w-5 h-5 animate-spin text-teal-500"/> : <Download className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors"/>}
                            </button>

                            <button onClick={() => handleBulkExport('gst-sheet', false)} disabled={exportLoading === 'gst-sheet'} className="flex items-center justify-between p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/30 hover:bg-violet-100/70 dark:hover:bg-violet-900/40 border border-violet-300 dark:border-violet-500/30 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-violet-900 dark:text-violet-200 group-hover:text-violet-700 dark:group-hover:text-white flex items-center gap-1.5">
                                  <span>GST Filing Ready Sheet</span>
                                  <span className="text-[9px] bg-violet-600 text-white px-1.5 py-0.5 rounded-full font-mono font-bold">GSTR-1</span>
                                </div>
                                <div className="text-[10px] text-violet-700/80 dark:text-violet-300/70 mt-1">Direct CA Filing with CGST/SGST/IGST &amp; Place of Supply</div>
                              </div>
                              {exportLoading === 'gst-sheet' ? <Loader2 className="w-5 h-5 animate-spin text-violet-500"/> : <Download className="w-5 h-5 text-violet-500 group-hover:text-violet-700 dark:group-hover:text-white transition-colors"/>}
                            </button>

                            <button onClick={() => handleBulkExport('research-reports', true)} disabled={exportLoading === 'research-reports'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                              <div>
                                <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">All Research Reports</div>
                                <div className="text-[10px] text-slate-500 mt-1">PDF Zip Archive</div>
                              </div>
                              {exportLoading === 'research-reports' ? <Loader2 className="w-5 h-5 animate-spin text-orange-500"/> : <Download className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors"/>}
                            </button>
                          </div>
                        </div>)}

                      {/* Active Client Summary Button */}
                      {(hasPermission('ACCESS_ACTIVE_CLIENT_SUMMARY') || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (<div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between shadow-sm">
                          <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400"/>
                              Active Client Summary
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              View daily historical active client counts and download detailed reports.
                            </p>
                          </div>
                          <button onClick={() => setActiveTab('activeClientSummary')} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                            View Summary <ChevronRight className="w-4 h-4"/>
                          </button>
                        </div>)}
                    </div>
);
}
