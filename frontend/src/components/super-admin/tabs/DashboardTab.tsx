'use client';

import { useState, useEffect } from 'react';
import { Landmark, Users, BellRing, ClipboardList, ShieldCheck, UserCheck, Layers, AlertCircle, Building2, CheckCircle2, XCircle, ChevronDown, Loader2, Wifi, WifiOff, FileText, BarChart3 } from 'lucide-react';
import api from '../../../services/api';

interface DashboardTabProps {
  telemetry: any;
  companies?: any[];
}

export default function DashboardTab({ telemetry, companies }: DashboardTabProps) {
  const activeCompanies = companies && companies.length > 0 ? companies : null;

  const totalRAs = activeCompanies ? activeCompanies.length : (telemetry?.totalCompanies ?? 0);
  const activeRAs = activeCompanies
    ? activeCompanies.filter(c => c.status === 'ACTIVE').length
    : (telemetry?.activeCompanies ?? 0);
  const suspendedRAs = activeCompanies
    ? activeCompanies.filter(c => c.status === 'SUSPENDED' || c.status === 'INACTIVE').length
    : (telemetry?.suspendedCompanies ?? 0);

  // Panel Stats State
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [panelStats, setPanelStats] = useState<any>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelSource, setPanelSource] = useState<string>('');
  const [panelError, setPanelError] = useState<string | null>(null);

  const selectedCompany = companies?.find(c => c._id === selectedCompanyId || c.id === selectedCompanyId);

  useEffect(() => {
    if (!selectedCompanyId) {
      setPanelStats(null);
      setPanelSource('');
      setPanelError(null);
      return;
    }
    const fetchPanelStats = async () => {
      setPanelLoading(true);
      setPanelError(null);
      setPanelStats(null);
      try {
        const res = await (api as any).getCompanyPanelStats(selectedCompanyId);
        if (res && res.success) {
          setPanelStats(res.data);
          setPanelSource(res.source || '');
        } else {
          setPanelError('Could not fetch panel data.');
        }
      } catch (err: any) {
        setPanelError(err.message || 'Failed to fetch panel stats.');
      } finally {
        setPanelLoading(false);
      }
    };
    fetchPanelStats();
  }, [selectedCompanyId]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Company Overview 3-Cards ── */}
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5" />
          Company Overview
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Total */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-slate-900/60 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-indigo-500/15 rounded-xl border border-indigo-500/20 shrink-0">
              <Building2 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Total Companies</p>
              <p className="text-4xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight leading-none mt-1">{totalRAs}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Registered RAs</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-indigo-400/10 dark:bg-indigo-400/5" />
          </div>

          {/* Active */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/40 dark:to-slate-900/60 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-emerald-500/15 rounded-xl border border-emerald-500/20 shrink-0">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active</p>
              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300 tracking-tight leading-none mt-1">{activeRAs}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Operational panels</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-emerald-400/10 dark:bg-emerald-400/5" />
          </div>

          {/* Inactive */}
          <div className="relative overflow-hidden p-5 rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/40 dark:to-slate-900/60 flex items-center gap-4 shadow-sm hover:shadow-md transition-all duration-300">
            <div className="p-3 bg-rose-500/15 rounded-xl border border-rose-500/20 shrink-0">
              <XCircle className="h-7 w-7 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Inactive / Suspended</p>
              <p className="text-4xl font-black text-rose-700 dark:text-rose-300 tracking-tight leading-none mt-1">{suspendedRAs}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Access restricted</p>
            </div>
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-rose-400/10 dark:bg-rose-400/5" />
          </div>
        </div>
      </div>

      {/* ── Platform Metrics with Panel Selector ── */}
      <div>
        {/* Header row with panel dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Platform Metrics
          </p>

          {/* Panel Selector Dropdown */}
          <div className="flex items-center gap-2">
            {panelSource === 'REMOTE_PANEL' && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-full font-semibold">
                <Wifi className="h-3 w-3" /> Live from Panel
              </span>
            )}
            {selectedCompanyId && panelSource === 'CENTRAL_DATABASE' && !panelLoading && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-full font-semibold">
                <WifiOff className="h-3 w-3" /> Panel Offline
              </span>
            )}
            <div className="relative">
              <select
                id="panel-selector"
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 cursor-pointer min-w-[200px] transition-all"
              >
                <option value="">— Global Metrics —</option>
                {(companies || []).map(c => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.companyName} {c.status !== 'ACTIVE' ? `(${c.status})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Loading State */}
        {panelLoading && (
          <div className="flex items-center justify-center py-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500 mr-3" />
            <span className="text-sm text-slate-500 dark:text-slate-400">Fetching live data from <strong>{selectedCompany?.companyName}</strong> panel…</span>
          </div>
        )}

        {/* Error State */}
        {!panelLoading && panelError && selectedCompanyId && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-sm mb-4">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {panelError} — showing zero values.
          </div>
        )}

        {/* KPI Cards — show panel stats if selected, else global */}
        {!panelLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {/* Card 1: Staff / Registered RAs */}
            {selectedCompanyId ? (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Staff Members</span>
                    <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white tracking-tight">{panelStats?.staffCount ?? 0}</p>
                  </div>
                  <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400 shadow-inner">
                    <UserCheck className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 text-xs text-slate-500 dark:text-slate-400">
                  Panel: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedCompany?.companyName}</span>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-primary-500/30 transition-all duration-300">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Registered RAs</span>
                    <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white tracking-tight">{totalRAs}</p>
                  </div>
                  <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400 shadow-inner">
                    <Landmark className="h-6 w-6" />
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {activeRAs} Active
                  </span>
                  <span>•</span>
                  <span>{suspendedRAs} Suspended</span>
                </div>
              </div>
            )}

            {/* Card 2: Clients */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {selectedCompanyId ? 'Clients' : 'Active Clients'}
                  </span>
                  <p className="text-4xl font-black mt-2 text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {selectedCompanyId ? (panelStats?.clientCount ?? 0) : (telemetry?.activeClients ?? 0)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-inner">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedCompanyId ? (
                  <span className="text-slate-500">All registered clients</span>
                ) : (
                  <>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{telemetry?.totalClients ?? 0} Registered</span>
                    <span>•</span>
                    <span className="text-amber-600 dark:text-amber-400">{telemetry?.pendingClients ?? 0} Pending</span>
                  </>
                )}
              </div>
            </div>

            {/* Card 3: Research Reports */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-violet-500/30 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {selectedCompanyId ? 'Research Reports' : 'Compliance Alerts'}
                  </span>
                  <p className={`text-4xl font-black mt-2 tracking-tight ${selectedCompanyId ? 'text-violet-600 dark:text-violet-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    {selectedCompanyId ? (panelStats?.researchCount ?? 0) : (telemetry?.activeAlerts ?? 0)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl shadow-inner ${selectedCompanyId ? 'bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400'}`}>
                  {selectedCompanyId ? <FileText className="h-6 w-6" /> : <BellRing className="h-6 w-6" />}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedCompanyId ? (
                  <span>Published research</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      {telemetry?.activeAlerts ?? 0} Open
                    </span>
                    <span>•</span>
                    <span>{telemetry?.resolvedAlerts ?? 0} Resolved</span>
                  </>
                )}
              </div>
            </div>

            {/* Card 4: Plans */}
            <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-purple-500/30 transition-all duration-300">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {selectedCompanyId ? 'Active Plans' : 'Audit Log Items'}
                  </span>
                  <p className="text-4xl font-black mt-2 text-purple-600 dark:text-purple-400 tracking-tight">
                    {selectedCompanyId ? (panelStats?.planCount ?? 0) : (telemetry?.auditLogsCount ?? 0)}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400 shadow-inner">
                  {selectedCompanyId ? <Layers className="h-6 w-6" /> : <ClipboardList className="h-6 w-6" />}
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedCompanyId ? (
                  <span>Subscription plans</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    SEBI Audit Trail Active
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Secondary Operational Metrics Bar (Global only) ── */}
      {!selectedCompanyId && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Staff Across RAs</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{telemetry?.activeStaff ?? telemetry?.totalStaff ?? 0} Active Staff</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-semibold">
              {telemetry?.totalStaff ?? 0} Total
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Compliance Audit Checks</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{telemetry?.pendingAudits ?? 0} Pending / Overdue</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-full font-semibold">
              {telemetry?.totalAudits ?? 0} Total
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Research Plans</p>
                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{telemetry?.activePlans ?? 0} Active Packages</p>
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full font-semibold">
              {telemetry?.totalPlans ?? 0} Total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
