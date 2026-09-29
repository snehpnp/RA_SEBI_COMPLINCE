'use client';

import { useState, useEffect } from 'react';
import {
  Bell, Target, FileText, CreditCard, ShieldCheck,
  Loader2, CheckCircle2, ChevronRight, ExternalLink,
  Download, Clock, AlertTriangle, Sparkles, Filter, Check
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface NotificationsProps {
  onNavigateToTab?: (tab: string) => void;
  onRefreshUnreadCount?: () => void;
}

export default function Notifications({ onNavigateToTab, onRefreshUnreadCount }: NotificationsProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'SIGNAL' | 'REPORT' | 'ACCOUNT'>('ALL');
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifs = async () => {
    try {
      const res = await api.getClientNotifications();
      if (res.success) {
        setNotifications(res.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await api.markClientNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
      if (onRefreshUnreadCount) onRefreshUnreadCount();
      toast.success('All notifications marked as read');
    } catch (err: any) {
      toast.error('Failed to mark notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkSingleRead = async (id: string) => {
    try {
      await api.markClientNotificationsAsRead(id);
      setNotifications(prev => prev.map(n => (n.id === id || n._id === id) ? { ...n, isRead: true, read: true } : n));
      if (onRefreshUnreadCount) onRefreshUnreadCount();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredNotifications = notifications.filter(n => {
    const t = (n.type || '').toLowerCase();
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'SIGNAL') return t === 'signal' || t === 'alert' || t === 'update';
    if (activeFilter === 'REPORT') return t === 'report';
    if (activeFilter === 'ACCOUNT') return t === 'payment' || t === 'kyc' || t === 'account';
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead && !n.read && n.status !== 'READ').length;

  const formatTimestamp = (dateStr?: string | Date) => {
    if (!dateStr) return 'Recently';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recently';

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getReportUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return `${process.env.NEXT_PUBLIC_API_URL || api.getBaseUrl() + ''}${url}`;
  };

  return (
    <div className="space-y-6 font-sans text-slate-900 dark:text-white animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary-600/10 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center relative">
            <Bell className="w-6 h-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black">Trade &amp; Activity Notifications</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live alerts, market signals, trade updates, and research reports for your subscribed plans.
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="self-start sm:self-auto px-4 py-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/40 dark:hover:bg-primary-900/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            {markingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeFilter === 'ALL'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveFilter('SIGNAL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'SIGNAL'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>Trade Alerts &amp; Updates</span>
        </button>
        <button
          onClick={() => setActiveFilter('REPORT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'REPORT'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Research Reports</span>
        </button>
        <button
          onClick={() => setActiveFilter('ACCOUNT')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
            activeFilter === 'ACCOUNT'
              ? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Account &amp; Invoices</span>
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin mb-3" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Checking live notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-3">
              <Bell className="w-7 h-7 opacity-40" />
            </div>
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">No Notifications</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              You're all caught up! New trade alerts, updates, and research reports will appear here in real-time.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const isUnread = !n.isRead && !n.read && n.status !== 'READ';
            const type = (n.type || '').toLowerCase();
            const reportUrl = n.data?.reportUrl;
            const signalId = n.data?.signalId;

            return (
              <div
                key={n.id || n._id}
                className={`p-4 md:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isUnread
                    ? 'bg-blue-50/50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800/60 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  {/* Icon */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                      type === 'signal' || type === 'alert' || type === 'update'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : type === 'report'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : type === 'payment'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : type === 'kyc'
                        ? 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                        : 'bg-slate-500/15 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {type === 'signal' && <Target className="w-5 h-5" />}
                    {type === 'alert' && <AlertTriangle className="w-5 h-5" />}
                    {type === 'update' && <Sparkles className="w-5 h-5" />}
                    {type === 'report' && <FileText className="w-5 h-5" />}
                    {type === 'payment' && <CreditCard className="w-5 h-5" />}
                    {type === 'kyc' && <ShieldCheck className="w-5 h-5" />}
                    {!['signal', 'alert', 'update', 'report', 'payment', 'kyc'].includes(type) && (
                      <Bell className="w-5 h-5" />
                    )}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{n.title}</span>
                      {isUnread && (
                        <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full uppercase tracking-wider">
                          New
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1 ml-auto">
                        <Clock className="w-3 h-3" />
                        {formatTimestamp(n.createdAt)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">
                      {n.message}
                    </p>

                    {/* Stock Symbol Tag if available */}
                    {n.data?.stockSymbol && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-200 dark:border-white/10">
                          {n.data.stockSymbol}
                        </span>
                        {n.data.callType && (
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                            n.data.callType === 'BUY' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}>
                            {n.data.callType}
                          </span>
                        )}
                        {n.data.segment && (
                          <span className="text-[11px] text-slate-400 uppercase font-semibold">
                            {n.data.segment}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-white/5">
                  {/* Go to signals if signal notification */}
                  {(type === 'signal' || type === 'alert' || type === 'update' || signalId) && onNavigateToTab && (
                    <button
                      onClick={() => {
                        if (isUnread) handleMarkSingleRead(n.id || n._id);
                        onNavigateToTab('signals');
                      }}
                      className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <span>View Signal</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Download Report if report notification */}
                  {reportUrl && (
                    <a
                      href={getReportUrl(reportUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        if (isUnread) handleMarkSingleRead(n.id || n._id);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download PDF</span>
                    </a>
                  )}

                  {/* Mark as read tick button */}
                  {isUnread && (
                    <button
                      onClick={() => handleMarkSingleRead(n.id || n._id)}
                      className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                      title="Mark as read"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
