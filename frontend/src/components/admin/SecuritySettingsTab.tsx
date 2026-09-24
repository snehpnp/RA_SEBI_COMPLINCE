'use client';

import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  Mail,
  Save,
  Send,
  Plus,
  Trash2,
  Edit2,
  Power,
  PowerOff,
  Info,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '@/services/api';

export interface SmsTemplateItem {
  id: string;
  _id?: string;
  name: string;
  dltTemplateId: string;
  category: 'LOGIN_2FA' | 'REGISTRATION_OTP' | 'CUSTOM';
  content: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

interface SecuritySettingsTabProps {
  tenantData?: any;
  onUpdate?: () => Promise<void> | void;
}

export default function SecuritySettingsTab({ tenantData, onUpdate }: SecuritySettingsTabProps) {
  // Password Policy
  const [passwordPolicy, setPasswordPolicy] = useState<'NORMAL' | 'STRONG'>('NORMAL');

  // Client Signup Verification Mode (SEBI Compliance)
  const [signupVerificationMode, setSignupVerificationMode] = useState<'EMAIL_ONLY' | 'MOBILE_ONLY' | 'BOTH'>('EMAIL_ONLY');

  // Locked / Teaser Trades Preview Count
  const [lockedTradesPreviewCount, setLockedTradesPreviewCount] = useState<number>(5);

  // Client 2FA
  const [client2FAEnabled, setClient2FAEnabled] = useState(false);
  const [twoFactorChannel, setTwoFactorChannel] = useState<'EMAIL' | 'SMS' | 'BOTH'>('EMAIL');

  // SMS Gateway Settings
  const [smsGatewayEnabled, setSmsGatewayEnabled] = useState(false);
  const [smsUsername, setSmsUsername] = useState('');
  const [smsPassword, setSmsPassword] = useState('');
  const [showSmsPassword, setShowSmsPassword] = useState(false);
  const [smsSenderId, setSmsSenderId] = useState('');
  const [smsEntityId, setSmsEntityId] = useState('');

  // Saving states
  const [savingSettings, setSavingSettings] = useState(false);

  // SMS Test Modal
  const [showTestModal, setShowTestModal] = useState(false);
  const [testMobile, setTestMobile] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testDltId, setTestDltId] = useState('');
  const [testingSms, setTestingSms] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  // SMS Templates List
  const [templates, setTemplates] = useState<SmsTemplateItem[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [togglingTemplateId, setTogglingTemplateId] = useState<string | null>(null);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  // Template Modal (Create / Edit)
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SmsTemplateItem | null>(null);
  const [tplName, setTplName] = useState('');
  const [tplDltId, setTplDltId] = useState('');
  const [tplCategory, setTplCategory] = useState<'LOGIN_2FA' | 'REGISTRATION_OTP' | 'CUSTOM'>('LOGIN_2FA');
  const [tplContent, setTplContent] = useState('');
  const [tplDescription, setTplDescription] = useState('');
  const [tplIsActive, setTplIsActive] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Sync state from tenantData props
  useEffect(() => {
    if (tenantData) {
      if (tenantData.passwordPolicy) setPasswordPolicy(tenantData.passwordPolicy);
      if (tenantData.signupVerificationMode) setSignupVerificationMode(tenantData.signupVerificationMode);
      if (typeof tenantData.lockedTradesPreviewCount === 'number') setLockedTradesPreviewCount(tenantData.lockedTradesPreviewCount);
      if (typeof tenantData.client2FAEnabled === 'boolean') setClient2FAEnabled(tenantData.client2FAEnabled);
      if (tenantData.twoFactorChannel) setTwoFactorChannel(tenantData.twoFactorChannel);
      if (typeof tenantData.smsGatewayEnabled === 'boolean') setSmsGatewayEnabled(tenantData.smsGatewayEnabled);
      if (tenantData.smsUsername) setSmsUsername(tenantData.smsUsername);
      if (tenantData.smsPassword) setSmsPassword(tenantData.smsPassword);
      if (tenantData.smsSenderId) setSmsSenderId(tenantData.smsSenderId);
      if (tenantData.smsEntityId) setSmsEntityId(tenantData.smsEntityId);
    }
  }, [tenantData]);

  // Fetch SMS Templates
  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const res = await api.getSmsTemplates();
      if (res.success && Array.isArray(res.data)) {
        setTemplates(res.data);
      }
    } catch (err: any) {
      console.error('Error fetching SMS templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Save Security Settings
  const handleSaveSecuritySettings = async () => {
    setSavingSettings(true);
    try {
      const formData = new FormData();
      formData.append('passwordPolicy', passwordPolicy);
      formData.append('signupVerificationMode', signupVerificationMode);
      formData.append('lockedTradesPreviewCount', String(lockedTradesPreviewCount));
      formData.append('client2FAEnabled', String(client2FAEnabled));
      formData.append('twoFactorChannel', twoFactorChannel);
      formData.append('smsGatewayEnabled', String(smsGatewayEnabled));
      formData.append('smsUsername', smsUsername.trim());
      formData.append('smsPassword', smsPassword.trim());
      formData.append('smsSenderId', smsSenderId.trim());
      formData.append('smsEntityId', smsEntityId.trim());
      const res = await api.updateTenantSettings(formData);
      if (res.success) {
        toast.success('Security & SMS settings saved successfully!');
        if (onUpdate) await onUpdate();
      } else {
        toast.error(res.message || 'Failed to save security settings.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving security settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Open Template Modal
  const openCreateTemplateModal = () => {
    setEditingTemplate(null);
    setTplName('');
    setTplDltId('');
    setTplCategory('LOGIN_2FA');
    setTplContent('Infoline Equity Research, {#alp#}{#alp#} .TRADE WITH PROPER STOPLOSS AND TARGET. https://infolineequity.com/ - info@infolineequity.com');
    setTplDescription('');
    setTplIsActive(true);
    setTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tpl: SmsTemplateItem) => {
    setEditingTemplate(tpl);
    setTplName(tpl.name);
    setTplDltId(tpl.dltTemplateId);
    setTplCategory(tpl.category);
    setTplContent(tpl.content);
    setTplDescription(tpl.description || '');
    setTplIsActive(tpl.isActive);
    setTemplateModalOpen(true);
  };

  // Save Template (Create or Update)
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplName.trim()) {
      toast.error('Please enter template name.');
      return;
    }
    if (!tplDltId.trim()) {
      toast.error('Please enter DLT Template ID.');
      return;
    }
    if (!tplContent.trim()) {
      toast.error('Please enter approved DLT message content.');
      return;
    }

    setSavingTemplate(true);
    try {
      const payload = {
        name: tplName.trim(),
        dltTemplateId: tplDltId.trim(),
        category: tplCategory,
        content: tplContent.trim(),
        description: tplDescription.trim(),
        isActive: tplIsActive
      };

      let res;
      if (editingTemplate) {
        res = await api.updateSmsTemplate(editingTemplate.id || (editingTemplate as any)._id, payload);
      } else {
        res = await api.createSmsTemplate(payload);
      }

      if (res.success) {
        toast.success(editingTemplate ? 'Template updated successfully!' : 'SMS Template created successfully!');
        setTemplateModalOpen(false);
        fetchTemplates();
      } else {
        toast.error(res.message || 'Failed to save template.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error saving template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Toggle Template Status
  const handleToggleTemplateStatus = async (tpl: SmsTemplateItem) => {
    const id = tpl.id || (tpl as any)._id;
    setTogglingTemplateId(id);
    try {
      const res = await api.toggleSmsTemplateStatus(id);
      if (res.success) {
        toast.success(`Template ${res.data?.isActive ? 'activated' : 'deactivated'}!`);
        setTemplates(prev =>
          prev.map(t => ((t.id || (t as any)._id) === id ? { ...t, isActive: res.data?.isActive ?? !t.isActive } : t))
        );
      } else {
        toast.error(res.message || 'Failed to toggle status.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error toggling template status.');
    } finally {
      setTogglingTemplateId(null);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (tpl: SmsTemplateItem) => {
    const id = tpl.id || (tpl as any)._id;
    if (!confirm(`Are you sure you want to delete template "${tpl.name}"?`)) return;

    setDeletingTemplateId(id);
    try {
      const res = await api.deleteSmsTemplate(id);
      if (res.success) {
        toast.success('Template deleted.');
        setTemplates(prev => prev.filter(t => (t.id || (t as any)._id) !== id));
      } else {
        toast.error(res.message || 'Failed to delete template.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error deleting template.');
    } finally {
      setDeletingTemplateId(null);
    }
  };

  // Run SMS Gateway Test
  const handleTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMobile = testMobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }

    setTestingSms(true);
    setTestResult(null);
    try {
      const res = await api.testSmsGateway({
        destMobile: cleanMobile.slice(-10),
        message: testMessage.trim() || undefined,
        dltTemplateId: testDltId.trim() || undefined
      });

      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'SMS sent successfully! Check recipient handset.',
          details: res.data
        });
        toast.success('SMS test dispatched successfully!');
      } else {
        setTestResult({
          success: false,
          message: res.message || 'SMS test delivery failed.',
          details: res.data
        });
        toast.error(res.message || 'SMS delivery failed.');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network or Gateway error.'
      });
      toast.error(err.message || 'SMS test failed.');
    } finally {
      setTestingSms(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Security & SMS Settings</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure client password policies, 2-factor authentication, and SMSJust gateway templates
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveSecuritySettings}
          disabled={savingSettings}
          className="inline-flex items-center justify-center space-x-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/30 transition duration-200"
        >
          {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{savingSettings ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      {/* SECTION 1: PASSWORD POLICY (TAREEQA A) */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary-500" />
              Client Password Policy
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Select the password complexity enforced during client registration and password resets
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-500/20">
            Tareeqa A Active
          </span>
        </div>

        {/* POLICY OPTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Normal */}
          <div
            onClick={() => setPasswordPolicy('NORMAL')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              passwordPolicy === 'NORMAL'
                ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-500/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-slate-800 dark:text-white">Normal Password</span>
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  passwordPolicy === 'NORMAL' ? 'border-primary-600 bg-primary-600' : 'border-slate-400'
                }`}
              >
                {passwordPolicy === 'NORMAL' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Standard user password requirement. Suitable for quick client onboarding.
            </p>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> 8 - 15 characters
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> Any combination of letters, numbers, or symbols
              </li>
            </ul>
          </div>

          {/* Strong */}
          <div
            onClick={() => setPasswordPolicy('STRONG')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              passwordPolicy === 'STRONG'
                ? 'border-primary-500 bg-primary-50/30 dark:bg-primary-500/10 shadow-sm'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                Strong Password <span className="text-[10px] bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 px-1.5 py-0.5 rounded font-bold">SEBI Recommended</span>
              </span>
              <div
                className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                  passwordPolicy === 'STRONG' ? 'border-primary-600 bg-primary-600' : 'border-slate-400'
                }`}
              >
                {passwordPolicy === 'STRONG' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              High-security password requirement. Enforces strict complexity parameters.
            </p>
            <ul className="text-xs space-y-1 text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> 8 - 15 characters
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> At least 1 Uppercase & 1 Lowercase letter
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-500" /> At least 1 Number & 1 Special Character
              </li>
            </ul>
          </div>
        </div>

        {/* TAREEQA A NOTICE */}
        <div className="p-4 bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/20 rounded-xl flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
          <div className="text-xs text-sky-800 dark:text-sky-200 space-y-1">
            <p className="font-bold text-sky-900 dark:text-sky-100">Tareeqa A Policy Behavior:</p>
            <p>
              Existing clients who signed up previously with normal passwords can continue to log in seamlessly without any interruption.
              The new <strong>Strong Password</strong> rule will only be prompted when a new client registers or when an existing client resets/changes their password.
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: CLIENT SIGNUP VERIFICATION MODE */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary-500" />
            Client Signup OTP Verification Mode
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Choose which credential must be verified with a 6-digit OTP during client self-registration
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { id: 'EMAIL_ONLY', label: 'Email OTP Only', icon: Mail, desc: 'Client only verifies Email. Mobile is entered without OTP.' },
            { id: 'MOBILE_ONLY', label: 'Mobile OTP Only', icon: Smartphone, desc: 'Client only verifies Mobile OTP. Email is entered without OTP.' },
            { id: 'BOTH', label: 'Both (Email & Mobile)', icon: ShieldCheck, desc: 'Client must verify both Email OTP and Mobile OTP before registering.' }
          ].map(m => (
            <div
              key={m.id}
              onClick={() => setSignupVerificationMode(m.id as any)}
              className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
                signupVerificationMode === m.id
                  ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-500/10 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-white">
                  <m.icon className="h-4 w-4 text-primary-500" />
                  {m.label}
                </span>
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    signupVerificationMode === m.id ? 'border-primary-600 bg-primary-600' : 'border-slate-400'
                  }`}
                >
                  {signupVerificationMode === m.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">{m.desc}</p>
            </div>
          ))}
        </div>

        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl flex items-start gap-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-800 dark:text-emerald-200">
            <strong>Admin Exemption:</strong> When an Admin or Staff registers a client manually from the Admin panel, OTP verification is automatically bypassed and the client account is created immediately.
          </div>
        </div>
      </div>

      {/* SECTION: LOCKED / TEASER TRADES PREVIEW */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div>
          <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary-500" />
            Locked / Teaser Trades Preview Settings
          </h4>
          <p className="text-xs text-slate-500 mt-1">
            Display masked teaser trade calls with live remaining potential % to non-subscribed clients to drive plan upgrades
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Maximum Locked Trades to Display
            </label>
            <p className="text-xs text-slate-500">
              Number of masked trade signals shown to clients without an active subscription (Default: 5)
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={20}
              value={lockedTradesPreviewCount}
              onChange={e => setLockedTradesPreviewCount(Math.max(0, Math.min(20, parseInt(e.target.value) || 0)))}
              className="w-24 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl py-2 px-3 text-center text-sm font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
            />
            <span className="text-xs font-semibold text-slate-500">Trades</span>
          </div>
        </div>

        <div className="p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl flex items-start gap-2.5">
          <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <strong>Dynamic Potential % Engine:</strong> Each locked trade dynamically computes the remaining upside % (for BUY) or downside % (for SELL) between entry and final target. If Target 1 is already achieved, it automatically recalculates from Target 1.
          </div>
        </div>
      </div>

      {/* SECTION 2: 2-STEP VERIFICATION (2FA) */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary-500" />
              Client Two-Step Verification (2FA)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Require clients to enter a 6-digit one-time passcode (OTP) on every login
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={client2FAEnabled}
              onChange={e => setClient2FAEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
            <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
              {client2FAEnabled ? '2FA Enabled' : '2FA Disabled'}
            </span>
          </label>
        </div>

        {client2FAEnabled && (
          <div className="space-y-4 pt-2 animate-fade-in">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              OTP Delivery Channel:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'EMAIL', label: 'Email Only', icon: Mail, desc: 'Sent to client registered email' },
                { id: 'SMS', label: 'SMS Only', icon: Smartphone, desc: 'Sent to client mobile via SMS Gateway' },
                { id: 'BOTH', label: 'Both (Email & SMS)', icon: ShieldCheck, desc: 'Sent simultaneously to both' }
              ].map(ch => (
                <div
                  key={ch.id}
                  onClick={() => setTwoFactorChannel(ch.id as any)}
                  className={`cursor-pointer p-3.5 rounded-xl border-2 transition-all ${
                    twoFactorChannel === ch.id
                      ? 'border-primary-500 bg-primary-50/20 dark:bg-primary-500/10'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="flex items-center gap-2 font-semibold text-xs text-slate-800 dark:text-white">
                      <ch.icon className="h-4 w-4 text-primary-500" />
                      {ch.label}
                    </span>
                    <div
                      className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center ${
                        twoFactorChannel === ch.id ? 'border-primary-600 bg-primary-600' : 'border-slate-400'
                      }`}
                    >
                      {twoFactorChannel === ch.id && <div className="h-1 w-1 rounded-full bg-white" />}
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{ch.desc}</p>
                </div>
              ))}
            </div>

            {/* FAILSAFE NOTICE */}
            <div className="p-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] text-amber-800 dark:text-amber-200">
                <strong>Automatic Failover:</strong> If the SMS Gateway or SMS template is marked Inactive or unreachable, the system will automatically deliver the OTP via Email to ensure the client is never locked out of login.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: SMS GATEWAY (SMSJUST.COM) */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-primary-500" />
              SMSJust.com Gateway Configuration
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Connect your SMSJust account to dispatch transactional DLT SMS directly to clients
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setTestResult(null);
                setShowTestModal(true);
              }}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Test Gateway</span>
            </button>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smsGatewayEnabled}
                onChange={e => setSmsGatewayEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-600"></div>
              <span className="ml-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                {smsGatewayEnabled ? 'Active' : 'Inactive'}
              </span>
            </label>
          </div>
        </div>

        {/* CREDENTIALS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gateway Username
            </label>
            <input
              type="text"
              value={smsUsername}
              onChange={e => setSmsUsername(e.target.value)}
              placeholder="e.g. INFOLINE2026"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Gateway Password
            </label>
            <div className="relative">
              <input
                type={showSmsPassword ? 'text' : 'password'}
                value={smsPassword}
                onChange={e => setSmsPassword(e.target.value)}
                placeholder="e.g. Infoline@2026"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowSmsPassword(!showSmsPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                {showSmsPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Sender ID (Header)
            </label>
            <input
              type="text"
              value={smsSenderId}
              onChange={e => setSmsSenderId(e.target.value.toUpperCase())}
              placeholder="e.g. EQUIIN (6 chars)"
              maxLength={6}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white uppercase font-mono placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Entity ID / Principal Entity (PE ID)
            </label>
            <input
              type="text"
              value={smsEntityId}
              onChange={e => setSmsEntityId(e.target.value)}
              placeholder="e.g. 1201178152182851794"
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: DLT SMS TEMPLATES (DUAL INACTIVE ISOLATION) */}
      <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary-500" />
              DLT SMS Templates
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Manage DLT-approved templates. Each template can be activated or deactivated independently.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateTemplateModal}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-primary-500/20 transition"
          >
            <Plus className="h-4 w-4" />
            <span>Add Template</span>
          </button>
        </div>

        {/* TEMPLATES TABLE / LIST */}
        {loadingTemplates ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary-500" />
            <p className="text-xs">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <MessageSquare className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No SMS Templates Found</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &apos;Add Template&apos; to register your approved DLT templates (e.g. Client 2FA Login OTP).
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] uppercase bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Template Name</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">DLT Temp ID</th>
                  <th className="py-3 px-4 font-semibold">Approved Message</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {templates.map(tpl => {
                  const id = tpl.id || (tpl as any)._id;
                  const isToggling = togglingTemplateId === id;
                  const isDeleting = deletingTemplateId === id;

                  return (
                    <tr key={id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-white">
                        {tpl.name}
                        {tpl.description && (
                          <p className="text-[10px] text-slate-400 font-normal mt-0.5">{tpl.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tpl.category === 'LOGIN_2FA'
                              ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300'
                              : tpl.category === 'REGISTRATION_OTP'
                              ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {tpl.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {tpl.dltTemplateId}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-slate-600 dark:text-slate-400 font-mono text-[11px]" title={tpl.content}>
                        {tpl.content}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleTemplateStatus(tpl)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
                            tpl.isActive
                              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 hover:bg-rose-100'
                          }`}
                        >
                          {isToggling ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : tpl.isActive ? (
                            <Power className="h-3 w-3" />
                          ) : (
                            <PowerOff className="h-3 w-3" />
                          )}
                          <span>{tpl.isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditTemplateModal(tpl)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Edit Template"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteTemplate(tpl)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="Delete Template"
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT SMS TEMPLATE */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                {editingTemplate ? 'Edit SMS Template' : 'Add DLT SMS Template'}
              </h4>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={tplName}
                  onChange={e => setTplName(e.target.value)}
                  placeholder="e.g. Client 2FA Login OTP"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    DLT Template ID *
                  </label>
                  <input
                    type="text"
                    value={tplDltId}
                    onChange={e => setTplDltId(e.target.value)}
                    placeholder="e.g. 1207178402616971064"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Template Category
                  </label>
                  <select
                    value={tplCategory}
                    onChange={e => setTplCategory(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  >
                    <option value="LOGIN_2FA">Client Login 2FA OTP</option>
                    <option value="REGISTRATION_OTP">Registration OTP</option>
                    <option value="CUSTOM">Custom Notification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  DLT Approved Template Content *
                </label>
                <textarea
                  rows={3}
                  value={tplContent}
                  onChange={e => setTplContent(e.target.value)}
                  placeholder="Infoline Equity Research, {#alp#}{#alp#} .TRADE WITH PROPER STOPLOSS AND TARGET..."
                  required
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Use DLT approved variables: <code className="text-primary-500">{"{#alp#}{#alp#}"}</code> or <code className="text-primary-500">{"{#var#}"}</code> or <code className="text-primary-500">{"{OTP}"}</code> where the 6-digit code will be inserted.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Description
                </label>
                <input
                  type="text"
                  value={tplDescription}
                  onChange={e => setTplDescription(e.target.value)}
                  placeholder="e.g. Primary OTP template for client 2FA"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tplIsActive}
                    onChange={e => setTplIsActive(e.target.checked)}
                    className="rounded text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Template Active
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTemplateModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingTemplate}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {savingTemplate && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>{editingTemplate ? 'Update' : 'Create'} Template</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TEST SMS GATEWAY */}
      {showTestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-primary-500" />
                Test SMS Gateway
              </h4>
              <button
                type="button"
                onClick={() => setShowTestModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleTestSms} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Destination Mobile Number *
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs">
                    +91
                  </span>
                  <input
                    type="tel"
                    value={testMobile}
                    onChange={e => setTestMobile(e.target.value)}
                    placeholder="9876543210"
                    maxLength={10}
                    required
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-r-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  DLT Template ID (Optional - leave blank to use active template)
                </label>
                <input
                  type="text"
                  value={testDltId}
                  onChange={e => setTestDltId(e.target.value)}
                  placeholder="e.g. 1207178402616971064"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Custom Test Message (Optional)
                </label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  placeholder="Leave empty to use approved DLT template with test OTP"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl border text-xs space-y-1 ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <p className="font-bold flex items-center gap-1.5">
                    {testResult.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-rose-500" />}
                    {testResult.message}
                  </p>
                  {testResult.details && (
                    <pre className="text-[10px] overflow-x-auto p-1.5 bg-black/5 dark:bg-black/20 rounded font-mono">
                      {JSON.stringify(testResult.details, null, 2)}
                    </pre>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTestModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={testingSms}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-semibold shadow-md transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {testingSms ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>{testingSms ? 'Sending...' : 'Send Test SMS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
