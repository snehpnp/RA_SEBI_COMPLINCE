'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Download,
  RefreshCw,
  Users,
  Globe,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ExternalLink,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CreditCard
} from 'lucide-react';
import { formatPan, formatAadhaar } from '@/utils/formatters';
import { downloadCSV } from '@/utils/exportCsv';
import { base_api_url } from '@/utils/config';

interface CompanyClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: any;
  clientsData: {
    loading: boolean;
    error: string | null;
    source?: string;
    domainUrl?: string | null;
    company?: any;
    data: any[];
  };
  onRefresh: () => void;
}

export default function CompanyClientsModal({
  isOpen,
  onClose,
  company,
  clientsData,
  onRefresh
}: CompanyClientsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const rawClients = clientsData?.data || [];

  // Filter clients - Hook placed unconditionally at top level
  const filteredClients = useMemo(() => {
    if (!rawClients || rawClients.length === 0) return [];
    return rawClients.filter((client: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (client.name && client.name.toLowerCase().includes(q)) ||
        (client.email && client.email.toLowerCase().includes(q)) ||
        (client.mobile && client.mobile.includes(q)) ||
        (client.pan && client.pan.toLowerCase().includes(q)) ||
        (client.aadhaar && client.aadhaar.includes(q));

      const status = (client.status || 'ACTIVE').toUpperCase();
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && status === 'ACTIVE') ||
        (statusFilter === 'KYC_PENDING' && (status.includes('KYC') || status.includes('PENDING'))) ||
        (statusFilter === 'INACTIVE' && (status === 'INACTIVE' || status === 'SUSPENDED'));

      return matchesSearch && matchesStatus;
    });
  }, [rawClients, searchQuery, statusFilter]);

  if (!isOpen || !company) return null;

  // Statistics
  const totalCount = rawClients.length;
  const activeCount = rawClients.filter((c: any) => (c.status || '').toUpperCase() === 'ACTIVE').length;
  const kycPendingCount = rawClients.filter((c: any) => (c.status || '').toUpperCase().includes('KYC') || (c.status || '').toUpperCase().includes('PENDING')).length;
  const withPlanCount = rawClients.filter((c: any) => c.activeSubscription || c.subscriptionsCount > 0).length;

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const targetDomain = clientsData.domainUrl || company.domainUrl || company.website || '';
  const thirdPartyEndpoint = targetDomain
    ? `${targetDomain.replace(/\/+$/, '')}/api/v1/third-party-api/clients`
    : `${base_api_url}/third-party-api/${company.id}/clients`;

  const handleExportCSV = () => {
    const exportRows = filteredClients.map((c: any, index: number) => ({
      'S.No': index + 1,
      'Client Name': c.name || 'N/A',
      'Email': c.email || 'N/A',
      'Mobile': c.mobile || 'N/A',
      'PAN': c.pan || 'N/A',
      'Aadhaar': c.aadhaar || 'N/A',
      'Risk Profile': c.riskProfile || 'MODERATE',
      'Status': c.status || 'ACTIVE',
      'Active Plan': c.activeSubscription?.plan?.name || (c.subscriptionsCount > 0 ? `${c.subscriptionsCount} Active` : 'None'),
      'Joined Date': c.joinedAt ? new Date(c.joinedAt).toLocaleDateString() : 'N/A',
      'Source': clientsData.source || 'DATABASE'
    }));

    downloadCSV(exportRows, `${company.companyName.replace(/\s+/g, '_')}_Clients`);
  };

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(thirdPartyEndpoint);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 dark:bg-slate-950/85 backdrop-blur-md p-3 md:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-3xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start md:items-center space-x-3.5">
            <div className="p-3 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-2xl flex-shrink-0">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-3 flex-wrap gap-y-1">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  {company.companyName}
                </h2>
                <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10">
                  {company.sebiRegistration}
                </span>

                {/* Live Data Source Badge */}
                {clientsData.source === 'REMOTE_DOMAIN_API' ? (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <Globe className="h-3.5 w-3.5" />
                    <span>Live Domain API ({targetDomain})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                    <Database className="h-3.5 w-3.5" />
                    <span>Platform Database</span>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span>Domain: </span>
                {targetDomain ? (
                  <a
                    href={targetDomain.startsWith('http') ? targetDomain : `https://${targetDomain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary-600 dark:text-primary-400 font-semibold hover:underline inline-flex items-center space-x-1"
                  >
                    <span>{targetDomain}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="italic text-slate-400">No domain configured (Using central database)</span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2.5 self-end md:self-auto">
            <button
              onClick={onRefresh}
              disabled={clientsData.loading}
              className="p-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 rounded-xl transition-all border border-slate-300 dark:border-white/10 flex items-center space-x-1.5 text-xs font-bold disabled:opacity-50"
              title="Refresh / Re-sync from Domain API"
            >
              <RefreshCw className={`h-4 w-4 ${clientsData.loading ? 'animate-spin text-primary-500' : ''}`} />
              <span className="hidden sm:inline">Sync Domain API</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={filteredClients.length === 0}
              className="px-4 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold disabled:opacity-50 shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 md:px-6 bg-slate-100/60 dark:bg-slate-950/20 border-b border-slate-200 dark:border-white/5">
          <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Clients</span>
              <span className="text-xl font-black text-slate-900 dark:text-white">{totalCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Clients</span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">KYC / Pending</span>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400">{kycPendingCount}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900/90 p-3.5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Subscribed</span>
              <span className="text-xl font-black text-purple-600 dark:text-purple-400">{withPlanCount}</span>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="p-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, mobile, PAN..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 transition placeholder:text-slate-400 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['ALL', 'ACTIVE', 'KYC_PENDING', 'INACTIVE'].map(statusKey => (
              <button
                key={statusKey}
                onClick={() => {
                  setStatusFilter(statusKey);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === statusKey
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                }`}
              >
                {statusKey === 'ALL'
                  ? 'All Clients'
                  : statusKey === 'ACTIVE'
                  ? 'Active'
                  : statusKey === 'KYC_PENDING'
                  ? 'KYC / Pending'
                  : 'Inactive'}
              </button>
            ))}
          </div>
        </div>

        {/* Content Table Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6">
          {clientsData.loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-4">
              <RefreshCw className="h-8 w-8 text-primary-500 animate-spin" />
              <div className="text-center">
                <span className="font-bold text-slate-800 dark:text-white block">Connecting to Company Domain API...</span>
                <span className="text-xs text-slate-500">Fetching live client records from {targetDomain || 'database'}</span>
              </div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="py-16 text-center bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-dashed border-slate-300 dark:border-white/10 my-4">
              <Users className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-50" />
              <h3 className="font-bold text-slate-700 dark:text-slate-300">No client records found</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? 'No clients matched your search query.'
                  : `No client accounts are currently registered under ${company.companyName}.`}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden my-2 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 text-center w-12">#</th>
                      <th className="py-3 px-4">Client Name & Info</th>
                      <th className="py-3 px-4">PAN / Aadhaar</th>
                      <th className="py-3 px-4">Risk Profile</th>
                      <th className="py-3 px-4">Subscriptions</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {paginatedClients.map((client: any, idx: number) => {
                      const status = (client.status || 'ACTIVE').toUpperCase();
                      const isClientActive = status === 'ACTIVE';
                      const isKycPending = status.includes('KYC') || status.includes('PENDING');

                      return (
                        <tr
                          key={client.id || idx}
                          className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="py-3.5 px-4 text-center font-mono text-slate-400">
                            {(currentPage - 1) * itemsPerPage + idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {(client.name || 'C').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 dark:text-white block">
                                  {client.name || 'Client User'}
                                </span>
                                <span className="text-[11px] text-slate-500 block">{client.email || 'No email'}</span>
                                {client.mobile && (
                                  <span className="text-[10px] font-mono text-slate-400">{client.mobile}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 block">
                                {client.pan ? formatPan(client.pan) : 'N/A'}
                              </span>
                              {client.aadhaar && (
                                <span className="font-mono text-[10px] text-slate-400 block">
                                  {formatAadhaar(client.aadhaar)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                client.riskProfile === 'AGGRESSIVE'
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                  : client.riskProfile === 'CONSERVATIVE'
                                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {client.riskProfile || 'MODERATE'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {client.activeSubscription ? (
                              <div>
                                <span className="font-semibold text-slate-900 dark:text-white block">
                                  {client.activeSubscription.plan?.name || 'Active Plan'}
                                </span>
                                {client.activeSubscription.plan?.price !== undefined && (
                                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
                                    ₹{Number(client.activeSubscription.plan.price).toLocaleString()} / {client.activeSubscription.plan.durationMonths || 1}m
                                  </span>
                                )}
                              </div>
                            ) : client.subscriptionsCount > 0 ? (
                              <span className="text-slate-600 dark:text-slate-400 font-medium">
                                {client.subscriptionsCount} Subscription(s)
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">No Active Plan</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                isClientActive
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : isKycPending
                                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredClients.length > itemsPerPage && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} clients
                  </span>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer / 3rd Party API Helper Snippet */}
        <div className="p-4 md:px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
              3rd Party API Endpoint:
            </span>
            <code className="font-mono text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/10 truncate max-w-[280px] md:max-w-md select-all">
              {thirdPartyEndpoint}
            </code>
            <button
              onClick={handleCopyEndpoint}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-md transition"
              title="Copy 3rd Party API URL"
            >
              {copiedUrl ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition text-xs shadow-md shadow-primary-500/20"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
