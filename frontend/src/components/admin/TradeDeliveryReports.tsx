import { executeSmartDownload } from '@/utils/smartDownload';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Send,
  Smartphone,
  Monitor,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  RefreshCcw,
  Download,
  Eye,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Phone,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  FileText,
  User,
  Users,
  Clock
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TradeDeliveryReportsProps {
  onBackToSignals?: () => void;
  initialChannel?: 'ALL' | 'TELEGRAM' | 'SMS' | 'INAPP';
  onChannelChange?: (channel: 'ALL' | 'TELEGRAM' | 'SMS' | 'INAPP') => void;
}

// Utility to cleanly strip HTML tags for CSV exports and previews
const stripHtml = (html: string = '') => {
  return html
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
};


// Sensitive data masking helpers
const maskEmail = (email: string | null | undefined) => {
  if (!email) return email || '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const maskedName = name.length > 2 ? name.substring(0, 2) + '*'.repeat(name.length - 2) : name + '*';
  return `${maskedName}@${parts[1]}`;
};

const maskMobile = (mobile: string | null | undefined) => {
  if (!mobile) return mobile || '';
  const clean = String(mobile).trim();
  const digits = clean.replace(/\D/g, '');
  if (digits.length >= 10) {
    const last2 = digits.slice(-2);
    const first2 = digits.slice(0, 2);
    return `${first2}${'*'.repeat(digits.length - 4)}${last2}`;
  }
  return clean.length > 4 ? clean.substring(0, 2) + '*'.repeat(clean.length - 4) + clean.substring(clean.length - 2) : '**********';
};

export default function TradeDeliveryReports({ onBackToSignals, initialChannel = 'ALL' }: TradeDeliveryReportsProps) {
  const activeChannel = initialChannel;

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL'); // ALL, ENTRY, EXIT
  const [selectedClient, setSelectedClient] = useState<string>('ALL');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [canViewSensitive, setCanViewSensitive] = useState<boolean>(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        const isFull = u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';
        const hasPerm = Array.isArray(u.permissions) && u.permissions.includes('VIEW_SENSITIVE_DATA');
        setCanViewSensitive(isFull || hasPerm);
      }
    } catch {
      setCanViewSensitive(true);
    }
  }, []);

  const formatMobile = (m: string | null | undefined) => canViewSensitive ? (m || '') : maskMobile(m);
  const formatEmail = (e: string | null | undefined) => canViewSensitive ? (e || '') : maskEmail(e);
  const formatRecipient = (r: string | null | undefined) => {
    if (!r) return '';
    if (canViewSensitive) return r;
    if (r.includes('@')) return maskEmail(r);
    if (/^\+?\d{10,14}$/.test(r.trim())) return maskMobile(r);
    return r;
  };
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);

  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [stats, setStats] = useState({
    totalDispatches: 0,
    telegramDelivered: 0,
    telegramFailed: 0,
    smsDelivered: 0,
    smsFailed: 0,
    inAppSent: 0
  });

  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [syncingDlr, setSyncingDlr] = useState(false);
  const [syncingLogId, setSyncingLogId] = useState<string | null>(null);

  // Configuration per channel
  const channelConfig = {
    ALL: {
      title: 'Trade Signal Multi-Channel Delivery Reports',
      subtitle: 'Combined SEBI compliant multi-channel dispatch tracking: Telegram DM, SMS Gateway & In-App panel feeds.',
      icon: Layers,
      badge: 'All Channels Combined',
      badgeColor: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
      exportLabel: 'Export All Channels CSV',
      filePrefix: 'trade-delivery-report-all'
    },
    TELEGRAM: {
      title: 'Telegram Bot Delivery Reports',
      subtitle: 'SEBI compliant tracking of direct 1-on-1 trade recommendations and exit updates delivered via Telegram Bot.',
      icon: Send,
      badge: 'Telegram Bot Only',
      badgeColor: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      exportLabel: 'Export Telegram Delivery CSV',
      filePrefix: 'trade-delivery-report-telegram'
    },
    SMS: {
      title: 'Text Msg (SMS) Delivery Reports',
      subtitle: 'SEBI compliant tracking of high-priority DLT verified SMS gateway trade dispatches sent to subscriber mobile numbers.',
      icon: Smartphone,
      badge: 'SMS Gateway Only',
      badgeColor: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      exportLabel: 'Export SMS Delivery CSV',
      filePrefix: 'trade-delivery-report-sms'
    },
    INAPP: {
      title: 'Panel Notifications Delivery Reports',
      subtitle: 'SEBI compliant tracking of real-time trade signals delivered directly to subscriber client web portals and dashboards.',
      icon: Monitor,
      badge: 'Panel / In-App Feeds Only',
      badgeColor: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      exportLabel: 'Export Panel Delivery CSV',
      filePrefix: 'trade-delivery-report-inapp'
    }
  }[activeChannel] || {
    title: 'Trade Signal Delivery Reports',
    subtitle: 'SEBI compliant trade delivery tracking.',
    icon: Layers,
    badge: 'Delivery Reports',
    badgeColor: 'bg-slate-500/15 text-slate-700 border-slate-500/30',
    exportLabel: 'Export CSV',
    filePrefix: 'trade-delivery-report'
  };

  // Load clients list for client-wise filter dropdown
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const res = await api.getAdminClients();
        if (res?.success && Array.isArray(res.data)) {
          setClientsList(res.data);
        } else if (Array.isArray(res)) {
          setClientsList(res);
        }
      } catch (err) {
        console.error('Failed to load clients list for filter:', err);
      }
    };
    fetchClients();
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getMasterDeliveryReport({
        page,
        limit,
        channel: activeChannel,
        status: statusFilter,
        search: searchQuery,
        clientId: selectedClient !== 'ALL' ? selectedClient : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      });

      if (res.success) {
        setReports(res.data || []);
        if (res.pagination) setPagination(res.pagination);
        if (res.stats) setStats(res.stats);
      } else {
        toast.error(res.message || 'Failed to load delivery reports');
      }
    } catch (err: any) {
      console.error('Error loading delivery reports:', err);
      toast.error(err.message || 'Error loading delivery reports');
    } finally {
      setLoading(false);
    }
  }, [page, limit, activeChannel, statusFilter, searchQuery, selectedClient, startDate, endDate]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Synchronize live DLR statuses from Pinnacle gateway for all recent SMS
  const handleSyncAllDlr = async () => {
    setSyncingDlr(true);
    try {
      const res: any = await api.syncSmsDeliveryReports();
      if (res?.success) {
        toast.success(res.message || 'SMS delivery reports synchronized from Pinnacle');
        await fetchReports();
      } else {
        toast.error(res?.message || 'Failed to sync SMS delivery reports');
      }
    } catch (err: any) {
      console.error('Error syncing SMS DLR:', err);
      toast.error(err.message || 'Failed to sync SMS delivery reports');
    } finally {
      setSyncingDlr(false);
    }
  };

  // Synchronize live DLR for a single SMS record
  const handleSyncSingleDlr = async (logId: string) => {
    setSyncingLogId(logId);
    try {
      const res: any = await api.syncSmsDeliveryReports(logId);
      if (res?.success) {
        toast.success('Live SMS delivery report fetched from Pinnacle gateway');
        await fetchReports();
        if (selectedRecord && selectedRecord.id === logId && res.data && res.data.length > 0) {
          const updated = res.data[0];
          setSelectedRecord((prev: any) => ({
            ...prev,
            status: updated.status,
            dlrCode: updated.dlrCode,
            dlrLabel: updated.label,
            dlrDescription: updated.description,
            failureReason: updated.status !== 'DELIVERED' ? updated.description : null
          }));
        }
      } else {
        toast.error(res?.message || 'Failed to fetch DLR');
      }
    } catch (err: any) {
      console.error('Error syncing single DLR:', err);
      toast.error(err.message || 'Failed to fetch DLR');
    } finally {
      setSyncingLogId(null);
    }
  };

  // Render status badge matching Pinnacle eZeeSMS URL API documentation
  const renderStatusBadge = (record: any) => {
    const isSms = record.channel === 'SMS';
    const status = record.status;
    const dlrCode = (record.dlrCode || '').toUpperCase();

    if (isSms) {
      if (dlrCode === 'DELIVRD' || status === 'DELIVERED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Delivered (DELIVRD)
          </span>
        );
      }
      if (dlrCode === 'PENDING' || status === 'PENDING') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> Pending DLR (PENDING)
          </span>
        );
      }
      if (dlrCode === 'REJECTD' || dlrCode === 'REJECTED' || status === 'REJECTED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Rejected (REJECTD)
          </span>
        );
      }
      if (dlrCode === 'UNDELIV' || status === 'UNDELIVERED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Undelivered (UNDELIV)
          </span>
        );
      }
      if (dlrCode === 'EXPIRED' || status === 'EXPIRED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <AlertCircle className="w-3 h-3" /> Expired (EXPIRED)
          </span>
        );
      }
      if (dlrCode === 'NCPR' || status === 'NCPR_DND') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <ShieldAlert className="w-3 h-3" /> DND Blocked (NCPR)
          </span>
        );
      }
      if (status === 'SKIPPED_CLIENT_DISABLED' || status === 'SKIPPED') {
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" /> Opted Out
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    }

    // Telegram & In-App channels
    if (status === 'DELIVERED' || status === 'SENT') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" /> Delivered
        </span>
      );
    }
    if (status === 'SKIPPED_CLIENT_DISABLED' || status === 'SKIPPED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          <AlertCircle className="w-3 h-3" /> Opted Out
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3" /> Failed
      </span>
    );
  };

  // Client-side action filter (ENTRY vs EXIT)
  const filteredReports = reports.filter(r => {
    if (actionFilter === 'ALL') return true;
    const isExit = r.tradeAction === 'EXIT' || r.action === 'TRADE_UPDATE';
    return actionFilter === 'EXIT' ? isExit : !isExit;
  });

  // Export comprehensive reports to CSV with full trade lifecycle details
  const handleExportCsv = async () => {
    if (filteredReports.length === 0) {
      toast('No records available to export.');
      return;
    }

    const headers = [
      'Timestamp',
      'Action (ENTRY/EXIT)',
      'Signal Type',
      'Stock Symbol',
      'Segment',
      'Call Type',
      'Entry Price',
      'Target 1',
      'Target 2',
      'Target 3',
      'Stop Loss',
      'Exit Price',
      'Close Status',
      'Close Remark',
      'Plan Name',
      'Client Name',
      'Client Mobile',
      'Client Email',
      'Telegram Chat ID',
      'Dispatch Channel',
      'Pinnacle Schedule ID',
      'Telecom DLR Code',
      'Telecom Status Description',
      'Delivery Status',
      'Dispatched Message Body',
      'Failure / Skip Reason'
    ];

    const rows = filteredReports.map((r: any) => {
      const isExit = r.tradeAction === 'EXIT' || r.action === 'TRADE_UPDATE';
      const cleanMsg = stripHtml(r.message || '');
      return [
        `"${new Date(r.createdAt).toLocaleString('en-IN')}"`,
        `"${isExit ? 'EXIT' : 'ENTRY'}"`,
        `"${isExit ? 'Trade Exit / Update' : 'New Trade Recommendation'}"`,
        `"${r.stockSymbol || ''}"`,
        `"${r.segment || ''}"`,
        `"${r.callType || ''}"`,
        `"${r.entryPrice ?? ''}"`,
        `"${r.target1 ?? ''}"`,
        `"${r.target2 ?? ''}"`,
        `"${r.target3 ?? ''}"`,
        `"${r.stoploss ?? ''}"`,
        `"${r.exitPrice ?? ''}"`,
        `"${r.closeStatus || (isExit ? 'CLOSED' : 'OPEN')}"`,
        `"${(r.closeRemark || '').replace(/"/g, '""')}"`,
        `"${(r.planName || '').replace(/"/g, '""')}"`,
        `"${(r.clientName || '').replace(/"/g, '""')}"`,
        `"${formatMobile(r.clientMobile || '')}"`,
        `"${formatEmail(r.clientEmail || '')}"`,
        `"${r.telegramChatId || ''}"`,
        `"${r.channel || ''}"`,
        `"${r.scheduleId || ''}"`,
        `"${r.dlrCode || ''}"`,
        `"${(r.dlrDescription || '').replace(/"/g, '""')}"`,
        `"${r.status || ''}"`,
        `"${cleanMsg.replace(/"/g, '""')}"`,
        `"${(r.failureReason || '').replace(/"/g, '""')}"`
      ];
    });

    // Add UTF-8 BOM so Excel opens with proper character rendering
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const clientSuffix = selectedClient !== 'ALL' ? `-client-${selectedClient.slice(-6)}` : '';
    await executeSmartDownload({
      blob,
      fileName: `${channelConfig.filePrefix}${clientSuffix}-${new Date().toISOString().split('T')[0]}.csv`,
      documentType: channelConfig.title
    });
  };

  const copyMessageToClipboard = (text: string) => {
    const clean = stripHtml(text);
    navigator.clipboard.writeText(clean);
    setCopiedMessage(true);
    toast.success('Message content copied to clipboard');
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  // Find currently selected client object if filtered
  const activeClientObj = clientsList.find(c => (c._id || c.id) === selectedClient);
  const ChannelIcon = channelConfig.icon;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 dark:bg-[#151c2c]/80 border border-slate-700 dark:border-white/10 rounded-2xl p-6 backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shadow-md ${
              activeChannel === 'TELEGRAM' ? 'bg-sky-500/20 text-sky-400' :
              activeChannel === 'SMS' ? 'bg-indigo-500/20 text-indigo-400' :
              activeChannel === 'INAPP' ? 'bg-amber-500/20 text-amber-400' :
              'bg-lime-500/20 text-lime-400'
            }`}>
              <ChannelIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {channelConfig.title}
                </h2>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${channelConfig.badgeColor}`}>
                  {channelConfig.badge}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {channelConfig.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToSignals && (
            <button
              onClick={onBackToSignals}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-400 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition"
            >
              Back to Signals
            </button>
          )}
          <button
            onClick={() => fetchReports()}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white border border-slate-300 dark:border-white/10 flex items-center gap-1.5 transition disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleSyncAllDlr}
            disabled={syncingDlr || loading}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            title="Fetch real-time telecom delivery report (DELIVRD, REJECTD, EXPIRED, etc.) from Pinnacle SMS Gateway"
          >
            <RefreshCcw className={`w-3.5 h-3.5 ${syncingDlr ? 'animate-spin' : ''}`} />
            {syncingDlr ? 'Syncing DLR...' : 'Sync SMS DLR'}
          </button>
          <button
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#d4f23b] text-black hover:bg-[#c3e031] flex items-center gap-1.5 shadow-md shadow-[#d4f23b]/10 transition"
          >
            <Download className="w-3.5 h-3.5" />
            {channelConfig.exportLabel}
          </button>
        </div>
      </div>

      {/* KPI Stats Cards - Channel Focused */}
      {activeChannel === 'ALL' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-100 dark:bg-[#1A2235]/60 border border-slate-300 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Total Dispatches</span>
              <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {stats.totalDispatches.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Across all delivery channels</div>
          </div>

          <div className="bg-slate-100 dark:bg-[#1A2235]/60 border border-slate-300 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              <span>Telegram Bot</span>
              <Send className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-baseline gap-2">
              <span className="text-emerald-700 dark:text-emerald-400">{stats.telegramDelivered.toLocaleString()}</span>
              {stats.telegramFailed > 0 && (
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">/ {stats.telegramFailed} failed</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Direct 1-on-1 DM via Bot</div>
          </div>

          <div className="bg-slate-100 dark:bg-[#1A2235]/60 border border-slate-300 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              <span>SMS Alerts</span>
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2 flex items-baseline gap-2">
              <span className="text-emerald-700 dark:text-emerald-400">{stats.smsDelivered.toLocaleString()}</span>
              {stats.smsFailed > 0 && (
                <span className="text-xs font-bold text-rose-700 dark:text-rose-400">/ {stats.smsFailed} failed</span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">DLT Verified Gateway</div>
          </div>

          <div className="bg-slate-100 dark:bg-[#1A2235]/60 border border-slate-300 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <span>Panel Notifications</span>
              <Monitor className="w-4 h-4" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {stats.inAppSent.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">In-App Live Feeds</div>
          </div>
        </div>
      )}

      {activeChannel === 'TELEGRAM' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
              <span>Telegram Total Sent</span>
              <Send className="w-4 h-4 text-sky-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {(stats.telegramDelivered + stats.telegramFailed).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Total 1-on-1 bot messages dispatched</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <span>Telegram Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
              {stats.telegramDelivered.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Confirmed received in client chat</div>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              <span>Telegram Failed / Missing ID</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-2">
              {stats.telegramFailed.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Chat ID not linked or bot blocked</div>
          </div>
        </div>
      )}

      {activeChannel === 'SMS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
              <span>SMS Total Sent</span>
              <Smartphone className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {(stats.smsDelivered + stats.smsFailed).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">DLT registered SMS alerts</div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              <span>SMS Delivered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-2">
              {stats.smsDelivered.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Delivered to mobile network</div>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider">
              <span>SMS Failed / Undelivered</span>
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-2">
              {stats.smsFailed.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Invalid number or gateway issue</div>
          </div>
        </div>
      )}

      {activeChannel === 'INAPP' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              <span>Panel Notifications Sent</span>
              <Monitor className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {stats.inAppSent.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Live in-app feed alerts dispatched</div>
          </div>

          <div className="bg-slate-100 dark:bg-[#1A2235]/60 border border-slate-300 dark:border-white/5 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              <span>Active Feed Status</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              100% Active
            </div>
            <div className="text-[11px] text-slate-500 mt-1">WebSocket &amp; In-App feeds online</div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-[#151c2c]/60 border border-slate-300 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
        {/* Dedicated Channel Header Banner (NO INNER SWITCHING TABS) */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1A2235]/40">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${channelConfig.badgeColor}`}>
              <ChannelIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {channelConfig.title}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${channelConfig.badgeColor}`}>
                  {channelConfig.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                {channelConfig.subtitle}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/5 shadow-xs">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredReports.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{pagination.total}</span> records
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by stock symbol, client name, mobile, email, chat ID..."
              className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-lime-500 transition"
            />
          </div>

          {/* Client-wise Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Client:
            </span>
            <select
              value={selectedClient}
              onChange={e => {
                setSelectedClient(e.target.value);
                setPage(1);
              }}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-lime-500 font-semibold max-w-[200px]"
            >
              <option value="ALL">All Clients {clientsList.length > 0 ? `(${clientsList.length})` : ''}</option>
              {clientsList.map((c: any) => {
                const cId = c._id || c.id;
                const cName = c.name || (c.userId ? `${c.userId.firstName || ''} ${c.userId.lastName || ''}`.trim() : null) || c.email || 'Client';
                const cPhone = c.mobile || '';
                return (
                  <option key={cId} value={cId}>
                    {cName} {cPhone ? `(${cPhone})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Trade Action Filter (ENTRY vs EXIT) */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Action:</span>
            <select
              value={actionFilter}
              onChange={e => setActionFilter(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-lime-500 font-semibold"
            >
              <option value="ALL">All Actions (Entry & Exit)</option>
              <option value="ENTRY">🟢 Trade Entry (New Reco)</option>
              <option value="EXIT">🔴 Trade Exit / Update</option>
            </select>
          </div>

          {/* Delivery Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-lime-500 font-semibold"
            >
              <option value="ALL">All Delivery Statuses</option>
              <option value="DELIVERED">✅ Delivered (DELIVRD)</option>
              <option value="PENDING">⏳ Pending DLR (PENDING)</option>
              <option value="REJECTED">🚫 Rejected (REJECTD)</option>
              <option value="UNDELIVERED">❌ Undelivered (UNDELIV)</option>
              <option value="EXPIRED">⌛ Expired (EXPIRED)</option>
              <option value="NCPR_DND">🛡️ DND Blocked (NCPR)</option>
              <option value="FAILED">⚠️ Failed (Gateway Error)</option>
              <option value="SKIPPED_CLIENT_DISABLED">⛔ Opted Out (Client)</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
              title="Start Date"
            />
            <span className="text-slate-400 text-xs">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-slate-800 dark:text-white"
              title="End Date"
            />
          </div>

          {(searchQuery || statusFilter !== 'ALL' || actionFilter !== 'ALL' || selectedClient !== 'ALL' || startDate || endDate) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setActionFilter('ALL');
                setSelectedClient('ALL');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Selected Client Indicator Banner */}
        {selectedClient !== 'ALL' && activeClientObj && (
          <div className="px-5 py-2.5 bg-lime-500/10 border-b border-lime-500/20 flex items-center justify-between text-xs text-lime-800 dark:text-lime-300">
            <div className="flex items-center gap-2 font-bold">
              <Users className="w-4 h-4 text-lime-600 dark:text-[#d4f23b]" />
              <span>
                Filtering {channelConfig.badge} for subscriber: <span className="underline">{activeClientObj.name || activeClientObj.email}</span>
                {activeClientObj.mobile && ` (Phone: ${activeClientObj.mobile})`}
              </span>
            </div>
            <button
              onClick={() => setSelectedClient('ALL')}
              className="text-xs font-semibold text-lime-700 dark:text-lime-400 hover:underline"
            >
              Show All Subscribers
            </button>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCcw className="w-6 h-6 animate-spin text-lime-500" />
              <p className="text-xs">Loading {channelConfig.title}...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-bold">No {channelConfig.title} records found matching your filters.</p>
              <p className="text-xs text-slate-400 mt-1">
                Dispatches will appear here whenever trades are created or closed.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200 dark:border-white/5 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Trade Lifecycle</th>
                  <th className="py-3 px-4">Stock & Levels</th>
                  <th className="py-3 px-4">Subscriber Details</th>
                  <th className="py-3 px-4">Plan Name</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Status & Dispatch Message</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                {filteredReports.map((row: any) => {
                  const isDelivered = row.status === 'DELIVERED' || row.status === 'SENT';
                  const isFailed = row.status === 'FAILED' || row.status === 'REJECTED' || row.status === 'ERROR';
                  const isOptedOut = row.status === 'SKIPPED_CLIENT_DISABLED' || row.status === 'SKIPPED';
                  const isExit = row.tradeAction === 'EXIT' || row.action === 'TRADE_UPDATE';
                  const messagePreview = stripHtml(row.message || '');

                  return (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {new Date(row.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      </td>

                      {/* Trade Lifecycle Action (ENTRY vs EXIT) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isExit ? (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                              <ArrowDownRight className="w-3.5 h-3.5" />
                              TRADE EXIT
                            </span>
                            <div className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {row.closeStatus ? (
                                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 uppercase text-[9px]">
                                  {row.closeStatus}
                                </span>
                              ) : 'CLOSED'}
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-extrabold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              TRADE ENTRY
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                              New Recommendation
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Stock & Levels */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 dark:text-white tracking-tight">
                            {row.stockSymbol}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                              row.callType === 'BUY'
                                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                            }`}
                          >
                            {row.callType}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                            {row.segment}
                          </span>
                        </div>

                        {/* Price & Levels info */}
                        <div className="text-[11px] mt-1 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          {isExit ? (
                            <>
                              <span className="font-semibold text-rose-600 dark:text-rose-400">
                                Exit: ₹{row.exitPrice ?? 'N/A'}
                              </span>
                              {row.entryPrice && (
                                <span className="text-slate-400 text-[10px]">
                                  (Entry: ₹{row.entryPrice})
                                </span>
                              )}
                              {row.closeRemark && (
                                <span className="text-[10px] text-slate-500 max-w-[150px] truncate" title={row.closeRemark}>
                                  • {row.closeRemark}
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                Entry: ₹{row.entryPrice ?? 'N/A'}
                              </span>
                              {row.target1 && (
                                <span className="text-slate-500 text-[10px]">
                                  T1: ₹{row.target1}
                                </span>
                              )}
                              {row.stoploss && (
                                <span className="text-rose-500 text-[10px]">
                                  SL: ₹{row.stoploss}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>

                      {/* Subscriber Details (Name, Mobile, Email) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          {row.clientName}
                        </div>
                        {row.clientMobile ? (
                          <div className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>{formatMobile(row.clientMobile)}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">No mobile recorded</div>
                        )}
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="max-w-[180px] truncate">{formatEmail(row.clientEmail) || formatRecipient(row.recipient)}</span>
                        </div>
                      </td>

                      {/* Plan */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-white/5 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/10">
                          {row.planName || 'Active Plan'}
                        </span>
                      </td>

                      {/* Channel */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {row.channel === 'TELEGRAM' && (
                          <div className="inline-flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                              <Send className="w-3 h-3" /> Telegram Bot
                            </span>
                            {row.telegramChatId ? (
                              <span className="text-[9px] text-slate-500 font-mono">
                                Chat ID: {row.telegramChatId}
                              </span>
                            ) : (
                              <span className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold">
                                No Chat ID
                              </span>
                            )}
                          </div>
                        )}
                        {row.channel === 'SMS' && (
                          <div className="inline-flex flex-col items-start gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                              <Smartphone className="w-3 h-3" /> SMS Gateway
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {formatMobile(row.clientMobile) || formatRecipient(row.recipient)}
                            </span>
                            {row.scheduleId && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[8.5px] text-slate-400 font-mono" title={`Pinnacle Schedule ID: ${row.scheduleId}`}>
                                  ID: {row.scheduleId.split('-')[0]}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSyncSingleDlr(row.id);
                                  }}
                                  disabled={syncingLogId === row.id}
                                  className="text-[8.5px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold"
                                  title="Check Live DLR with Pinnacle"
                                >
                                  <RefreshCcw className={`w-2.5 h-2.5 ${syncingLogId === row.id ? 'animate-spin' : ''}`} />
                                  Check
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {row.channel === 'INAPP' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            <Monitor className="w-3 h-3" /> Panel / In-App
                          </span>
                        )}
                      </td>

                      {/* Status & Message Body Preview */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {renderStatusBadge(row)}
                        </div>

                        {row.channel === 'SMS' && row.dlrDescription && row.status !== 'DELIVERED' && (
                          <div className="text-[9.5px] text-rose-600 dark:text-rose-400 font-medium leading-tight mb-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                            Telecom: {row.dlrDescription}
                          </div>
                        )}

                        {messagePreview ? (
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed" title={messagePreview}>
                            "{messagePreview}"
                          </p>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No message body</span>
                        )}

                        {(isFailed || isOptedOut) && row.failureReason && row.failureReason !== row.dlrDescription && (
                          <div className="text-[9.5px] text-rose-600 dark:text-rose-400 font-semibold truncate max-w-[260px] mt-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded" title={row.failureReason}>
                            ⚠️ {row.failureReason}
                          </div>
                        )}
                      </td>

                      {/* View Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedRecord(row)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition font-bold text-[11px] inline-flex items-center gap-1.5 shadow-sm"
                          title="View Complete Dispatched Signal & Log"
                        >
                          <Eye className="w-3.5 h-3.5 text-lime-600 dark:text-[#d4f23b]" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
            <div>
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(prev => Math.min(pagination.totalPages, prev + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail / Dispatched Content Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#151c2c] border border-slate-300 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5 bg-slate-100 dark:bg-[#1A2235]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-lime-500/10 text-lime-600 dark:text-[#d4f23b] flex items-center justify-center">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{selectedRecord.stockSymbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-slate-600 dark:text-slate-300">
                      {selectedRecord.segment} • {selectedRecord.callType}
                    </span>
                    {(selectedRecord.tradeAction === 'EXIT' || selectedRecord.action === 'TRADE_UPDATE') ? (
                      <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                        TRADE EXIT
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                        TRADE ENTRY
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Dispatched on {new Date(selectedRecord.createdAt).toLocaleString('en-IN')} via {selectedRecord.channel}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 overflow-y-auto text-xs text-slate-700 dark:text-slate-300">
              {/* Trade Price & Levels Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/5 space-y-2">
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Signal Parameters & Price Levels
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500">Entry Price:</span>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      ₹{selectedRecord.entryPrice ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Target 1 / 2:</span>
                    <p className="font-extrabold text-slate-900 dark:text-white">
                      ₹{selectedRecord.target1 ?? 'N/A'} {selectedRecord.target2 ? `/ ₹${selectedRecord.target2}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Stop Loss:</span>
                    <p className="font-extrabold text-rose-600 dark:text-rose-400">
                      ₹{selectedRecord.stoploss ?? 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500">Exit Price:</span>
                    <p className="font-extrabold text-amber-600 dark:text-amber-400">
                      {selectedRecord.exitPrice ? `₹${selectedRecord.exitPrice}` : 'Open (Not Closed)'}
                    </p>
                  </div>
                </div>

                {(selectedRecord.closeStatus || selectedRecord.closeRemark) && (
                  <div className="pt-2 border-t border-slate-200 dark:border-white/5 grid grid-cols-2 gap-3 text-[11px]">
                    <div>
                      <span className="text-[10px] text-slate-500">Close Status:</span>
                      <p className="font-bold text-slate-900 dark:text-white uppercase">{selectedRecord.closeStatus || 'CLOSED'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Exit Remark:</span>
                      <p className="font-bold text-slate-900 dark:text-white">{selectedRecord.closeRemark || 'N/A'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Subscriber Details Card */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-white/5">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Subscriber Name</span>
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedRecord.clientName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Mobile Number</span>
                  <p className="font-bold font-mono text-slate-900 dark:text-white flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-500" />
                    {formatMobile(selectedRecord.clientMobile) || 'N/A'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Email Address</span>
                  <p className="font-medium text-slate-700 dark:text-slate-300 truncate" title={selectedRecord.clientEmail}>
                    {formatEmail(selectedRecord.clientEmail) || formatRecipient(selectedRecord.recipient)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Service Plan</span>
                  <p className="font-bold text-slate-900 dark:text-white">{selectedRecord.planName}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Channel & Target</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {selectedRecord.channel} {selectedRecord.telegramChatId ? `(Chat ID: ${selectedRecord.telegramChatId})` : ''}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-black">Delivery Status</span>
                  <div className="mt-0.5">
                    {renderStatusBadge(selectedRecord)}
                  </div>
                </div>
              </div>

              {/* Pinnacle SMS Delivery Report (DLR) Details Card */}
              {selectedRecord.channel === 'SMS' && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-xl border border-indigo-200 dark:border-indigo-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>Pinnacle eZeeSMS Delivery Report (DLR)</span>
                          <span className="text-[9px] px-2 py-0.2 rounded-full font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                            Telecom Operator Verified
                          </span>
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          SEBI compliance tracking matching Pinnacle URL API specification (response.php)
                        </p>
                      </div>
                    </div>
                    {selectedRecord.scheduleId && 
                     selectedRecord.status !== 'DELIVERED' && 
                     String(selectedRecord.dlrCode || '').toUpperCase() !== 'DELIVRD' && (
                      <button
                        onClick={() => handleSyncSingleDlr(selectedRecord.id)}
                        disabled={syncingLogId === selectedRecord.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition disabled:opacity-50"
                        title="Query Pinnacle live response.php endpoint"
                      >
                        <RefreshCcw className={`w-3 h-3 ${syncingLogId === selectedRecord.id ? 'animate-spin' : ''}`} />
                        {syncingLogId === selectedRecord.id ? 'Checking...' : 'Check Live DLR Now'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2.5 border-t border-indigo-200/60 dark:border-indigo-500/20 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Pinnacle Schedule ID</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white select-all text-[11px] mt-0.5">
                        {selectedRecord.scheduleId || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Telecom Status Code</span>
                      <div className="mt-0.5">
                        {renderStatusBadge(selectedRecord)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">Recipient Mobile</span>
                      <p className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                        {formatMobile(selectedRecord.clientMobile) || formatRecipient(selectedRecord.recipient)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-black/30 p-3 rounded-lg border border-indigo-100 dark:border-white/5 space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1">
                      <span className="text-slate-500 font-semibold">Documentation Definition:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-200">
                        {selectedRecord.dlrDescription || (selectedRecord.status === 'DELIVERED' ? 'Message successfully delivered to handset' : (selectedRecord.failureReason || 'Status reported by telecom operator'))}
                      </span>
                    </div>
                    {selectedRecord.dlrRawResponse && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] gap-1 pt-1 border-t border-slate-200/50 dark:border-white/5">
                        <span className="text-slate-500 font-semibold">Raw Gateway String:</span>
                        <code className="text-[10.5px] font-mono font-bold text-indigo-700 dark:text-indigo-300">
                          {selectedRecord.dlrRawResponse}
                        </code>
                      </div>
                    )}
                    {selectedRecord.dlrCheckedAt && (
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200/50 dark:border-white/5">
                        <span>Last Verified with Telecom:</span>
                        <span>{new Date(selectedRecord.dlrCheckedAt).toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Failure Error Notice */}
              {selectedRecord.failureReason && (
                <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400">
                  <div className="font-bold flex items-center gap-1.5 mb-1">
                    <ShieldAlert className="w-4 h-4" /> Failure / Rejection Reason:
                  </div>
                  <p className="text-[11px] font-mono leading-relaxed">{selectedRecord.failureReason}</p>
                </div>
              )}

              {/* Actual Dispatched Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    Exact Message Dispatched to Subscriber
                  </span>
                  {selectedRecord.message && (
                    <button
                      onClick={() => copyMessageToClipboard(selectedRecord.message)}
                      className="text-[10px] text-lime-600 dark:text-[#d4f23b] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedMessage ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedMessage ? 'Copied' : 'Copy Message'}
                    </button>
                  )}
                </div>
                <div
                  className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-300 dark:border-white/10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto text-slate-800 dark:text-slate-200 select-text"
                  dangerouslySetInnerHTML={{ __html: selectedRecord.message || '<i class="text-slate-400">No message content recorded.</i>' }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-[#1A2235] flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-mono">
                Log ID: {selectedRecord.id}
              </span>
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-200 dark:bg-white/10 hover:bg-slate-300 dark:hover:bg-white/20 text-slate-800 dark:text-white font-bold rounded-xl text-xs transition"
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
