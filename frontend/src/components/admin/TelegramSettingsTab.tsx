'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  Users,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Zap,
  HelpCircle,
  TrendingUp,
  Flame,
  Plus,
  Trash2,
  Edit2,
  Search,
  CheckCircle,
  XCircle,
  Layers,
  ArrowRight,
  Link as LinkIcon,
  Globe,
  Smartphone,
  KeyRound,
  Unlink,
  CheckCheck,
  Sliders,
  Award,
  ChevronRight,
  ShieldAlert,
  Info,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  PlusCircle,
  CheckSquare,
  UserCheck,
  History,
  Filter,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface TelegramGroupItem {
  _id: string;
  id?: string;
  name: string;
  chatId: string;
  inviteLink?: string | null;
  type?: string;
  username?: string | null;
  memberCount?: number;
  isDefault?: boolean;
  status: string;
  createdAt?: string;
}

interface PlanMatrixItem {
  planId: string;
  name: string;
  price: number;
  durationMonths: number;
  researchSegments: string;
  status: string;
  telegramChatId: string | null;
  telegramGroupName: string | null;
  telegramInviteLink: string | null;
  isCustomMapped: boolean;
  groupType: string;
  activeSubscribers: number;
}

interface TelegramAuthStatus {
  isConnected: boolean;
  phone: string | null;
  user: {
    id: string;
    firstName: string;
    lastName?: string | null;
    username?: string | null;
    phone?: string | null;
  } | null;
  hasSession: boolean;
}

export default function TelegramSettingsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingCustomSignal, setSendingCustomSignal] = useState(false);

  // Phone MTProto Connection State
  const [authStatus, setAuthStatus] = useState<TelegramAuthStatus>({
    isConnected: false,
    phone: null,
    user: null,
    hasSession: false
  });
  const [phoneInput, setPhoneInput] = useState('+91');
  const [otpCode, setOtpCode] = useState('');
  const [password2FA, setPassword2FA] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [is2FARequired, setIs2FARequired] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [syncingAccountGroups, setSyncingAccountGroups] = useState(false);
  const [disconnectingAccount, setDisconnectingAccount] = useState(false);

  // Multi-Plan Group Matrix State
  const [planMatrix, setPlanMatrix] = useState<PlanMatrixItem[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [savingMatrix, setSavingMatrix] = useState(false);
  const [matrixDraft, setMatrixDraft] = useState<Record<string, { chatId: string; groupName: string; inviteLink: string }>>({});
  const [generatingPlanInviteId, setGeneratingPlanInviteId] = useState<string | null>(null);
  const [testingPlanPingId, setTestingPlanPingId] = useState<string | null>(null);
  const [copiedPlanId, setCopiedPlanId] = useState<string | null>(null);

  // Bot Core Settings State
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Status Info from Server
  const [botInfo, setBotInfo] = useState<any>(null);
  const [chatInfo, setChatInfo] = useState<any>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Dynamic Groups State
  const [groups, setGroups] = useState<TelegramGroupItem[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  // Add / Edit Group Modal State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'AUTO_CREATE' | 'PICK_EXISTING' | 'MANUAL'>('AUTO_CREATE');
  const [editingGroup, setEditingGroup] = useState<TelegramGroupItem | null>(null);
  const [groupName, setGroupName] = useState('');
  const [channelAbout, setChannelAbout] = useState('Official SEBI Registered Trading Advisory Channel');
  const [groupChatId, setGroupChatId] = useState('');
  const [groupInviteLink, setGroupInviteLink] = useState('');
  const [groupType, setGroupType] = useState('channel');
  const [groupIsDefault, setGroupIsDefault] = useState(false);
  const [groupStatus, setGroupStatus] = useState('ACTIVE');
  const [selectedPlanForGroup, setSelectedPlanForGroup] = useState<string>('');
  const [selectedExistingChatId, setSelectedExistingChatId] = useState<string>('');
  const [showAdvancedGroupSettings, setShowAdvancedGroupSettings] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);

  // Auto-Detect Modal State
  const [isAutoDetectModalOpen, setIsAutoDetectModalOpen] = useState(false);
  const [detectingGroups, setDetectingGroups] = useState(false);
  const [detectResults, setDetectResults] = useState<any[]>([]);
  const [autoDetectError, setAutoDetectError] = useState<string | null>(null);
  const [importingGroups, setImportingGroups] = useState(false);

  // Action Loading states for specific groups
  const [testingGroupId, setTestingGroupId] = useState<string | null>(null);
  const [generatingInviteGroupId, setGeneratingInviteGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);

  // Signal Broadcast Tester State
  const [targetGroupId, setTargetGroupId] = useState<string>('default');
  const [testSymbol, setTestSymbol] = useState('NIFTY');
  const [testAction, setTestAction] = useState('BUY');
  const [testEntry, setTestEntry] = useState('25000');
  const [testTarget, setTestTarget] = useState('25200');
  const [testTarget2, setTestTarget2] = useState('');
  const [testStopLoss, setTestStopLoss] = useState('24900');
  const [testSegment, setTestSegment] = useState('EQUITY');
  const [testNote, setTestNote] = useState('Live test signal broadcast from Admin Settings desk.');

  // Section 5: Linked Telegram Clients State
  const [linkedUsers, setLinkedUsers] = useState<any[]>([]);
  const [loadingLinkedUsers, setLoadingLinkedUsers] = useState(false);
  const [linkedUserSearch, setLinkedUserSearch] = useState('');

  // Section 6: Telegram Delivery Logs State
  const [deliveryLogs, setDeliveryLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPagination, setLogsPagination] = useState({ total: 0, page: 1, totalPages: 1, limit: 20 });
  const [logFilterPlan, setLogFilterPlan] = useState('');
  const [logFilterType, setLogFilterType] = useState('');
  const [logFilterStatus, setLogFilterStatus] = useState('');

  // 1. Fetch All Initial Data
  const fetchAllData = async () => {
    setLoading(true);
    setConnectionError(null);
    try {
      const [settingsRes, groupsRes, authRes, matrixRes, linkedRes, logsRes] = await Promise.allSettled([
        api.getTelegramSettings(),
        api.getTelegramGroups(),
        api.getTelegramAuthStatus(),
        api.getTelegramPlanMatrix(),
        api.getLinkedTelegramUsers(),
        api.getTelegramDeliveryLogs({ limit: 20 })
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.success && settingsRes.value.data) {
        const d = settingsRes.value.data;
        setIsConfigured(Boolean(d.isConfigured));
        setChatId(d.chatId || '');
        setInviteLink(d.inviteLink || '');
        setBotInfo(d.bot || null);
        setChatInfo(d.chat || null);
        setMemberCount(d.memberCount ?? null);
        setConnectionError(d.connectionError || null);
        if (d.botToken) {
          setBotToken(d.botToken);
        } else if (!botToken && d.botTokenMasked) {
          setBotToken(d.botTokenMasked);
        }
      }

      if (groupsRes.status === 'fulfilled' && groupsRes.value?.success && groupsRes.value.data) {
        setGroups(groupsRes.value.data);
      }

      if (authRes.status === 'fulfilled' && authRes.value?.success && authRes.value.data) {
        setAuthStatus(authRes.value.data);
        if (authRes.value.data.phone) {
          setPhoneInput(authRes.value.data.phone);
        }
      }

      if (matrixRes.status === 'fulfilled' && matrixRes.value?.success && matrixRes.value.data) {
        const pList: PlanMatrixItem[] = matrixRes.value.data.plans || [];
        setPlanMatrix(pList);
        const draft: Record<string, { chatId: string; groupName: string; inviteLink: string }> = {};
        pList.forEach(p => {
          draft[p.planId] = {
            chatId: p.telegramChatId || '',
            groupName: p.telegramGroupName || '',
            inviteLink: p.telegramInviteLink || ''
          };
        });
        setMatrixDraft(draft);
      }

      if (linkedRes.status === 'fulfilled' && linkedRes.value?.success && linkedRes.value.data) {
        setLinkedUsers(linkedRes.value.data);
      }

      if (logsRes.status === 'fulfilled' && logsRes.value?.success && logsRes.value.data) {
        setDeliveryLogs(logsRes.value.data);
        if (logsRes.value.pagination) {
          setLogsPagination(logsRes.value.pagination);
        }
      }
    } catch (err: any) {
      console.error('Failed to load Telegram Hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await api.getTelegramGroups();
      if (res?.success && res.data) {
        setGroups(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchPlanMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await api.getTelegramPlanMatrix();
      if (res?.success && res.data?.plans) {
        const pList: PlanMatrixItem[] = res.data.plans;
        setPlanMatrix(pList);
        const draft: Record<string, { chatId: string; groupName: string; inviteLink: string }> = {};
        pList.forEach(p => {
          draft[p.planId] = {
            chatId: p.telegramChatId || '',
            groupName: p.telegramGroupName || '',
            inviteLink: p.telegramInviteLink || ''
          };
        });
        setMatrixDraft(draft);
      }
    } catch (err: any) {
      console.error('Failed to fetch plan matrix:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  const fetchLinkedUsers = async () => {
    setLoadingLinkedUsers(true);
    try {
      const res = await api.getLinkedTelegramUsers();
      if (res?.success && res.data) {
        setLinkedUsers(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch linked Telegram users:', err);
    } finally {
      setLoadingLinkedUsers(false);
    }
  };

  const fetchDeliveryLogs = async (page = 1) => {
    setLoadingLogs(true);
    try {
      const res = await api.getTelegramDeliveryLogs({
        planId: logFilterPlan || undefined,
        targetType: logFilterType || undefined,
        status: logFilterStatus || undefined,
        page,
        limit: 20
      });
      if (res?.success && res.data) {
        setDeliveryLogs(res.data);
        if (res.pagination) {
          setLogsPagination(res.pagination);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch delivery logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // --- PHONE MTPROTO LOGIN HANDLERS ---
  const handleSendPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!phoneInput || phoneInput.trim().length < 8) {
      toast.error('Please enter a valid phone number with country code (e.g. +91 98765 43210)');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await api.sendTelegramPhoneOtp(phoneInput.trim());
      if (res?.success && res.data?.phoneCodeHash) {
        setPhoneCodeHash(res.data.phoneCodeHash);
        setIsOtpSent(true);
        toast.success(`Telegram verification code sent to ${res.data.phoneNumber || phoneInput}! Check your Telegram app.`);
      } else {
        toast.error(res?.message || 'Failed to send Telegram code');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error sending Telegram code');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 3) {
      toast.error('Please enter the verification code received on Telegram');
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await api.verifyTelegramPhoneOtp({
        phoneNumber: phoneInput.trim(),
        phoneCode: otpCode.trim(),
        phoneCodeHash,
        password: password2FA.trim() || undefined
      });

      if (res?.success) {
        toast.success(res.message || 'Telegram account connected and groups synced successfully!');
        setIsOtpSent(false);
        setOtpCode('');
        setPassword2FA('');
        setIs2FARequired(false);
        setAuthStatus({
          isConnected: true,
          phone: phoneInput.trim(),
          user: res.data?.user || null,
          hasSession: true
        });
        await fetchAllData();
      } else {
        if (res?.is2faRequired || res?.message?.includes('2FA')) {
          setIs2FARequired(true);
          toast.error('Two-Step Verification Password required. Please enter your 2FA password.');
        } else {
          toast.error(res?.message || 'Invalid Telegram code');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSyncAccountGroups = async () => {
    setSyncingAccountGroups(true);
    try {
      const res = await api.syncTelegramAccountGroups();
      if (res?.success) {
        toast.success(res.message || 'Synchronized channels & groups from your Telegram account!');
        await Promise.all([fetchGroups(), fetchPlanMatrix()]);
      } else {
        toast.error(res?.message || 'Sync failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error syncing groups');
    } finally {
      setSyncingAccountGroups(false);
    }
  };

  const handleDisconnectAccount = async () => {
    const confirm = window.confirm('Are you sure you want to disconnect your Telegram phone session?');
    if (!confirm) return;

    setDisconnectingAccount(true);
    try {
      const res = await api.disconnectTelegramAccount();
      if (res?.success) {
        toast.success('Telegram phone account disconnected.');
        setIsOtpSent(false);
        setOtpCode('');
        setPassword2FA('');
        await fetchAllData();
      } else {
        toast.error(res?.message || 'Disconnect failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error disconnecting');
    } finally {
      setDisconnectingAccount(false);
    }
  };

  // --- MULTI-PLAN GROUP MATRIX HANDLERS ---
  const handlePlanGroupSelect = async (planId: string, value: string) => {
    let targetChatId = '';
    let targetGroupName = 'Primary Default Group';
    let targetInviteLink = '';

    if (value === 'DEFAULT' || value === '') {
      targetChatId = chatId || '';
      targetGroupName = 'Primary Default Group';
      targetInviteLink = inviteLink || '';
    } else {
      const matched = groups.find(g => (g._id || g.id) === value || g.chatId === value);
      if (matched) {
        targetChatId = matched.chatId;
        targetGroupName = matched.name;
        targetInviteLink = matched.inviteLink || '';
      }
    }

    setMatrixDraft(prev => ({
      ...prev,
      [planId]: {
        chatId: targetChatId,
        groupName: targetGroupName,
        inviteLink: targetInviteLink
      }
    }));

    // Instantly persist mapping in backend
    try {
      await api.bulkMapTelegramPlans([{
        planId,
        telegramChatId: targetChatId || null,
        telegramGroupName: targetGroupName || null,
        telegramInviteLink: targetInviteLink || null
      }]);
      toast.success(`Telegram channel mapped to plan!`, { id: `plan-map-${planId}`, duration: 2000 });
    } catch (err: any) {
      console.warn('Auto-save plan mapping warning:', err.message);
    }
  };

  const handleSavePlanMatrix = async () => {
    setSavingMatrix(true);
    try {
      const mappings = Object.entries(matrixDraft).map(([planId, data]) => ({
        planId,
        telegramChatId: data.chatId || null,
        telegramGroupName: data.groupName || null,
        telegramInviteLink: data.inviteLink || null
      }));

      const res = await api.bulkMapTelegramPlans(mappings);
      if (res?.success) {
        toast.success(res.message || 'Plan-to-Telegram mappings updated successfully!');
        await fetchPlanMatrix();
      } else {
        toast.error(res?.message || 'Failed to save plan mappings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving plan mappings');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleGeneratePlanInvite = async (plan: PlanMatrixItem) => {
    const currentChatId = matrixDraft[plan.planId]?.chatId || plan.telegramChatId;
    if (!currentChatId) {
      toast.error('Please assign a Telegram group first.');
      return;
    }

    setGeneratingPlanInviteId(plan.planId);
    try {
      const matchedGroup = groups.find(g => String(g.chatId).trim() === String(currentChatId).trim());
      if (matchedGroup) {
        const res = await api.generateTelegramGroupInvite(matchedGroup._id || matchedGroup.id!);
        if (res?.success && res.data?.inviteLink) {
          const newLink = res.data.inviteLink;
          setMatrixDraft(prev => ({
            ...prev,
            [plan.planId]: {
              ...prev[plan.planId],
              inviteLink: newLink
            }
          }));
          toast.success(`Generated invite link for ${plan.name}!`);
          await fetchPlanMatrix();
          return;
        }
      }

      toast.error('Please ensure Telegram Bot is added as an Admin in this group with invite rights.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate invite link');
    } finally {
      setGeneratingPlanInviteId(null);
    }
  };

  const handleTestPlanPing = async (plan: PlanMatrixItem) => {
    const currentChatId = matrixDraft[plan.planId]?.chatId || plan.telegramChatId;
    if (!currentChatId) {
      toast.error('No Telegram Group assigned to test ping.');
      return;
    }

    setTestingPlanPingId(plan.planId);
    try {
      const res = await api.sendTelegramSignal({
        symbol: 'PING',
        action: 'BUY',
        entry: '100',
        target: '110',
        stopLoss: '95',
        description: `🔔 Test verification ping for subscription plan: [${plan.name}]`,
        chatId: currentChatId,
        planId: plan.planId
      } as any);

      if (res?.success) {
        toast.success(`Verification ping sent to [${plan.name}] group!`);
      } else {
        toast.error(res?.message || 'Ping failed. Check bot admin rights.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Ping failed');
    } finally {
      setTestingPlanPingId(null);
    }
  };

  const handleCopyPlanInvite = (planId: string, link: string) => {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopiedPlanId(planId);
    toast.success('Telegram invite link copied to clipboard!');
    setTimeout(() => setCopiedPlanId(null), 2500);
  };

  // --- BOT SETTINGS HANDLERS ---
  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setTestResult(null);
    try {
      const payload: any = {
        chatId: chatId.trim(),
        inviteLink: inviteLink.trim()
      };
      if (botToken && !botToken.includes('...')) {
        payload.botToken = botToken.trim();
      }

      const res = await api.updateTelegramSettings(payload);
      if (res?.success) {
        toast.success('Telegram configuration saved successfully!');
        await fetchAllData();
      } else {
        toast.error(res?.message || 'Failed to save settings');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const payload: any = {};
      if (botToken && !botToken.includes('...')) {
        payload.botToken = botToken.trim();
      }
      if (chatId) {
        payload.chatId = chatId.trim();
      }

      const res = await api.testTelegramConnection(payload);
      if (res?.success) {
        setTestResult({
          success: true,
          message: res.message || 'Telegram Bot connected & verified! Check your group for the test message.'
        });
        toast.success('Telegram connection verified!');
        await fetchAllData();
      } else {
        setTestResult({
          success: false,
          message: res?.message || 'Connection test failed. Check bot token & group permissions.'
        });
        toast.error(res?.message || 'Connection failed');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Failed to communicate with server.'
      });
      toast.error(err.message || 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  // --- OPEN MODAL (AUTO-CREATE OR LINK) ---
  const handleOpenAddGroup = (preselectedPlanId?: string) => {
    setEditingGroup(null);
    setGroupName('');
    setChannelAbout('Official SEBI Registered Trading Advisory Channel');
    setGroupChatId('');
    setGroupInviteLink('');
    setGroupType('channel');
    setGroupIsDefault(groups.length === 0);
    setGroupStatus('ACTIVE');
    setSelectedPlanForGroup(preselectedPlanId || (planMatrix.length > 0 ? planMatrix[0].planId : ''));
    setSelectedExistingChatId('');
    setShowAdvancedGroupSettings(false);
    setModalMode(authStatus.isConnected ? 'AUTO_CREATE' : (groups.length > 0 ? 'PICK_EXISTING' : 'MANUAL'));
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (group: TelegramGroupItem) => {
    setEditingGroup(group);
    setGroupName(group.name || '');
    setGroupChatId(group.chatId || '');
    setGroupInviteLink(group.inviteLink || '');
    setGroupType(group.type || 'supergroup');
    setGroupIsDefault(Boolean(group.isDefault));
    setGroupStatus(group.status || 'ACTIVE');
    setSelectedPlanForGroup('');
    setShowAdvancedGroupSettings(false);
    setModalMode('MANUAL');
    setIsGroupModalOpen(true);
  };

  const handleSelectExistingChannel = (chatIdVal: string) => {
    setSelectedExistingChatId(chatIdVal);
    if (!chatIdVal) return;
    const found = groups.find(g => g.chatId === chatIdVal || (g._id || g.id) === chatIdVal);
    if (found) {
      setGroupName(found.name);
      setGroupChatId(found.chatId);
      if (found.inviteLink) setGroupInviteLink(found.inviteLink);
      if (found.type) setGroupType(found.type);
    }
  };

  // Submit Handler for Modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. AUTO-CREATE BRAND NEW CHANNEL ON TELEGRAM ACCOUNT DIRECTLY!
    if (modalMode === 'AUTO_CREATE' && !editingGroup) {
      if (!groupName.trim()) {
        toast.error('Please enter Channel Title');
        return;
      }

      setSavingGroup(true);
      try {
        const res = await api.createTelegramChannelViaAccount({
          title: groupName.trim(),
          about: channelAbout.trim() || undefined,
          isBroadcast: groupType === 'channel',
          assignedPlanId: selectedPlanForGroup || undefined
        });

        if (res?.success) {
          toast.success(res.message || `Channel "${groupName}" created on your Telegram account!`);
          setIsGroupModalOpen(false);
          await Promise.all([fetchGroups(), fetchPlanMatrix()]);
        } else {
          toast.error(res?.message || 'Failed to create channel on Telegram');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error creating channel');
      } finally {
        setSavingGroup(false);
      }
      return;
    }

    // 2. PICK EXISTING DISCOVERED CHANNEL OR MANUAL GROUP LINK
    if (!groupName.trim()) {
      toast.error('Please enter Group / Channel Name');
      return;
    }

    setSavingGroup(true);
    try {
      if (editingGroup) {
        const res = await api.updateTelegramGroup(editingGroup._id || editingGroup.id!, {
          name: groupName.trim(),
          chatId: groupChatId.trim() || editingGroup.chatId,
          inviteLink: groupInviteLink.trim() || '',
          type: groupType,
          isDefault: groupIsDefault,
          status: groupStatus
        });
        if (res?.success) {
          toast.success(`Group "${groupName}" updated successfully!`);
          setIsGroupModalOpen(false);
          await Promise.all([fetchGroups(), fetchPlanMatrix()]);
        } else {
          toast.error(res?.message || 'Failed to update group');
        }
      } else {
        const res = await api.createTelegramGroup({
          name: groupName.trim(),
          chatId: groupChatId.trim() || undefined,
          inviteLink: groupInviteLink.trim() || undefined,
          type: groupType,
          isDefault: groupIsDefault,
          status: groupStatus,
          assignedPlanId: selectedPlanForGroup || undefined
        } as any);

        if (res?.success) {
          toast.success(`Telegram group "${groupName}" linked to plan successfully!`);
          setIsGroupModalOpen(false);
          await Promise.all([fetchGroups(), fetchPlanMatrix()]);
        } else {
          toast.error(res?.message || 'Failed to link group');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving group');
    } finally {
      setSavingGroup(false);
    }
  };

  const handleDeleteGroup = async (group: TelegramGroupItem) => {
    const confirm = window.confirm(`Are you sure you want to delete the Telegram group "${group.name}"?`);
    if (!confirm) return;

    try {
      const res = await api.deleteTelegramGroup(group._id || group.id!);
      if (res?.success) {
        toast.success(`Group "${group.name}" deleted.`);
        await Promise.all([fetchGroups(), fetchPlanMatrix()]);
      } else {
        toast.error(res?.message || 'Failed to delete group');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting group');
    }
  };

  const handleTestGroupPing = async (group: TelegramGroupItem) => {
    const gid = group._id || group.id!;
    setTestingGroupId(gid);
    try {
      const res = await api.testTelegramGroupPing(gid);
      if (res?.success) {
        toast.success(`Verification ping sent to "${group.name}"!`);
      } else {
        toast.error(res?.message || 'Failed to send ping. Ensure bot has admin permissions.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Test failed');
    } finally {
      setTestingGroupId(null);
    }
  };

  const handleGenerateInvite = async (group: TelegramGroupItem) => {
    const gid = group._id || group.id!;
    setGeneratingInviteGroupId(gid);
    try {
      const res = await api.generateTelegramGroupInvite(gid);
      if (res?.success && res.data?.inviteLink) {
        toast.success('New invite link generated and saved!');
        await Promise.all([fetchGroups(), fetchPlanMatrix()]);
      } else {
        toast.error(res?.message || 'Could not generate invite link. Ensure bot is admin in the group.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invite link generation failed');
    } finally {
      setGeneratingInviteGroupId(null);
    }
  };

  const handleCopyGroupInvite = (group: TelegramGroupItem) => {
    if (!group.inviteLink) return;
    navigator.clipboard.writeText(group.inviteLink);
    setCopiedGroupId(group._id || group.id!);
    toast.success(`Invite link for "${group.name}" copied!`);
    setTimeout(() => setCopiedGroupId(null), 2500);
  };

  // --- AUTO-DETECT MODAL HANDLERS ---
  const handleOpenAutoDetect = async () => {
    setIsAutoDetectModalOpen(true);
    setDetectingGroups(true);
    setAutoDetectError(null);
    setDetectResults([]);

    try {
      const res = await api.autoDetectTelegramGroups(false);
      if (res?.success && res.data) {
        setDetectResults(res.data.detectedGroups || []);
      } else {
        setAutoDetectError(res?.message || 'No groups found in recent bot updates.');
      }
    } catch (err: any) {
      setAutoDetectError(err.message || 'Failed to run auto-detection.');
    } finally {
      setDetectingGroups(false);
    }
  };

  const handleImportDetectedGroup = async (item: any) => {
    try {
      const res = await api.createTelegramGroup({
        name: item.name,
        chatId: item.chatId,
        inviteLink: item.inviteLink || undefined,
        type: item.type || 'supergroup',
        isDefault: groups.length === 0,
        status: 'ACTIVE'
      });
      if (res?.success) {
        toast.success(`Imported "${item.name}"!`);
        setDetectResults(prev => prev.map(g => g.chatId === item.chatId ? { ...g, isAlreadyRegistered: true } : g));
        await Promise.all([fetchGroups(), fetchPlanMatrix()]);
      } else {
        toast.error(res?.message || 'Failed to import group');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error importing group');
    }
  };

  const handleImportAllDetected = async () => {
    setImportingGroups(true);
    try {
      const res = await api.autoDetectTelegramGroups(true);
      if (res?.success) {
        toast.success(res.message || 'Imported all new detected groups!');
        setIsAutoDetectModalOpen(false);
        await Promise.all([fetchGroups(), fetchPlanMatrix()]);
      } else {
        toast.error(res?.message || 'Import failed');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error importing groups');
    } finally {
      setImportingGroups(false);
    }
  };

  // --- SIGNAL BROADCAST TESTER ---
  const handleSendTestSignal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingCustomSignal(true);
    try {
      const payload: any = {
        symbol: testSymbol.trim().toUpperCase(),
        action: testAction,
        entry: parseFloat(testEntry),
        target: parseFloat(testTarget),
        stopLoss: parseFloat(testStopLoss),
        segment: testSegment,
        description: testNote.trim()
      };
      if (testTarget2) payload.target2 = parseFloat(testTarget2);

      let options: any = {};
      if (targetGroupId !== 'default') {
        const found = groups.find(g => (g._id || g.id) === targetGroupId);
        if (found) {
          options.chatId = found.chatId;
        }
      }

      const res = await api.sendTelegramSignal({ ...payload, ...options });
      if (res?.success) {
        toast.success(`Trading signal sent to Telegram group successfully!`);
      } else {
        toast.error(res?.message || 'Failed to broadcast signal');
      }
    } catch (err: any) {
      toast.error(err.message || 'Signal broadcast error');
    } finally {
      setSendingCustomSignal(false);
    }
  };

  const filteredGroups = groups.filter(g =>
    (g.name || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
    (g.chatId || '').toLowerCase().includes(groupSearchQuery.toLowerCase()) ||
    (g.username || '').toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      
    

      {/* SECTION 1: 1-CLICK TELEGRAM ACCOUNT CONNECTION (PHONE & OTP) */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                1-Click Telegram Account Connect (Phone & OTP)
                {authStatus.isConnected && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Connected
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Login with your Telegram Phone number to auto-discover channels and directly create new channels on your account with 1-click.
              </p>
            </div>
          </div>

          {authStatus.isConnected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAccountGroups}
                disabled={syncingAccountGroups}
                className="flex items-center space-x-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAccountGroups ? 'animate-spin' : ''}`} />
                <span>{syncingAccountGroups ? 'Syncing...' : 'Re-sync My Channels'}</span>
              </button>
              <button
                type="button"
                onClick={handleDisconnectAccount}
                disabled={disconnectingAccount}
                className="flex items-center space-x-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                title="Disconnect session"
              >
                <Unlink className="w-3.5 h-3.5" />
                <span>Disconnect</span>
              </button>
            </div>
          )}
        </div>

        {authStatus.isConnected ? (
          /* CONNECTED STATE DETAILS */
          <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0088cc] to-sky-400 text-white flex items-center justify-center font-black text-lg shadow-md shadow-sky-500/20">
                {(authStatus.user?.firstName || 'T')[0].toUpperCase()}
              </div>
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  {authStatus.user?.firstName} {authStatus.user?.lastName || ''}
                  {authStatus.user?.username && (
                    <span className="text-xs text-[#0088cc] font-mono">@{authStatus.user.username}</span>
                  )}
                </h4>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  📱 Phone: <span className="font-semibold text-slate-700 dark:text-slate-300">{authStatus.phone}</span>
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                  <CheckCheck className="w-3.5 h-3.5" />
                  Telegram MTProto Session Active — You can auto-create channels directly!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddGroup()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Create Channel on Telegram</span>
              </button>
            </div>
          </div>
        ) : (
          /* NOT CONNECTED STATE: PHONE / OTP INPUT FORM */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 space-y-4">
              {!isOtpSent ? (
                /* Step 1: Phone Number Input */
                <form onSubmit={handleSendPhoneOtp} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter your Telegram Registered Phone Number
                  </label>
                  <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                    <div className="relative flex-1">
                      <Smartphone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={e => setPhoneInput(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs font-mono focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sendingOtp || !phoneInput.trim()}
                      className="flex items-center justify-center space-x-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#0088cc]/20 transition disabled:opacity-50"
                    >
                      {sendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      <span>{sendingOtp ? 'Sending Code...' : 'Send Telegram OTP'}</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Include country code (e.g. <code>+91</code>). Telegram will send the login code directly to your Telegram mobile/desktop app.
                  </p>
                </form>
              ) : (
                /* Step 2: OTP & 2FA Verification */
                <form onSubmit={handleVerifyPhoneOtp} className="space-y-4 p-5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <KeyRound className="w-4 h-4 text-[#0088cc]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-white">
                        Enter Telegram Code for <span className="font-mono text-[#0088cc]">{phoneInput}</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOtpSent(false)}
                      className="text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 underline"
                    >
                      Change Phone
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <input
                        type="text"
                        required
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value)}
                        placeholder="Enter 5-digit Telegram Code (e.g. 84920)"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-mono tracking-widest text-center text-sm font-bold focus:border-[#0088cc] outline-none"
                      />
                    </div>

                    {/* Optional / Required 2FA Password */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Two-Step Verification (2FA) Password {is2FARequired ? <span className="text-rose-500 font-bold">* Required</span> : '(If enabled on Telegram)'}
                      </label>
                      <input
                        type="password"
                        value={password2FA}
                        onChange={e => setPassword2FA(e.target.value)}
                        placeholder="Enter 2FA cloud password if set"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:border-[#0088cc] outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="submit"
                        disabled={verifyingOtp || !otpCode.trim()}
                        className="flex-1 flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50"
                      >
                        {verifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        <span>{verifyingOtp ? 'Verifying & Syncing...' : 'Verify & Auto-Import Channels'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSendPhoneOtp}
                        disabled={sendingOtp}
                        className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition"
                      >
                        Resend
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Explanatory Benefit Box */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              <h5 className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Why Phone + OTP Hybrid is Best:
              </h5>
              <ul className="space-y-1.5 list-disc list-inside">
                <li><b className="text-slate-800 dark:text-slate-200">Auto-Create Channels:</b> Create live Telegram channels directly from portal.</li>
                <li><b className="text-slate-800 dark:text-slate-200">Zero Configuration:</b> No need to find or copy Chat IDs.</li>
                <li><b className="text-slate-800 dark:text-slate-200">Multi-Plan Allocation:</b> Assign separate groups to distinct plans in 1 click.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: MULTI-PLAN TELEGRAM GROUP MAPPING MATRIX */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-2xl">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Multi-Plan Telegram Group Mapping Matrix
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  Plan-Wise Setup
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Route signals automatically to distinct Telegram groups/channels based on client subscription plan tiers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleOpenAddGroup()}
              className="flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-4 py-2.5 rounded-2xl text-xs font-bold border border-indigo-200 dark:border-indigo-800 transition"
            >
              <FolderPlus className="w-4 h-4" />
              <span>{authStatus.isConnected ? 'Create / Link Channel' : 'Link Group to Plan'}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePlanMatrix}
              disabled={savingMatrix || loadingMatrix}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
            >
              {savingMatrix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{savingMatrix ? 'Saving Mappings...' : 'Save Plan Mappings'}</span>
            </button>
          </div>
        </div>

        {/* Quick Bot Setup Helper Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-[#0088cc] text-white rounded-xl mt-0.5 sm:mt-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
              <p className="font-bold text-slate-900 dark:text-white">
                How to enable Signal Broadcasting for your Channels / Groups:
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Telegram requires that your Broadcast Bot (<span className="font-mono font-bold text-[#0088cc]">@Complince_signal_bot</span>) must be an <b>Administrator</b> in your channel/group with <i>Post Messages</i> rights.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://t.me/Complince_signal_bot?startchannel=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Bot to Channel</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
            <a
              href="https://t.me/Complince_signal_bot?startgroup=true"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 transition"
            >
              <span>Add to Group</span>
              <ExternalLink className="w-3 h-3 ml-0.5 opacity-70" />
            </a>
          </div>
        </div>

        {loadingMatrix ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading subscription plans matrix...</p>
          </div>
        ) : planMatrix.length === 0 ? (
          <div className="py-12 text-center space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Subscription Plans Found</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Create advisory subscription plans under Plan Management to configure dedicated Telegram groups for each tier.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {planMatrix.map(plan => {
                const currentDraft = matrixDraft[plan.planId] || {
                  chatId: plan.telegramChatId || '',
                  groupName: plan.telegramGroupName || '',
                  inviteLink: plan.telegramInviteLink || ''
                };
                const isGenerating = generatingPlanInviteId === plan.planId;
                const isTesting = testingPlanPingId === plan.planId;
                const isCopied = copiedPlanId === plan.planId;

                // Find matching group object
                const matchedGroup = groups.find(g => String(g.chatId).trim() === String(currentDraft.chatId).trim());

                return (
                  <div
                    key={plan.planId}
                    className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 transition shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    {/* Plan Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {plan.researchSegments || 'EQUITY'}
                          </span>
                          <h4 className="text-base font-black text-slate-900 dark:text-white mt-1.5">
                            {plan.name}
                          </h4>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-slate-900 dark:text-white">
                            ₹{plan.price.toLocaleString()}
                          </span>
                          <p className="text-[10px] text-slate-500">/{plan.durationMonths}m</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                        <span><b>{plan.activeSubscribers}</b> active client{plan.activeSubscribers !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Mapped Group Dropdown */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        <span>Assigned Telegram Group</span>
                        <button
                          type="button"
                          onClick={() => handleOpenAddGroup(plan.planId)}
                          className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 font-bold"
                        >
                          <Plus className="w-3 h-3" />
                          <span>New Group / Channel</span>
                        </button>
                      </div>
                      
                      <select
                        value={
                          matchedGroup
                            ? (matchedGroup._id || matchedGroup.id || matchedGroup.chatId)
                            : (currentDraft.chatId ? currentDraft.chatId : 'DEFAULT')
                        }
                        onChange={e => {
                          if (e.target.value === '__CREATE_NEW__') {
                            handleOpenAddGroup(plan.planId);
                            return;
                          }
                          handlePlanGroupSelect(plan.planId, e.target.value);
                        }}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-2.5 text-xs focus:border-indigo-500 outline-none font-medium text-slate-800 dark:text-slate-200"
                      >
                        <option value="DEFAULT">⭐ Primary Default Group ({chatId || 'Configured'})</option>
                        <option value="__CREATE_NEW__" className="font-bold text-indigo-600 dark:text-indigo-400">
                          ⚡ ➕ Auto-Create New Channel on Telegram for {plan.name}...
                        </option>
                        {groups.map(grp => (
                          <option key={grp._id || grp.id || grp.chatId} value={grp._id || grp.id || grp.chatId}>
                            📢 {grp.name} ({grp.type || 'group'})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Invite Link Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-600 dark:text-slate-400">Invite Link</span>
                        {currentDraft.inviteLink ? (
                          <button
                            type="button"
                            onClick={() => handleCopyPlanInvite(plan.planId, currentDraft.inviteLink)}
                            className="text-[#0088cc] hover:underline font-bold flex items-center gap-1"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copied!' : 'Copy Link'}</span>
                          </button>
                        ) : null}
                      </div>

                      {currentDraft.inviteLink ? (
                        <div className="flex items-center space-x-1.5 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                          <Globe className="w-3.5 h-3.5 text-[#0088cc] flex-shrink-0" />
                          <span className="text-[11px] font-mono truncate text-slate-600 dark:text-slate-400 select-all flex-1">
                            {currentDraft.inviteLink}
                          </span>
                          <a
                            href={currentDraft.inviteLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-[#0088cc]"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGeneratePlanInvite(plan)}
                          disabled={isGenerating || !currentDraft.chatId}
                          className="w-full py-1.5 px-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 rounded-xl text-[11px] font-bold border border-indigo-200 dark:border-indigo-900/50 transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
                          <span>Generate Invite Link</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom Plan Actions */}
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTestPlanPing(plan)}
                        disabled={isTesting || !currentDraft.chatId}
                        className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition disabled:opacity-50"
                        title="Send test signal to this plan's Telegram group"
                      >
                        {isTesting ? <Loader2 className="w-3 h-3 animate-spin text-indigo-500" /> : <Radio className="w-3 h-3 text-indigo-500" />}
                        <span>{isTesting ? 'Pinging...' : 'Test Plan Group Ping'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-xs text-indigo-950 dark:text-indigo-200">
                <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>
                  When you publish a Trading Signal for a specific plan, our dispatcher routes the signal directly to its mapped Telegram Channel.
                </span>
              </div>
              <button
                type="button"
                onClick={handleSavePlanMatrix}
                disabled={savingMatrix}
                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {savingMatrix ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save All Mappings</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: ALL MANAGED TELEGRAM GROUPS & AUTO-DISCOVERY */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#0088cc]/10 text-[#0088cc] rounded-2xl">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                All Discovered & Registered Telegram Groups
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {groups.length} Active
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage group credentials, supergroups, broadcast channels, and auto-generated join links.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {authStatus.isConnected && (
              <button
                type="button"
                onClick={handleSyncAccountGroups}
                disabled={syncingAccountGroups}
                className="flex items-center space-x-1.5 bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc] px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingAccountGroups ? 'animate-spin' : ''}`} />
                <span>Sync Phone Groups</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAutoDetect}
              className="flex items-center space-x-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 px-3.5 py-2 rounded-xl text-xs font-bold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Scan Bot Updates</span>
            </button>

            <button
              type="button"
              onClick={() => handleOpenAddGroup()}
              className="flex items-center space-x-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md shadow-[#0088cc]/20 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{authStatus.isConnected ? 'Create / Link Channel' : 'Link / Add Group'}</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={groupSearchQuery}
            onChange={e => setGroupSearchQuery(e.target.value)}
            placeholder="Search groups by name, chat ID, or username..."
            className="w-full bg-transparent text-xs outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400"
          />
        </div>

        {loadingGroups ? (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0088cc] mx-auto" />
            <p className="text-xs font-bold text-slate-500">Loading Telegram groups...</p>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="py-12 text-center space-y-3 p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No Telegram Groups Registered</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Connect your Telegram account above to auto-create or auto-import your channels.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map(group => {
              const isGenerating = generatingInviteGroupId === (group._id || group.id);
              const isTesting = testingGroupId === (group._id || group.id);
              const isCopied = copiedGroupId === (group._id || group.id);

              return (
                <div
                  key={group._id || group.id}
                  className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#0088cc]/40 transition shadow-sm space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            {group.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#0088cc]/10 text-[#0088cc]">
                            {group.type || 'channel'}
                          </span>
                          {group.isDefault && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Default Master
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-xs font-mono space-y-1 text-slate-500 dark:text-slate-400">
                      <p>
                        Chat ID: <span className="font-bold text-slate-800 dark:text-slate-200">{group.chatId}</span>
                      </p>
                      {group.memberCount ? (
                        <p className="text-[11px] flex items-center gap-1">
                          <Users className="w-3 h-3 text-slate-400" />
                          <span>{group.memberCount} members</span>
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Invite Link */}
                  <div className="space-y-1.5">
                    {group.inviteLink ? (
                      <div className="flex items-center space-x-1.5 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                        <Globe className="w-3.5 h-3.5 text-[#0088cc] flex-shrink-0" />
                        <span className="text-[11px] font-mono truncate text-slate-600 dark:text-slate-400 select-all flex-1">
                          {group.inviteLink}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyGroupInvite(group)}
                          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-[#0088cc]"
                          title="Copy Invite Link"
                        >
                          {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleGenerateInvite(group)}
                        disabled={isGenerating}
                        className="w-full text-center py-1.5 px-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-[#0088cc] rounded-xl text-[11px] font-bold border border-[#0088cc]/20 transition flex items-center justify-center gap-1.5"
                      >
                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <LinkIcon className="w-3 h-3" />}
                        <span>Auto-Generate Invite Link</span>
                      </button>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleTestGroupPing(group)}
                      disabled={isTesting}
                      className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition disabled:opacity-50"
                    >
                      {isTesting ? <Loader2 className="w-3 h-3 animate-spin text-[#0088cc]" /> : <Radio className="w-3 h-3 text-[#0088cc]" />}
                      <span>{isTesting ? 'Pinging...' : 'Test Ping'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditGroup(group)}
                      className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                      title="Edit Group"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition"
                      title="Delete Group"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION 4: BOT CREDENTIALS & SIGNAL BROADCAST TESTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* BOT TOKEN & PRIMARY CHAT CONFIGURATION */}
        <div className="lg:col-span-6 bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#0088cc]" />
              Safe Broadcast Bot Credentials
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Broadcasts are routed via the official Bot API to guarantee zero phone ban risk.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Bot Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Bot Token (from @BotFather)</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. 8495264463:AAFD...</span>
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  placeholder="Paste your Telegram Bot Token here"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-mono pr-10 focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none transition"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Primary Chat ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Primary / Default Group Chat ID</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. -5455721319 or -100...</span>
              </label>
              <input
                type="text"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                placeholder="e.g. -5455721319"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-mono focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none transition"
              />
            </div>

            {/* Default Invite Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Default Group Invite Link (Optional)</span>
                <span className="text-[10px] text-slate-400 font-normal">e.g. https://t.me/+AbCd...</span>
              </label>
              <input
                type="text"
                value={inviteLink}
                onChange={e => setInviteLink(e.target.value)}
                placeholder="Leave blank to auto-generate via Bot API"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs focus:border-[#0088cc] focus:ring-1 focus:ring-[#0088cc] outline-none transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                className="flex items-center space-x-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs border border-slate-300 dark:border-slate-700 transition disabled:opacity-50"
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin text-[#0088cc]" /> : <Radio className="w-4 h-4 text-[#0088cc]" />}
                <span>{testing ? 'Testing...' : 'Test Master Bot'}</span>
              </button>

              <button
                type="submit"
                disabled={saving || testing}
                className="flex items-center space-x-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-[#0088cc]/20 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* LIVE SIGNAL BROADCAST TESTER */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                Live Signal Broadcast Dispatcher
              </h4>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#0088cc]/10 text-[#0088cc] border border-[#0088cc]/20">
                Interactive Test
              </span>
            </div>

            <form onSubmit={handleSendTestSignal} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Target Group / Plan
                </label>
                <select
                  value={targetGroupId}
                  onChange={e => setTargetGroupId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                >
                  <option value="default">Primary Default Group ({chatId || 'Global'})</option>
                  {groups.map(grp => (
                    <option key={grp._id || grp.id} value={grp._id || grp.id}>
                      {grp.name} ({grp.chatId})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Symbol</label>
                  <input
                    type="text"
                    required
                    value={testSymbol}
                    onChange={e => setTestSymbol(e.target.value)}
                    placeholder="e.g. RELIANCE"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Action</label>
                  <select
                    value={testAction}
                    onChange={e => setTestAction(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-bold"
                  >
                    <option value="BUY">🟢 BUY</option>
                    <option value="SELL">🔴 SELL</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Entry</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={testEntry}
                    onChange={e => setTestEntry(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-2.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Target 1</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={testTarget}
                    onChange={e => setTestTarget(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-2.5 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Stop Loss</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={testStopLoss}
                    onChange={e => setTestStopLoss(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-2.5 text-xs font-mono text-rose-600 dark:text-rose-400 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sendingCustomSignal || !isConfigured}
                className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white py-2.5 px-4 rounded-xl font-bold text-xs shadow-md transition disabled:opacity-50 mt-2"
              >
                {sendingCustomSignal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{sendingCustomSignal ? 'Broadcasting...' : 'Broadcast Test Signal Now'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* SECTION 5: LINKED TELEGRAM CLIENTS */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Linked Telegram Clients ({linkedUsers.length})
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Active Direct DMs
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Clients who linked their Telegram account via <code>/start &lt;token&gt;</code> and receive automated private signal DMs.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={linkedUserSearch}
                onChange={e => setLinkedUserSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-8 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-indigo-500 w-48"
              />
            </div>
            <button
              type="button"
              onClick={fetchLinkedUsers}
              disabled={loadingLinkedUsers}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs transition"
              title="Refresh Linked Users"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingLinkedUsers ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Clients Table */}
        {loadingLinkedUsers ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0088cc]" />
            <span>Loading linked clients...</span>
          </div>
        ) : linkedUsers.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <Users className="w-8 h-8 text-slate-400 mx-auto" />
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Linked Telegram Clients Yet</h5>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              When clients click &quot;Connect Telegram&quot; on their client dashboard, their account will be automatically linked and listed here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Client Name &amp; Contact</th>
                  <th className="px-4 py-3">Telegram Username</th>
                  <th className="px-4 py-3">Telegram Chat ID</th>
                  <th className="px-4 py-3">Active Subscriptions</th>
                  <th className="px-4 py-3">Linked Date</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                {linkedUsers
                  .filter(u => {
                    if (!linkedUserSearch.trim()) return true;
                    const q = linkedUserSearch.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(q) ||
                      u.email?.toLowerCase().includes(q) ||
                      u.mobile?.includes(q) ||
                      u.telegramUsername?.toLowerCase().includes(q) ||
                      u.telegramChatId?.includes(q)
                    );
                  })
                  .map((user, idx) => (
                    <tr key={user._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{user.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{user.email} • {user.mobile}</div>
                      </td>
                      <td className="px-4 py-3">
                        {user.telegramUsername ? (
                          <span className="inline-flex items-center gap-1 font-mono text-[#0088cc] font-bold bg-[#0088cc]/10 px-2 py-0.5 rounded-lg">
                            @{user.telegramUsername}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No Username</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                          {user.telegramChatId}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {user.activeSubscriptions && user.activeSubscriptions.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.activeSubscriptions.map((s: any, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold border border-indigo-500/20"
                              >
                                {s.planName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">No active plans</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {user.telegramLinkedAt ? new Date(user.telegramLinkedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'N/A'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          Linked
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 6: TELEGRAM SIGNAL DELIVERY LOGS */}
      <div className="bg-white dark:bg-[#0F172A] p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-sky-500/10 text-[#0088cc] rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Telegram Signal Delivery Logs &amp; Audit Trail
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-500/10 text-[#0088cc] border border-sky-500/20">
                  Total {logsPagination.total} Deliveries
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time audit log of every trading signal broadcasted to Telegram channels and sent via direct DMs to active subscribers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchDeliveryLogs(logsPagination.page)}
            disabled={loadingLogs}
            className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3.5 py-2 rounded-xl text-xs font-bold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-500 font-bold text-[11px]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter By:</span>
          </div>

          <select
            value={logFilterPlan}
            onChange={e => {
              setLogFilterPlan(e.target.value);
              fetchDeliveryLogs(1);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">All Plans</option>
            {planMatrix.map(p => (
              <option key={p.planId} value={p.planId}>{p.name}</option>
            ))}
          </select>

          <select
            value={logFilterType}
            onChange={e => {
              setLogFilterType(e.target.value);
              fetchDeliveryLogs(1);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">All Target Types</option>
            <option value="CHANNEL">📢 Channel Broadcasts</option>
            <option value="USER_DIRECT">👤 Subscriber Direct DMs</option>
          </select>

          <select
            value={logFilterStatus}
            onChange={e => {
              setLogFilterStatus(e.target.value);
              fetchDeliveryLogs(1);
            }}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DELIVERED">✅ Delivered</option>
            <option value="FAILED">❌ Failed</option>
          </select>

          {(logFilterPlan || logFilterType || logFilterStatus) && (
            <button
              type="button"
              onClick={() => {
                setLogFilterPlan('');
                setLogFilterType('');
                setLogFilterStatus('');
                fetchDeliveryLogs(1);
              }}
              className="text-xs text-rose-500 hover:underline font-bold ml-auto"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Logs Table */}
        {loadingLogs ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0088cc]" />
            <span>Loading delivery logs...</span>
          </div>
        ) : deliveryLogs.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
            <History className="w-8 h-8 text-slate-400 mx-auto" />
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">No Signal Deliveries Recorded</h5>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              When a trading signal is created, updated, or test-pinged, detailed delivery logs will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp (IST)</th>
                    <th className="px-4 py-3">Signal &amp; Action</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Target &amp; Recipient</th>
                    <th className="px-4 py-3">Target Chat ID</th>
                    <th className="px-4 py-3">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {deliveryLogs.map((log, idx) => {
                    const isSuccess = log.status === 'DELIVERED';
                    const isChannel = log.targetType === 'CHANNEL';

                    return (
                      <tr key={log._id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                          {log.sentAt ? new Date(log.sentAt).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit'
                          }) : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{log.symbol || 'MARKET'}</span>
                            <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                              (log.action || '').toUpperCase().includes('BUY')
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : (log.action || '').toUpperCase().includes('SELL')
                                ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                : 'bg-blue-500/15 text-[#0088cc]'
                            }`}>
                              {log.action || 'SIGNAL'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
                          {log.planName || 'General Broadcast'}
                        </td>
                        <td className="px-4 py-3">
                          {isChannel ? (
                            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
                              <Radio className="w-3.5 h-3.5" />
                              <span>Channel Broadcast</span>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                <Send className="w-3.5 h-3.5 text-[#0088cc]" />
                                <span>{log.recipientName || 'Subscriber DM'}</span>
                              </div>
                              {log.recipientUsername && (
                                <span className="text-[10px] text-slate-400 font-mono">@{log.recipientUsername}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {log.targetChatId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              Delivered {log.telegramMessageId ? `(#${log.telegramMessageId})` : ''}
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <XCircle className="w-3 h-3" />
                                Failed
                              </span>
                              {log.errorMessage && (
                                <p className="text-[10px] text-rose-500 truncate max-w-xs" title={log.errorMessage}>
                                  {log.errorMessage}
                                </p>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {logsPagination.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 px-2 text-xs">
                <span className="text-slate-500">
                  Page {logsPagination.page} of {logsPagination.totalPages} ({logsPagination.total} logs)
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    disabled={logsPagination.page <= 1}
                    onClick={() => fetchDeliveryLogs(logsPagination.page - 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={logsPagination.page >= logsPagination.totalPages}
                    onClick={() => fetchDeliveryLogs(logsPagination.page + 1)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-xs font-bold"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL: CREATE BRAND NEW CHANNEL ON TELEGRAM OR LINK TO PLAN */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">
                    {editingGroup
                      ? 'Edit Telegram Group'
                      : modalMode === 'AUTO_CREATE'
                      ? 'Create New Telegram Channel on Account'
                      : 'Link Telegram Channel to Plan'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {modalMode === 'AUTO_CREATE'
                      ? 'System will automatically create the live channel on Telegram and link it to your plan!'
                      : 'Assign a Telegram group/channel to a subscription plan tier.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs (If creating new) */}
            {!editingGroup && (
              <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalMode('AUTO_CREATE')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    modalMode === 'AUTO_CREATE'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Create Channel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('PICK_EXISTING')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    modalMode === 'PICK_EXISTING'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Pick Discovered ({groups.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setModalMode('MANUAL')}
                  className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
                    modalMode === 'MANUAL'
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Manual Link</span>
                </button>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="space-y-4">
              
              {/* TAB 1: AUTO-CREATE CHANNEL ON TELEGRAM ACCOUNT */}
              {modalMode === 'AUTO_CREATE' && !editingGroup ? (
                <div className="space-y-3.5 animate-fade-in">
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>
                      System will automatically create a real <b>Broadcast Channel</b> on your connected Telegram account ({authStatus.phone || phoneInput}) and link it to your plan!
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Channel Name / Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder="e.g. VIP Nifty Futures Signals"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Channel Description / Bio (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={channelAbout}
                      onChange={e => setChannelAbout(e.target.value)}
                      placeholder="Official SEBI Registered Trading Advisory Channel"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs focus:border-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Assign to Subscription Plan <span className="text-indigo-500">*</span>
                      </label>
                      <select
                        value={selectedPlanForGroup}
                        onChange={e => setSelectedPlanForGroup(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                      >
                        <option value="">-- General / No Specific Plan --</option>
                        {planMatrix.map(p => (
                          <option key={p.planId} value={p.planId}>
                            🏷️ {p.name} (₹{p.price.toLocaleString()} / {p.durationMonths}m)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Channel Type</label>
                      <select
                        value={groupType}
                        onChange={e => setGroupType(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs"
                      >
                        <option value="channel">Broadcast Channel (Recommended)</option>
                        <option value="supergroup">Supergroup (Two-way Chat)</option>
                      </select>
                    </div>
                  </div>

                  {/* Telegram Session Status / Connect Box */}
                  {authStatus.isConnected ? (
                    <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 flex items-center justify-between text-xs">
                      <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                        <CheckCheck className="w-4 h-4 text-emerald-600" />
                        Telegram Account Connected: {authStatus.phone || phoneInput}
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        Ready to Create Live
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/50 space-y-2.5">
                      <div className="flex items-center space-x-2 text-indigo-800 dark:text-indigo-300 font-bold text-xs">
                        <Smartphone className="w-4 h-4" />
                        <span>Connect Telegram Phone (1-Time) to Create Live Channel:</span>
                      </div>

                      {!isOtpSent ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="tel"
                            value={phoneInput}
                            onChange={e => setPhoneInput(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleSendPhoneOtp}
                            disabled={sendingOtp || !phoneInput.trim()}
                            className="bg-[#0088cc] hover:bg-[#0077b5] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-1"
                          >
                            {sendingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            <span>Send OTP</span>
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700 dark:text-slate-300">Enter Telegram Code for {phoneInput}:</span>
                            <button
                              type="button"
                              onClick={() => setIsOtpSent(false)}
                              className="text-[#0088cc] underline"
                            >
                              Change
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={otpCode}
                              onChange={e => setOtpCode(e.target.value)}
                              placeholder="Telegram Code (e.g. 12345)"
                              className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-mono font-bold tracking-widest text-center"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyPhoneOtp}
                              disabled={verifyingOtp || !otpCode.trim()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50 shrink-0 flex items-center gap-1"
                            >
                              {verifyingOtp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Verify</span>
                            </button>
                          </div>
                          {is2FARequired && (
                            <input
                              type="password"
                              value={password2FA}
                              onChange={e => setPassword2FA(e.target.value)}
                              placeholder="2FA Password (if enabled)"
                              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : modalMode === 'PICK_EXISTING' && !editingGroup ? (
                /* TAB 2: PICK DISCOVERED CHANNEL */
                <div className="space-y-3.5 animate-fade-in">
                  {/* Banner to create directly if wanted */}
                  <div className="p-3 bg-indigo-50/80 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between gap-3">
                    <div className="text-xs text-indigo-950 dark:text-indigo-200">
                      <span className="font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Admin khud naya channel create karna chahte hain?
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Bina Telegram app khole portal se direct live channel banayein.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalMode('AUTO_CREATE')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Auto-Create</span>
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Discovered Channel from your Telegram Account <span className="text-indigo-500">*</span>
                    </label>
                    <select
                      value={selectedExistingChatId}
                      onChange={e => {
                        if (e.target.value === '__CREATE_NEW__') {
                          setModalMode('AUTO_CREATE');
                          return;
                        }
                        handleSelectExistingChannel(e.target.value);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                    >
                      <option value="">-- Select one of your existing channels/groups --</option>
                      <option value="__CREATE_NEW__" className="font-bold text-indigo-600 dark:text-indigo-400">
                        ⚡ ➕ Create New Telegram Channel on Account...
                      </option>
                      {groups.map(g => (
                        <option key={g._id || g.id || g.chatId} value={g.chatId}>
                          📢 {g.name} ({g.type || 'group'}) {g.memberCount ? `• ${g.memberCount} members` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {groupName && (
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <p className="font-bold text-slate-800 dark:text-white">Selected: {groupName}</p>
                      <p className="font-mono text-[11px] text-slate-500">Chat ID: {groupChatId}</p>
                      {groupInviteLink && <p className="font-mono text-[11px] text-[#0088cc] truncate">Link: {groupInviteLink}</p>}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Assign to Subscription Plan <span className="text-indigo-500">*</span>
                    </label>
                    <select
                      value={selectedPlanForGroup}
                      onChange={e => setSelectedPlanForGroup(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                    >
                      <option value="">-- General / No Specific Plan --</option>
                      {planMatrix.map(p => (
                        <option key={p.planId} value={p.planId}>
                          🏷️ {p.name} (₹{p.price.toLocaleString()} / {p.durationMonths}m) - {p.researchSegments}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* TAB 3: MANUAL LINK / EDIT GROUP */
                <div className="space-y-3.5 animate-fade-in">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Group / Channel Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={e => setGroupName(e.target.value)}
                      placeholder="e.g. VIP Nifty Options Signals"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {!editingGroup && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Assign to Subscription Plan
                      </label>
                      <select
                        value={selectedPlanForGroup}
                        onChange={e => setSelectedPlanForGroup(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs font-medium text-slate-800 dark:text-slate-200 focus:border-indigo-500 outline-none"
                      >
                        <option value="">-- General / No Specific Plan --</option>
                        {planMatrix.map(p => (
                          <option key={p.planId} value={p.planId}>
                            🏷️ {p.name} (₹{p.price.toLocaleString()} / {p.durationMonths}m)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                      <span>Invite Link or Username (Optional)</span>
                      <span className="text-[10px] text-slate-400 font-normal">e.g. https://t.me/+AbCd... or @my_channel</span>
                    </label>
                    <input
                      type="text"
                      value={groupInviteLink}
                      onChange={e => setGroupInviteLink(e.target.value)}
                      placeholder="Leave empty to auto-generate via Bot API"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-2.5 px-3 text-xs focus:border-indigo-500 outline-none"
                    />
                  </div>

                  {/* Advanced Settings Toggle */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedGroupSettings(!showAdvancedGroupSettings)}
                      className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                    >
                      {showAdvancedGroupSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      <span>Advanced Settings (Custom Chat ID)</span>
                    </button>
                  </div>

                  {showAdvancedGroupSettings && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Telegram Chat ID (Optional)
                        </label>
                        <input
                          type="text"
                          value={groupChatId}
                          onChange={e => setGroupChatId(e.target.value)}
                          placeholder="Auto-generated if left empty"
                          className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs font-mono focus:border-indigo-500 outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Type</label>
                          <select
                            value={groupType}
                            onChange={e => setGroupType(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                          >
                            <option value="channel">Broadcast Channel</option>
                            <option value="supergroup">Supergroup</option>
                            <option value="group">Normal Group</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                          <select
                            value={groupStatus}
                            onChange={e => setGroupStatus(e.target.value)}
                            className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-xs"
                          >
                            <option value="ACTIVE">ACTIVE</option>
                            <option value="INACTIVE">INACTIVE</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGroup || (!groupName.trim() && modalMode !== 'PICK_EXISTING')}
                  className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
                >
                  {savingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>
                    {savingGroup
                      ? 'Processing...'
                      : editingGroup
                      ? 'Update Group'
                      : modalMode === 'AUTO_CREATE'
                      ? '⚡ Create & Link Channel'
                      : 'Link Channel to Plan'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO-DETECT TELEGRAM GROUPS */}
      {isAutoDetectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-800 dark:text-white">
                    Auto-Detected Telegram Groups & Channels
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Discovered by scanning Telegram Bot updates for groups where bot was added.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAutoDetectModalOpen(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {detectingGroups ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#0088cc] mx-auto" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Scanning Telegram API updates for recently added groups...
                </p>
              </div>
            ) : autoDetectError ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs space-y-2">
                <p className="font-bold">Auto-Detection Warning</p>
                <p>{autoDetectError}</p>
                <p className="text-[11px] text-slate-500 pt-1">
                  How to make a group detectable: Add your bot into your group/channel and send any message in the group (e.g. "hi"), then click Re-scan!
                </p>
              </div>
            ) : detectResults.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No new groups detected yet</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Make sure you have added your bot to your group and sent a test message so Telegram updates capture the chat ID.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Found {detectResults.length} group/channel(s)
                  </span>
                  {detectResults.some(g => !g.isAlreadyRegistered) && (
                    <button
                      type="button"
                      onClick={handleImportAllDetected}
                      disabled={importingGroups}
                      className="px-3 py-1.5 bg-[#0088cc] hover:bg-[#0077b5] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                    >
                      {importingGroups ? 'Importing...' : 'Import All New Groups'}
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {detectResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h6 className="font-bold text-xs text-slate-800 dark:text-white">{item.name}</h6>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {item.type || 'group'}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500">
                          Chat ID: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.chatId}</span>
                          {item.memberCount ? ` • ${item.memberCount} members` : ''}
                        </p>
                      </div>

                      <div>
                        {item.isAlreadyRegistered ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-4 h-4" />
                            Registered
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleImportDetectedGroup(item)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Import</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleOpenAutoDetect}
                disabled={detectingGroups}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0088cc] hover:underline"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-scan Updates</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAutoDetectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
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
