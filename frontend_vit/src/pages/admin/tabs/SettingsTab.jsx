import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAdmin } from '../AdminContext';
import {
  ShieldAlert, Save, Upload, Tag, Sun, Moon, FileText, FileCheck, Database,
  Download, Edit3, Trash2, Shield, Eye, TrendingUp, Clock, Plus, Filter, Users,
  X, Check, Search, DownloadCloud, Menu, UploadCloud, File, AlertTriangle,
  AlertCircle, RotateCcw, Building, Lock, Landmark, User, ClipboardList,
  CheckCircle, CheckCircle2, RefreshCw, LogOut, ShieldCheck, CheckSquare, Layers,
  Loader2, ArrowRight, ArrowRightLeft, Edit2, RotateCcw as RotateCcwIcon, Settings,
  Activity, LifeBuoy, CreditCard, ExternalLink, Smartphone, ChevronRight, ChevronLeft,
  EyeOff, LayoutGrid, Table as TableIcon, Copy, Briefcase, QrCode, Zap, FolderArchive,
  Folder, HelpCircle, Mail, Bell, Target, Calendar as CalendarIcon, MapPin, Phone,
  Video, Send, RefreshCcw, XCircle, Monitor, Usb, Info
} from 'lucide-react';
import DataTable from 'react-data-table-component';
import api from '@/services/api';
import { formatPan, formatAadhaar } from '@/utils/formatters';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { PaginatedList } from '@/components/ui/PaginatedList';
import ConfirmDialog from '@/components/ConfirmDialog';
import MobilePreview from '@/components/MobilePreview';
import { toast } from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, Cell, XAxis, YAxis, Tooltip } from 'recharts';


import FaqManagement from '@/components/admin/FaqManagement';
import OccupationsManager from '@/components/admin/OccupationsManager';
import SecuritySettingsTab from '@/components/admin/SecuritySettingsTab';
import EmailTemplatesManager from '@/components/admin/EmailTemplatesManager';
import PagesManagement from '@/components/admin/PagesManagement';
import { base_ra_url } from '@/utils/config';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { CKEditor } from '@ckeditor/ckeditor5-react';


export default function SettingsTab(props) {
  const admin = useAdmin();
  const {
    user,
    setUser,
    isStaff,
    hasPermission,
    tenantDetails,
    setTenantDetails,
    dashboardStats,
    setDashboardStats,
    refreshDashboard,
    staff,
    setStaff,
    allStaff,
    editingStaff,
    setEditingStaff,
    clients,
    setClients,
    allClients,
    selectedClient,
    setSelectedClient,
    adminPlans,
    setAdminPlans,
    allPayments,
    setAllPayments,
    checklist,
    setChecklist,
    activityLogs,
    setActivityLogs,
    alerts,
    setAlerts,
    closingAlertId,
    setClosingAlertId,
    handleCloseAlert,
    activeTab,
    setActiveTab,
    adminPagesList,
    setAdminPagesList,
    roles,
    setRoles,
    confirmState,
    setConfirmState,
    showConfirm,
    pdfPreviewModal,
    setPdfPreviewModal,
    showCalendarModal,
    setShowCalendarModal,
    showReportModal,
    setShowReportModal,
    isSetupPrereqModalOpen,
    setIsSetupPrereqModalOpen,
    getPrerequisitesStatus,
    openTimelineModal,
    setSettingsTab,
    settingsTab,
    logoFile,
    tenantLogoUrl,
    appLogo,
    setLogoFile,
    setSocialMediaLinks,
    socialMediaLinks,
    telegramTradeEnabled,
    setTelegramTradeEnabled,
    smsTradeEnabled,
    setSmsTradeEnabled,
    telegramBotToken,
    setTelegramBotToken,
    setBotTestResult,
    handleTestTelegramBot,
    testingBot,
    telegramBotUsername,
    setTelegramBotUsername,
    botTestResult,
    telegramJoinRule,
    setTelegramJoinRule,
    handleSaveTradeDispatchSettings,
    savingTradeDispatch,
    kycFirst,
    termsPdf,
    termsPdfUrl,
    setTermsPdf,
    openPdfPreview,
    getPdfDirectUrl,
    privacyPdf,
    privacyPdfUrl,
    setPrivacyPdf,
    internalPolicyPdf,
    policyUrl,
    setInternalPolicyPdf,
    AGREEMENT_VARIABLES,
    copiedVariable,
    handleCopyVariable,
    agreementContent,
    setAgreementContent,
    reportDisclaimer,
    setReportDisclaimer,
    gstEnabled,
    handleTriggerGstToggle,
    gstCalculationType,
    setGstCalculationType,
    orgGst,
    setOrgGst,
    tenantState,
    setTenantState,
    bankName,
    setBankName,
    bankBranch,
    setBankBranch,
    bankAccountName,
    setBankAccountName,
    bankAccountNo,
    setBankAccountNo,
    bankAccountType,
    setBankAccountType,
    bankIfsc,
    setBankIfsc,
    setInvoiceDispatchPolicy,
    invoiceDispatchPolicy,
    l2ApprovalEnabled,
    setL2ApprovalEnabled,
    setFileDownloadPolicy,
    fileDownloadPolicy,
    fileDownloadNotificationEmail,
    setFileDownloadNotificationEmail,
    maxEmailFileSizeMb,
    setMaxEmailFileSizeMb,
    handleSaveSettings,
    setIntegrationTab,
    integrationTab,
    paymentGatewayEnabled,
    setPaymentGatewayEnabled,
    activePaymentGateway,
    setActivePaymentGateway,
    razorpayKeyId,
    setRazorpayKeyId,
    razorpayKeySecret,
    setRazorpayKeySecret,
    cashfreeAppId,
    setCashfreeAppId,
    cashfreeSecretKey,
    setCashfreeSecretKey,
    ccavenueMerchantId,
    setCcavenueMerchantId,
    ccavenueAccessCode,
    setCcavenueAccessCode,
    ccavenueWorkingKey,
    setCcavenueWorkingKey,
    stripePublishableKey,
    setStripePublishableKey,
    stripeSecretKey,
    setStripeSecretKey,
    gatewayVerifyResult,
    handleVerifyPaymentGateway,
    verifyingGateway,
    upiQrEnabled,
    setUpiQrEnabled,
    upiId,
    setUpiId,
    upiPayeeName,
    setUpiPayeeName,
    upiQrImagePreview,
    upiQrImageUrl,
    getFullUrl,
    setUpiQrImageFile,
    setUpiQrImagePreview,
    setUpiQrImageUrl,
    upiInstructions,
    setUpiInstructions,
    smtpHost,
    setSmtpHost,
    smtpPort,
    setSmtpPort,
    smtpUser,
    setSmtpUser,
    smtpPassword,
    setSmtpPassword,
    smtpFrom,
    setSmtpFrom,
    ccInvoiceEnabled,
    setCcInvoiceEnabled,
    ccInvoiceEmail,
    setCcInvoiceEmail,
    ccAgreementEnabled,
    setCcAgreementEnabled,
    ccAgreementEmail,
    setCcAgreementEmail,
    testSmtpEmail,
    setTestSmtpEmail,
    handleTestSmtp,
    isTestingSmtp,
    digioEnvironment,
    digioClientId,
    digioClientSecret,
    setDigioEnvironment,
    digioKycTemplateName,
    setDigioKycTemplateName,
    setDigioClientId,
    setDigioClientSecret,
    testingDigio,
    setTestingDigio,
    setDigioTestResult,
    digioTestResult,
    camsClientCode,
    camsClientId,
    camsClientSecret,
    setCamsClientCode,
    camsPoscode,
    setCamsPoscode,
    setCamsClientId,
    setCamsClientSecret,
    testingCams,
    setTestingCams,
    setCamsTestResult,
    camsTestResult,
    loadData
  } = admin || {};

  return (
<div className="max-w-4xl space-y-6 pb-20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Settings</h2>
                          <p className="text-xs text-slate-500 mt-1">Manage global preferences and integrations</p>
                        </div>
                      </div>

                      {/* TABS */}
                      <div className="flex flex-wrap items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full mb-6">
                        {[
        { id: 'general', label: 'General Info', icon: Settings },
        { id: 'trade-dispatch', label: 'Trade Dispatch & Bot', icon: Send },
        { id: 'policies', label: 'Documents & Policies', icon: FileText },
        { id: 'billing', label: 'Banking & Invoicing', icon: Landmark },
        { id: 'integrations', label: 'Integrations', icon: LayoutGrid },
        { id: 'email-templates', label: 'Email Templates', icon: Mail },
        { id: 'security', label: 'Security & SMS', icon: ShieldCheck },
        { id: 'occupations', label: 'Manage Occupations', icon: Briefcase }
    ].map(tab => (<button key={tab.id} onClick={() => setSettingsTab(tab.id)} className={`flex flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${settingsTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                            <tab.icon className="h-4 w-4"/>
                            <span>{tab.label}</span>
                          </button>))}
                      </div>

                      {settingsTab === 'general' && (<div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">🏢 Company Details</h3>
                              <p className="text-xs text-slate-500 mb-6">Basic information about your firm.</p>

                              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Company Logo</label>
                              <div className="flex items-start gap-6">
                                {(logoFile || tenantLogoUrl || appLogo) && (<div className="shrink-0 p-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                                    <img src={logoFile
                ? URL.createObjectURL(logoFile)
                : tenantLogoUrl
                    ? (tenantLogoUrl.startsWith('http') ? tenantLogoUrl : `${base_ra_url}${tenantLogoUrl}`)
                    : appLogo} alt="Company Logo" className="h-16 w-auto object-contain max-w-[140px]"/>
                                  </div>)}
                                <div className="flex-1 space-y-2">
                                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml" onChange={e => {
            if (e.target.files && e.target.files[0]) {
                setLogoFile(e.target.files[0]);
            }
        }} className="w-full max-w-md text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 dark:file:bg-primary-950 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 cursor-pointer"/>
                                  <p className="text-xs text-slate-500">Appears on Research Reports, Client Portal & Invoices (PNG, JPG, SVG, WebP).</p>
                                  {logoFile && (<div className="flex items-center space-x-2 text-xs text-emerald-600 font-semibold">
                                      <span>✓ New file selected: {logoFile.name} (Click "Save Settings" below to apply)</span>
                                      <button type="button" onClick={() => setLogoFile(null)} className="text-red-500 hover:underline font-bold ml-2">
                                        Cancel
                                      </button>
                                    </div>)}
                                </div>
                              </div>
                            </div>

                        

                            <div className="border-t border-slate-400 dark:border-white/10 pt-6">
                              <div className="flex justify-between items-center border-b border-slate-200 dark:border-white/10 pb-2 mb-4">
                                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Social Media Links</h4>
                                <button onClick={() => setSocialMediaLinks([...socialMediaLinks, { platform: '', link: '' }])} className="text-xs text-primary-600 font-bold hover:underline">
                                  + Add Link
                                </button>
                              </div>
                              <div className="space-y-3">
                                {socialMediaLinks.map((link, idx) => (<div key={idx} className="flex space-x-4 items-center">
                                    <input type="text" value={link.platform} onChange={e => {
                const newLinks = [...socialMediaLinks];
                newLinks[idx].platform = e.target.value;
                setSocialMediaLinks(newLinks);
            }} placeholder="Platform (e.g. Twitter)" className="w-1/3 bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                    <input type="url" value={link.link} onChange={e => {
                const newLinks = [...socialMediaLinks];
                newLinks[idx].link = e.target.value;
                setSocialMediaLinks(newLinks);
            }} placeholder="URL" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                    <button onClick={() => {
                const newLinks = [...socialMediaLinks];
                newLinks.splice(idx, 1);
                setSocialMediaLinks(newLinks);
            }} className="p-2 text-red-500 hover:bg-red-50 rounded">
                                      <Trash2 className="h-4 w-4"/>
                                    </button>
                                  </div>))}
                              </div>
                            </div>
                          </div>
                        </div>)}

                      {settingsTab === 'trade-dispatch' && (<div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            {/* Section Header */}
                            <div className="border-b border-slate-200 dark:border-slate-800/60 pb-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-lime-500/10 text-lime-600 dark:text-[#d4f23b] flex items-center justify-center font-bold">
                                  <Send className="w-5 h-5"/>
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                                    Trade Signal Dispatch & Telegram Bot Settings
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Configure global channel dispatch rules and company Telegram Bot integration.
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Info Callout */}
                            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-800 dark:text-sky-300 space-y-1">
                              <p className="font-bold flex items-center gap-1.5">
                                ℹ️ Global Channel Dispatch Policy
                              </p>
                              <p className="leading-relaxed text-[11px] text-sky-700 dark:text-sky-400">
                                Trade recommendations and updates are strictly dispatched only to clients with an <b>active subscription</b> matching the trade's service plan. Expired subscriptions are blocked by the system.
                                When a platform is enabled here, trades go to all eligible subscribers unless unchecked in an individual client's profile.
                              </p>
                            </div>

                            {/* Global Delivery Toggles */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Telegram Master Toggle */}
                              <div className={`p-4 rounded-xl border transition-all ${telegramTradeEnabled
            ? 'bg-sky-500/5 border-sky-500/30'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input type="checkbox" checked={telegramTradeEnabled} onChange={e => setTelegramTradeEnabled(e.target.checked)} className="mt-1 h-5 w-5 rounded accent-[#d4f23b] border-gray-300"/>
                                  <div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <Send className="w-4 h-4 text-sky-500"/>
                                      Telegram Trade Delivery
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                      Send real-time trade signals and status updates directly to clients via Company Telegram Bot. If unchecked, no Telegram messages will be sent to any client.
                                    </p>
                                  </div>
                                </label>
                              </div>

                              {/* SMS Master Toggle */}
                              <div className={`p-4 rounded-xl border transition-all ${smsTradeEnabled
            ? 'bg-indigo-500/5 border-indigo-500/30'
            : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'}`}>
                                <label className="flex items-start gap-3 cursor-pointer">
                                  <input type="checkbox" checked={smsTradeEnabled} onChange={e => setSmsTradeEnabled(e.target.checked)} className="mt-1 h-5 w-5 rounded accent-[#d4f23b] border-gray-300"/>
                                  <div>
                                    <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                      <Smartphone className="w-4 h-4 text-indigo-500"/>
                                      SMS Text Message Delivery
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                      Send DLT-compliant SMS trade alerts to client mobile numbers. If unchecked, no SMS trade messages will be sent to any client.
                                    </p>
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Telegram Bot Configuration */}
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Send className="w-4 h-4 text-sky-500"/>
                                    Company Telegram Bot Configuration
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Obtain a token by creating a bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">@BotFather</a> on Telegram.
                                  </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${telegramTradeEnabled && telegramBotToken
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'}`}>
                                  {telegramTradeEnabled && telegramBotToken ? 'Configured' : 'Not Active'}
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="col-span-2">
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Telegram Bot Token <span className="text-rose-500">*</span>
                                  </label>
                                  <div className="flex gap-2">
                                    <input type="password" value={telegramBotToken} onChange={e => {
            setTelegramBotToken(e.target.value.trim());
            setBotTestResult(null);
        }} placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ" className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"/>
                                    <button type="button" onClick={handleTestTelegramBot} disabled={testingBot || !telegramBotToken} className="px-4 py-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-sm">
                                      {testingBot ? (<>
                                          <RefreshCcw className="w-3.5 h-3.5 animate-spin"/>
                                          Testing...
                                        </>) : (<>
                                          <CheckCircle2 className="w-3.5 h-3.5"/>
                                          Test Connection
                                        </>)}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Telegram Bot Username (without @)
                                  </label>
                                  <input type="text" value={telegramBotUsername} onChange={e => setTelegramBotUsername(e.target.value.replace(/^@/, '').trim())} placeholder="e.g. InfolineTradeBot" className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-sky-500 transition"/>
                                </div>

                                <div className="flex items-end">
                                  {telegramBotUsername && (<a href={`https://t.me/${telegramBotUsername}`} target="_blank" rel="noreferrer" className="text-xs text-sky-500 hover:underline flex items-center gap-1 font-semibold pb-2">
                                      Open Bot in Telegram: t.me/{telegramBotUsername}
                                    </a>)}
                                </div>
                              </div>

                              {botTestResult && (<div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${botTestResult.success
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'}`}>
                                  {botTestResult.success ? (<CheckCircle2 className="w-4 h-4 shrink-0"/>) : (<XCircle className="w-4 h-4 shrink-0"/>)}
                                  <span className="font-semibold">{botTestResult.message}</span>
                                </div>)}

                              {/* Telegram Join Eligibility Rule */}
                              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-3">
                                <div>
                                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-1">
                                    Client Telegram Join Rule (Button Visibility on Dashboard)
                                  </label>
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Paid active plan is mandatory for trade alerts. Select whether subscribers can connect immediately or only after verified KYC &amp; Agreement:
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                                  <label className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${telegramJoinRule === 'ACTIVE_PLAN_ONLY' || telegramJoinRule === 'ALL'
            ? 'border-sky-500 bg-sky-500/10 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'}`}>
                                    <input type="radio" name="telegramJoinRule" value="ACTIVE_PLAN_ONLY" checked={telegramJoinRule === 'ACTIVE_PLAN_ONLY' || telegramJoinRule === 'ALL'} onChange={() => setTelegramJoinRule('ACTIVE_PLAN_ONLY')} className="mt-1 accent-sky-500"/>
                                    <div>
                                      <p className="text-xs font-bold flex items-center gap-1.5">
                                        <span>Active Paid Plan Holders</span>
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono">Paid Only</span>
                                      </p>
                                      <p className="text-[11px] opacity-75 mt-0.5">
                                        Only clients with an active paid subscription plan can connect (allowed even before completing KYC or Agreement).
                                      </p>
                                    </div>
                                  </label>

                                  <label className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${telegramJoinRule === 'KYC_AGREEMENT_VERIFIED'
            ? 'border-sky-500 bg-sky-500/10 text-slate-900 dark:text-white'
            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'}`}>
                                    <input type="radio" name="telegramJoinRule" value="KYC_AGREEMENT_VERIFIED" checked={telegramJoinRule === 'KYC_AGREEMENT_VERIFIED'} onChange={() => setTelegramJoinRule('KYC_AGREEMENT_VERIFIED')} className="mt-1 accent-sky-500"/>
                                    <div>
                                      <p className="text-xs font-bold flex items-center gap-1.5">
                                        <span>Active Paid Plan + KYC &amp; Agreement</span>
                                        <span className="text-[10px] bg-sky-500/20 text-sky-600 dark:text-sky-400 px-1.5 py-0.5 rounded font-mono">Strict SEBI</span>
                                      </p>
                                      <p className="text-[11px] opacity-75 mt-0.5">
                                        Clients must have an active paid plan AND their DigiLocker KYC and Service Agreement must be verified before connecting.
                                      </p>
                                    </div>
                                  </label>
                                </div>
                              </div>
                            </div>

                            {/* Save Button */}

                            <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800">
                              <button type="button" onClick={handleSaveTradeDispatchSettings} disabled={savingTradeDispatch} className="px-6 py-2.5 bg-[#d4f23b] text-black hover:bg-[#c3e031] font-extrabold rounded-xl text-xs transition shadow-md shadow-[#d4f23b]/20 flex items-center gap-2 disabled:opacity-50">
                                {savingTradeDispatch && <RefreshCcw className="w-3.5 h-3.5 animate-spin"/>}
                                {savingTradeDispatch ? 'Saving Settings...' : 'Save Trade Dispatch Settings'}
                              </button>
                            </div>
                          </div>
                        </div>)}

                      {settingsTab === 'policies' && (<div className="space-y-6 animate-fade-in">
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">📄 Documents, Policies & Onboarding</h3>
                            <p className="text-xs text-slate-500 mb-6">Manage mandatory compliance files and customer flow preferences.</p>

                            {/* Client Onboarding Sequence Control (KYC First vs Payment First) */}
                            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-white/10 mb-6 space-y-4">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-primary-500"/>
                                    <span>Client Onboarding Sequence</span>
                                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${kycFirst
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300'
            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300'}`}>
                                      {kycFirst ? '● KYC BEFORE PAYMENT' : '● KYC AFTER PAYMENT'}
                                    </span>
                                  </h4>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Select the mandatory verification flow for new clients. Click either card to switch sequence (with confirmation).
                                  </p>
                                </div>
                              </div>

                              {/* Single Locked Compliance Flow Card (KYC After Payment Hidden) */}
                              <div className="max-w-xl">
                                <div className="p-4 rounded-xl border-2 border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/30 relative">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-sm">
                                        <ShieldCheck className="w-4 h-4"/>
                                      </div>
                                      <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">KYC Before Payment</span>
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400">Strict Compliance Standard Flow</span>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 shadow-sm">
                                      <Check className="w-3 h-3"/> Active &amp; Locked
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2.5">
                                    Client must verify PAN/KRA and sign Service Agreement <strong>first</strong>. Pricing &amp; payments unlock only after agreement.
                                  </p>
                                  <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center gap-1.5 text-[10px] font-mono text-blue-700 dark:text-blue-300 font-semibold">
                                    <span>Welcome</span> ➔ <span>KYC</span> ➔ <span>Agreement</span> ➔ <span>Payment</span>
                                  </div>
                                </div>
                              </div>                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* Terms & Conditions PDF Card */}
                              <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-primary-500/30 transition-all">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                      Terms & Conditions PDF
                                    </label>
                                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${termsPdf
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            : termsPdfUrl
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                                      {termsPdf ? '● New File Selected' : termsPdfUrl ? '● Custom PDF Active' : '● Default SEBI Template'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                    Sent automatically to client in the Welcome Email upon onboarding.
                                  </p>

                                  <div className="space-y-3">
                                    <input type="file" accept="application/pdf" onChange={e => setTermsPdf(e.target.files?.[0])} className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 dark:file:bg-primary-950/60 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30"/>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button type="button" onClick={() => openPdfPreview('terms', 'Terms & Conditions PDF', termsPdf, termsPdfUrl)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold transition-all shadow-sm group">
                                        <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"/>
                                        <span>Preview Terms PDF</span>
                                      </button>
                                      <a href={getPdfDirectUrl('terms', termsPdf, termsPdfUrl)} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition" title="Open in new window">
                                        <ExternalLink className="w-4 h-4"/>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Privacy Policy PDF Card */}
                              <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-primary-500/30 transition-all">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                      Privacy Policy PDF
                                    </label>
                                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${privacyPdf
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            : privacyPdfUrl
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                                      {privacyPdf ? '● New File Selected' : privacyPdfUrl ? '● Custom PDF Active' : '● Default SEBI Template'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                    Sent automatically to client in the Welcome Email upon onboarding.
                                  </p>

                                  <div className="space-y-3">
                                    <input type="file" accept="application/pdf" onChange={e => setPrivacyPdf(e.target.files?.[0])} className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 dark:file:bg-primary-950/60 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30"/>

                                    <div className="flex items-center gap-2 pt-1">
                                      <button type="button" onClick={() => openPdfPreview('privacy', 'Privacy Policy PDF', privacyPdf, privacyPdfUrl)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold transition-all shadow-sm group">
                                        <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"/>
                                        <span>Preview Privacy PDF</span>
                                      </button>
                                      <a href={getPdfDirectUrl('privacy', privacyPdf, privacyPdfUrl)} target="_blank" rel="noreferrer" className="p-2 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition" title="Open in new window">
                                        <ExternalLink className="w-4 h-4"/>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Internal Policy PDF Card */}
                              <div className="bg-white dark:bg-slate-900/90 p-5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col justify-between hover:border-primary-500/30 transition-all md:col-span-2">
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                      Internal Policy PDF
                                    </label>
                                    <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${internalPolicyPdf
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
            : policyUrl
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800'}`}>
                                      {internalPolicyPdf ? '● New File Selected' : policyUrl ? '● Custom PDF Active' : '● Default SEBI Template'}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                    Written internal supervisory policies & controls for SEBI compliance audit trail. Not visible to clients.
                                  </p>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                    <input type="file" accept="application/pdf" onChange={e => setInternalPolicyPdf(e.target.files?.[0])} className="w-full text-xs text-slate-500 dark:text-slate-400 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 dark:file:bg-primary-950/60 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900/50 cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-800/30"/>

                                    <div className="flex items-center gap-2">
                                      <button type="button" onClick={() => openPdfPreview('internal', 'Internal Policy PDF', internalPolicyPdf, policyUrl)} className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/50 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/60 rounded-xl text-xs font-bold transition-all shadow-sm group">
                                        <Eye className="w-3.5 h-3.5 group-hover:scale-110 transition-transform"/>
                                        <span>Preview Internal Policy PDF</span>
                                      </button>
                                      <a href={getPdfDirectUrl('internal', internalPolicyPdf, policyUrl)} target="_blank" rel="noreferrer" className="p-2.5 text-slate-500 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition" title="Open in new window">
                                        <ExternalLink className="w-4 h-4"/>
                                      </a>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-300 dark:border-white/10 pt-6 space-y-6">
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                                    Service Agreement Content
                                  </label>
                                  <span className="text-[10px] bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 px-2.5 py-1 rounded-full font-bold border border-primary-200 dark:border-primary-800/60">
                                    Supports Dynamic Variables
                                  </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200 dark:border-white/5 mb-3">
                                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                                    <span>Click any variable below to copy it with one click:</span>
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {AGREEMENT_VARIABLES.map(v => {
            const isCopied = copiedVariable === v.key;
            return (<button key={v.key} type="button" onClick={() => handleCopyVariable(v.key, v.label)} className={`group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium transition-all duration-150 border cursor-pointer ${isCopied
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 shadow-sm'
                    : 'bg-white hover:bg-primary-50 dark:bg-slate-800 dark:hover:bg-primary-950/40 border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-600 text-slate-700 dark:text-slate-200 hover:text-primary-700 dark:hover:text-primary-300'}`} title={`Click to copy ${v.key} (${v.label})`}>
                                          {isCopied ? (<Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"/>) : (<Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors"/>)}
                                          <span className="font-semibold">{v.key}</span>
                                          <span className="text-[10px] text-slate-400 font-sans group-hover:text-primary-500">
                                            {isCopied ? 'Copied!' : `(${v.label})`}
                                          </span>
                                        </button>);
        })}
                                  </div>
                                </div>
                                <div className="text-black bg-white rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 shadow-inner">
                                  {ClassicEditor ? (<CKEditor editor={ClassicEditor} data={agreementContent} onChange={(event, editor) => {
                const data = editor.getData();
                setAgreementContent(data);
            }}/>) : (<textarea value={agreementContent} onChange={e => setAgreementContent(e.target.value)} rows={6} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs font-mono" placeholder={`Enter the Service Agreement terms here...\n\nThis agreement is made between {{COMPANY_NAME}} and {{CLIENT_NAME}}...`}/>)}
                                </div>
                              </div>

                              {/* Welcome Email link to Email Templates (Centralized management) */}
                              <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/10 border border-blue-200/80 dark:border-blue-900/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 shrink-0">
                                    <Mail className="w-5 h-5"/>
                                  </div>
                                  <div>
                                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                      <span>Welcome Onboarding Email</span>
                                      <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold px-2 py-0.5 rounded-full">
                                        Email Templates Engine
                                      </span>
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Welcome email subject, credentials layout, and dynamic variables are now centrally configured in the <strong>Email Templates</strong> tab.
                                    </p>
                                  </div>
                                </div>
                                <button type="button" onClick={() => setSettingsTab('email-templates')} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-sm whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5">
                                  <span>Manage Welcome Email</span>
                                  <ArrowRight className="w-3.5 h-3.5"/>
                                </button>
                              </div>

                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Research Report Disclaimer</label>
                                <div className="text-black bg-white rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 shadow-inner">
                                  {ClassicEditor ? (<CKEditor editor={ClassicEditor} data={reportDisclaimer} onChange={(event, editor) => {
                const data = editor.getData();
                setReportDisclaimer(data);
            }}/>) : (<textarea value={reportDisclaimer} onChange={e => setReportDisclaimer(e.target.value)} rows={4} placeholder="Type your full research report disclaimer and disclosure here..." className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 outline-none transition"/>)}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">This text will automatically appear at the bottom of generated PDF Research Reports.</p>
                              </div>
                            </div>
                          </div>
                        </div>)}

                      {settingsTab === 'billing' && (<div className="space-y-6 animate-fade-in">
                          {/* 1. GST & Tax Calculation Card */}
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                  <span>💳 GST & Tax Settings</span>
                                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${gstEnabled
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300'}`}>
                                    {gstEnabled ? '● GST ENABLED (18% TAX)' : '○ GST DISABLED (0% NON-GST)'}
                                  </span>
                                </h3>
                                <p className="text-xs text-slate-500">
                                  {gstEnabled
            ? 'Tax invoices are generated with 18% GST (CGST/SGST or IGST). Company GSTIN is mandatory.'
            : 'Invoices will be generated without GST (0% tax). No GSTIN number will appear on invoices.'}
                                </p>
                              </div>

                              {/* Toggle GST Switch with Confirmation */}
                              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-white/10 shrink-0">
                                <button type="button" onClick={() => handleTriggerGstToggle(false)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${!gstEnabled
            ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 ring-1 ring-rose-500'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                                  <span>Disable GST</span>
                                </button>
                                <button type="button" onClick={() => handleTriggerGstToggle(true)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${gstEnabled
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 ring-1 ring-emerald-500'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>
                                  <span>Enable GST</span>
                                </button>
                              </div>
                            </div>

                            {!gstEnabled && (<div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600"/>
                                <span>
                                  <strong>Non-GST Advisor Mode:</strong> GST calculation is disabled. Invoices will be generated with 0% tax, and company GSTIN will NOT be printed on generated invoices.
                                </span>
                              </div>)}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                  GST Calculation Method {gstEnabled && <span className="text-rose-500">*</span>}
                                </label>
                                <select value={gstCalculationType} onChange={e => setGstCalculationType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition cursor-pointer">
                                  <option value="EXCLUSIVE">Amount + GST (Exclusive - 18% added on top)</option>
                                  <option value="INCLUSIVE">Amount Including GST (Inclusive - 18% extracted)</option>
                                </select>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {gstEnabled ? 'Applies 18% GST (CGST/SGST or IGST)' : 'Default method (applies when GST is enabled)'}
                                </p>
                              </div>
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label htmlFor="company-gstin-input" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Company GSTIN Number
                                  </label>
                                  {gstEnabled ? (<span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                                      * Mandatory (15 Chars)
                                    </span>) : (<span className="text-[10px] font-medium text-slate-400">
                                      Optional (Applied on Enable)
                                    </span>)}
                                </div>
                                <input id="company-gstin-input" type="text" value={orgGst} onChange={e => setOrgGst(e.target.value.toUpperCase())} placeholder="e.g. 22AAAAA1111A1Z1 (15 Characters)" className={`w-full bg-white dark:bg-slate-900 border rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition uppercase ${gstEnabled && (!orgGst || orgGst.trim().length < 15)
            ? 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-400/20'
            : 'border-slate-400 dark:border-white/10'}`}/>
                                <p className="text-[10px] text-slate-500 mt-1">
                                  {gstEnabled
            ? 'Must be exactly 15 alphanumeric characters.'
            : 'Enter your 15-character GSTIN. When GST is disabled, GSTIN will NOT be printed on invoice PDFs.'}
                                </p>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Company State (For CGST/SGST vs IGST)</label>
                                <select value={tenantState} onChange={e => setTenantState(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition">
                                  <option value="">-- Select State --</option>
                                  <option value="ANDAMAN AND NICOBAR ISLANDS">Andaman and Nicobar Islands</option>
                                  <option value="ANDHRA PRADESH">Andhra Pradesh</option>
                                  <option value="ARUNACHAL PRADESH">Arunachal Pradesh</option>
                                  <option value="ASSAM">Assam</option>
                                  <option value="BIHAR">Bihar</option>
                                  <option value="CHANDIGARH">Chandigarh</option>
                                  <option value="CHHATTISGARH">Chhattisgarh</option>
                                  <option value="DADRA AND NAGAR HAVELI AND DAMAN AND DIU">Dadra and Nagar Haveli and Daman and Diu</option>
                                  <option value="DELHI">Delhi</option>
                                  <option value="GOA">Goa</option>
                                  <option value="GUJARAT">Gujarat</option>
                                  <option value="HARYANA">Haryana</option>
                                  <option value="HIMACHAL PRADESH">Himachal Pradesh</option>
                                  <option value="JAMMU AND KASHMIR">Jammu and Kashmir</option>
                                  <option value="JHARKHAND">Jharkhand</option>
                                  <option value="KARNATAKA">Karnataka</option>
                                  <option value="KERALA">Kerala</option>
                                  <option value="LADAKH">Ladakh</option>
                                  <option value="LAKSHADWEEP">Lakshadweep</option>
                                  <option value="MADHYA PRADESH">Madhya Pradesh</option>
                                  <option value="MAHARASHTRA">Maharashtra</option>
                                  <option value="MANIPUR">Manipur</option>
                                  <option value="MEGHALAYA">Meghalaya</option>
                                  <option value="MIZORAM">Mizoram</option>
                                  <option value="NAGALAND">Nagaland</option>
                                  <option value="ODISHA">Odisha</option>
                                  <option value="PUDUCHERRY">Puducherry</option>
                                  <option value="PUNJAB">Punjab</option>
                                  <option value="RAJASTHAN">Rajasthan</option>
                                  <option value="SIKKIM">Sikkim</option>
                                  <option value="TAMIL NADU">Tamil Nadu</option>
                                  <option value="TELANGANA">Telangana</option>
                                  <option value="TRIPURA">Tripura</option>
                                  <option value="UTTAR PRADESH">Uttar Pradesh</option>
                                  <option value="UTTARAKHAND">Uttarakhand</option>
                                  <option value="WEST BENGAL">West Bengal</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">🏦 Bank Account Details</h3>
                            <p className="text-xs text-slate-500 mb-6">Displayed on generated invoices.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Bank Name</label>
                                <input type="text" value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Branch</label>
                                <input type="text" value={bankBranch} onChange={e => setBankBranch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Name</label>
                                <input type="text" value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Number</label>
                                <input type="text" value={bankAccountNo} onChange={e => setBankAccountNo(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Account Type</label>
                                <input type="text" value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">IFSC Code</label>
                                <input type="text" value={bankIfsc} onChange={e => setBankIfsc(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-sm"/>
                              </div>
                            </div>
                          </div>

                          {/* 3. Tax Invoice Dispatch & Generation Policy Card */}
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-4">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                <span>🧾 Tax Invoice Dispatch & Generation Policy</span>
                              </h3>
                              <p className="text-xs text-slate-500">
                                Choose when and how Tax Invoices are generated and dispatched to clients. Only 1 option can be active at a time.
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                              {/* Option 1: Immediate */}
                              <div onClick={() => setInvoiceDispatchPolicy('IMMEDIATE_ON_PAYMENT')} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${invoiceDispatchPolicy === 'IMMEDIATE_ON_PAYMENT'
            ? 'border-primary-600 bg-primary-50/50 dark:bg-primary-950/20 shadow-md ring-2 ring-primary-500/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-base">⚡</span>
                                    <span>Immediate on Payment</span>
                                  </span>
                                  <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${invoiceDispatchPolicy === 'IMMEDIATE_ON_PAYMENT' ? 'border-primary-600 bg-primary-600' : 'border-slate-400'}`}>
                                    {invoiceDispatchPolicy === 'IMMEDIATE_ON_PAYMENT' && <span className="w-1.5 h-1.5 rounded-full bg-white"/>}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Invoice is generated and emailed to client immediately upon payment or admin assignment. (Uses Admin-edited or current profile details).
                                </p>
                              </div>

                              {/* Option 2: After Agreement */}
                              <div onClick={() => setInvoiceDispatchPolicy('AFTER_KYC_AGREEMENT')} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${invoiceDispatchPolicy === 'AFTER_KYC_AGREEMENT'
            ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md ring-2 ring-emerald-500/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                                    <span className="text-base">✍️</span>
                                    <span>After KYC & Agreement</span>
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                                      RECOMMENDED
                                    </span>
                                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${invoiceDispatchPolicy === 'AFTER_KYC_AGREEMENT' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-400'}`}>
                                      {invoiceDispatchPolicy === 'AFTER_KYC_AGREEMENT' && <span className="w-1.5 h-1.5 rounded-full bg-white"/>}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                  Plan starts immediately. Invoices remain pending until the client completes KYC & signs the agreement. Once signed, all pending invoices are batch-released with verified details.
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* 3. L2 Payment Approval Workflow Card */}
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                  <span>🛡️ Multi-Level (L2) Payment Approval Workflow</span>
                                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${l2ApprovalEnabled
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}>
                                    {l2ApprovalEnabled ? '● L2 APPROVAL REQUIRED' : '○ DIRECT ACTIVATION (L2 OFF)'}
                                  </span>
                                </h3>
                                <p className="text-xs text-slate-500 max-w-2xl">
                                  When enabled, manual QR/UPI screenshot payments and direct admin plan assignments will not immediately activate plans or send invoices. They are queued for final L2 review where the approver can modify plan, amount, days, discount, payment date, and service start date before activation.
                                </p>
                              </div>

                              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input type="checkbox" checked={l2ApprovalEnabled} onChange={e => setL2ApprovalEnabled(e.target.checked)} className="sr-only peer"/>
                                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                              </label>
                            </div>
                          </div>

                          {/* 4. Centralized File Download & Data Security Policy Card */}
                          <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-5">
                            <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1 flex items-center gap-2">
                                <span>🔒 Centralized File Download Security Policy</span>
                              </h3>
                              <p className="text-xs text-slate-500">
                                Control how exports, reports, and client records are distributed across your organization to protect against data leakage.
                              </p>
                            </div>

                            {/* Options: SYSTEM vs EMAIL vs BOTH */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              {[
            { id: 'SYSTEM', title: '🖥️ Download on System', desc: 'Direct browser download to the user device for authorized staff.' },
            { id: 'EMAIL', title: '✉️ Send on Registered Email', desc: 'Staff exports are NEVER saved locally; strictly routed to Admin registered email address.' },
            { id: 'BOTH', title: '🔄 Both (System & Email)', desc: 'Allows authorized download while maintaining an audit copy sent to the Admin email.' }
        ].map(pol => (<div key={pol.id} onClick={() => setFileDownloadPolicy(pol.id)} className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${fileDownloadPolicy === pol.id
                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-bold text-xs text-slate-800 dark:text-white">{pol.title}</span>
                                    <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${fileDownloadPolicy === pol.id ? 'border-indigo-600 bg-indigo-600' : 'border-slate-400'}`}>
                                      {fileDownloadPolicy === pol.id && <span className="w-1.5 h-1.5 rounded-full bg-white"/>}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">{pol.desc}</p>
                                </div>))}
                            </div>

                            {/* Additional Email & Threshold Inputs */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Secondary Notification Email for Downloads (Optional)
                                </label>
                                <input type="email" value={fileDownloadNotificationEmail} onChange={e => setFileDownloadNotificationEmail(e.target.value)} placeholder="e.g. audit@company.com or ca@firm.com" className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"/>
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                  If set, all file exports dispatched via email will also be CC&apos;d to this address.
                                </span>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                  Max Attachment Size Limit (MB)
                                </label>
                                <input type="number" min="1" max="25" value={maxEmailFileSizeMb} onChange={e => setMaxEmailFileSizeMb(Number(e.target.value) || 10)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-mono"/>
                                <span className="text-[10px] text-slate-500 mt-1 block">
                                  Exports exceeding this size prompt Admin for local save, while blocking staff direct downloads.
                                </span>
                              </div>
                            </div>

                            {/* Save Button for Billing & Security */}
                            <div className="flex justify-end pt-3">
                              <button type="button" disabled={savingTradeDispatch} onClick={handleSaveSettings} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-primary-600/30 transition-all flex items-center gap-2">
                                {savingTradeDispatch && <Loader2 className="w-3.5 h-3.5 animate-spin"/>}
                                <span>Save Workflow &amp; Security Settings</span>
                              </button>
                            </div>
                          </div>
                        </div>)}

                      {settingsTab === 'integrations' && (<div className="space-y-6 animate-fade-in">
                          {/* Integration Sub-tabs */}
                          <div className="flex flex-wrap items-center gap-2 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl w-full mb-2">
                            {[
            { id: 'payments', label: 'Payment Gateways', icon: CreditCard },
            { id: 'email', label: 'Email & SMTP', icon: User },
            { id: 'email-templates', label: 'Email Templates', icon: Mail },
            { id: 'kyc', label: 'Digio KYC & eSign', icon: FileCheck }
        ].map(tab => (<button key={tab.id} onClick={() => setIntegrationTab(tab.id)} className={`flex flex-1 sm:flex-none justify-center items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${integrationTab === tab.id ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}>
                                <tab.icon className="h-4 w-4"/>
                                <span>{tab.label}</span>
                              </button>))}
                          </div>

                          {/* Payment Gateways & QR / UPI Settings */}
                          {integrationTab === 'payments' && (<div className="space-y-6 animate-fade-in">
                              {/* 1. ONLINE PAYMENT GATEWAY CARD */}
                              <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                                  <div>
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                                        <CreditCard className="w-5 h-5"/>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Online Payment Gateway</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      Enable or disable online payment gateway redirect (Razorpay, CCAvenue, Cashfree, Stripe) for clients.
                                    </p>
                                  </div>

                                  <label className="inline-flex items-center cursor-pointer select-none">
                                    <span className="mr-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                      {paymentGatewayEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <div className="relative">
                                      <input type="checkbox" className="sr-only peer" checked={paymentGatewayEnabled} onChange={e => setPaymentGatewayEnabled(e.target.checked)}/>
                                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                    </div>
                                  </label>
                                </div>

                                {paymentGatewayEnabled ? (<div className="space-y-4">
                                    <div>
                                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Active Payment Gateway</label>
                                      <select value={activePaymentGateway} onChange={e => setActivePaymentGateway(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition">
                                        <option value="RAZORPAY">Razorpay</option>
                                        <option value="CASHFREE">Cashfree</option>
                                        <option value="CCAVENUE">CCAvenue</option>
                                        <option value="STRIPE">Stripe</option>
                                      </select>
                                    </div>

                                    {activePaymentGateway === 'RAZORPAY' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Razorpay Key ID</label>
                                          <input type="text" value={razorpayKeyId} onChange={e => setRazorpayKeyId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Razorpay Key Secret</label>
                                          <input type="password" value={razorpayKeySecret} onChange={e => setRazorpayKeySecret(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                      </div>)}

                                    {activePaymentGateway === 'CASHFREE' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cashfree App ID</label>
                                          <input type="text" value={cashfreeAppId} onChange={e => setCashfreeAppId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Cashfree Secret Key</label>
                                          <input type="password" value={cashfreeSecretKey} onChange={e => setCashfreeSecretKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                      </div>)}

                                    {activePaymentGateway === 'CCAVENUE' && (<div className="grid grid-cols-1 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Merchant ID</label>
                                          <input type="text" value={ccavenueMerchantId} onChange={e => setCcavenueMerchantId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Access Code</label>
                                          <input type="text" value={ccavenueAccessCode} onChange={e => setCcavenueAccessCode(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">CCAvenue Working Key</label>
                                          <input type="password" value={ccavenueWorkingKey} onChange={e => setCcavenueWorkingKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                      </div>)}

                                    {activePaymentGateway === 'STRIPE' && (<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-white/10 pt-4 mt-4">
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Stripe Publishable Key</label>
                                          <input type="text" value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                        <div>
                                          <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Stripe Secret Key</label>
                                          <input type="password" value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs"/>
                                        </div>
                                      </div>)}

                                    {/* Gateway Live Verification Section */}
                                    <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4">
                                      <div className="flex-1">
                                        {gatewayVerifyResult ? (<div className={`flex items-center space-x-2.5 text-xs p-3 rounded-xl transition-all ${gatewayVerifyResult.success ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30'}`}>
                                            <span className="text-base leading-none">{gatewayVerifyResult.success ? '✅' : '❌'}</span>
                                            <div className="flex-1 min-w-0">
                                              <p className="font-semibold">{gatewayVerifyResult.message}</p>
                                              {gatewayVerifyResult.mode && (<span className="inline-block mt-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border border-emerald-500/30">
                                                  Status: {gatewayVerifyResult.mode} MODE
                                                </span>)}
                                            </div>
                                          </div>) : (<p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Click Verify to test authentication with <span className="font-semibold text-slate-700 dark:text-slate-300">{activePaymentGateway}</span> servers.
                                          </p>)}
                                      </div>

                                      <button type="button" onClick={handleVerifyPaymentGateway} disabled={verifyingGateway} className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 whitespace-nowrap self-end sm:self-center">
                                        {verifyingGateway ? (<>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                            <span>Verifying Credentials...</span>
                                          </>) : (<>
                                            <ShieldCheck className="h-4 w-4"/>
                                            <span>Verify Gateway Connection</span>
                                          </>)}
                                      </button>
                                    </div>
                                  </div>) : (<div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 shrink-0"/>
                                    <span>
                                      Online Payment Gateway is currently <strong>disabled</strong>. Clients will not see the &quot;Pay Online&quot; button at checkout.
                                    </span>
                                  </div>)}
                              </div>

                              {/* 2. PAY WITH QR / UPI CONFIGURATION CARD */}
                              <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-4">
                                  <div>
                                    <div className="flex items-center gap-2.5">
                                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                        <QrCode className="w-5 h-5"/>
                                      </div>
                                      <h3 className="text-lg font-bold text-slate-800 dark:text-white">Pay with QR / UPI Settings</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                      Allow clients to pay directly to your UPI ID or QR code and upload payment screenshot for manual verification and plan assignment.
                                    </p>
                                  </div>

                                  <label className="inline-flex items-center cursor-pointer select-none">
                                    <span className="mr-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                                      {upiQrEnabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                    <div className="relative">
                                      <input type="checkbox" className="sr-only peer" checked={upiQrEnabled} onChange={e => setUpiQrEnabled(e.target.checked)}/>
                                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                    </div>
                                  </label>
                                </div>

                                {upiQrEnabled ? (<div className="space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                          UPI ID (VPA) <span className="text-rose-500">*</span>
                                        </label>
                                        <input type="text" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. yourname@okaxis or company@icici" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-xs focus:border-primary-500 outline-none transition font-mono"/>
                                        <p className="text-[10px] text-slate-400 mt-1">This UPI ID will be displayed to clients with a 1-click copy button.</p>
                                      </div>

                                      <div>
                                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                          Payee / Business Name
                                        </label>
                                        <input type="text" value={upiPayeeName} onChange={e => setUpiPayeeName(e.target.value)} placeholder="e.g. ABC Research Services" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2.5 px-3.5 text-xs focus:border-primary-500 outline-none transition"/>
                                        <p className="text-[10px] text-slate-400 mt-1">Name displayed under the QR code during payment.</p>
                                      </div>
                                    </div>

                                    {/* QR Code Upload & Preview */}
                                    <div>
                                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                                        UPI QR Code Image
                                      </label>
                                      <div className="flex flex-col sm:flex-row items-start gap-4 p-4 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40">
                                        {(upiQrImagePreview || upiQrImageUrl) ? (<div className="relative w-36 h-36 bg-white rounded-2xl p-2 border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
                                            <img src={upiQrImagePreview || getFullUrl(upiQrImageUrl)} alt="UPI QR Code" className="w-full h-full object-contain rounded-xl"/>
                                          </div>) : (<div className="w-36 h-36 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center text-slate-400 shrink-0 bg-white/50 dark:bg-slate-800/50">
                                            <QrCode className="w-10 h-10 mb-1 text-slate-300 dark:text-slate-600"/>
                                            <span className="text-[10px] font-bold">No QR Uploaded</span>
                                          </div>)}

                                        <div className="flex-1 space-y-2.5">
                                          <p className="text-xs text-slate-600 dark:text-slate-300">
                                            Upload your official business UPI QR code image (PNG, JPG, or WEBP). Clients will scan this image from any UPI payment app.
                                          </p>
                                          <input type="file" accept="image/*" id="upiQrFileInput" onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                        setUpiQrImageFile(file);
                        setUpiQrImagePreview(URL.createObjectURL(file));
                    }
                }} className="hidden"/>
                                          <div className="flex items-center gap-2">
                                            <label htmlFor="upiQrFileInput" className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm">
                                              <Upload className="w-3.5 h-3.5"/>
                                              <span>{(upiQrImagePreview || upiQrImageUrl) ? 'Change QR Image' : 'Upload QR Image'}</span>
                                            </label>

                                            {(upiQrImagePreview || upiQrImageUrl) && (<button type="button" onClick={() => {
                        setUpiQrImageFile(null);
                        setUpiQrImagePreview('');
                        setUpiQrImageUrl('');
                    }} className="px-3 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition">
                                                Remove
                                              </button>)}
                                          </div>
                                          <p className="text-[10px] text-slate-400">Recommended: Square format image (at least 400x400 px).</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Custom Instructions */}
                                    <div>
                                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        Custom Instructions for Clients
                                      </label>
                                      <textarea value={upiInstructions} onChange={e => setUpiInstructions(e.target.value)} rows={2} placeholder="Scan using Google Pay, PhonePe, Paytm or BHIM. After payment, enter the 12-digit UTR and upload the payment screenshot." className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs focus:border-primary-500 outline-none transition"/>
                                      <p className="text-[10px] text-slate-400 mt-1">This text will be highlighted in yellow above the screenshot upload area.</p>
                                    </div>
                                  </div>) : (<div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs flex items-center gap-3">
                                    <AlertCircle className="w-4 h-4 shrink-0"/>
                                    <span>
                                      Pay with QR / UPI is currently <strong>disabled</strong>. Enable it to show the QR/UPI payment button to clients.
                                    </span>
                                  </div>)}
                              </div>
                            </div>)}

                          {/* Email & SMTP Configuration */}
                          {integrationTab === 'email' && (<div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in">
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">📧 Email & SMTP Configuration</h3>
                              <p className="text-xs text-slate-500 dark:text-slate-500">Configure your own email server to send welcome emails and password reset links to your users.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">SMTP Host</label>
                                  <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. smtp.gmail.com"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">SMTP Port</label>
                                  <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. 587 or 465"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Username (Email)</label>
                                  <input type="email" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. you@gmail.com"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Password (App Password)</label>
                                  <input type="password" value={smtpPassword} onChange={e => setSmtpPassword(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="Enter password to update"/>
                                </div>
                                <div className="md:col-span-2">
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Sender Name / From Header (Optional)</label>
                                  <input type="text" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. RAGCP Support or leave blank to use Username"/>
                                </div>
                              </div>

                              {/* CC Invoice & CC Agreement Configuration */}
                              <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
                                <div className="mb-4">
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <span>📬 CC (Carbon Copy) Automated Email Dispatch</span>
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Configure CC email addresses for automatic carbon copies when client invoices and signed agreements are sent.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* CC Invoice Card */}
                                  <div className={`p-4 rounded-xl border transition-all ${ccInvoiceEnabled
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/60 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold">
                                          🧾
                                        </div>
                                        <div>
                                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">CC Invoice</label>
                                          <p className="text-[11px] text-slate-500">Auto-copy for client Tax Invoices</p>
                                        </div>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={ccInvoiceEnabled} onChange={e => setCcInvoiceEnabled(e.target.checked)}/>
                                        <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                      </label>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        CC Invoice Email Address {ccInvoiceEnabled && <span className="text-red-500">*</span>}
                                      </label>
                                      <input type="email" disabled={!ccInvoiceEnabled} value={ccInvoiceEmail} onChange={e => setCcInvoiceEmail(e.target.value)} placeholder="e.g. accounts@yourcompany.com" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 focus:border-primary-500 outline-none transition"/>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        When enabled, an exact PDF copy of every generated client invoice is sent here.
                                      </p>
                                    </div>
                                  </div>

                                  {/* CC Agreement Card */}
                                  <div className={`p-4 rounded-xl border transition-all ${ccAgreementEnabled
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60 shadow-sm'
                : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'}`}>
                                    <div className="flex items-center justify-between gap-3 mb-3">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">
                                          📜
                                        </div>
                                        <div>
                                          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">CC Agreement</label>
                                          <p className="text-[11px] text-slate-500">Auto-copy for signed Service Agreements</p>
                                        </div>
                                      </div>
                                      <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={ccAgreementEnabled} onChange={e => setCcAgreementEnabled(e.target.checked)}/>
                                        <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                                      </label>
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                        CC Agreement Email Address {ccAgreementEnabled && <span className="text-red-500">*</span>}
                                      </label>
                                      <input type="email" disabled={!ccAgreementEnabled} value={ccAgreementEmail} onChange={e => setCcAgreementEmail(e.target.value)} placeholder="e.g. compliance@yourcompany.com" className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs disabled:opacity-50 disabled:bg-slate-100 dark:disabled:bg-slate-800/60 focus:border-primary-500 outline-none transition"/>
                                      <p className="text-[10px] text-slate-400 mt-1">
                                        When enabled, an executed copy of client service agreements with PDF is sent here.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="border-t border-slate-200 dark:border-slate-800 my-6"></div>

                              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-2">Test SMTP Connection</h4>
                                <p className="text-xs text-slate-500 mb-4">Send a test email to verify your SMTP credentials before saving.</p>
                                <div className="flex flex-col sm:flex-row gap-3">
                                  <input type="email" value={testSmtpEmail} onChange={e => setTestSmtpEmail(e.target.value)} className="flex-1 bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="Enter your email address to receive test"/>
                                  <button onClick={handleTestSmtp} disabled={isTestingSmtp} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
                                    {isTestingSmtp ? (<span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Testing...</span>) : 'Send Test Email'}
                                  </button>
                                </div>
                              </div>
                            </div>)}

                          {/* Email Templates Engine */}
                          {integrationTab === 'email-templates' && (<div className="animate-fade-in">
                              <EmailTemplatesManager />
                            </div>)}

                          {/* Digio & CAMS KYC */}
                          {integrationTab === 'kyc' && (<div className="space-y-6">
                              <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Digio KYC &amp; eSign Configuration</h3>
                                  <p className="text-xs text-slate-500 mt-0.5">Configure your Digio credentials to enable Aadhaar DigiLocker KYC and Service Agreement eSigning for clients.</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto ${(digioEnvironment || '').toUpperCase() === 'PRODUCTION'
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'}`}>
                                  {digioEnvironment || 'SANDBOX'} MODE
                                </span>
                              </div>

                              {/* Warning if Client ID and Secret are identical */}
                              {digioClientId && digioClientSecret && digioClientId.trim() === digioClientSecret.trim() && (<div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
                                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5"/>
                                  <div>
                                    <p className="font-bold">Credential Warning: Client ID &amp; Secret are identical!</p>
                                    <p className="mt-0.5 text-[11px] leading-relaxed">
                                      You have entered the same key in both fields. Digio requires a separate Secret Key generated alongside the Client ID in your Digio Dashboard &gt; Settings &gt; API Keys. Pasting the Client ID into the Secret field causes authentication failures (403 Invalid API Credentials).
                                    </p>
                                  </div>
                                </div>)}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio Environment</label>
                                  <select value={digioEnvironment} onChange={e => setDigioEnvironment(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs">
                                    <option value="SANDBOX">Sandbox / UAT (ext.digio.in:444) — For Testing (ACK/AIK keys)</option>
                                    <option value="PRODUCTION">Production (api.digio.in) — Live Accounts</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio KYC Template Name</label>
                                  <input type="text" value={digioKycTemplateName} onChange={e => setDigioKycTemplateName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs" placeholder="e.g. KYC_AGREEMENT"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio Client ID (Access Key)</label>
                                  <input type="text" value={digioClientId} onChange={e => setDigioClientId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="e.g. ACK2609091655497739..."/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Digio Client Secret (Secret Key)</label>
                                  <input type="password" value={digioClientSecret} onChange={e => setDigioClientSecret(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="Leave blank to keep unchanged"/>
                                </div>
                              </div>

                              {/* Test Connection Button and Feedback */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <button type="button" disabled={testingDigio || !digioClientId} onClick={async () => {
                setTestingDigio(true);
                setDigioTestResult(null);
                try {
                    const res = await api.testDigioConfig({
                        digioClientId,
                        digioClientSecret,
                        digioEnvironment
                    });
                    setDigioTestResult({
                        success: res.success,
                        message: res.message || (res.success ? 'Digio connection successful!' : 'Connection test failed')
                    });
                    if (res.success) {
                        toast.success('Digio API connection verified!');
                    }
                    else {
                        toast.error(res.message || 'Digio connection test failed');
                    }
                }
                catch (err) {
                    setDigioTestResult({
                        success: false,
                        message: err.message || 'Failed to communicate with Digio'
                    });
                    toast.error(err.message || 'Failed to test Digio connection');
                }
                finally {
                    setTestingDigio(false);
                }
            }} className="bg-primary-50 dark:bg-primary-950/30 hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50">
                                  {testingDigio ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
                                  <span>{testingDigio ? 'Testing Digio API...' : '⚡ Test Digio Connection'}</span>
                                </button>

                                {digioTestResult && (<div className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${digioTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                                    {digioTestResult.success ? <Check className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
                                    <span>{digioTestResult.message}</span>
                                  </div>)}
                              </div>
                            </div>

                            {/* CAMS KRA Settings Card */}
                            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-xl shadow-slate-200/20 dark:shadow-none space-y-6 animate-fade-in mt-6">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                <div>
                                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                    <span>CAMS KRA Integration</span>
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">SEBI Approved KRA</span>
                                  </h3>
                                  <p className="text-xs text-slate-500 mt-0.5">Configure CAMS KRA credentials (camskra.com) for automated PAN download, client KYC verification and record auto-fetch.</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto ${camsClientCode && camsClientId && camsClientSecret
                ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-800'}`}>
                                  {camsClientCode && camsClientId && camsClientSecret ? 'CONFIGURED' : 'NOT CONFIGURED'}
                                </span>
                              </div>

                              {/* Warning if CAMS Client ID and Secret are identical */}
                              {camsClientId && camsClientSecret && camsClientId.trim() === camsClientSecret.trim() && (<div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2.5">
                                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600"/>
                                  <div>
                                    <p className="font-bold">Dhyan Dein: CAMS Client ID aur Client Secret same hain!</p>
                                    <p className="mt-0.5 opacity-90">Aapka CAMS Client ID (Username) aur Client Secret (Password) exact same value par set hai. CAMS KRA me Client Secret (Password) alag hota hai. Isi wajah se CAMS KRA server <strong>"No data found."</strong> return karta hai. Kripya apna sahi CAMS Client Secret yahan enter karein.</p>
                                  </div>
                                </div>)}

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    CAMS Client Code (clientCode) <span className="text-red-500">*</span>
                                  </label>
                                  <input type="text" value={camsClientCode} onChange={e => setCamsClientCode(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="e.g. CAMS_CLIENT_CODE"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    CAMS POS Code (poscode)
                                  </label>
                                  <input type="text" value={camsPoscode} onChange={e => setCamsPoscode(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="e.g. CAMS_POSCODE"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    CAMS Client ID (Basic Auth Username) <span className="text-red-500">*</span>
                                  </label>
                                  <input type="text" value={camsClientId} onChange={e => setCamsClientId(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="e.g. CAMS_CLIENT_ID"/>
                                </div>
                                <div>
                                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    CAMS Client Secret (Basic Auth Password) <span className="text-red-500">*</span>
                                  </label>
                                  <input type="password" value={camsClientSecret} onChange={e => setCamsClientSecret(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-mono" placeholder="Leave blank to keep unchanged"/>
                                </div>
                              </div>

                              {/* Test Connection Button and Feedback */}
                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                <button type="button" disabled={testingCams || !camsClientCode || !camsClientId} onClick={async () => {
                setTestingCams(true);
                setCamsTestResult(null);
                if (camsClientId && camsClientSecret && camsClientId.trim() === camsClientSecret.trim()) {
                    const msg = 'CAMS Client ID aur Client Secret identical hain! CAMS KRA me Client Secret (Password) alag hota hai. Kripya apna sahi Client Secret enter karein.';
                    setCamsTestResult({ success: false, message: msg });
                    toast.error(msg);
                    setTestingCams(false);
                    return;
                }
                try {
                    const res = await api.testCamsKra({
                        camsClientCode,
                        camsClientId,
                        camsClientSecret,
                        camsPoscode
                    });
                    setCamsTestResult({
                        success: res.success,
                        message: res.message || (res.success ? 'CAMS KRA connection verified!' : 'Connection test failed')
                    });
                    if (res.success) {
                        toast.success('CAMS KRA API Token verified successfully!');
                    }
                    else {
                        toast.error(res.message || 'CAMS KRA test failed');
                    }
                }
                catch (err) {
                    const msg = err?.response?.data?.message || err?.message || 'Failed to communicate with CAMS KRA';
                    setCamsTestResult({
                        success: false,
                        message: msg
                    });
                    toast.error(msg);
                }
                finally {
                    setTestingCams(false);
                }
            }} className="bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 transition-all disabled:opacity-50">
                                  {testingCams ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Zap className="w-3.5 h-3.5"/>}
                                  <span>{testingCams ? 'Testing CAMS KRA Token...' : '⚡ Test CAMS KRA Token'}</span>
                                </button>

                                {camsTestResult && (<div className={`text-xs font-medium px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${camsTestResult.success
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'}`}>
                                    {camsTestResult.success ? <Check className="w-3.5 h-3.5"/> : <AlertTriangle className="w-3.5 h-3.5"/>}
                                    <span>{camsTestResult.message}</span>
                                  </div>)}
                              </div>
                            </div>
                            </div>)}
                        </div>)}

                      {settingsTab === 'email-templates' && (<div className="animate-fade-in">
                          <EmailTemplatesManager />
                        </div>)}

                      {settingsTab === 'security' && (<SecuritySettingsTab tenantData={tenantDetails || user?.tenant} onUpdate={async () => {
            await loadData(true);
        }}/>)}

                      {settingsTab === 'occupations' && (<OccupationsManager />)}

                      {/* Save Settings Footer */}
                      {settingsTab !== 'occupations' && settingsTab !== 'security' && settingsTab !== 'email-templates' && (<div className="mt-8 p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/60 rounded-2xl flex items-center justify-between shadow-xl shadow-slate-200/20 dark:shadow-none animate-fade-in">
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">Save Your Changes</h4>
                            <p className="text-xs text-slate-500 mt-1">Make sure to save your settings before leaving this page.</p>
                          </div>
                          <button onClick={handleSaveSettings} className="bg-primary-600 hover:bg-primary-500 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center">
                            <Save className="h-5 w-5 mr-2"/> Save Settings
                          </button>
                        </div>)}
                    </div>
);
}
