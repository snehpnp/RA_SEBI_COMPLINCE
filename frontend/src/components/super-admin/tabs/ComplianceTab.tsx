'use client';

import { AlertTriangle, CheckCircle2, ChevronRight, ShieldAlert, FileText, Download, Loader2, RefreshCw, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';

interface ComplianceTabProps {
  selectedCompanyForCompliance: string;
  setSelectedCompanyForCompliance: (val: string) => void;
  companies: any[];
  complianceSweepLoading: boolean;
  handleGlobalComplianceSweep: () => void;
  complianceMetrics: any;
  activeComplianceSubTab: string;
  setActiveComplianceSubTab: (val: string) => void;
  currentPageAlerts: number;
  itemsPerPage: number;
  setCurrentPageAlerts: (val: number | ((prev: number) => number)) => void;
  setItemsPerPage: (val: number) => void;
}

export default function ComplianceTab({
  selectedCompanyForCompliance, setSelectedCompanyForCompliance, companies, complianceSweepLoading, handleGlobalComplianceSweep,
  complianceMetrics, activeComplianceSubTab, setActiveComplianceSubTab,
  currentPageAlerts, itemsPerPage, setCurrentPageAlerts, setItemsPerPage
}: ComplianceTabProps) {
  const router = useRouter();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header / Selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6 rounded-2xl gap-4 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Compliance Center</h2>
            <p className="text-sm mt-1 text-slate-500 dark:text-slate-400 font-medium">Governance overview and verification sweeps across companies</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCompanyForCompliance}
            onChange={e => setSelectedCompanyForCompliance(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer transition-all"
          >
            <option value="ALL">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>

          <button
            onClick={handleGlobalComplianceSweep}
            disabled={complianceSweepLoading}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5 bg-primary-600 hover:bg-primary-700 text-white"
          >
            {complianceSweepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span>Run Verification Sweep</span>
          </button>
        </div>
      </div>

      {/* Dashboard Counts */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          { id: 'upcoming', label: 'Upcoming Alerts', count: complianceMetrics?.counts?.upcoming || 0, color: 'text-blue-600 dark:text-blue-400', accent: 'bg-blue-500' },
          { id: 'due', label: 'Due Alerts', count: complianceMetrics?.counts?.due || 0, color: 'text-amber-600 dark:text-amber-400', accent: 'bg-amber-500' },
          { id: 'overdue', label: 'Overdue Alerts', count: complianceMetrics?.counts?.overdue || 0, color: 'text-rose-600 dark:text-rose-400', accent: 'bg-rose-500' },
          { id: 'penalty', label: 'Penalty Alerts', count: complianceMetrics?.counts?.penalty || 0, color: 'text-red-600 dark:text-red-400', accent: 'bg-red-500' },
          { id: 'closed', label: 'Closed Alerts', count: complianceMetrics?.counts?.closed || 0, color: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500' },
        ].map(card => (
          <button
            key={card.id}
            onClick={() => setActiveComplianceSubTab(card.id)}
            className={`relative p-6 rounded-2xl text-left transition-all duration-300 bg-white dark:bg-slate-900 border overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-1 group ${activeComplianceSubTab === card.id ? 'border-primary-500 ring-1 ring-primary-500' : 'border-slate-300 dark:border-white/10 hover:border-slate-400 dark:hover:border-white/20'}`}
          >
            <div className={`absolute top-0 left-0 w-full h-1 ${card.accent} opacity-80`} />
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">{card.label}</span>
            <p className={`text-3xl font-extrabold mt-3 ${card.color}`}>{card.count}</p>
          </button>
        ))}
      </div>

      {/* Audits Table */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-2xl border border-slate-400 dark:border-white/10 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-300 dark:border-white/5 bg-slate-100 dark:bg-slate-950/20 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            List of {activeComplianceSubTab} compliance audits
          </span>
          <button
            onClick={() => {
              const dataToExport = complianceMetrics && complianceMetrics[activeComplianceSubTab] ? complianceMetrics[activeComplianceSubTab] : [];
              const exportData = dataToExport.map((audit: any) => ({
                Sr_No: audit.requirement?.serialNo,
                Company: audit.tenant?.companyName || '—',
                Requirement: audit.requirement?.requirement,
                Due_Date: audit.dueDate ? new Date(audit.dueDate).toLocaleDateString() : '—',
                Status: audit.status,
                Penalty: audit.penalty?.amount || 0,
                Remarks: audit.officerRemarks || '—'
              }));
              import('@/utils/exportCsv').then(m => m.downloadCSV(exportData, `Compliance_${activeComplianceSubTab}`));
            }}
            className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 text-xs font-bold rounded-lg transition-all flex items-center space-x-2 text-white"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">S.No</TableHead>
              {selectedCompanyForCompliance === 'ALL' && <TableHead>Company</TableHead>}
              <TableHead>Requirement</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Penalty</TableHead>
              <TableHead>Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(complianceMetrics && complianceMetrics[activeComplianceSubTab] ? complianceMetrics[activeComplianceSubTab] : [])
              .slice((currentPageAlerts - 1) * itemsPerPage, currentPageAlerts * itemsPerPage)
              .map((audit: any, index: number) => (
                <TableRow key={audit.id}>
                  <TableCell className="font-mono text-slate-500">{(currentPageAlerts - 1) * itemsPerPage + index + 1}</TableCell>
                  {selectedCompanyForCompliance === 'ALL' && (
                    <TableCell className="font-semibold text-slate-900 dark:text-white text-xs">{audit.tenant?.companyName || '—'}</TableCell>
                  )}
                  <TableCell className="max-w-[200px] text-xs text-slate-800 dark:text-slate-200">{audit.requirement?.requirement || '—'}</TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {audit.dueDate ? new Date(audit.dueDate).toLocaleDateString() : '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      audit.status === 'OVERDUE' ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400' :
                      audit.status === 'DUE' ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                      audit.status === 'UPCOMING' ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400' :
                      audit.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' :
                      'bg-slate-500/20 text-slate-600 dark:text-slate-400'
                    }`}>
                      {audit.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                    {audit.penalty?.amount ? `₹${audit.penalty.amount}` : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500 max-w-[160px] truncate">{audit.officerRemarks || '—'}</TableCell>
                </TableRow>
              ))}
            {(!complianceMetrics || !complianceMetrics[activeComplianceSubTab] || complianceMetrics[activeComplianceSubTab].length === 0) && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500 bg-slate-100 dark:bg-slate-950/20">
                  No {activeComplianceSubTab} compliance records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {/* Pagination */}
        {complianceMetrics && complianceMetrics[activeComplianceSubTab] && complianceMetrics[activeComplianceSubTab].length > itemsPerPage && (
          <div className="px-6 py-4 border-t border-slate-400 dark:border-white/10 bg-slate-100 dark:bg-slate-950/30 flex items-center justify-between">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Showing {((currentPageAlerts - 1) * itemsPerPage) + 1} to {Math.min(currentPageAlerts * itemsPerPage, complianceMetrics[activeComplianceSubTab].length)} of {complianceMetrics[activeComplianceSubTab].length} entries
            </span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 text-xs rounded px-2 py-1 outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPageAlerts(prev => typeof prev === 'number' ? Math.max(prev - 1, 1) : 1)}
                  disabled={currentPageAlerts === 1}
                  className="p-1.5 rounded border border-slate-300 dark:border-white/10 disabled:opacity-30 transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold px-1">Page {currentPageAlerts}</span>
                <button
                  onClick={() => setCurrentPageAlerts(prev => typeof prev === 'number' ? Math.min(prev + 1, Math.ceil(complianceMetrics[activeComplianceSubTab].length / itemsPerPage)) : 1)}
                  disabled={currentPageAlerts === Math.ceil(complianceMetrics[activeComplianceSubTab].length / itemsPerPage)}
                  className="p-1.5 rounded border border-slate-300 dark:border-white/10 disabled:opacity-30 transition"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}