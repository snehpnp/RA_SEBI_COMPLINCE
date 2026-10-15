'use client';

import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Settings, 
  Save, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye, 
  Search, 
  Filter, 
  Radio, 
  User, 
  CreditCard, 
  MapPin, 
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  FileText,
  Check,
  ShieldCheck,
  FileCheck,
  X,
  Copy,
  Share2,
  MessageSquare,
  Calendar
} from 'lucide-react';
import api from '../../services/api';

interface VideoKycSessionItem {
  _id: string;
  sessionId: string;
  clientId: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    mobile?: string;
    pan?: string;
  };
  status: 'REQUESTED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
  scheduleType?: 'INSTANT' | 'SCHEDULED';
  scheduledAt?: string;
  initiatedBy: 'ADMIN' | 'CLIENT';
  consentText: string;
  otpCode: string;
  videoUrl?: string;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
  geoData?: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
  };
  panSnapshotUrl?: string;
  clientFaceSnapshotUrl?: string;
  snapshots?: Array<{
    type: 'PAN' | 'FACE' | 'OTHER';
    url: string;
    capturedAt: string;
    label?: string;
  }>;
  rejectionReason?: string;
  adminNotes?: string;
  reviewedBy?: {
    name?: string;
    email?: string;
  };
  reviewedAt?: string;
  createdAt: string;
}

export default function VideoKycDesk() {
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'settings'>('sessions');

  // Sessions Table States
  const [sessions, setSessions] = useState<VideoKycSessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Settings States
  const [videoKycEnabled, setVideoKycEnabled] = useState(true);
  const [clientVideoKycRequestEnabled, setClientVideoKycRequestEnabled] = useState(true);
  const [videoKycAgreementRule, setVideoKycAgreementRule] = useState<'ALL' | 'SIGNED_ONLY' | 'PENDING_ONLY'>('ALL');
  const [videoKycPlanRule, setVideoKycPlanRule] = useState<'ALL' | 'ACTIVE_ONLY' | 'EXPIRED_ONLY'>('ALL');
  const [globalConsentText, setGlobalConsentText] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Review & Playback Modal
  const [selectedSession, setSelectedSession] = useState<VideoKycSessionItem | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewAction, setReviewAction] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Send Direct Invite Modal
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteScheduleType, setInviteScheduleType] = useState<'INSTANT' | 'SCHEDULED'>('INSTANT');
  const [inviteScheduledAt, setInviteScheduledAt] = useState<string>('');
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [selectedClientForInvite, setSelectedClientForInvite] = useState<string>('');
  const [perClientConsentText, setPerClientConsentText] = useState('');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [createdSessionResult, setCreatedSessionResult] = useState<any>(null);
  console.log("Created Session Result:", createdSessionResult);

  // View Details & Share Modal State
  const [viewDetailsSession, setViewDetailsSession] = useState<VideoKycSessionItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedOtp, setCopiedOtp] = useState(false);
  const [copiedWaMsg, setCopiedWaMsg] = useState(false);
  const [currentTimeMs, setCurrentTimeMs] = useState(Date.now());
  const [unlockingEarly, setUnlockingEarly] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getClientInviteUrl = (session: VideoKycSessionItem) => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/video-kyc/${session.sessionId}?role=client`;
    }
    return `http://localhost:3000/video-kyc/${session.sessionId}?role=client`;
  };

  const copyToClipboard = (text: string, type: 'LINK' | 'OTP' | 'WA') => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      if (type === 'LINK') {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } else if (type === 'OTP') {
        setCopiedOtp(true);
        setTimeout(() => setCopiedOtp(false), 2500);
      } else if (type === 'WA') {
        setCopiedWaMsg(true);
        setTimeout(() => setCopiedWaMsg(false), 2500);
      }
    }
  };

  const getWhatsAppShareText = (session: VideoKycSessionItem) => {
    const clientName = session.clientId?.name || `${session.clientId?.firstName || ''} ${session.clientId?.lastName || ''}`.trim() || 'Client';
    const link = getClientInviteUrl(session);
    const dateStr = session.scheduledAt ? new Date(session.scheduledAt).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata'
    }) : 'Immediate Verification';

    return `Dear ${clientName},\n\nYour SEBI Video KYC Verification is scheduled on ${dateStr}.\n\n🔗 Verification Link: ${link}\n🔑 Session OTP: ${session.otpCode}\n\nPlease keep your physical original PAN card ready and read the on-screen consent statement aloud.\n\nThank you.`;
  };

  const openWhatsAppShare = (session: VideoKycSessionItem) => {
    const text = encodeURIComponent(getWhatsAppShareText(session));
    const phone = session.clientId?.mobile?.replace(/\D/g, '') || '';
    const url = phone ? `https://api.whatsapp.com/send?phone=${phone}&text=${text}` : `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  };

  const getCountdownString = (scheduledAt?: string) => {
    if (!scheduledAt) return null;
    const diffMs = new Date(scheduledAt).getTime() - currentTimeMs;
    if (diffMs <= 0) return 'Slot is active now';
    const totalSecs = Math.floor(diffMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s remaining`;
  };

  // In-Modal Filter & Search States
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [clientAgreementFilter, setClientAgreementFilter] = useState<'ALL' | 'SIGNED' | 'PENDING'>('ALL');
  const [clientPlanFilter, setClientPlanFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED_OR_NONE'>('ALL');

  // Helper to inspect client's Video KYC, Agreement, and Subscription Plan status
  const getClientMeta = (c: any) => {
    // 1. Is Video KYC Approved
    const isVideoKycApproved = c.videoKycStatus === 'APPROVED';

    // 2. Agreement Status
    const hasAgreements = Array.isArray(c.agreements) && c.agreements.length > 0;
    const isAgreementSigned = (hasAgreements && c.agreements.some((a: any) => 
      a.status === 'SIGNED' || a.signedAt || a.status === 'COMPLETED'
    )) || c.agreementStatus === 'SIGNED' || c.agreementStatus === 'COMPLETED';

    // 3. Subscription / Plan Status
    const hasSubs = Array.isArray(c.subscriptions) && c.subscriptions.length > 0;
    const activeSub = hasSubs ? c.subscriptions.find((s: any) => {
      if (s.status !== 'ACTIVE') return false;
      if (!s.endDate) return true;
      return new Date(s.endDate).getTime() >= Date.now();
    }) : null;

    const isPlanActive = Boolean(activeSub);
    const planName = activeSub?.plan?.name || activeSub?.planName || null;
    const isPlanExpired = !isPlanActive && hasSubs;
    const hasNoPlan = !hasSubs;

    return {
      isVideoKycApproved,
      isAgreementSigned,
      agreementLabel: isAgreementSigned ? 'Agreement Signed' : 'Agreement Pending',
      isPlanActive,
      isPlanExpired,
      hasNoPlan,
      planStatus: isPlanActive ? 'ACTIVE' : (isPlanExpired ? 'EXPIRED' : 'NONE'),
      planLabel: isPlanActive ? `Plan: Active${planName ? ` (${planName})` : ''}` : (isPlanExpired ? 'Plan Expired' : 'No Plan'),
      planName
    };
  };

  // Minimum allowed date-time (current moment, preventing past dates)
  const getMinDateTimeString = () => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  };

  // Load Sessions
  const fetchSessions = async () => {
    try {
      setLoading(true);
      const res: any = await api.listVideoKycSessions({
        status: statusFilter === 'ALL' ? undefined : statusFilter
      });
      if (res?.success && res?.data?.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err: any) {
      console.error('Failed to fetch Video KYC sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load Settings
  const fetchSettings = async () => {
    try {
      const res: any = await api.getVideoKycSettings();
      if (res?.success && res?.data) {
        setVideoKycEnabled(res.data.videoKycEnabled);
        setClientVideoKycRequestEnabled(res.data.clientVideoKycRequestEnabled);
        if (res.data.videoKycAgreementRule) setVideoKycAgreementRule(res.data.videoKycAgreementRule);
        if (res.data.videoKycPlanRule) setVideoKycPlanRule(res.data.videoKycPlanRule);
        setGlobalConsentText(res.data.globalVideoKycConsentText);
        setPerClientConsentText(res.data.globalVideoKycConsentText);
      }
    } catch (err: any) {
      console.error('Failed to fetch Video KYC settings:', err);
    }
  };

  // Load Clients for Invite Dropdown
  const fetchClients = async () => {
    try {
      const res: any = await api.getAdminClients();
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setClientsList(list);
      }
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    }
  };

  useEffect(() => {
    fetchSessions();
    fetchSettings();
    fetchClients();
  }, [statusFilter]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsMessage(null);
      const res: any = await api.updateVideoKycSettings({
        videoKycEnabled,
        clientVideoKycRequestEnabled,
        videoKycAgreementRule,
        videoKycPlanRule,
        globalVideoKycConsentText: globalConsentText
      });
      if (res?.success) {
        setSettingsMessage({ type: 'success', text: 'Video KYC system settings updated successfully!' });
      } else {
        setSettingsMessage({ type: 'error', text: res?.message || 'Failed to update settings.' });
      }
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err?.message || 'Error updating settings.' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle Submit Review (Approve or Reject)
  const handleSubmitReview = async () => {
    if (!selectedSession) return;
    if (reviewAction === 'REJECTED' && !rejectionReason.trim()) {
      alert('Please specify a rejection reason so the client can re-attempt properly.');
      return;
    }

    try {
      setSubmittingReview(true);
      const res: any = await api.reviewVideoKycSession(selectedSession.sessionId, {
        status: reviewAction,
        rejectionReason: rejectionReason.trim(),
        adminNotes: adminNotes.trim()
      });

      if (res?.success) {
        setReviewModalOpen(false);
        setSelectedSession(null);
        fetchSessions();
      } else {
        alert(res?.message || 'Failed to submit review');
      }
    } catch (err: any) {
      alert(err?.message || 'Error submitting review');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle Initiate Direct Invite to Client
  const handleSendInvite = async () => {
    if (!selectedClientForInvite) {
      alert('Please select a client to send the Video KYC invitation.');
      return;
    }

    if (inviteScheduleType === 'SCHEDULED') {
      if (!inviteScheduledAt) {
        alert('Please choose a date and time for the scheduled session.');
        return;
      }
      if (new Date(inviteScheduledAt).getTime() <= Date.now()) {
        alert('Scheduled appointment date and time must be in the future.');
        return;
      }
    }

    try {
      setSendingInvite(true);
      const res: any = await api.createVideoKycSession({
        clientId: selectedClientForInvite,
        customConsentText: perClientConsentText,
        scheduleType: inviteScheduleType,
        scheduledAt: inviteScheduleType === 'SCHEDULED' ? inviteScheduledAt : null,
        origin: typeof window !== 'undefined' ? window.location.origin : undefined
      });

      if (res?.success) {
        setCreatedSessionResult(res.data);
        fetchSessions();
      } else {
        alert(res?.message || 'Failed to send Video KYC invitation');
      }
    } catch (err: any) {
      alert(err?.message || 'Error creating Video KYC session');
    } finally {
      setSendingInvite(false);
    }
  };

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => {
    const name = s.clientId?.name || `${s.clientId?.firstName || ''} ${s.clientId?.lastName || ''}`;
    const pan = s.clientId?.pan || '';
    const sid = s.sessionId || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || pan.toLowerCase().includes(q) || sid.toLowerCase().includes(q);
  });

  // Filtered Clients for Invite Modal
  const eligibleClients = clientsList.filter(c => {
    if (c.deletedAt) return false;
    const email = (c.email || c.user?.email || '').toLowerCase();
    if (email.includes('_deleted_')) return false;

    const meta = getClientMeta(c);
    // User requirement 1: Exclude already approved Video KYC clients
    if (meta.isVideoKycApproved) return false;

    return true;
  });

  const filteredClientsForInvite = eligibleClients.filter(c => {
    const meta = getClientMeta(c);
    const name = (c.name || `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || c.panName || '').toLowerCase();
    const pan = (c.pan || c.profile?.pan || '').toLowerCase();
    const email = (c.email || c.user?.email || '').toLowerCase();
    const mobile = (c.mobile || c.user?.mobile || '').toLowerCase();

    if (clientSearchQuery.trim()) {
      const q = clientSearchQuery.trim().toLowerCase();
      const match = name.includes(q) || pan.includes(q) || email.includes(q) || mobile.includes(q);
      if (!match) return false;
    }

    if (clientAgreementFilter === 'SIGNED' && !meta.isAgreementSigned) return false;
    if (clientAgreementFilter === 'PENDING' && meta.isAgreementSigned) return false;

    if (clientPlanFilter === 'ACTIVE' && !meta.isPlanActive) return false;
    if (clientPlanFilter === 'EXPIRED_OR_NONE' && meta.isPlanActive) return false;

    return true;
  });

  const currentSelectedClient = selectedClientForInvite 
    ? clientsList.find(c => (c._id || c.id) === selectedClientForInvite) 
    : null;
  const currentSelectedMeta = currentSelectedClient ? getClientMeta(currentSelectedClient) : null;

  const handleSelectClient = (clientId: string) => {
    setSelectedClientForInvite(clientId);
    const chosen = clientsList.find(c => (c._id || c.id) === clientId);
    if (chosen) {
      const name = chosen.name || `${chosen.user?.firstName || ''} ${chosen.user?.lastName || ''}`.trim() || 'Client';
      const pan = chosen.pan || chosen.profile?.pan || 'N/A';
      const tailored = (globalConsentText || '')
        .replace(/\{\{clientName\}\}/g, name)
        .replace(/\{\{pan\}\}/g, pan)
        .replace(/\{\{date\}\}/g, new Date().toLocaleDateString('en-IN'))
        .replace(/\{\{companyName\}\}/g, 'Research Analyst');
      setPerClientConsentText(tailored);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Live Video KYC & IPV Desk
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                  videoKycEnabled 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                }`}>
                  {videoKycEnabled ? 'MODULE ACTIVE' : 'MODULE DISABLED'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                SEBI Digital In-Person Verification (V-CIP) with live two-way WebRTC calling, recorded video compression, and geotagging.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setPerClientConsentText(globalConsentText);
              setSelectedClientForInvite('');
              setCreatedSessionResult(null);
              setClientSearchQuery('');
              setClientAgreementFilter(videoKycAgreementRule === 'SIGNED_ONLY' ? 'SIGNED' : (videoKycAgreementRule === 'PENDING_ONLY' ? 'PENDING' : 'ALL'));
              setClientPlanFilter(videoKycPlanRule === 'ACTIVE_ONLY' ? 'ACTIVE' : (videoKycPlanRule === 'EXPIRED_ONLY' ? 'EXPIRED_OR_NONE' : 'ALL'));
              fetchClients();
              setInviteModalOpen(true);
            }}
            className="py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/25 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Request Video KYC
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab('sessions')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'sessions'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Radio className="w-4 h-4" /> Verification Sessions ({sessions.length})
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`py-2 px-4 rounded-xl text-xs font-semibold transition flex items-center gap-2 ${
            activeSubTab === 'settings'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Video KYC Settings & Consent Text
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB: SESSIONS LIST */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'sessions' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search client, PAN, session ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REQUESTED">Requested (Instant)</option>
                  <option value="SCHEDULED">Scheduled Appointment</option>
                  <option value="COMPLETED">Completed (Needs Review)</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>

            <button
              onClick={fetchSessions}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Sessions Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mb-2" />
                Loading sessions...
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                No Video KYC verification sessions found matching your criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3.5 px-4">Client Name & PAN</th>
                      <th className="py-3.5 px-4">Session Code / OTP</th>
                      <th className="py-3.5 px-4">Initiated By</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Recording & Snapshots</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredSessions.map((session) => {
                      const clientName = session.clientId?.name || `${session.clientId?.firstName || ''} ${session.clientId?.lastName || ''}`.trim() || 'Client';
                      const pan = session.clientId?.pan || 'N/A';

                      return (
                        <tr key={session._id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-100">{clientName}</div>
                            <div className="text-[11px] font-mono text-blue-400">{pan}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-slate-300 font-medium">{session.sessionId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(getClientInviteUrl(session), 'LINK')}
                                className="text-slate-500 hover:text-blue-400 p-1 rounded transition"
                                title="Copy Client Link"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-emerald-400 font-mono font-bold tracking-wider">
                              OTP: {session.otpCode}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              session.initiatedBy === 'ADMIN' ? 'bg-indigo-500/10 text-indigo-300' : 'bg-emerald-500/10 text-emerald-300'
                            }`}>
                              {session.initiatedBy}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {session.status === 'SCHEDULED' ? (
                              <div className="space-y-1">
                                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold border bg-indigo-500/10 text-indigo-300 border-indigo-500/30 inline-flex items-center gap-1.5">
                                  <Clock className="w-3 h-3 text-indigo-400" /> SCHEDULED
                                </span>
                                {session.scheduledAt && (
                                  <div>
                                    <div className="text-[10px] text-indigo-300 font-medium">
                                      {new Date(session.scheduledAt).toLocaleString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </div>
                                    <div className="text-[10px] font-mono text-cyan-400 font-semibold mt-0.5">
                                      ⏱️ {getCountdownString(session.scheduledAt)}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                session.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                session.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                session.status === 'COMPLETED' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              }`}>
                                {session.status}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {session.videoUrl ? (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3.5 h-3.5" /> Saved ({session.durationSeconds || 0}s)
                                </span>
                                {session.panSnapshotUrl && (
                                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">PAN</span>
                                )}
                                {session.clientFaceSnapshotUrl && (
                                  <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">Face</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No recording yet</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(session.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View Details / Share Button (For all sessions) */}
                              <button
                                type="button"
                                onClick={() => setViewDetailsSession(session)}
                                className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
                                title="View Session Details, Timer & Share Link"
                              >
                                <Eye className="w-3.5 h-3.5 text-cyan-400" /> Details
                              </button>

                              {/* Join Room Button (Only for Pending / Active sessions) */}
                              {['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(session.status) && (
                                <a
                                  href={`/video-kyc/${session.sessionId}?role=admin`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="py-1 px-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                  title="Open Live Room"
                                >
                                  <Play className="w-3 h-3" /> Join Room
                                </a>
                              )}

                              {/* Review Recording Button (For Completed) */}
                              {session.status === 'COMPLETED' && (
                                <button
                                  onClick={() => {
                                    setSelectedSession(session);
                                    setReviewAction('APPROVED');
                                    setRejectionReason(session.rejectionReason || '');
                                    setAdminNotes(session.adminNotes || '');
                                    setReviewModalOpen(true);
                                  }}
                                  className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                                  title="Review & Take Decision"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Review
                                </button>
                              )}

                              {/* View Evidence Button (For Approved or Rejected) */}
                              {['APPROVED', 'REJECTED'].includes(session.status) && (
                                <button
                                  onClick={() => {
                                    setSelectedSession(session);
                                    setReviewAction(session.status as any);
                                    setRejectionReason(session.rejectionReason || '');
                                    setAdminNotes(session.adminNotes || '');
                                    setReviewModalOpen(true);
                                  }}
                                  className="py-1 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                                  title="View Recorded Evidence"
                                >
                                  <Eye className="w-3 h-3" /> View Evidence
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* SUB-TAB: SETTINGS & CONSENT */}
      {/* --------------------------------------------------------------------- */}
      {activeSubTab === 'settings' && (
        <div className="max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Settings className="w-4 h-4 text-blue-400" /> Video KYC Configuration
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure master rules, participant request permissions, and the regulatory consent statement.
            </p>
          </div>

          {settingsMessage && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
              settingsMessage.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-950/40 text-red-300 border border-red-500/30'
            }`}>
              {settingsMessage.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
              {settingsMessage.text}
            </div>
          )}

          {/* Feature Toggles */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-200">Enable Video KYC Module</div>
                <div className="text-[11px] text-slate-400">
                  Activates digital IPV and video verification across the tenant platform.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={videoKycEnabled}
                  onChange={(e) => setVideoKycEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-slate-200">Allow Client-Initiated Video KYC Requests</div>
                <div className="text-[11px] text-slate-400">
                  When enabled, clients can request Video KYC from their client portal. If disabled, only the Admin / Compliance Officer can send invites.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={clientVideoKycRequestEnabled}
                  onChange={(e) => setClientVideoKycRequestEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Eligibility Policy Configuration */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" /> Video KYC Client Eligibility Criteria (Default Policy)
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Configure which clients are allowed to undergo Video KYC. Clients who have already completed & approved Video KYC are permanently excluded.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KYC / Service Agreement Rule */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">SEBI Agreement Requirement</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Require whether client must complete and sign their SEBI Research Analyst Service Agreement before Video KYC.
                </p>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="agreementRule"
                      value="ALL"
                      checked={videoKycAgreementRule === 'ALL'}
                      onChange={() => setVideoKycAgreementRule('ALL')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong>All Clients</strong> (With or without signed agreement)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="agreementRule"
                      value="SIGNED_ONLY"
                      checked={videoKycAgreementRule === 'SIGNED_ONLY'}
                      onChange={() => setVideoKycAgreementRule('SIGNED_ONLY')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong className="text-emerald-400">Signed Agreement Only</strong> (Mandatory signed agreement)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="agreementRule"
                      value="PENDING_ONLY"
                      checked={videoKycAgreementRule === 'PENDING_ONLY'}
                      onChange={() => setVideoKycAgreementRule('PENDING_ONLY')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong className="text-amber-400">Pending Agreement Only</strong> (Clients without agreement)</span>
                  </label>
                </div>
              </div>

              {/* Subscription Plan Rule */}
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">Subscription Plan Requirement</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Filter eligibility based on whether the client holds an active advisory/research subscription plan.
                </p>
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="planRule"
                      value="ALL"
                      checked={videoKycPlanRule === 'ALL'}
                      onChange={() => setVideoKycPlanRule('ALL')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong>All Clients</strong> (Active, expired, or without plan)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="planRule"
                      value="ACTIVE_ONLY"
                      checked={videoKycPlanRule === 'ACTIVE_ONLY'}
                      onChange={() => setVideoKycPlanRule('ACTIVE_ONLY')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong className="text-teal-400">Active Plan Only</strong> (Must have unexpired plan)</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300 hover:text-white transition">
                    <input
                      type="radio"
                      name="planRule"
                      value="EXPIRED_ONLY"
                      checked={videoKycPlanRule === 'EXPIRED_ONLY'}
                      onChange={() => setVideoKycPlanRule('EXPIRED_ONLY')}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span><strong className="text-rose-400">Expired / No Plan Only</strong> (Expired or non-subscribed)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Global Consent Text Editor */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" /> Master Consent Statement
              </label>
              <span className="text-[11px] text-slate-400">
                Variables: <code className="text-blue-400">&#123;&#123;clientName&#125;&#125;</code>, <code className="text-blue-400">&#123;&#123;companyName&#125;&#125;</code>, <code className="text-blue-400">&#123;&#123;pan&#125;&#125;</code>, <code className="text-blue-400">&#123;&#123;date&#125;&#125;</code>
              </span>
            </div>
            <textarea
              rows={4}
              value={globalConsentText}
              onChange={(e) => setGlobalConsentText(e.target.value)}
              placeholder="Enter master consent statement..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500 font-sans"
            />
            <p className="text-[11px] text-slate-400">
              * Note: Before sending an invite to any individual client, you can also edit/customize this text specifically for them.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="py-2.5 px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {savingSettings ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Settings
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: REVIEW RECORDING & APPROVE / REJECT */}
      {/* --------------------------------------------------------------------- */}
      {reviewModalOpen && selectedSession && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" /> Compliance Review: {selectedSession.clientId?.name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">Session ID: {selectedSession.sessionId}</p>
              </div>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Video Player */}
            {selectedSession.videoUrl ? (
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300">Compressed Video Recording:</span>
                <div className="bg-black rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                  <video
                    src={selectedSession.videoUrl.startsWith('http') ? selectedSession.videoUrl : `${api.getBaseUrl()}${selectedSession.videoUrl}`}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl">
                No video recording file found for this session.
              </div>
            )}

            {/* Snapshots Grid & Gallery */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Verification Evidence Snapshots ({selectedSession.snapshots?.length || (selectedSession.panSnapshotUrl || selectedSession.clientFaceSnapshotUrl ? 2 : 0)}):
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Saved to Regulatory Vault
                </span>
              </div>

              {/* Multiple Snapshots Gallery if available */}
              {selectedSession.snapshots && selectedSession.snapshots.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {selectedSession.snapshots.map((snap, sIdx) => {
                    const snapUrl = snap.url.startsWith('http') || snap.url.startsWith('data:') ? snap.url : `${api.getBaseUrl()}${snap.url}`;
                    return (
                      <div key={sIdx} className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 p-2 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-slate-200">{snap.label || `${snap.type} Snap`}</span>
                          <span className="text-slate-400 font-mono text-[9px]">#{sIdx + 1}</span>
                        </div>
                        <div className="bg-black rounded-lg overflow-hidden aspect-video border border-slate-800/80 flex items-center justify-center">
                          <img src={snapUrl} alt={snap.label || 'Snap'} className="w-full h-full object-contain" />
                        </div>
                        <a
                          href={snapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-blue-400 hover:underline block text-center pt-0.5"
                        >
                          View Full Size ↗
                        </a>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-bold text-slate-300">PAN Card Snapshot:</span>
                    <div className="mt-1 bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                      {selectedSession.panSnapshotUrl ? (
                        <img
                          src={selectedSession.panSnapshotUrl.startsWith('http') || selectedSession.panSnapshotUrl.startsWith('data:') ? selectedSession.panSnapshotUrl : `${api.getBaseUrl()}${selectedSession.panSnapshotUrl}`}
                          alt="PAN Snapshot"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-500">No PAN snapshot taken</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-slate-300">Client Face Snapshot:</span>
                    <div className="mt-1 bg-slate-950 rounded-xl overflow-hidden aspect-video border border-slate-800 flex items-center justify-center">
                      {selectedSession.clientFaceSnapshotUrl ? (
                        <img
                          src={selectedSession.clientFaceSnapshotUrl.startsWith('http') || selectedSession.clientFaceSnapshotUrl.startsWith('data:') ? selectedSession.clientFaceSnapshotUrl : `${api.getBaseUrl()}${selectedSession.clientFaceSnapshotUrl}`}
                          alt="Face Snapshot"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-[11px] text-slate-500">No face snapshot taken</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Metadata */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs space-y-2 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Consent Read:</span>
                <span className="font-medium text-slate-200">"{selectedSession.consentText}"</span>
              </div>
              {selectedSession.geoData?.latitude && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Geo-Coordinates:</span>
                  <span className="font-mono text-emerald-400">
                    {selectedSession.geoData.latitude}, {selectedSession.geoData.longitude}
                  </span>
                </div>
              )}
            </div>

            {/* Approval Decision Form */}
            <div className="space-y-4 pt-3 border-t border-slate-800">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Review Decision:</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-emerald-400">
                    <input
                      type="radio"
                      name="decision"
                      value="APPROVED"
                      checked={reviewAction === 'APPROVED'}
                      onChange={() => setReviewAction('APPROVED')}
                      className="text-emerald-500"
                    />
                    Approve Video KYC (Compliant)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-red-400">
                    <input
                      type="radio"
                      name="decision"
                      value="REJECTED"
                      checked={reviewAction === 'REJECTED'}
                      onChange={() => setReviewAction('REJECTED')}
                      className="text-red-500"
                    />
                    Reject Video KYC (Re-attempt required)
                  </label>
                </div>
              </div>

              {reviewAction === 'REJECTED' && (
                <div>
                  <label className="text-xs font-bold text-red-400 block mb-1">
                    Rejection Reason (will be communicated to client):
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. PAN card was blurred, face not clear, audio inaudible..."
                    className="w-full bg-slate-950 border border-red-500/40 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Internal Compliance Notes (Optional):</label>
                <input
                  type="text"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Officer remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setReviewModalOpen(false)}
                  className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={submittingReview}
                  className={`py-2.5 px-6 rounded-xl text-xs font-bold text-white transition shadow-lg ${
                    reviewAction === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'
                  }`}
                >
                  {submittingReview ? 'Submitting...' : `Submit Decision (${reviewAction})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* MODAL: DIRECT INVITE WITH CUSTOMIZABLE PER-CLIENT CONSENT */}
      {/* --------------------------------------------------------------------- */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 shadow-2xl space-y-5 custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Send className="w-5 h-5 text-blue-400" /> Initiate Video KYC Session
                </h3>
                <p className="text-xs text-slate-400">Generate a live session link & send invitation email to client</p>
              </div>
              <button
                onClick={() => setInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {createdSessionResult ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h4 className="text-base font-bold text-slate-100">Video KYC Invite Dispatched!</h4>
                <p className="text-xs text-slate-400">
                  An email with the link and code has been sent. You can also share the link directly:
                </p>

                {(() => {
                  const sid = createdSessionResult.session?.sessionId || createdSessionResult.sessionId || '';
                  const clientUrl = (typeof window !== 'undefined' && sid)
                    ? `${window.location.origin}/video-kyc/${sid}?role=client`
                    : createdSessionResult.videoKycUrl;
                  const adminUrl = (typeof window !== 'undefined' && sid)
                    ? `${window.location.origin}/video-kyc/${sid}?role=admin`
                    : (createdSessionResult.videoKycUrl || '').replace('?role=client', '?role=admin');

                  return (
                    <>
                      <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 font-mono break-all text-left space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 font-sans font-bold text-[11px]">Client Verification Link:</span>
                            {copiedLink && <span className="text-emerald-400 text-[10px] font-sans font-bold">Copied!</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              readOnly
                              value={clientUrl}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-blue-300 select-all"
                            />
                            <button
                              type="button"
                              onClick={() => copyToClipboard(clientUrl, 'LINK')}
                              className="py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                              title="Copy Link"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              {copiedLink ? 'Copied' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                          <div>
                            <span className="text-slate-400 font-sans font-bold text-[11px]">Session OTP:</span>{' '}
                            <span className="text-emerald-400 font-bold text-sm tracking-wider">{createdSessionResult.otpCode}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(createdSessionResult.otpCode, 'OTP')}
                            className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold transition flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> {copiedOtp ? 'Copied' : 'Copy OTP'}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            const dummySession: any = {
                              sessionId: sid,
                              otpCode: createdSessionResult.otpCode,
                              clientId: currentSelectedClient,
                              scheduledAt: createdSessionResult.scheduledAt || createdSessionResult.session?.scheduledAt
                            };
                            openWhatsAppShare(dummySession);
                          }}
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold text-center shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-1.5"
                        >
                          <MessageSquare className="w-4 h-4" /> Share WhatsApp
                        </button>

                        <a
                          href={adminUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold text-center shadow-lg shadow-blue-600/30 flex items-center justify-center gap-1.5"
                        >
                          <Play className="w-4 h-4" /> Enter Room
                        </a>

                        <button
                          onClick={() => setInviteModalOpen(false)}
                          className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
                        >
                          Done
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Client Selection with Filters & Status Badges */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-400" /> Select Target Client:
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Approved KYC clients excluded automatically
                    </span>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="bg-slate-950/90 p-3 rounded-xl border border-slate-800 space-y-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={clientSearchQuery}
                        onChange={(e) => setClientSearchQuery(e.target.value)}
                        placeholder="Search by client name, PAN, email, mobile..."
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-8 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      {clientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setClientSearchQuery('')}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Filter Pills */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                      {/* Agreement Filters */}
                      <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
                        <FileCheck className="w-3 h-3 text-emerald-400" /> Agreement:
                      </span>
                      <button
                        type="button"
                        onClick={() => setClientAgreementFilter('ALL')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition ${
                          clientAgreementFilter === 'ALL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientAgreementFilter('SIGNED')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${
                          clientAgreementFilter === 'SIGNED'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-emerald-400/80 hover:bg-slate-800 hover:text-emerald-300'
                        }`}
                      >
                        <CheckCircle className="w-3 h-3" /> Signed
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientAgreementFilter('PENDING')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${
                          clientAgreementFilter === 'PENDING'
                            ? 'bg-amber-600 text-white'
                            : 'bg-slate-900 text-amber-400/80 hover:bg-slate-800 hover:text-amber-300'
                        }`}
                      >
                        <Clock className="w-3 h-3" /> Pending
                      </button>

                      <div className="h-3.5 w-px bg-slate-800 mx-1 hidden sm:block"></div>

                      {/* Plan Filters */}
                      <span className="text-slate-400 font-semibold flex items-center gap-1 mr-1">
                        <CreditCard className="w-3 h-3 text-indigo-400" /> Plan:
                      </span>
                      <button
                        type="button"
                        onClick={() => setClientPlanFilter('ALL')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition ${
                          clientPlanFilter === 'ALL'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientPlanFilter('ACTIVE')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${
                          clientPlanFilter === 'ACTIVE'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-900 text-teal-400/80 hover:bg-slate-800 hover:text-teal-300'
                        }`}
                      >
                        <Sparkles className="w-3 h-3" /> Active Plan
                      </button>
                      <button
                        type="button"
                        onClick={() => setClientPlanFilter('EXPIRED_OR_NONE')}
                        className={`px-2.5 py-0.5 rounded-md font-semibold transition flex items-center gap-1 ${
                          clientPlanFilter === 'EXPIRED_OR_NONE'
                            ? 'bg-rose-600 text-white'
                            : 'bg-slate-900 text-rose-400/80 hover:bg-slate-800 hover:text-rose-300'
                        }`}
                      >
                        <XCircle className="w-3 h-3" /> Expired / None
                      </button>
                    </div>
                  </div>

                  {/* Selected Client Callout Preview */}
                  {currentSelectedClient && (
                    <div className="p-3 bg-blue-950/50 border border-blue-500/40 rounded-xl flex items-center justify-between animate-in fade-in">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-white">
                            {currentSelectedClient.name || `${currentSelectedClient.user?.firstName || ''} ${currentSelectedClient.user?.lastName || ''}`.trim() || 'Client'}
                          </span>
                          <span className="font-mono text-[10px] bg-slate-900 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">
                            PAN: {currentSelectedClient.pan || currentSelectedClient.profile?.pan || 'N/A'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-2">
                          <span>{currentSelectedClient.email || currentSelectedClient.user?.email || 'No email'}</span>
                          <span>•</span>
                          <span>{currentSelectedClient.mobile || currentSelectedClient.user?.mobile || 'No mobile'}</span>
                          {currentSelectedMeta?.isAgreementSigned ? (
                            <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              ✓ Agreement Done
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              ⏳ Agreement Pending
                            </span>
                          )}
                          {currentSelectedMeta?.isPlanActive ? (
                            <span className="text-[10px] text-teal-300 font-semibold bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                              ✓ Plan: Active ({currentSelectedMeta.planName || 'Subscribed'})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                              {currentSelectedMeta?.isPlanExpired ? 'Plan Expired' : 'No Plan'}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClientForInvite('')}
                        className="text-xs text-blue-400 hover:text-blue-300 underline font-semibold px-2 py-1"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Selectable Client List (Shown when choosing or changing client) */}
                  {!selectedClientForInvite && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400 px-1">
                        <span>Eligible Clients ({filteredClientsForInvite.length} matching)</span>
                        <span className="text-[10px] text-blue-400">Click a client to select</span>
                      </div>
                      <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80 rounded-xl border border-slate-800 bg-slate-950/70 p-1 custom-scrollbar">
                        {filteredClientsForInvite.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-500">
                            No eligible clients found matching your search and filter criteria.
                            <div className="text-[10px] text-slate-600 mt-1">
                              (Clients whose Video KYC is already approved are automatically excluded)
                            </div>
                          </div>
                        ) : (
                          filteredClientsForInvite.map((c) => {
                            const cid = c._id || c.id;
                            const name = c.name || `${c.user?.firstName || ''} ${c.user?.lastName || ''}`.trim() || c.panName || 'Client';
                            const pan = c.pan || c.profile?.pan || 'N/A';
                            const contact = c.email || c.user?.email || c.mobile || 'No Contact';
                            const meta = getClientMeta(c);

                            return (
                              <div
                                key={cid}
                                onClick={() => handleSelectClient(cid)}
                                className="p-2.5 rounded-lg hover:bg-slate-800/60 cursor-pointer transition flex items-center justify-between group"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition">
                                      {name}
                                    </span>
                                    <span className="font-mono text-[10px] bg-slate-900 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                      PAN: {pan}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {contact}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                    {meta.isAgreementSigned ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                                        <CheckCircle className="w-2.5 h-2.5" /> Agreement: Done
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/25">
                                        <Clock className="w-2.5 h-2.5" /> Agreement: Pending
                                      </span>
                                    )}

                                    {meta.isPlanActive ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-teal-500/10 text-teal-300 border border-teal-500/25">
                                        <Sparkles className="w-2.5 h-2.5" /> Plan: Active {meta.planName ? `(${meta.planName})` : ''}
                                      </span>
                                    ) : meta.isPlanExpired ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
                                        <XCircle className="w-2.5 h-2.5" /> Plan: Expired
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                                        <CreditCard className="w-2.5 h-2.5" /> No Plan
                                      </span>
                                    )}

                                    {c.videoKycStatus === 'REJECTED' && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/10 text-red-400 border border-red-500/25">
                                        <AlertTriangle className="w-2.5 h-2.5" /> KYC Rejected (Re-attempt)
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectClient(cid);
                                  }}
                                  className="text-xs font-semibold px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white rounded-lg transition border border-blue-500/30"
                                >
                                  Select
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Session Type: Instant vs Scheduled */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Verification Mode:</label>
                  <div className="grid grid-cols-2 gap-3 mb-2.5">
                    <button
                      type="button"
                      onClick={() => setInviteScheduleType('INSTANT')}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                        inviteScheduleType === 'INSTANT'
                          ? 'bg-blue-600/20 text-blue-300 border-blue-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      ⚡ Instant (Start Now)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setInviteScheduleType('SCHEDULED');
                        if (!inviteScheduledAt) {
                          // Default to tomorrow 11:00 AM or next hour
                          const nextHour = new Date(Date.now() + 60 * 60 * 1000);
                          nextHour.setMinutes(0, 0, 0);
                          const localIso = new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
                          setInviteScheduledAt(localIso);
                        }
                      }}
                      className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${
                        inviteScheduleType === 'SCHEDULED'
                          ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-sm'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      📅 Schedule for Later
                    </button>
                  </div>

                  {inviteScheduleType === 'SCHEDULED' && (
                    <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-xl space-y-2 mb-2 animate-in fade-in">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> Choose Date & Time:
                        </label>
                        <span className="text-[10px] text-slate-400">Indian Standard Time (IST)</span>
                      </div>
                      <input
                        type="datetime-local"
                        min={getMinDateTimeString()}
                        value={inviteScheduledAt}
                        onChange={(e) => {
                          const val = e.target.value;
                          const minVal = getMinDateTimeString();
                          if (val && val < minVal) {
                            alert('Past date and time cannot be selected. Please select a current or future time.');
                            setInviteScheduledAt(minVal);
                          } else {
                            setInviteScheduledAt(val);
                          }
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                      />
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Client will receive an invitation email for this scheduled time. The room will unlock and commence verification at this time.
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-300">
                      Consent Statement for this Session:
                    </label>
                    <span className="text-[10px] text-amber-400">Can be tailored specifically for this client</span>
                  </div>
                  <textarea
                    rows={4}
                    value={perClientConsentText}
                    onChange={(e) => setPerClientConsentText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    onClick={() => setInviteModalOpen(false)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendInvite}
                    disabled={sendingInvite || !selectedClientForInvite}
                    className={`py-2.5 px-6 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 disabled:opacity-50 ${
                      inviteScheduleType === 'SCHEDULED'
                        ? 'bg-indigo-600 hover:bg-indigo-500'
                        : 'bg-blue-600 hover:bg-blue-500'
                    }`}
                  >
                    {sendingInvite ? <RefreshCw className="w-4 h-4 animate-spin" /> : inviteScheduleType === 'SCHEDULED' ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    {inviteScheduleType === 'SCHEDULED' ? 'Schedule Session & Dispatch Invite' : 'Create Session & Dispatch Invite'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW SESSION DETAILS & SHARE MODAL */}
      {/* --------------------------------------------------------------------- */}
      {viewDetailsSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    Video KYC Session Details
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      viewDetailsSession.status === 'SCHEDULED' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' :
                      viewDetailsSession.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      viewDetailsSession.status === 'REJECTED' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {viewDetailsSession.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">Session ID: <span className="font-mono text-slate-200">{viewDetailsSession.sessionId}</span></p>
                </div>
              </div>
              <button
                onClick={() => setViewDetailsSession(null)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              {/* If Scheduled: Live Countdown Timer banner */}
              {viewDetailsSession.status === 'SCHEDULED' && viewDetailsSession.scheduledAt && (
                <div className="p-4 bg-gradient-to-r from-indigo-950/60 to-purple-950/40 border border-indigo-500/30 rounded-xl shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-cyan-400 animate-pulse" /> Scheduled Session Countdown
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(viewDetailsSession.scheduledAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                        timeZone: 'Asia/Kolkata'
                      })}
                    </span>
                  </div>
                  <div className="mt-2 text-2xl font-mono font-bold text-cyan-300 tracking-wider flex items-center gap-2">
                    ⏱️ {getCountdownString(viewDetailsSession.scheduledAt)}
                  </div>
                </div>
              )}

              {/* Client Information */}
              <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-400" /> Client Profile
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Full Name:</span>
                    <span className="font-semibold text-slate-200">
                      {viewDetailsSession.clientId?.name || `${viewDetailsSession.clientId?.firstName || ''} ${viewDetailsSession.clientId?.lastName || ''}`.trim() || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">PAN Number:</span>
                    <span className="font-mono font-bold text-blue-400">
                      {viewDetailsSession.clientId?.pan || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Mobile:</span>
                    <span className="text-slate-300">
                      {viewDetailsSession.clientId?.mobile || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Email:</span>
                    <span className="text-slate-300 truncate block">
                      {viewDetailsSession.clientId?.email || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Session OTP Security Box */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Session Security OTP
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Required by client on 2FA screen to enter room
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-mono font-black text-emerald-300 tracking-widest px-3 py-1 bg-slate-950 border border-emerald-500/30 rounded-lg">
                    {viewDetailsSession.otpCode}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(viewDetailsSession.otpCode, 'OTP')}
                    className="p-2 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg border border-emerald-500/30 transition text-xs font-bold flex items-center gap-1"
                    title="Copy OTP"
                  >
                    {copiedOtp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedOtp ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Client Verification Link (One-Click Copy & WhatsApp Share) */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Client Join Link
                  </span>
                  {copiedLink && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3" /> Link Copied to Clipboard!
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getClientInviteUrl(viewDetailsSession)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-blue-300 select-all focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getClientInviteUrl(viewDetailsSession), 'LINK')}
                    className="py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedLink ? 'Copied' : 'Copy Link'}
                  </button>
                </div>

                {/* WhatsApp & Text Sharing Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => openWhatsAppShare(viewDetailsSession)}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/50"
                  >
                    <MessageSquare className="w-4 h-4" /> Share via WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(getWhatsAppShareText(viewDetailsSession), 'WA')}
                    className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition"
                  >
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    {copiedWaMsg ? 'Message Copied!' : 'Copy WA Message'}
                  </button>
                </div>
              </div>

              {/* Session Consent Preview */}
              {viewDetailsSession.consentText && (
                <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Client Consent Statement
                  </span>
                  <p className="text-xs text-slate-300 italic line-clamp-3">
                    "{viewDetailsSession.consentText}"
                  </p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setViewDetailsSession(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>

              {['REQUESTED', 'SCHEDULED', 'IN_PROGRESS'].includes(viewDetailsSession.status) && (
                <a
                  href={`/video-kyc/${viewDetailsSession.sessionId}?role=admin`}
                  target="_blank"
                  rel="noreferrer"
                  className="py-2 px-5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/40"
                >
                  <Play className="w-4 h-4" /> Enter Room as Admin
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
