'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Bell,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Lock,
  Layers,
  CheckCircle2,
  RefreshCw,
  Unlink,
  MessageSquare,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TelegramGroupItem {
  planId: string;
  planName: string;
  description?: string;
  price?: number;
  durationMonths?: number;
  researchSegments?: string;
  telegramChatId?: string | null;
  telegramInviteLink?: string | null;
  telegramGroupName?: string | null;
  subscriptionId?: string;
  subscriptionStatus?: string;
  startDate?: string;
  endDate?: string;
  isConfigured?: boolean;
}

interface TelegramAccountStatus {
  isLinked: boolean;
  telegramChatId: string | null;
  telegramUsername: string | null;
  telegramLinkedAt: string | null;
}

interface TelegramConnectCardProps {
  compact?: boolean;
  className?: string;
  onNavigateToPlans?: () => void;
}

export default function TelegramConnectCard({
  compact = false,
  className = '',
  onNavigateToPlans
}: TelegramConnectCardProps) {
  const [groups, setGroups] = useState<TelegramGroupItem[]>([]);
  const [hasSubscription, setHasSubscription] = useState<boolean>(false);
  const [defaultInviteLink, setDefaultInviteLink] = useState<string | null>(null);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [accountStatus, setAccountStatus] = useState<TelegramAccountStatus>({
    isLinked: false,
    telegramChatId: null,
    telegramUsername: null,
    telegramLinkedAt: null
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [linking, setLinking] = useState<boolean>(false);
  const [unlinking, setUnlinking] = useState<boolean>(false);
  const [joiningPlanId, setJoiningPlanId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupsRes, linkRes, statusRes] = await Promise.all([
        api.getClientTelegramGroups().catch(() => ({ success: false, data: null })),
        api.getTelegramInviteLink().catch(() => ({ success: false, data: null })),
        api.getClientTelegramStatus().catch(() => ({ success: false, data: null }))
      ]);

      const subscribedList: TelegramGroupItem[] = groupsRes?.data?.subscribedGroups || [];
      const hasActiveSub = Boolean(groupsRes?.data?.hasActiveSubscription || subscribedList.length > 0);
      const fallbackLink = groupsRes?.data?.defaultInviteLink || linkRes?.data?.inviteLink || 'https://t.me/Complince_signal_bot';

      setGroups(subscribedList);
      setHasSubscription(hasActiveSub);
      setDefaultInviteLink(fallbackLink);

      if (statusRes?.success && statusRes.data) {
        setAccountStatus(statusRes.data);
      }
    } catch (err) {
      console.warn('Error loading Telegram data:', err);
      setDefaultInviteLink('https://t.me/Complince_signal_bot');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const activeGroup = groups[selectedGroupIndex] || (groups.length > 0 ? groups[0] : null);
  const effectiveInviteLink = activeGroup?.telegramInviteLink || defaultInviteLink || 'https://t.me/Complince_signal_bot';

  const handleCopy = (linkToCopy: string, id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!linkToCopy) return;
    navigator.clipboard.writeText(linkToCopy);
    setCopiedId(id);
    toast.success('Telegram group link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Redirect to Telegram Bot with plan token for 1-tap channel button
  const handleJoinPlan = async (grp: TelegramGroupItem) => {
    try {
      setJoiningPlanId(grp.planId || 'active');
      toast.loading(`Opening Telegram Bot for ${grp.planName}...`, { id: 'join-tg' });

      const res = await api.generateClientTelegramToken(grp.planId);
      if (res.success && res.data?.deepLink) {
        toast.success(`Redirecting to Telegram Bot... Click START to enter ${grp.planName} channel!`, { id: 'join-tg' });
        window.open(res.data.deepLink, '_blank', 'noopener,noreferrer');

        // Poll for linking status in background
        let pollCount = 0;
        const interval = setInterval(async () => {
          pollCount++;
          if (pollCount > 10) {
            clearInterval(interval);
            return;
          }
          try {
            const statusRes = await api.getClientTelegramStatus();
            if (statusRes?.success && statusRes.data?.isLinked) {
              setAccountStatus(statusRes.data);
              clearInterval(interval);
            }
          } catch {}
        }, 3000);
        return;
      }

      // Fallback
      toast.dismiss('join-tg');
      const fallbackLink = grp.telegramInviteLink || defaultInviteLink || 'https://t.me/Complince_signal_bot';
      window.open(fallbackLink, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      toast.dismiss('join-tg');
      const fallbackLink = grp.telegramInviteLink || defaultInviteLink || 'https://t.me/Complince_signal_bot';
      window.open(fallbackLink, '_blank', 'noopener,noreferrer');
    } finally {
      setJoiningPlanId(null);
    }
  };

  // Connect Telegram Account via /start <token> Flow
  const handleConnectTelegramAccount = async () => {
    try {
      setLinking(true);
      const res = await api.generateClientTelegramToken();
      if (!res.success || !res.data?.deepLink) {
        toast.error(res.message || 'Failed to initiate Telegram connection. Please try again.');
        return;
      }

      toast.success('Redirecting to Telegram Bot to connect your account...');
      window.open(res.data.deepLink, '_blank', 'noopener,noreferrer');

      // Poll for 30 seconds to automatically detect when linking succeeds
      let pollCount = 0;
      const interval = setInterval(async () => {
        pollCount++;
        if (pollCount > 10) {
          clearInterval(interval);
          return;
        }
        try {
          const statusRes = await api.getClientTelegramStatus();
          if (statusRes?.success && statusRes.data?.isLinked) {
            setAccountStatus(statusRes.data);
            toast.success('Telegram account connected successfully!');
            clearInterval(interval);
          }
        } catch {}
      }, 3000);
    } catch (err: any) {
      toast.error(err.message || 'Error connecting Telegram account');
    } finally {
      setLinking(false);
    }
  };

  // Unlink Telegram Account
  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account? You will stop receiving direct signal DMs.')) {
      return;
    }

    try {
      setUnlinking(true);
      const res = await api.unlinkClientTelegram();
      if (res.success) {
        setAccountStatus({
          isLinked: false,
          telegramChatId: null,
          telegramUsername: null,
          telegramLinkedAt: null
        });
        toast.success('Telegram account unlinked.');
      } else {
        toast.error(res.message || 'Failed to unlink Telegram');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error unlinking Telegram');
    } finally {
      setUnlinking(false);
    }
  };

  // -------------------------------------------------------------
  // COMPACT VIEW (DASHBOARD OVERVIEW)
  // -------------------------------------------------------------
  if (compact) {
    if (loading) {
      return (
        <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse flex items-center justify-between ${className}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700" />
            <div className="space-y-1.5">
              <div className="w-36 h-4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="w-24 h-3 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
          <div className="w-20 h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      );
    }

    // Unsubscribed User State
    if (!hasSubscription || groups.length === 0) {
      return (
        <div
          onClick={() => {
            if (onNavigateToPlans) onNavigateToPlans();
            else if (typeof window !== 'undefined') {
              localStorage.setItem('clientActiveTab', 'subscriptions');
              window.location.reload();
            }
          }}
          className={`group relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-4 rounded-2xl text-white shadow-lg shadow-indigo-950/20 hover:shadow-xl transition-all cursor-pointer border border-indigo-500/20 ${className}`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="p-2.5 bg-indigo-500/20 text-indigo-300 rounded-xl shrink-0 group-hover:scale-105 transition border border-indigo-500/30">
                <Send className="w-5 h-5 text-[#24A1DE]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-sm font-bold truncate">Telegram Signals Bot</h4>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    VIP ACCESS
                  </span>
                </div>
                <p className="text-xs text-slate-300 truncate mt-0.5">
                  Subscribe to a plan to unlock live Telegram channel & signal alerts
                </p>
              </div>
            </div>

            <button
              type="button"
              className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md shadow-indigo-500/25 transition shrink-0"
            >
              <span>View Plans</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    // Active Subscribed User State
    return (
      <div className={`space-y-2.5 ${className}`}>
        {/* Account Linking Quick Status */}
        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
          <div className="flex items-center space-x-2">
            <Send className="w-4 h-4 text-[#0088cc]" />
            <span className="font-medium text-slate-700 dark:text-slate-300">Telegram Direct DMs:</span>
            {accountStatus.isLinked ? (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Linked {accountStatus.telegramUsername ? `(@${accountStatus.telegramUsername})` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                Not Connected
              </span>
            )}
          </div>
          {!accountStatus.isLinked && (
            <button
              type="button"
              onClick={handleConnectTelegramAccount}
              disabled={linking}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              {linking ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
              <span>Connect Now</span>
            </button>
          )}
        </div>

        {/* Channel Cards */}
        {groups.map((grp, idx) => {
          const link = grp.telegramInviteLink || defaultInviteLink || 'https://t.me/Complince_signal_bot';
          const isCopied = copiedId === grp.planId;
          const isJoining = joiningPlanId === (grp.planId || 'active');

          return (
            <div
              key={grp.planId || idx}
              onClick={() => handleJoinPlan(grp)}
              className="group relative overflow-hidden bg-gradient-to-r from-[#0088cc] via-[#1d98dc] to-[#027ebd] p-4 rounded-2xl text-white shadow-lg shadow-[#0088cc]/15 hover:shadow-xl hover:shadow-[#0088cc]/25 transition-all cursor-pointer border border-white/15"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-xl shrink-0 group-hover:scale-105 transition border border-white/20">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold truncate">
                        Join {grp.planName} Channel
                      </h4>
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-400/20 text-emerald-200 border border-emerald-300/30 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        LIVE
                      </span>
                    </div>
                    <p className="text-xs text-blue-100 truncate mt-0.5">
                      Instant mobile trading alerts for {grp.planName} subscribers
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(link, grp.planId, e)}
                    className="p-2 bg-white/15 hover:bg-white/25 rounded-lg text-white transition backdrop-blur-sm"
                    title="Copy Channel Link"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  </button>

                  <button
                    type="button"
                    disabled={isJoining}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinPlan(grp);
                    }}
                    className="flex items-center space-x-1.5 bg-white text-[#0088cc] hover:bg-blue-50 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow transition-all group-hover:scale-[1.02]"
                  >
                    {isJoining ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0088cc]" />
                    ) : (
                      <>
                        <span>Join Channel</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL / EXPANDED VIEW (MARKET SIGNALS & DEDICATED TABS)
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className={`p-8 rounded-3xl bg-slate-100 dark:bg-slate-800/50 animate-pulse border border-slate-200 dark:border-slate-700 ${className}`}>
        <div className="h-6 w-48 bg-slate-300 dark:bg-slate-700 rounded mb-4" />
        <div className="h-4 w-96 bg-slate-200 dark:bg-slate-700 rounded mb-6" />
        <div className="h-12 w-48 bg-slate-300 dark:bg-slate-700 rounded-2xl" />
      </div>
    );
  }

  // Unsubscribed state in full view
  if (!hasSubscription || groups.length === 0) {
    return (
      <div className={`relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-indigo-950/20 border border-indigo-500/20 ${className}`}>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25 text-xs font-bold">
              <Lock className="w-3.5 h-3.5" />
              <span>Subscriber-Only Telegram Community</span>
            </div>

            <h3 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
              <Send className="w-7 h-7 text-[#24A1DE] shrink-0" />
              Real-Time Telegram Market Signals Bot
            </h3>

            <p className="text-sm text-slate-300 leading-relaxed">
              Get Buy/Sell recommendations, target hits, and stop-loss notifications delivered directly to your Telegram app the instant our research team publishes them.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                Zero-Latency Signal Push
              </span>
              <span className="flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-400" />
                Target & SL Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-300" />
                SEBI Compliant Research
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToPlans) onNavigateToPlans();
                else if (typeof window !== 'undefined') {
                  localStorage.setItem('clientActiveTab', 'subscriptions');
                  window.location.reload();
                }
              }}
              className="flex items-center justify-center space-x-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white px-6 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl shadow-indigo-500/25 hover:shadow-2xl transition-all"
            >
              <span>Explore Plans & Subscribe</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Subscribed state in full view
  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. Direct Telegram Account Link Bar (DM Delivery) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className={`p-3 rounded-2xl shrink-0 ${accountStatus.isLinked ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20'}`}>
              {accountStatus.isLinked ? <UserCheck className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  Personal Signal DMs on Telegram
                </h4>
                {accountStatus.isLinked ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/25 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Connected
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-500/25">
                    Action Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {accountStatus.isLinked
                  ? `Your Telegram account (${accountStatus.telegramUsername ? `@${accountStatus.telegramUsername}` : 'Chat ID: ' + accountStatus.telegramChatId}) is connected. You receive real-time direct messages for every published signal matching your plans.`
                  : 'Link your Telegram account so our official compliance bot delivers personal Buy/Sell signals & SL updates directly to your chat.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {accountStatus.isLinked ? (
              <button
                type="button"
                onClick={handleUnlink}
                disabled={unlinking}
                className="flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 px-3.5 py-2 rounded-xl text-xs font-bold transition border border-rose-200 dark:border-rose-900/40"
              >
                {unlinking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>Unlink</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConnectTelegramAccount}
                disabled={linking}
                className="flex items-center space-x-2 bg-gradient-to-r from-[#0088cc] to-[#0077b5] hover:from-[#007cb8] hover:to-[#00669c] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-[#0088cc]/20 transition"
              >
                {linking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Connect Telegram Account</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Subscribed Channel Tabs & Join Channel Section */}
      <div className="space-y-4">
        {groups.length > 1 && (
          <div className="flex items-center space-x-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Your Channels:
            </span>
            {groups.map((grp, idx) => (
              <button
                key={grp.planId || idx}
                onClick={() => setSelectedGroupIndex(idx)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  selectedGroupIndex === idx
                    ? 'bg-[#0088cc] text-white shadow-md shadow-[#0088cc]/20'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>{grp.planName}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hero Banner for active group */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1b93d6] via-[#24A1DE] to-[#007cb8] p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-[#229ED9]/20 border border-white/15">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-60 h-60 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute left-1/3 bottom-0 translate-y-12 w-48 h-48 bg-blue-900/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                <span>{activeGroup?.planName || 'Subscribed Plan'} • Official Telegram Channel</span>
              </div>

              <h3 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
                <Send className="w-7 h-7 text-white shrink-0" />
                Join {activeGroup?.planName || 'Live'} Channel
              </h3>

              <p className="text-sm text-blue-50 leading-relaxed">
                Never miss a trading call! Join your plan channel to see all market updates, target hits, chart analyses, and stop-loss notifications in one dedicated stream.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-blue-100">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-300" />
                  Real-time Signal Broadcast
                </span>
                <span className="flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-emerald-300" />
                  Live Target & Stop-Loss Updates
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-200" />
                  SEBI Registered Advisory Channel
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <button
                type="button"
                disabled={joiningPlanId === (activeGroup?.planId || 'active')}
                onClick={() => activeGroup && handleJoinPlan(activeGroup)}
                className="flex items-center justify-center space-x-2.5 bg-white text-[#0088cc] hover:bg-blue-50 px-6 py-3.5 rounded-2xl font-extrabold text-sm shadow-xl shadow-black/10 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
              >
                {joiningPlanId === (activeGroup?.planId || 'active') ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-[#0088cc]" />
                ) : (
                  <Send className="w-4 h-4 text-[#0088cc]" />
                )}
                <span>Join Channel</span>
                <ExternalLink className="w-4 h-4 opacity-70" />
              </button>

              <button
                type="button"
                onClick={(e) => handleCopy(effectiveInviteLink, activeGroup?.planId || 'active', e)}
                className="flex items-center justify-center space-x-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl font-bold text-xs border border-white/20 transition backdrop-blur-sm"
              >
                {copiedId === (activeGroup?.planId || 'active') ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>
                  {copiedId === (activeGroup?.planId || 'active') ? 'Invite Link Copied!' : 'Copy Channel Link'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

