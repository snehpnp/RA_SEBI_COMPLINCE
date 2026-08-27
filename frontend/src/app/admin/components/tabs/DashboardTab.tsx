import React from 'react';
import {
  Users, Activity, Building2, CreditCard, ShieldCheck, 
  Settings, Clock, CheckCircle2, ChevronRight, FileText, AlertCircle, ArrowUpRight, ArrowDownRight, Package, Shield, Calendar, RefreshCcw, Bell,
  TrendingUp, ClipboardList, ArrowRight, AlertTriangle, Loader2, RefreshCw, Download, FileCheck, Database
} from 'lucide-react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Bar, AreaChart, Area } from 'recharts';

export default function DashboardTab({
  user,
  dashboardStats,
  setActiveTab,
  activityLogs,
  hasPermission,
  lineChartData,
  lineChartOptions,
  doughnutChartData,
  doughnutChartOptions,
  upcomingAlerts = [],
  overdueAlerts = [],
  checklist = [],
  handleComplianceSweep,
  sweepLoading,
  dashboardMetric,
  setDashboardMetric,
  dashboardTimeframe,
  setDashboardTimeframe,
  salesAndClientChartData = [],
  exportRange,
  setExportRange,
  exportStartDate,
  setExportStartDate,
  exportEndDate,
  setExportEndDate,
  exportLoading,
  handleBulkExport
}: any) {
  const isStaff = user && user.role && user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN';
  return (
    <>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Stats Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(!isStaff || hasPermission('ACCESS_RESEARCH')) && (
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(16,185,129,0.15)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isStaff ? 'My Research Calls' : 'Published Calls'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-emerald-600 to-teal-400 dark:from-emerald-400 dark:to-teal-200">
                      {dashboardStats.researchCount}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}

          {(!isStaff || hasPermission('ACCESS_STAFF')) && (
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(59,130,246,0.15)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Staff Directory</span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-cyan-400 dark:from-blue-400 dark:to-cyan-200">
                      {dashboardStats.staffCount}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}

          {(!isStaff || hasPermission('ACCESS_CLIENTS') || hasPermission('VIEW_OWN_CLIENTS') || hasPermission('VIEW_ALL_CLIENTS')) && (
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(139,92,246,0.15)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isStaff ? 'My Clients' : 'Total Clients'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-purple-600 to-pink-400 dark:from-purple-400 dark:to-pink-200">
                      {dashboardStats.clientCount}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20 rounded-2xl text-purple-600 dark:text-purple-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}

          {(!isStaff || hasPermission('ACCESS_PLANS') || hasPermission('VIEW_OWN_PLANS') || hasPermission('VIEW_ALL_PLANS')) && (
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(245,158,11,0.15)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    {isStaff ? 'My Plans' : 'Active Plans'}
                  </span>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-amber-500 to-orange-400 dark:from-amber-400 dark:to-orange-200">
                      {dashboardStats.planCount}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <ClipboardList className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}

          {isStaff && (
            <div className="relative p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden group hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(16,185,129,0.15)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Assigned Role</span>
                  <p className="text-lg font-black mt-2 bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 uppercase tracking-wider">
                    {user.role.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Compliance Action Center (Upcoming & Overdue Alerts) */}
        {(!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col relative overflow-hidden group hover:shadow-[0_8px_30px_rgb(245,158,11,0.1)] transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-110"></div>
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="font-bold text-slate-900 dark:text-white text-lg">Upcoming Compliance Alerts (Next 7 Days)</h3>
                <span className="px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-xl text-[11px] font-bold shadow-sm">
                  {upcomingAlerts.length} Action(s) Required
                </span>
              </div>
              <div className="flex-grow space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar relative z-10">
                {upcomingAlerts.length > 0 ? (
                  <>
                    {upcomingAlerts.slice(0, 10).map((alert: any) => {
                      const daysLeft = Math.ceil((new Date(alert.deadlineAt).getTime() - Date.now()) / (1000 * 3600 * 24));
                      return (
                        <div key={alert.id} className="flex justify-between items-center p-4 rounded-2xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-all duration-200">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200" title={alert.description}>{(alert.description || '').substring(0, 80)}{alert.description?.length > 80 ? '...' : ''}</h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{alert.title}</p>
                          </div>
                          <div className="text-right whitespace-nowrap ml-4">
                            <span className={`px-3 py-1 rounded-lg text-[11px] font-bold ${daysLeft <= 2 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                              Due in {daysLeft} day{daysLeft !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {upcomingAlerts.length > 10 && (
                      <button onClick={() => window.dispatchEvent(new CustomEvent('nav-to-upcoming'))} className="w-full text-center text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white py-3 mt-2 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl transition shadow-sm">
                        View all {upcomingAlerts.length} upcoming alerts <ArrowRight className="inline h-3 w-3 ml-1" />
                      </button>
                    )}
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm font-medium text-slate-500 dark:text-slate-400">
                    No upcoming alerts for the next 7 days.
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-gradient-to-br from-rose-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-900/90 backdrop-blur-xl border border-rose-200 dark:border-rose-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col items-center justify-center text-center cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(225,29,72,0.15)] transition-all duration-300 group relative overflow-hidden"
              onClick={() => {
                if (typeof window !== 'undefined') window.location.hash = 'compliance';
                setTimeout(() => {
                  const btn = document.getElementById('btn-compliance-tab');
                  if (btn) btn.click();
                  window.dispatchEvent(new CustomEvent('nav-to-overdue'));
                }, 0);
              }}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] z-0"></div>
              <div className="p-5 bg-gradient-to-br from-rose-500/20 to-red-500/10 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10 shadow-inner">
                <AlertTriangle className="h-10 w-10 text-rose-600 dark:text-rose-500 drop-shadow-md" />
              </div>
              <h3 className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest relative z-10">Overdue Alerts</h3>
              <p className="text-6xl font-black bg-clip-text text-transparent bg-gradient-to-b from-rose-600 to-red-500 dark:from-rose-400 dark:to-red-300 my-2 relative z-10">{overdueAlerts.length}</p>
              <span className="text-[11px] font-medium text-rose-600 dark:text-rose-400/80 group-hover:text-rose-600 dark:text-rose-400 flex items-center mt-2 relative z-10">
                Click to view all overdue <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        )}

        {/* Dashboard grid (Compliance Analytics & Penalty Matrix) */}
        {(!isStaff || hasPermission('ACCESS_COMPLIANCE')) && (() => {
          // Compute data for compliance health
          const compliantCount = checklist.filter((item: any) => item.audit?.status === 'COMPLIANT').length;
          const nonCompliantCount = checklist.filter((item: any) => item.audit?.status === 'NON_COMPLIANT').length;
          const pendingCount = checklist.filter((item: any) => !item.audit || item.audit?.status === 'PENDING').length;
          const overdueCount = checklist.filter((item: any) => item.audit?.status === 'OVERDUE').length;
          const resolvedCount = checklist.filter((item: any) => item.audit?.status === 'PENALTY_RESOLVED').length;

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

          return (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Left Column: Compliance Health Overview */}
              <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/5 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">SEBI Compliance Health</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time status of regulatory requirements</p>
                  </div>
                  <button onClick={handleComplianceSweep} disabled={sweepLoading} className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl text-[11px] font-bold text-primary-600 dark:text-primary-400 transition-all flex items-center space-x-2 disabled:opacity-50 shadow-sm border border-slate-200 dark:border-white/5">
                    {sweepLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    <span>Sweep Audits</span>
                  </button>
                </div>

                <div className="h-[240px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={complianceChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorCompliant" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorOverdue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.3} />
                        </linearGradient>
                        <linearGradient id="colorNonCompliant" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.9} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                      />
                      <Bar dataKey="value" radius={[12, 12, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-5 gap-3 pt-6 mt-auto text-center">
                  <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/5 transition-transform hover:scale-105">
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block mb-1">Compliant</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{compliantCount}</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/5 transition-transform hover:scale-105">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-500 font-bold uppercase block mb-1">Paid</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{resolvedCount}</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/5 transition-transform hover:scale-105">
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase block mb-1">Pending</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{pendingCount}</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/5 transition-transform hover:scale-105">
                    <span className="text-[10px] text-amber-600 dark:text-amber-500 font-bold uppercase block mb-1">Overdue</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{overdueCount}</strong>
                  </div>
                  <div className="bg-slate-100 dark:bg-white/5 rounded-2xl p-2 border border-slate-200 dark:border-white/5 transition-transform hover:scale-105">
                    <span className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase block mb-1">Levied</span>
                    <strong className="text-xl font-black text-slate-900 dark:text-white">{nonCompliantCount}</strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Sales & Client Growth Analytics */}
              <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] flex flex-col hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-200 dark:border-white/5 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Sales & Client Growth</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-medium">Advisory revenue and user onboarding</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center space-x-3">
                    {/* Metric Selector */}
                    <div className="relative">
                      <select
                        value={dashboardMetric}
                        onChange={e => setDashboardMetric(e.target.value as any)}
                        className="appearance-none bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2 pl-3 pr-8 text-[11px] font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 cursor-pointer shadow-sm"
                      >
                        <option value="sales">💰 Sales Revenue</option>
                        <option value="clients">👥 Client Growth</option>
                      </select>
                      <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400 pointer-events-none rotate-90" />
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex bg-slate-200/50 dark:bg-slate-800/50 border border-slate-300/50 dark:border-white/5 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => setDashboardTimeframe('monthly')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dashboardTimeframe === 'monthly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                      >
                        Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setDashboardTimeframe('yearly')}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${dashboardTimeframe === 'yearly' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:text-slate-300'}`}
                      >
                        Year
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-[240px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={salesAndClientChartData} margin={{ top: 20, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.6} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="period" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => dashboardMetric === 'sales' ? `₹${(v / 1000).toLocaleString()}K` : v}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}
                        formatter={(value: any) => [
                          dashboardMetric === 'sales' ? `₹${value.toLocaleString()}` : `${value} Clients`,
                          dashboardMetric === 'sales' ? 'Revenue' : 'New Onboards'
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={dashboardMetric === 'sales' ? '#8b5cf6' : '#06b6d4'}
                        strokeWidth={4}
                        fill={dashboardMetric === 'sales' ? 'url(#colorSales)' : 'url(#colorClients)'}
                        animationDuration={1500}
                        animationEasing="ease-out"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Summary Footer */}
                <div className="flex justify-between items-center bg-slate-100 dark:bg-white/5 rounded-2xl p-4 mt-auto border border-slate-200 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                      Total {dashboardMetric === 'sales' ? 'Revenue' : 'Clients'}
                    </span>
                    <strong className="text-lg font-black text-slate-900 dark:text-white">
                      {dashboardMetric === 'sales'
                        ? `₹${salesAndClientChartData.reduce((acc: number, curr: any) => acc + curr.value, 0).toLocaleString()}`
                        : `${salesAndClientChartData.reduce((acc: number, curr: any) => acc + curr.value, 0)}`}
                    </strong>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">
                      {dashboardTimeframe === 'monthly' ? 'This Month' : 'This Year'}
                    </span>
                    <strong className={`text-lg font-black ${dashboardMetric === 'sales' ? 'text-purple-600 dark:text-purple-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                      {salesAndClientChartData.length > 0
                        ? dashboardMetric === 'sales'
                          ? `₹${salesAndClientChartData[salesAndClientChartData.length - 1].value.toLocaleString()}`
                          : `+${salesAndClientChartData[salesAndClientChartData.length - 1].value}`
                        : '—'}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Closing Alert Modal removed from dashboard tab block */}

        {/* Bulk Exports Section */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <div className="mt-8 glassmorphism p-6 rounded-2xl border border-slate-400 dark:border-white/10 space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Download className="w-5 h-5 text-indigo-500" />
                  Bulk Data Exports
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">Download complete records for compliance and record-keeping.</p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-300 dark:border-white/5">
                <select
                  value={exportRange}
                  onChange={(e) => setExportRange(e.target.value as 'all' | 'date')}
                  className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none focus:border-indigo-500"
                >
                  <option value="all">All Time</option>
                  <option value="date">Date Range</option>
                </select>

                {exportRange === 'date' && (
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={exportStartDate}
                      onChange={(e) => setExportStartDate(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-xs px-3 py-2 text-slate-700 dark:text-slate-200 outline-none"
                    />
                    <span className="text-slate-500 text-xs">to</span>
                    <input
                      type="date"
                      value={exportEndDate}
                      onChange={(e) => setExportEndDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-white/5">
              <button onClick={() => handleBulkExport('invoices', true)} disabled={exportLoading === 'invoices'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3"><FileText className="w-4 h-4 text-indigo-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">All Client Invoices (ZIP)</span></div>
                {exportLoading === 'invoices' ? <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />}
              </button>

              <button onClick={() => handleBulkExport('agreements', true)} disabled={exportLoading === 'agreements'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3"><FileCheck className="w-4 h-4 text-emerald-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">All Client Agreements (ZIP)</span></div>
                {exportLoading === 'agreements' ? <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-emerald-500" />}
              </button>

              <button onClick={() => handleBulkExport('kra', true)} disabled={exportLoading === 'kra'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex items-center gap-3"><Database className="w-4 h-4 text-blue-500" /><span className="font-medium text-sm text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">All KRA Documents (ZIP)</span></div>
                {exportLoading === 'kra' ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div> : <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-500" />}
              </button>

              <button onClick={() => handleBulkExport('clients', false)} disabled={exportLoading === 'clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">All Clients List</div>
                  <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                </div>
                {exportLoading === 'clients' ? <Loader2 className="w-5 h-5 animate-spin text-amber-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />}
              </button>

              <button onClick={() => handleBulkExport('deleted-clients', false)} disabled={exportLoading === 'deleted-clients'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-rose-50 dark:hover:bg-rose-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400">Deleted Clients</div>
                  <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                </div>
                {exportLoading === 'deleted-clients' ? <Loader2 className="w-5 h-5 animate-spin text-rose-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />}
              </button>

              <button onClick={() => handleBulkExport('payments', false)} disabled={exportLoading === 'payments'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400">Payments Report</div>
                  <div className="text-[10px] text-slate-500 mt-1">CSV Format</div>
                </div>
                {exportLoading === 'payments' ? <Loader2 className="w-5 h-5 animate-spin text-teal-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-teal-500 transition-colors" />}
              </button>

              <button onClick={() => handleBulkExport('research-reports', true)} disabled={exportLoading === 'research-reports'} className="flex items-center justify-between p-4 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-300 dark:border-white/5 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div>
                  <div className="font-bold text-sm text-slate-800 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400">All Research Reports</div>
                  <div className="text-[10px] text-slate-500 mt-1">PDF Zip Archive</div>
                </div>
                {exportLoading === 'research-reports' ? <Loader2 className="w-5 h-5 animate-spin text-orange-500" /> : <Download className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />}
              </button>
            </div>
          </div>
        )}

        {/* Active Client Summary Button */}
        {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between shadow-sm">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Active Client Summary
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                View daily historical active client counts and download detailed reports.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('activeClientSummary')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              View Summary <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>

  );
}
