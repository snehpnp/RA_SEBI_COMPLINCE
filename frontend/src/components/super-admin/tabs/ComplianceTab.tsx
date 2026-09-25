'use client';

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Search,
  ExternalLink,
  Globe,
  Database,
  Building,
  Clock,
  AlertCircle,
  X,
  Eye,
  Calendar,
  Sparkles,
  ShieldCheck,
  Ban
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { downloadCSV } from '@/utils/exportCsv';

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
  onRefresh?: () => void;
}

export default function ComplianceTab({
  selectedCompanyForCompliance,
  setSelectedCompanyForCompliance,
  companies,
  complianceSweepLoading,
  handleGlobalComplianceSweep,
  complianceMetrics,
  activeComplianceSubTab,
  setActiveComplianceSubTab,
  currentPageAlerts,
  itemsPerPage,
  setCurrentPageAlerts,
  setItemsPerPage,
  onRefresh
}: ComplianceTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAuditForView, setSelectedAuditForView] = useState<any | null>(null);

  // Selected company object if specific company is chosen
  const currentCompany = useMemo(() => {
    if (selectedCompanyForCompliance === 'ALL') return null;
    return companies.find(c => c.id === selectedCompanyForCompliance || c._id === selectedCompanyForCompliance) || null;
  }, [selectedCompanyForCompliance, companies]);

  // Data source metadata
  const meta = complianceMetrics?._meta || {};
  const isLiveDomainApi = meta.source === 'REMOTE_DOMAIN_API';
  const effectiveDomain = meta.domainUrl || currentCompany?.domainUrl || currentCompany?.website || null;

  // Active sub-tab audits list
  const rawList: any[] = useMemo(() => {
    if (!complianceMetrics) return [];
    const list = complianceMetrics[activeComplianceSubTab];
    return Array.isArray(list) ? list : [];
  }, [complianceMetrics, activeComplianceSubTab]);

  // Filtered by search term
  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return rawList;
    const q = searchTerm.toLowerCase();
    return rawList.filter((audit: any) => {
      const serialNo = String(audit.requirement?.serialNo || audit.requirementId?.serialNo || '');
      const reqText = (audit.requirement?.requirement || audit.requirementId?.requirement || audit.requirementId?.title || '').toLowerCase();
      const compName = (audit.tenant?.companyName || audit.tenantId?.companyName || currentCompany?.companyName || '').toLowerCase();
      const remarks = (audit.officerRemarks || '').toLowerCase();
      const status = (audit.status || '').toLowerCase();
      return serialNo.includes(q) || reqText.includes(q) || compName.includes(q) || remarks.includes(q) || status.includes(q);
    });
  }, [rawList, searchTerm, currentCompany]);

  // Pagination slice
  const paginatedList = useMemo(() => {
    const start = (currentPageAlerts - 1) * itemsPerPage;
    return filteredList.slice(start, start + itemsPerPage);
  }, [filteredList, currentPageAlerts, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / itemsPerPage));

  // CSV Export Handler
  const handleExportCSV = () => {
    const exportData = filteredList.map((audit: any, index: number) => ({
      Sr_No: audit.requirement?.serialNo || audit.requirementId?.serialNo || index + 1,
      Company: audit.tenant?.companyName || audit.tenantId?.companyName || currentCompany?.companyName || '—',
      SEBI_Registration: audit.tenant?.sebiRegistration || audit.tenantId?.sebiRegistration || currentCompany?.sebiRegistration || '—',
      Requirement: audit.requirement?.requirement || audit.requirementId?.requirement || audit.requirementId?.title || '—',
      Frequency: audit.requirement?.frequency || audit.requirementId?.frequency || audit.requirementId?.frequencyType || '—',
      Due_Date: audit.dueDate ? new Date(audit.dueDate).toLocaleDateString('en-IN') : '—',
      Status: audit.status || 'PENDING',
      Penalty_Amount: audit.penalty?.amount ? `₹${audit.penalty.amount}` : (audit.requirement?.penaltyAmount ? `₹${audit.requirement.penaltyAmount}` : '₹0'),
      Penalty_Status: audit.penalty?.status || 'NONE',
      Remarks: audit.officerRemarks || '—'
    }));

    const filePrefix = selectedCompanyForCompliance === 'ALL'
      ? `Global_Compliance_${activeComplianceSubTab}`
      : `${(currentCompany?.companyName || 'Company').replace(/\s+/g, '_')}_Compliance_${activeComplianceSubTab}`;

    downloadCSV(exportData, filePrefix);
  };

  // Helper for due date badge
  const renderDueDateBadge = (dueDateStr?: string, status?: string) => {
    if (!dueDateStr) return <span className="text-slate-500 dark:text-slate-400 text-xs">—</span>;
    const dueDate = new Date(dueDateStr);
    const now = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (status === 'COMPLIANT' || status === 'CLOSED' || status === 'PENALTY_RESOLVED') {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Completed</span>
        </div>
      );
    }

    if (diffDays < 0) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wide">
            Overdue by {Math.abs(diffDays)}d
          </span>
        </div>
      );
    }

    if (diffDays <= 7) {
      return (
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
            Due in {diffDays}d
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {dueDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-[10px] text-blue-500 font-medium">Due in {diffDays}d</span>
      </div>
    );
  };

  const cards = [
    {
      id: 'upcoming',
      label: 'Upcoming Alerts',
      count: complianceMetrics?.counts?.upcoming || 0,
      description: 'Audits due in next 30 days',
      color: 'text-blue-600 dark:text-blue-400',
      bgGlow: 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500/30',
      accent: 'bg-blue-500',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
    },
    {
      id: 'due',
      label: 'Due Alerts',
      count: complianceMetrics?.counts?.due || 0,
      description: 'Pending deadline items',
      color: 'text-amber-600 dark:text-amber-400',
      bgGlow: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-200 dark:border-amber-500/30',
      accent: 'bg-amber-500',
      badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
    },
    {
      id: 'overdue',
      label: 'Overdue Alerts',
      count: complianceMetrics?.counts?.overdue || 0,
      description: 'Violations requiring action',
      color: 'text-rose-600 dark:text-rose-400',
      bgGlow: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500/30',
      accent: 'bg-rose-500',
      badge: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
    },
    {
      id: 'penalty',
      label: 'Penalty Alerts',
      count: complianceMetrics?.counts?.penalty || 0,
      description: 'Fines pending resolution',
      color: 'text-red-600 dark:text-red-400',
      bgGlow: 'bg-red-500/10 dark:bg-red-500/15 border-red-200 dark:border-red-500/30',
      accent: 'bg-red-500',
      badge: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
    },
    {
      id: 'closed',
      label: 'Closed Alerts',
      count: complianceMetrics?.counts?.closed || 0,
      description: 'Compliant & settled items',
      color: 'text-emerald-600 dark:text-emerald-400',
      bgGlow: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/30',
      accent: 'bg-emerald-500',
      badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Controls */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Compliance Center</h2>
                {/* Live Data Source Badge */}
                {selectedCompanyForCompliance !== 'ALL' && (
                  isLiveDomainApi ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-500/30 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Globe className="w-3.5 h-3.5" />
                      <span>Live Domain API</span>
                      {effectiveDomain && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 opacity-80 underline underline-offset-2">
                          {effectiveDomain.replace(/^https?:\/\//, '')}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-500/30 shadow-xs">
                      <Database className="w-3.5 h-3.5" />
                      <span>Central Master DB</span>
                    </span>
                  )
                )}
                {selectedCompanyForCompliance === 'ALL' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-white/10">
                    <Building className="w-3.5 h-3.5 text-primary-500" />
                    <span>Aggregated ({companies.length} Companies)</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Real-time SEBI governance tracking, penalty monitoring & automated verification sweeps
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Company Select, Refresh, Sweep */}
        <div className="flex items-center flex-wrap gap-3">
          <div className="relative min-w-[220px]">
            <select
              value={selectedCompanyForCompliance}
              onChange={e => {
                setSelectedCompanyForCompliance(e.target.value);
                setCurrentPageAlerts(1);
              }}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent cursor-pointer transition-all appearance-none"
            >
              <option value="ALL">🌐 All Companies (Global View)</option>
              {companies.map(c => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  🏢 {c.companyName} {c.domainUrl ? ' (Domain API)' : ''}
                </option>
              ))}
            </select>
            <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh Compliance Metrics"
              className="p-2.5 rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={handleGlobalComplianceSweep}
            disabled={complianceSweepLoading}
            className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 hover:shadow-lg hover:-translate-y-0.5 bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
          >
            {complianceSweepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{complianceSweepLoading ? 'Running Sweep...' : 'Run Verification Sweep'}</span>
          </button>
        </div>
      </div>

      {/* Dashboard Count Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(card => {
          const isActive = activeComplianceSubTab === card.id;
          return (
            <button
              key={card.id}
              onClick={() => {
                setActiveComplianceSubTab(card.id);
                setCurrentPageAlerts(1);
              }}
              className={`relative p-5 rounded-2xl text-left transition-all duration-300 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 group border ${
                isActive
                  ? `${card.bgGlow} border-primary-500 dark:border-primary-400 ring-2 ring-primary-500/20`
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
              }`}
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${card.accent} ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                  {card.label}
                </span>
                {card.count > 0 && card.id === 'overdue' && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <p className={`text-3xl font-extrabold mt-2.5 tracking-tight ${card.color}`}>
                {card.count}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 truncate">
                {card.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Audits Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm">
        {/* Table Header & Search Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              List of {activeComplianceSubTab} compliance audits ({filteredList.length})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPageAlerts(1);
                }}
                placeholder="Search requirement, company..."
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 w-52 transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <button
              onClick={handleExportCSV}
              disabled={filteredList.length === 0}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 text-white disabled:opacity-40 shadow-xs"
            >
              <Download className="h-3 w-3" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">S.No</TableHead>
              {selectedCompanyForCompliance === 'ALL' && <TableHead className="min-w-[140px]">Company</TableHead>}
              <TableHead className="min-w-[280px]">Requirement / Regulation</TableHead>
              <TableHead className="min-w-[130px]">Due Date</TableHead>
              <TableHead className="min-w-[110px]">Status</TableHead>
              <TableHead className="min-w-[100px]">Penalty</TableHead>
              <TableHead className="min-w-[160px]">Remarks / Evidence</TableHead>
              <TableHead className="w-20 text-center">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedList.map((audit: any, index: number) => {
              const serialNo = audit.requirement?.serialNo || audit.requirementId?.serialNo || ((currentPageAlerts - 1) * itemsPerPage + index + 1);
              const reqText = audit.requirement?.requirement || audit.requirementId?.requirement || audit.requirementId?.title || 'SEBI Regulation Requirement';
              const frequency = audit.requirement?.frequency || audit.requirementId?.frequency || audit.requirementId?.frequencyType || null;
              const companyName = audit.tenant?.companyName || audit.tenantId?.companyName || currentCompany?.companyName || '—';
              const penaltyAmt = audit.penalty?.amount || audit.requirement?.penaltyAmount || null;

              return (
                <TableRow
                  key={audit.id || audit._id || index}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group cursor-pointer"
                  onClick={() => setSelectedAuditForView(audit)}
                >
                  <TableCell className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {(currentPageAlerts - 1) * itemsPerPage + index + 1}
                  </TableCell>

                  {selectedCompanyForCompliance === 'ALL' && (
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-white text-xs">{companyName}</span>
                        {audit.tenant?.sebiRegistration && (
                          <span className="text-[10px] text-slate-500 font-mono">{audit.tenant.sebiRegistration}</span>
                        )}
                      </div>
                    </TableCell>
                  )}

                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                          SR.{serialNo}
                        </span>
                        {frequency && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {frequency}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-800 dark:text-slate-200 line-clamp-2 leading-relaxed font-normal">
                        {reqText}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell>
                    {renderDueDateBadge(audit.dueDate, audit.status)}
                  </TableCell>

                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        audit.status === 'OVERDUE'
                          ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                          : audit.status === 'DUE'
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900'
                          : audit.status === 'UPCOMING'
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900'
                          : audit.status === 'COMPLIANT' || audit.status === 'CLOSED' || audit.status === 'PENALTY_RESOLVED'
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {audit.status || 'PENDING'}
                    </span>
                  </TableCell>

                  <TableCell>
                    {penaltyAmt ? (
                      <span className="inline-flex items-center text-xs font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(penaltyAmt).toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <div className="flex flex-col max-w-[180px]">
                      <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                        {audit.officerRemarks || '—'}
                      </span>
                      {audit.proofDocumentUrl && (
                        <span className="text-[10px] text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 mt-0.5">
                          <FileText className="w-3 h-3" /> Proof attached
                        </span>
                      )}
                    </div>
                  </TableCell>

                  <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedAuditForView(audit)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all"
                      title="View Audit Details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}

            {filteredList.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={selectedCompanyForCompliance === 'ALL' ? 8 : 7}
                  className="text-center py-12 text-slate-500 bg-slate-50/50 dark:bg-slate-950/20"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ShieldCheck className="h-8 w-8 text-slate-400 opacity-60" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      No {activeComplianceSubTab} compliance records found.
                    </p>
                    {searchTerm && (
                      <p className="text-xs text-slate-400">
                        Try clearing your search query &quot;{searchTerm}&quot;
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Footer */}
        {filteredList.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-slate-950/30 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-600 dark:text-slate-400">
              Showing {Math.min((currentPageAlerts - 1) * itemsPerPage + 1, filteredList.length)} to{' '}
              {Math.min(currentPageAlerts * itemsPerPage, filteredList.length)} of {filteredList.length} entries
            </span>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500">Rows:</span>
                <select
                  value={itemsPerPage}
                  onChange={e => setItemsPerPage(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 text-xs rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-300"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setCurrentPageAlerts(prev => Math.max(Number(prev) - 1, 1))}
                  disabled={currentPageAlerts === 1}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-400"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                  Page {currentPageAlerts} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPageAlerts(prev => Math.min(Number(prev) + 1, totalPages))}
                  disabled={currentPageAlerts >= totalPages}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition text-slate-600 dark:text-slate-400"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedAuditForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Compliance Audit Details
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Serial No: SR.{selectedAuditForView.requirement?.serialNo || selectedAuditForView.requirementId?.serialNo || '—'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditForView(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-xs">
              {/* Company & Source */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Company</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                    {selectedAuditForView.tenant?.companyName || selectedAuditForView.tenantId?.companyName || currentCompany?.companyName || '—'}
                  </p>
                </div>
                {selectedAuditForView.tenant?.sebiRegistration && (
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">SEBI Reg No</span>
                    <p className="text-xs font-mono font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                      {selectedAuditForView.tenant.sebiRegistration}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Data Source</span>
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5 flex items-center gap-1">
                    {isLiveDomainApi ? (
                      <>
                        <Globe className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Live Domain API</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5 text-purple-500" />
                        <span>Master Database</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Requirement Text */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                  Requirement Clause
                </span>
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                  {selectedAuditForView.requirement?.requirement || selectedAuditForView.requirementId?.requirement || selectedAuditForView.requirementId?.title || 'SEBI Mandated Compliance Audit Item'}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Frequency</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedAuditForView.requirement?.frequency || selectedAuditForView.requirementId?.frequency || selectedAuditForView.requirementId?.frequencyType || 'Continuous'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Status</span>
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {selectedAuditForView.status || 'PENDING'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Due Date</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedAuditForView.dueDate ? new Date(selectedAuditForView.dueDate).toLocaleDateString('en-IN') : '—'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Penalty</span>
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1">
                    {selectedAuditForView.penalty?.amount ? `₹${selectedAuditForView.penalty.amount}` : (selectedAuditForView.requirement?.penaltyAmount ? `₹${selectedAuditForView.requirement.penaltyAmount}` : '₹0')}
                  </p>
                </div>
              </div>

              {/* Officer Remarks */}
              {selectedAuditForView.officerRemarks && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Compliance Officer Remarks
                  </span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300">
                    {selectedAuditForView.officerRemarks}
                  </div>
                </div>
              )}

              {/* Proof Document */}
              {selectedAuditForView.proofDocumentUrl && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                    Uploaded Proof Document
                  </span>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-white/5">
                    <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-xs font-semibold">Verification Document</span>
                    </div>
                    <a
                      href={selectedAuditForView.proofDocumentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition shadow-xs"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>View File</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setSelectedAuditForView(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}