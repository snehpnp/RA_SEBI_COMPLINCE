'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  LogIn,
  UserCheck,
  LifeBuoy,
  FileCheck,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Download,
  RefreshCw,
  Laptop,
  Smartphone,
  Globe,
  Calendar,
  Layers,
  Sparkles,
  Info,
  SlidersHorizontal,
  ChevronUp,
  FileText
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface ClientTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string | null;
  clientName?: string;
}

interface TimelineEvent {
  id: string;
  source: 'REALTIME' | 'HISTORICAL';
  category: 'AUTH' | 'KYC_COMPLIANCE' | 'PAYMENT' | 'SUBSCRIPTION' | 'STAFF_ACTION' | 'SUPPORT' | 'SYSTEM';
  action: string;
  title: string;
  description: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'INFO';
  timestamp: string;
  actorName?: string;
  actorType?: string;
  ipAddress?: string;
  device?: string;
  browser?: string;
  os?: string;
  metadata?: Record<string, any>;
}

interface Milestone {
  step: number;
  key: string;
  label: string;
  completed: boolean;
  current: boolean;
  timestamp: string | null;
  detail: string;
}

interface DateGroup {
  key: string;
  label: string;
  dayName: string;
  count: number;
  events: TimelineEvent[];
}

interface MonthGroup {
  monthKey: string;
  monthLabel: string;
  isCurrentMonth: boolean;
  totalCount: number;
  dateGroups: DateGroup[];
}

interface TimelineData {
  clientSummary: {
    id: string;
    name: string;
    email: string;
    mobile: string;
    pan?: string;
    status: string;
    category: string;
    registeredAt: string;
    totalSpent: number;
    activeSubscriptions: number;
  };
  milestones: Milestone[];
  stats: {
    totalEvents: number;
    totalSpent: number;
    totalPayments: number;
    totalSubscriptions: number;
    totalLogins: number;
    lastActive: string;
  };
  groups: any[];
  rawEvents: TimelineEvent[];
}

export default function ClientTimelineModal({
  isOpen,
  onClose,
  clientId,
  clientName
}: ClientTimelineModalProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});
  const [collapsedDates, setCollapsedDates] = useState<Record<string, boolean>>({});
  const [clusterLogins, setClusterLogins] = useState(true);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Fetch timeline on modal open or client change
  useEffect(() => {
    if (isOpen && clientId) {
      fetchTimeline();
    } else {
      setData(null);
      setSelectedCategory('ALL');
      setSearchQuery('');
      setCollapsedMonths({});
      setCollapsedDates({});
    }
  }, [isOpen, clientId]);

  const fetchTimeline = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await api.getClientTimelineAdmin(clientId);
      if (res && res.success && res.data) {
        setData(res.data);
      } else {
        toast.error(res?.message || 'Failed to load timeline data');
      }
    } catch (err: any) {
      console.error('Error fetching client timeline:', err);
      toast.error(err?.message || 'Error fetching client timeline');
    } finally {
      setLoading(false);
    }
  };

  // Toggle single month accordion
  const toggleMonthCollapse = (mKey: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [mKey]: !prev[mKey]
    }));
  };

  // Toggle single date group accordion
  const toggleDateCollapse = (dKey: string) => {
    setCollapsedDates(prev => ({
      ...prev,
      [dKey]: !prev[dKey]
    }));
  };

  // Toggle card details drawer
  const toggleEventDetail = (eventId: string) => {
    setExpandedDetails(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  // Filtered Events logic
  const filteredEvents = useMemo(() => {
    if (!data?.rawEvents) return [];
    return data.rawEvents.filter(ev => {
      // Category filter
      if (selectedCategory !== 'ALL') {
        if (selectedCategory === 'PAYMENT_SUBSCRIPTION') {
          if (ev.category !== 'PAYMENT' && ev.category !== 'SUBSCRIPTION') return false;
        } else if (ev.category !== selectedCategory) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = ev.title?.toLowerCase().includes(q);
        const inDesc = ev.description?.toLowerCase().includes(q);
        const inActor = ev.actorName?.toLowerCase().includes(q);
        const inIp = ev.ipAddress?.toLowerCase().includes(q);
        const inMeta = JSON.stringify(ev.metadata || {}).toLowerCase().includes(q);
        if (!inTitle && !inDesc && !inActor && !inIp && !inMeta) {
          return false;
        }
      }

      return true;
    });
  }, [data?.rawEvents, selectedCategory, searchQuery]);

  // Re-group filtered events into Month & Date hierarchy
  const displayMonthGroups = useMemo<MonthGroup[]>(() => {
    if (!filteredEvents.length) return [];

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const todayStr = new Date().toDateString();
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const yesterdayStr = yest.toDateString();

    const monthsMap = new Map<string, { monthLabel: string; isCurrentMonth: boolean; datesMap: Map<string, { label: string; dayName: string; events: TimelineEvent[] }> }>();

    for (const ev of filteredEvents) {
      let d = new Date(ev.timestamp);
      if (d.getTime() > now.getTime()) {
        d = now;
      }

      const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      const isCur = d.getFullYear() === currentYear && d.getMonth() === currentMonth;

      if (!monthsMap.has(mKey)) {
        monthsMap.set(mKey, {
          monthLabel: mLabel,
          isCurrentMonth: isCur,
          datesMap: new Map()
        });
      }

      const mObj = monthsMap.get(mKey)!;
      const dateKey = `${mKey}-${String(d.getDate()).padStart(2, '0')}`;
      const dStr = d.toDateString();

      let dLabel = '';
      if (dStr === todayStr) {
        dLabel = `Today (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
      } else if (dStr === yesterdayStr) {
        dLabel = `Yesterday (${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
      } else {
        dLabel = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      const dayName = d.toLocaleDateString('en-IN', { weekday: 'short' });

      if (!mObj.datesMap.has(dateKey)) {
        mObj.datesMap.set(dateKey, {
          label: dLabel,
          dayName,
          events: []
        });
      }

      mObj.datesMap.get(dateKey)!.events.push(ev);
    }

    const result: MonthGroup[] = [];
    const sortedMonthKeys = Array.from(monthsMap.keys()).sort((a, b) => b.localeCompare(a));

    for (const mKey of sortedMonthKeys) {
      const mObj = monthsMap.get(mKey)!;
      const sortedDateKeys = Array.from(mObj.datesMap.keys()).sort((a, b) => b.localeCompare(a));

      const dateGroups: DateGroup[] = sortedDateKeys.map(dKey => {
        const dObj = mObj.datesMap.get(dKey)!;
        return {
          key: dKey,
          label: dObj.label,
          dayName: dObj.dayName,
          count: dObj.events.length,
          events: dObj.events
        };
      });

      const totalCount = dateGroups.reduce((acc, dg) => acc + dg.count, 0);

      result.push({
        monthKey: mKey,
        monthLabel: mObj.monthLabel,
        isCurrentMonth: mObj.isCurrentMonth,
        totalCount,
        dateGroups
      });
    }

    return result;
  }, [filteredEvents]);

  // Synchronize default collapse for older months (past months are collapsed by default)
  useEffect(() => {
    if (!displayMonthGroups.length) return;
    setCollapsedMonths(prev => {
      const updated = { ...prev };
      displayMonthGroups.forEach(mg => {
        if (!mg.isCurrentMonth && updated[mg.monthKey] === undefined) {
          updated[mg.monthKey] = true; // Older months start collapsed!
        }
      });
      return updated;
    });
  }, [displayMonthGroups]);

  // Expand or collapse all months and dates
  const toggleAll = (collapse: boolean) => {
    const newMonths: Record<string, boolean> = {};
    const newDates: Record<string, boolean> = {};
    displayMonthGroups.forEach(mg => {
      newMonths[mg.monthKey] = collapse;
      mg.dateGroups.forEach(dg => {
        newDates[dg.key] = collapse;
      });
    });
    setCollapsedMonths(newMonths);
    setCollapsedDates(newDates);
  };

  // Export filtered events as CSV for Compliance Audit
  const exportTimelineAudit = () => {
    if (!filteredEvents.length) {
      toast.error('No events to export');
      return;
    }

    const headers = ['Timestamp', 'Category', 'Action', 'Title', 'Description', 'Actor', 'IP Address', 'Device', 'Status'];
    const rows = filteredEvents.map(e => [
      new Date(e.timestamp).toISOString(),
      e.category,
      e.action,
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.actorName || '').replace(/"/g, '""')}"`,
      e.ipAddress || '',
      `"${(e.os || '')} ${(e.browser || '')}"`,
      e.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Client_Timeline_${clientName || clientId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Activity audit log downloaded');
  };

  if (!isOpen) return null;

  // Category visual helper
  const getCategoryConfig = (category: string) => {
    switch (category) {
      case 'PAYMENT':
      case 'SUBSCRIPTION':
        return {
          icon: CreditCard,
          border: 'border-l-emerald-500',
          badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
          dot: 'bg-emerald-500'
        };
      case 'KYC_COMPLIANCE':
        return {
          icon: ShieldCheck,
          border: 'border-l-indigo-500',
          badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
          dot: 'bg-indigo-500'
        };
      case 'AUTH':
        return {
          icon: LogIn,
          border: 'border-l-sky-500',
          badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
          dot: 'bg-sky-500'
        };
      case 'STAFF_ACTION':
        return {
          icon: UserCheck,
          border: 'border-l-amber-500',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
          dot: 'bg-amber-500'
        };
      case 'SUPPORT':
        return {
          icon: LifeBuoy,
          border: 'border-l-rose-500',
          badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
          dot: 'bg-rose-500'
        };
      default:
        return {
          icon: Clock,
          border: 'border-l-slate-400',
          badge: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
          dot: 'bg-slate-400'
        };
    }
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHrs = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffSec < 60) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatMetadataValue = (key: string, val: any): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    const s = String(val).trim();
    if (s === 'CUSTOM_PRO_RATA') return 'Custom Plan (Adjusted Validity/Amount)';
    if (s === 'ONLINE_RAZORPAY' || s === 'RAZORPAY') return 'Online Payment (Razorpay)';
    if (s === 'ADMIN_ASSIGNED' || s === 'MANUAL_ADMIN') return 'Admin Manual Assignment';
    if (s === 'OFFLINE_BANK_TRANSFER' || s === 'BANK_TRANSFER' || s === 'NEFT' || s === 'RTGS') return 'Bank Transfer (NEFT/RTGS)';
    if (s === 'OFFLINE_UPI' || s === 'UPI') return 'UPI Transfer';
    if (s === 'OFFLINE_CHEQUE' || s === 'CHEQUE') return 'Cheque';
    if (s.includes('AADHAAR') || s.includes('MOCK') || s.includes('DIGIO')) {
      if (key.toLowerCase().includes('esign') || key.toLowerCase().includes('mode')) return 'Aadhaar eSign (Digio)';
    }
    if (s.startsWith('[PRO-RATA]')) {
      return s.replace(/^\[PRO-RATA\]\s*Assigned by Admin\s*-\s*/i, '').replace(/^\[PRO-RATA\]\s*/i, '').trim();
    }
    return s;
  };

  const formatMetadataKey = (key: string): string => {
    const map: Record<string, string> = {
      paymentMode: 'Payment Method',
      planName: 'Plan',
      planValidity: 'Plan Validity',
      plan: 'Plan',
      amount: 'Amount',
      transactionRef: 'Reference / UTR',
      assignedBy: 'Assigned By Staff',
      note: 'Staff Note',
      esignMode: 'eSign Method',
      agreementUrl: 'Agreement Document',
      receiptUrl: 'Receipt Document',
      pan: 'PAN Number',
      aadhaar: 'Aadhaar (Last 4)',
      verificationSource: 'Verification Provider'
    };
    if (map[key]) return map[key];
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const cleanDescription = (desc?: string): string => {
    if (!desc) return '';
    return desc
      .replace(/CUSTOM_PRO_RATA/g, 'Custom Plan (Adjusted Validity)')
      .replace(/ONLINE_RAZORPAY/g, 'Online (Razorpay)')
      .replace(/\[PRO-RATA\]\s*Assigned by Admin\s*-\s*/gi, '')
      .replace(/\[PRO-RATA\]\s*/gi, '');
  };

  const client = data?.clientSummary;
  const stats = data?.stats;
  const milestones = data?.milestones || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-2 sm:p-4 overflow-hidden">
      <div className="w-full max-w-5xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col h-[94vh] max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* 1. TOP HEADER WITH CLIENT PROFILE & KPIS */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
              {client?.name ? client.name.charAt(0).toUpperCase() : (clientName ? clientName.charAt(0).toUpperCase() : 'C')}
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {client?.name || clientName || 'Client Timeline'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    client?.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}
                >
                  {client?.status || 'PENDING'}
                </span>
                {client?.category && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                    • {client.category}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                {client?.email && <span>{client.email}</span>}
                {client?.mobile && <span>• {client.mobile}</span>}
                {client?.pan && (
                  <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                    PAN: {client.pan}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
            <button
              onClick={exportTimelineAudit}
              title="Download Compliance Audit CSV"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-white/10 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export Audit</span>
            </button>
            <button
              onClick={fetchTimeline}
              disabled={loading}
              title="Refresh Timeline"
              className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2. TOP METRICS STRIP (Instant At-A-Glance KPIs) */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-6 py-2.5 bg-slate-100/70 dark:bg-slate-900/40 border-b border-slate-200 dark:border-white/10 text-xs shrink-0">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Activities</span>
              <strong className="text-sm font-extrabold text-slate-900 dark:text-white">{stats.totalEvents}</strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Invested</span>
              <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                ₹{Number(stats.totalSpent || 0).toLocaleString('en-IN')}
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Active Plans</span>
              <strong className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                {client?.activeSubscriptions || 0} active
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Login Sessions</span>
              <strong className="text-sm font-extrabold text-sky-600 dark:text-sky-400">{stats.totalLogins} logins</strong>
            </div>
            <div className="col-span-2 sm:col-span-1 flex flex-col">
              <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Last Activity</span>
              <strong className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {stats.lastActive ? formatRelativeTime(stats.lastActive) : '—'}
              </strong>
            </div>
          </div>
        )}

        {/* 3. 5-STAGE MILESTONE ROADMAP STEPPER */}
        {milestones.length > 0 && (
          <div className="px-6 py-3.5 border-b border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                Client Lifecycle Roadmap
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {milestones.filter(m => m.completed).length} of 5 Completed
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 relative">
              {/* Connecting line behind icons */}
              <div className="absolute top-3.5 left-[10%] right-[10%] h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />

              {milestones.map((m, idx) => {
                const isDone = m.completed;
                const isCurrent = m.current;
                return (
                  <div key={m.key} className="flex flex-col items-center text-center relative z-10">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-sm ${
                        isDone
                          ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                          : isCurrent
                          ? 'bg-amber-500 text-white ring-4 ring-amber-500/20 animate-pulse'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      className={`text-[11px] font-bold mt-1.5 truncate max-w-full ${
                        isDone
                          ? 'text-slate-900 dark:text-white'
                          : isCurrent
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-slate-500'
                      }`}
                    >
                      {m.label}
                    </span>
                    <span className="text-[9px] text-slate-500 dark:text-slate-500 truncate max-w-full hidden sm:block">
                      {m.detail}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. FILTER CONTROLS & SEARCH (High-Density Anti-Scrolling Toolbar) */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'PAYMENT_SUBSCRIPTION', label: 'Payments & Plans' },
              { id: 'KYC_COMPLIANCE', label: 'KYC & eSign' },
              { id: 'AUTH', label: 'Logins & Auth' },
              { id: 'STAFF_ACTION', label: 'Staff Actions' },
              { id: 'SUPPORT', label: 'Support' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                  selectedCategory === cat.id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Bar & Accordion Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-grow sm:w-56">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search activities, IP, notes..."
                className="w-full pl-8 pr-3 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Expand / Collapse All Toggle */}
            <button
              onClick={() => {
                const areAllCollapsed = displayMonthGroups.every(mg => 
                  (!mg.isCurrentMonth && Boolean(collapsedMonths[mg.monthKey])) ||
                  mg.dateGroups.every(dg => Boolean(collapsedDates[dg.key]))
                );
                toggleAll(!areAllCollapsed);
              }}
              title="Expand or Collapse All Month & Date Sections"
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-white/10 flex items-center space-x-1 shrink-0"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden md:inline">
                {displayMonthGroups.every(mg => (!mg.isCurrentMonth && Boolean(collapsedMonths[mg.monthKey])) || mg.dateGroups.every(dg => Boolean(collapsedDates[dg.key]))) ? 'Expand All' : 'Collapse All'}
              </span>
            </button>
          </div>
        </div>

        {/* 5. TIMELINE BODY (Hierarchical Month -> Date -> Events Architecture) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Loading client audit trail & timeline...
              </p>
            </div>
          ) : displayMonthGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Activity Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 max-w-sm">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'No events match your search query or filter. Try clearing the filter.'
                  : 'No timeline events recorded yet for this client.'}
              </p>
              {(searchQuery || selectedCategory !== 'ALL') && (
                <button
                  onClick={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-3 px-3 py-1.5 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            displayMonthGroups.map(monthGroup => {
              const isMonthCollapsed = Boolean(collapsedMonths[monthGroup.monthKey]);

              return (
                <div key={monthGroup.monthKey} className="space-y-3">
                  {/* Current Month Banner OR Past Month Accordion Bar */}
                  {monthGroup.isCurrentMonth ? (
                    <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-600/10 via-indigo-600/10 to-transparent dark:from-primary-900/30 dark:via-indigo-900/20 dark:to-transparent backdrop-blur-md border border-primary-500/20 dark:border-primary-400/20 shadow-xs">
                      <div className="flex items-center space-x-2.5">
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-primary-800 dark:text-primary-200">
                          {monthGroup.monthLabel}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary-600 text-white shadow-xs">
                          Current Month • {monthGroup.totalCount} {monthGroup.totalCount === 1 ? 'activity' : 'activities'}
                        </span>
                      </div>

                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
                        Date-wise Breakdown
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => toggleMonthCollapse(monthGroup.monthKey)}
                      className="sticky top-0 z-30 flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-200/90 dark:bg-slate-800/90 backdrop-blur-md border border-slate-300 dark:border-white/10 cursor-pointer hover:bg-slate-300/80 dark:hover:bg-slate-700/80 transition shadow-sm"
                    >
                      <div className="flex items-center space-x-2.5">
                        {isMonthCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                        )}
                        <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {monthGroup.monthLabel}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-white/10">
                          {monthGroup.totalCount} {monthGroup.totalCount === 1 ? 'event' : 'events'}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                        {isMonthCollapsed ? 'Click to expand month' : 'Click to collapse month'}
                      </span>
                    </div>
                  )}

                  {/* Date Groups inside this Month */}
                  {(!monthGroup.isCurrentMonth && isMonthCollapsed) ? null : (
                    <div className={`space-y-3 ${monthGroup.isCurrentMonth ? '' : 'pl-3 sm:pl-4 border-l-2 border-slate-300 dark:border-slate-700 ml-2 mt-2'}`}>
                      {monthGroup.dateGroups.map(dateGroup => {
                        const isDateCollapsed = Boolean(collapsedDates[dateGroup.key]);

                        return (
                          <div key={dateGroup.key} className="space-y-2">
                            {/* Date Accordion Header Bar */}
                            <div
                              onClick={() => toggleDateCollapse(dateGroup.key)}
                              className="flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800/60 border border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition"
                            >
                              <div className="flex items-center space-x-2">
                                {isDateCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                )}
                                <Calendar className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                  {dateGroup.label}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                  ({dateGroup.dayName})
                                </span>
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                  {dateGroup.count} {dateGroup.count === 1 ? 'record' : 'records'}
                                </span>
                              </div>

                              <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">
                                {isDateCollapsed ? 'Click to expand date' : 'Click to collapse date'}
                              </span>
                            </div>

                            {/* Event Cards under this date */}
                            {!isDateCollapsed && (
                              <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                                {dateGroup.events.map((ev, eventIdx) => {
                                  const cfg = getCategoryConfig(ev.category);
                                  const Icon = cfg.icon;
                                  const isExpanded = Boolean(expandedDetails[ev.id]);
                                  const hasMetadata = ev.metadata && Object.keys(ev.metadata).length > 0;

                                  return (
                                    <div
                                      key={ev.id || `${dateGroup.key}_${eventIdx}`}
                                      className={`relative rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-850 p-3.5 shadow-sm transition hover:shadow-md border-l-4 ${cfg.border}`}
                                    >
                                      {/* Timeline dot */}
                                      <div
                                        className={`absolute -left-[19px] top-4 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${cfg.dot}`}
                                      />

                                      {/* Event Header with Bold Date & Time */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center space-x-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cfg.badge}`}>
                                            {ev.category.replace(/_/g, ' ')}
                                          </span>
                                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                            {cleanDescription(ev.title)}
                                          </h4>
                                        </div>

                                        {/* BOLD PROMINENT DATE & TIME BADGE */}
                                        <div className="flex items-center space-x-1.5 self-start sm:self-center bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 px-2.5 py-1 rounded-lg">
                                          <Calendar className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
                                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                                            {new Date(ev.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                          </span>
                                          <span className="text-slate-300 dark:text-slate-600 font-bold">•</span>
                                          <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                                          <span className="text-xs font-extrabold text-primary-700 dark:text-primary-300">
                                            {new Date(ev.timestamp).toLocaleTimeString('en-IN', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              hour12: true
                                            })}
                                          </span>
                                          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline ml-0.5">
                                            ({formatRelativeTime(ev.timestamp)})
                                          </span>
                                        </div>
                                      </div>

                                      {/* Event Description */}
                                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                        {cleanDescription(ev.description)}
                                      </p>

                                      {/* Technical & Actor Pills */}
                                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px]">
                                        {ev.actorName && (
                                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                                            By: <strong>{ev.actorName}</strong> ({ev.actorType || 'CLIENT'})
                                          </span>
                                        )}

                                        {ev.ipAddress && (
                                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono flex items-center gap-1">
                                            <Globe className="w-2.5 h-2.5 text-slate-400" />
                                            {ev.ipAddress}
                                          </span>
                                        )}

                                        {(ev.os || ev.browser) && (
                                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                            <Laptop className="w-2.5 h-2.5 text-slate-400" />
                                            {ev.os || 'OS'} • {ev.browser || 'Browser'}
                                          </span>
                                        )}

                                        {hasMetadata && (
                                          <button
                                            onClick={() => toggleEventDetail(ev.id)}
                                            className="ml-auto text-primary-600 dark:text-primary-400 hover:underline font-bold flex items-center gap-0.5"
                                          >
                                            <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                                            {isExpanded ? (
                                              <ChevronUp className="w-3 h-3" />
                                            ) : (
                                              <ChevronDown className="w-3 h-3" />
                                            )}
                                          </button>
                                        )}
                                      </div>

                                      {/* Expandable Metadata Drawer */}
                                      {isExpanded && hasMetadata && (
                                        <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-xs space-y-2">
                                          <div className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                                            Event Details & Audit Parameters
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                            <div className="flex flex-col bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-white/5">
                                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Exact Date & Time</span>
                                              <strong className="text-slate-900 dark:text-white font-mono text-[11px] truncate">
                                                {new Date(ev.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(ev.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                              </strong>
                                            </div>
                                            {Object.entries(ev.metadata || {}).map(([mKey, mVal]) => {
                                              if (mVal === null || mVal === undefined || mVal === '') return null;
                                              const displayKey = formatMetadataKey(mKey);
                                              const isUrl = typeof mVal === 'string' && (mVal.startsWith('http') || mVal.startsWith('/uploads'));
                                              const displayVal = formatMetadataValue(mKey, mVal);

                                              return (
                                                <div key={mKey} className="flex flex-col bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-white/5">
                                                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{displayKey}</span>
                                                  {isUrl ? (
                                                    <a
                                                      href={mVal}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="text-primary-600 dark:text-primary-400 font-semibold hover:underline flex items-center gap-1 mt-0.5 truncate"
                                                    >
                                                      <FileText className="w-3 h-3 shrink-0" />
                                                      <span className="truncate">View Document</span>
                                                      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                                    </a>
                                                  ) : (
                                                    <strong className="text-slate-900 dark:text-white font-mono text-[11px] truncate">
                                                      {displayVal}
                                                    </strong>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 6. MODAL FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs shrink-0">
          <div className="text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>SEBI Compliance & Audit Logging Enabled</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
