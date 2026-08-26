'use client';

import { Landmark, Users, BellRing, ClipboardList } from 'lucide-react';

interface DashboardTabProps {
  telemetry: any;
}

export default function DashboardTab({ telemetry }: DashboardTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex justify-between items-start hover:border-slate-400 dark:border-white/20 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Registered RAs</span>
            <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white">{telemetry?.totalCompanies || 0}</p>
          </div>
          <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-600 dark:text-primary-400 shadow-inner">
            <Landmark className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex justify-between items-start hover:border-slate-400 dark:border-white/20 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Clients</span>
            <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white">{telemetry?.activeCompanies || 0}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-inner">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex justify-between items-start hover:border-slate-400 dark:border-white/20 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Compliance Alerts</span>
            <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white">{telemetry?.activeAlerts || 0}</p>
          </div>
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 shadow-inner">
            <BellRing className="h-6 w-6" />
          </div>
        </div>

        <div className="p-6 rounded-2xl border border-slate-400 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm flex justify-between items-start hover:border-slate-400 dark:border-white/20 transition-colors">
          <div>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Audit Log Items</span>
            <p className="text-4xl font-black mt-2 text-slate-900 dark:text-white">{telemetry?.auditLogsCount || 0}</p>
          </div>
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400 shadow-inner">
            <ClipboardList className="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>
  );
}
