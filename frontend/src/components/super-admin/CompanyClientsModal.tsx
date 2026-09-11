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
  CreditCard,
  Eye,
  FileText,
  MapPin,
  Calendar,
  Phone,
  Mail,
  Shield,
  Layers
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
    endpointUsed?: string | null;
    company?: any;
    data: any[];
    localData?: any[];
    remoteCount?: number;
    localCount?: number;
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
  const [activeSourceView, setActiveSourceView] = useState<'REMOTE' | 'LOCAL'>('REMOTE');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedClientForView, setSelectedClientForView] = useState<any | null>(null);

  const hasRemoteData = clientsData?.source === 'REMOTE_DOMAIN_API';
  const hasLocalData = Array.isArray(clientsData?.localData) && clientsData.localData.length > 0;

  // Decide which list to use based on user selected source view
  const activeClientsList = useMemo(() => {
    if (activeSourceView === 'LOCAL' && hasLocalData) {
      return clientsData.localData || [];
    }
    return clientsData?.data || [];
  }, [activeSourceView, clientsData, hasLocalData]);

  // Helper to check KYC pending status
  const isClientKycPending = (client: any) => {
    const status = (client.status || '').toUpperCase();
    return status.includes('KYC') || status.includes('PENDING') || client.kraVerified === false || client.kraVerified === 'false';
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    if (!activeClientsList || activeClientsList.length === 0) return [];
    return activeClientsList.filter((client: any) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (client.name && client.name.toLowerCase().includes(q)) ||
        (client.companyName && client.companyName.toLowerCase().includes(q)) ||
        (client.email && client.email.toLowerCase().includes(q)) ||
        (client.mobile && client.mobile.includes(q)) ||
        (client.pan && client.pan.toLowerCase().includes(q)) ||
        (client.aadhaar && client.aadhaar.includes(q)) ||
        (client.city && client.city.toLowerCase().includes(q)) ||
        (client.state && client.state.toLowerCase().includes(q));

      const status = (client.status || 'ACTIVE').toUpperCase();
      const kycPending = isClientKycPending(client);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && status === 'ACTIVE') ||
        (statusFilter === 'KYC_PENDING' && kycPending) ||
        (statusFilter === 'INACTIVE' && (status === 'INACTIVE' || status === 'SUSPENDED'));

      return matchesSearch && matchesStatus;
    });
  }, [activeClientsList, searchQuery, statusFilter]);

  if (!isOpen || !company) return null;

  // Statistics
  const totalCount = activeClientsList.length;
  const activeCount = activeClientsList.filter((c: any) => (c.status || '').toUpperCase() === 'ACTIVE').length;
  const kycPendingCount = activeClientsList.filter((c: any) => isClientKycPending(c)).length;
  const inactiveCount = activeClientsList.filter((c: any) => {
    const s = (c.status || '').toUpperCase();
    return s === 'INACTIVE' || s === 'SUSPENDED';
  }).length;
  const withPlanCount = activeClientsList.filter((c: any) => c.activeSubscription || c.subscriptionsCount > 0).length;

  const totalPages = Math.ceil(filteredClients.length / itemsPerPage) || 1;
  const paginatedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const targetDomain = clientsData.domainUrl || company.domainUrl || company.website || '';
  const thirdPartyEndpoint = clientsData.endpointUsed || (targetDomain
    ? `${targetDomain.replace(/\/+$/, '')}/backend/api/v1/third-party-api/clients`
    : `${base_api_url}/third-party-api/${company.id}/clients`);

  const handleExportCSV = () => {
    const exportRows = filteredClients.map((c: any, index: number) => ({
      'S.No': index + 1,
      'Client Name': c.name || 'N/A',
      'Company / Entity': c.companyName || company.companyName || 'N/A',
      'Email': c.email || 'N/A',
      'Mobile': c.mobile || 'N/A',
      'PAN': c.pan || 'N/A',
      'Aadhaar': c.aadhaar || 'N/A',
      'Risk Profile': c.riskProfile || 'MODERATE',
      'City': c.city || '—',
      'State': c.state || '—',
      'Status': c.status || 'ACTIVE',
      'Active Plan': c.activeSubscription?.plan?.name || (c.subscriptionsCount > 0 ? `${c.subscriptionsCount} Active` : 'None'),
      'Joined Date': c.joinedAt ? new Date(c.joinedAt).toLocaleDateString() : 'N/A',
      'Source': activeSourceView === 'LOCAL' ? 'CENTRAL_DATABASE' : (clientsData.source || 'REMOTE_DOMAIN_API')
    }));

    downloadCSV(exportRows, `${company.companyName.replace(/\s+/g, '_')}_Clients_${activeSourceView}`);
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

                {/* Source View Tabs */}
                {hasRemoteData && hasLocalData && (
                  <div className="inline-flex items-center p-0.5 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-white/10 text-xs font-semibold">
                    <button
                      onClick={() => {
                        setActiveSourceView('REMOTE');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition ${
                        activeSourceView === 'REMOTE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      <span>Live Domain API ({clientsData.data?.length || 0})</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveSourceView('LOCAL');
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1 rounded-full flex items-center gap-1.5 transition ${
                        activeSourceView === 'LOCAL'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      <span>Local Central DB ({clientsData.localData?.length || 0})</span>
                    </button>
                  </div>
                )}

                {(!hasRemoteData || !hasLocalData) && (
                  clientsData.source === 'REMOTE_DOMAIN_API' ? (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Globe className="h-3.5 w-3.5" />
                      <span>Live Domain API ({targetDomain})</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                      <Database className="h-3.5 w-3.5" />
                      <span>Central Master Database</span>
                    </span>
                  )
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

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 md:px-6 md:pt-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 flex items-center space-x-3.5 shadow-xs">
            <div className="p-3 bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Clients
              </span>
              <span className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {totalCount}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 flex items-center space-x-3.5 shadow-xs">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Active Clients
              </span>
              <span className="text-xl md:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {activeCount}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 flex items-center space-x-3.5 shadow-xs">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                KYC / Pending
              </span>
              <span className="text-xl md:text-2xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {kycPendingCount}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-white/5 flex items-center space-x-3.5 shadow-xs">
            <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Subscribed
              </span>
              <span className="text-xl md:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                {withPlanCount}
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="px-4 md:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, email, mobile, PAN, city..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 transition placeholder:text-slate-400 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { key: 'ALL', label: 'All Clients', count: totalCount },
              { key: 'ACTIVE', label: 'Active', count: activeCount },
              { key: 'KYC_PENDING', label: 'KYC / Pending', count: kycPendingCount },
              { key: 'INACTIVE', label: 'Inactive', count: inactiveCount }
            ].map(({ key: statusKey, label, count }) => (
              <button
                key={statusKey}
                onClick={() => {
                  setStatusFilter(statusKey);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  statusFilter === statusKey
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-500/20'
                    : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/5'
                }`}
              >
                <span>{label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  statusFilter === statusKey ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'
                }`}>
                  {count}
                </span>
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
                  : `No client accounts are currently registered under ${company.companyName} in this source.`}
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
                      <th className="py-3 px-4 text-center w-16">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                    {paginatedClients.map((client: any, idx: number) => {
                      const status = (client.status || 'ACTIVE').toUpperCase();
                      const isKycPending = isClientKycPending(client);
                      const isClientActive = status === 'ACTIVE';

                      return (
                        <tr
                          key={client.id || idx}
                          className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setSelectedClientForView(client)}
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
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <span className="font-bold text-slate-900 dark:text-white block">
                                    {client.name || 'Client User'}
                                  </span>
                                  {client.companyName && (
                                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                      {client.companyName}
                                    </span>
                                  )}
                                </div>
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
                                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                    ₹{Number(client.activeSubscription.plan.price).toLocaleString('en-IN')} / {client.activeSubscription.plan.durationMonths || 1}m
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
                            {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString('en-IN') : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                  isClientActive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : isKycPending
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                    : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                }`}
                              >
                                {status}
                              </span>
                              {client.kraVerified === false ? (
                                <span className="text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                  KRA Pending
                                </span>
                              ) : client.kraVerified ? (
                                <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded">
                                  KRA Verified
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedClientForView(client)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                              title="View Client Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
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

        {/* Footer with Third-Party API Endpoint & Copy */}
        <div className="p-4 px-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400 flex-wrap">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider">
              3rd Party API Endpoint:
            </span>
            <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 select-all">
              {thirdPartyEndpoint}
            </span>
            <button
              onClick={handleCopyEndpoint}
              className="p-1 hover:text-primary-600 dark:hover:text-primary-400 transition"
              title="Copy Endpoint"
            >
              {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition shadow-sm"
          >
            Close
          </button>
        </div>
      </div>

      {/* Client Profile Inspection Modal */}
      {selectedClientForView && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-base">
                  {(selectedClientForView.name || 'C').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {selectedClientForView.name || 'Client Details'}
                  </h3>
                  <span className="text-xs text-slate-500">{selectedClientForView.email || 'No email'}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedClientForView(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1 text-xs">
              {/* Status & Risk Profile */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Account Status</span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                    {selectedClientForView.status || 'ACTIVE'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Risk Profile</span>
                  <p className="text-xs font-bold text-primary-600 dark:text-primary-400 mt-1">
                    {selectedClientForView.riskProfile || 'MODERATE'}
                  </p>
                </div>
              </div>

              {/* KYC Identification */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Identity & KYC
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">PAN Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedClientForView.pan ? formatPan(selectedClientForView.pan) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Aadhaar Number</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {selectedClientForView.aadhaar ? formatAadhaar(selectedClientForView.aadhaar) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Category</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedClientForView.category || 'INDIVIDUAL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Occupation</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {selectedClientForView.occupation || 'OTHER'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact & Location */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-white/5 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                  Contact & Location
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Mobile</span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedClientForView.mobile || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Location</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {[selectedClientForView.city, selectedClientForView.state].filter(Boolean).join(', ') || '—'}
                    </span>
                  </div>
                  {selectedClientForView.address && (
                    <div className="col-span-2">
                      <span className="text-slate-400 text-[10px] block">Address</span>
                      <span className="text-slate-700 dark:text-slate-300">{selectedClientForView.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Subscription Plan */}
              {selectedClientForView.activeSubscription && (
                <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Active Subscription
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
                      {selectedClientForView.activeSubscription.status || 'ACTIVE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">
                        {selectedClientForView.activeSubscription.plan?.name || 'Subscription Plan'}
                      </p>
                      {selectedClientForView.activeSubscription.plan?.price !== undefined && (
                        <p className="text-[11px] text-emerald-600 font-semibold font-mono mt-0.5">
                          ₹{Number(selectedClientForView.activeSubscription.plan.price).toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>
                    {selectedClientForView.activeSubscription.endDate && (
                      <div className="text-right text-[11px] text-slate-500">
                        <span>Valid until</span>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          {new Date(selectedClientForView.activeSubscription.endDate).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-white/10">
              <button
                onClick={() => setSelectedClientForView(null)}
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
