'use client';

import { Landmark, Users, BellRing, ClipboardList, ShieldCheck, UserCheck, Layers, AlertCircle } from 'lucide-react';

interface DashboardTabProps {
  telemetry: any;
  companies?: any[];
}

export default function DashboardTab({ telemetry, companies }: DashboardTabProps) {
  const totalRAs = (companies && companies.length > 0) ? companies.length : (telemetry?.totalCompanies ?? 0);
  const activeRAs = (companies && companies.length > 0) ? companies.filter(c => c.status === 'ACTIVE').length : (telemetry?.activeCompanies ?? 0);
  const suspendedRAs = (companies && companies.length > 0) ? companies.filter(c => c.status === 'SUSPENDED').length : (telemetry?.suspendedCompanies ?? 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Registered RAs */}
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
            <span className="text-slate-500">{suspendedRAs} Suspended</span>
          </div>
        </div>

        {/* Card 2: Active Clients */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Clients</span>
              <p className="text-4xl font-black mt-2 text-emerald-600 dark:text-emerald-400 tracking-tight">{telemetry?.activeClients ?? 0}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-inner">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">{telemetry?.totalClients ?? 0} Registered</span>
            <span>•</span>
            <span className="text-amber-600 dark:text-amber-400">{telemetry?.pendingClients ?? 0} Pending</span>
          </div>
        </div>

        {/* Card 3: Compliance Alerts */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-rose-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance Alerts</span>
              <p className="text-4xl font-black mt-2 text-rose-600 dark:text-rose-400 tracking-tight">{telemetry?.activeAlerts ?? 0}</p>
            </div>
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shadow-inner">
              <BellRing className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
              <AlertCircle className="h-3.5 w-3.5" />
              {telemetry?.activeAlerts ?? 0} Open
            </span>
            <span>•</span>
            <span className="text-slate-500">{telemetry?.resolvedAlerts ?? 0} Resolved</span>
          </div>
        </div>

        {/* Card 4: Audit Log Items */}
        <div className="p-6 rounded-2xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md flex flex-col justify-between hover:shadow-lg hover:border-purple-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Audit Log Items</span>
              <p className="text-4xl font-black mt-2 text-purple-600 dark:text-purple-400 tracking-tight">{telemetry?.auditLogsCount ?? 0}</p>
            </div>
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400 shadow-inner">
              <ClipboardList className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" />
              SEBI Audit Trail Active
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Bar */}
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
    </div>
  );
}
