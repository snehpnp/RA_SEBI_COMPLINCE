import React from 'react';
import { useAdmin } from './AdminContext';
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
import { ThemeToggle } from '@/components/ThemeToggle';
import UserProfileDropdown from '@/components/UserProfileDropdown';
import ConfirmDialog from '@/components/ConfirmDialog';
import ClientTimelineModal from '@/components/admin/ClientTimelineModal';
import ComplianceCalendarModal from '@/components/compliance/ComplianceCalendarModal';
import SecretComplianceVaultModal from '@/components/admin/SecretComplianceVaultModal';
import L2PaymentReviewModal from '@/components/admin/L2PaymentReviewModal';
import L1L2AuditModal from '@/components/admin/L1L2AuditModal';
import { formatPan } from '@/utils/formatters';
import api from '@/services/api';

export default function AdminLayout({ children }) {
  const admin = useAdmin();
  const {
    ICON_MAP,
    NAV_CONFIG,
    activeTab,
    adminNotifications,
    adminPagesList,
    adminPlans,
    adminUnreadCount,
    alertProof,
    alerts,
    allPayments,
    appLogo,
    appName,
    auditModalReq,
    checklist,
    checklistHistory,
    checklistPendingCount,
    closeRemarks,
    closingAlertId,
    coEmail,
    coMobile,
    coName,
    coNism,
    complaintClientName,
    complaintClientSearch,
    complaintDescription,
    complaintEmail,
    complaintFoundClient,
    complaintManualEmail,
    complaintManualMobile,
    complaintManualName,
    complaintManualPan,
    complaintMobile,
    complaintPan,
    complaintProof,
    complaintReceivedAt,
    complaintScoresRegNo,
    complaintSearchQuery,
    complaintSearching,
    complaintSource,
    complaintSubject,
    complaintType,
    completeness,
    completenessMetrics,
    complianceAlertCount,
    confirmGstToggle,
    confirmKycFlowToggle,
    confirmState,
    depositTopup,
    downloadingReport,
    filteredNav,
    getCalculatedCutoffInfo,
    getPrerequisitesStatus,
    goLivePassword,
    gstCalculationType,
    handleCloseAlert,
    handleConfirmGoLive,
    handleConfirmGstToggle,
    handleConfirmKycFlowToggle,
    handleCreateComplaint,
    handleDownloadPeriodicReport,
    handleLiveBadgeClick,
    handleLogout,
    handleMarkAdminNotifsRead,
    handleMarkAllNotifsAsRead,
    handleNavigateToPrerequisite,
    handleNotifItemClick,
    handleProceedToGoLive,
    handleRegisterComplaint,
    handleRevertImpersonate,
    handleSaveWizardStep,
    handleSearchClientForComplaint,
    hasPermission,
    isActivatingLive,
    isAdminNotifOpen,
    isComplaintModalOpen,
    isCompletenessLoading,
    isDarkMode,
    isDeliveryReportsExpanded,
    isGoLiveModalOpen,
    isGstConfirmModalOpen,
    isKycFlowConfirmModalOpen,
    isLogoutModalOpen,
    isManualFillAllowed,
    isMobileMenuOpen,
    isPagesExpanded,
    isProfileComplete,
    isSavingComplaint,
    isSavingGstToggle,
    isSavingKycFlowToggle,
    isSecretVaultOpen,
    isSetupPrereqModalOpen,
    isSidebarCollapsed,
    isStaff,
    isSubmittingComplaint,
    isSubmittingGoLive,
    isTimelineModalOpen,
    loadData,
    notifModalFilter,
    notifSearchQuery,
    orgAddress,
    orgGst,
    orgMobile,
    orgWebsite,
    pdfPreviewModal,
    pendingGstTargetState,
    pendingGstValue,
    pendingKycFirstState,
    pendingKycFlowValue,
    pendingQrCount,
    poEmail,
    poMobile,
    poName,
    poNism,
    poValidity,
    policyUrl,
    prereqActionTarget,
    reportHalf,
    reportStartYear,
    reportYear,
    selectedL1L2Diff,
    selectedL2Payment,
    selectedTimelineClient,
    setActiveTab,
    setAlertProof,
    setAllPayments,
    setAuditModalReq,
    setAuditRemarks,
    setAuditStatus,
    setCloseRemarks,
    setClosingAlertId,
    setCoEmail,
    setCoMobile,
    setCoName,
    setCoNism,
    setComplaintClientName,
    setComplaintClientSearch,
    setComplaintDescription,
    setComplaintEmail,
    setComplaintFoundClient,
    setComplaintManualEmail,
    setComplaintManualMobile,
    setComplaintManualName,
    setComplaintManualPan,
    setComplaintMobile,
    setComplaintPan,
    setComplaintProof,
    setComplaintReceivedAt,
    setComplaintScoresRegNo,
    setComplaintSearchQuery,
    setComplaintSource,
    setComplaintSubject,
    setComplaintType,
    setConfirmState,
    setDepositTopup,
    setGoLivePassword,
    setIsAdminNotifOpen,
    setIsComplaintModalOpen,
    setIsDeliveryReportsExpanded,
    setIsGoLiveModalOpen,
    setIsGstConfirmModalOpen,
    setIsKycFlowConfirmModalOpen,
    setIsLogoutModalOpen,
    setIsManualFillAllowed,
    setIsMobileMenuOpen,
    setIsPagesExpanded,
    setIsSecretVaultOpen,
    setIsSetupPrereqModalOpen,
    setIsSidebarCollapsed,
    setIsTimelineModalOpen,
    setNotifModalFilter,
    setNotifSearchQuery,
    setOrgAddress,
    setOrgGst,
    setOrgMobile,
    setOrgWebsite,
    setPdfPreviewModal,
    setPendingGstTargetState,
    setPendingGstValue,
    setPendingKycFirstState,
    setPendingKycFlowValue,
    setPoEmail,
    setPoMobile,
    setPoName,
    setPoNism,
    setPoValidity,
    setPolicyUrl,
    setReportHalf,
    setReportYear,
    setSelectedL1L2Diff,
    setSelectedL2Payment,
    setSelectedTimelineClient,
    setSettingsTab,
    setShowAllNotifsModal,
    setShowCalendarModal,
    setShowClientNotFoundAlert,
    setShowGoLivePassword,
    setShowReportModal,
    setWizardStep,
    showAllNotifsModal,
    showCalendarModal,
    showClientNotFoundAlert,
    showGoLivePassword,
    showReportModal,
    tenantCutoffDate,
    tenantDetails,
    tenantIsLive,
    user,
    wizardErrors,
    wizardStep
  } = admin || {};

return (<div className={isDarkMode ? 'dark' : ''}>

      <div className="h-screen h-dvh overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-white flex relative">
        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (<div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in" onClick={() => setIsMobileMenuOpen(false)}/>)}

        {/* Premium Sidebar (Blue in Light Mode) */}
        <aside className={`fixed lg:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border text-white transform transition-all duration-300 ease-in-out flex flex-col shrink-0 ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'} ${!isMobileMenuOpen && isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>

          {/* Brand */}
          <div className={`h-24 flex items-center border-b border-blue-800 dark:border-premium-border ${isSidebarCollapsed ? 'justify-center flex-col px-2 py-2 gap-2' : 'px-6 justify-between'}`}>
            <div className={`flex items-center gap-3 overflow-hidden ${isSidebarCollapsed ? 'justify-center' : ''}`}>
              {(() => {
        const rawLogo = user?.tenantLogo || user?.tenant?.logoUrl || appLogo;
        const logoSrc = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : `${api.getBaseUrl()}${rawLogo}`) : null;
        const displayName = user?.tenantName || user?.tenant?.companyName || appName || 'Logo';
        if (logoSrc) {
            return (<img src={logoSrc} alt={displayName} className={`max-h-10 object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-w-[32px]' : 'max-w-[180px]'}`}/>);
        }
        return (<>
                    <img src="/logo-light.png" alt={appName} className={`dark:hidden object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`}/>
                    <img src="/logo-dark.png" alt={appName} className={`hidden dark:block object-contain transition-all duration-300 ${isSidebarCollapsed ? 'max-h-8' : 'max-h-12'}`}/>
                  </>);
    })()}
            </div>
            {!isSidebarCollapsed && (<button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0">
                <Menu className="w-5 h-5"/>
              </button>)}
            {isSidebarCollapsed && (<button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="hidden lg:flex w-full items-center justify-center p-2 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors">
                <Menu className="w-5 h-5"/>
              </button>)}
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:rounded-full">
            {NAV_CONFIG.map((mod) => {
        if (!hasPermission(mod.accessKey))
            return null;
        if (tenantDetails?.complianceFeaturesEnabled === false && ['compliance', 'checklist', 'penalty-matrix'].includes(mod.tab))
            return null;
        if (mod.tab === 'signature_settings' && (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN'))
            return null;
        // Pre-Live (Setup Mode): Show only 3 essential panels (Dashboard, Client Management, Settings)
        const PRE_LIVE_TABS = ['dashboard', 'clients', 'settings', 'profile'];
        if (!tenantIsLive && !PRE_LIVE_TABS.includes(mod.tab)) {
            return null;
        }
        const Icon = ICON_MAP[mod.icon] || Layers;
        if (mod.tab === 'delivery-reports') {
            const isDeliveryActive = activeTab === 'delivery-reports' || activeTab.startsWith('deliveryReports_');
            return (<div key={mod.tab} className="pt-1">
                    <button onClick={() => {
                    if (isSidebarCollapsed)
                        setIsSidebarCollapsed(false);
                    setIsDeliveryReportsExpanded(!isDeliveryReportsExpanded);
                    if (!isDeliveryActive) {
                        setActiveTab('deliveryReports_all');
                    }
                }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group ${isDeliveryActive
                    ? 'bg-white/20 text-white font-semibold shadow-inner'
                    : 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? mod.label : undefined}>
                      <div className="flex items-center gap-4 min-w-0">
                        <Icon className={`w-5 h-5 transition-colors ${isDeliveryActive ? 'text-white' : 'text-blue-200 dark:text-white/50 group-hover:text-white'} shrink-0`}/>
                        {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{mod.label}</span>}
                      </div>
                      {!isSidebarCollapsed && (<div className={`transition-transform duration-200 ${isDeliveryReportsExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4"/>
                        </div>)}
                    </button>

                    {!isSidebarCollapsed && isDeliveryReportsExpanded && (<div className="pl-12 pr-4 space-y-1 mt-1">
                        {[
                        { id: 'deliveryReports_all', label: 'Delivery Report (All Type)', icon: Layers },
                        { id: 'deliveryReports_telegram', label: 'Telegram Delivery Report', icon: Send },
                        { id: 'deliveryReports_sms', label: 'Text Msg (SMS)', icon: Smartphone },
                        { id: 'deliveryReports_inapp', label: 'Panel Notifications', icon: Monitor }
                    ].map(subItem => {
                        const SubIcon = subItem.icon;
                        const isSubActive = activeTab === subItem.id || (activeTab === 'delivery-reports' && subItem.id === 'deliveryReports_all');
                        return (<button key={subItem.id} onClick={() => {
                                setActiveTab(subItem.id);
                                setIsMobileMenuOpen(false);
                            }} className={`w-full text-left py-2 px-3 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${isSubActive
                                ? 'bg-[#d4f23b] text-black font-extrabold shadow-sm'
                                : 'text-blue-100 dark:text-white/70 hover:text-white hover:bg-white/10'}`}>
                              <div className="flex items-center gap-2 truncate">
                                <SubIcon className="w-3.5 h-3.5 shrink-0"/>
                                <span className="truncate">{subItem.label}</span>
                              </div>
                              {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-black shrink-0"/>}
                            </button>);
                    })}
                      </div>)}
                  </div>);
        }
        if (mod.tab === 'customPages') {
            return (<div key={mod.tab} className="pt-2">
                    <button onClick={() => {
                    if (isSidebarCollapsed)
                        setIsSidebarCollapsed(false);
                    setIsPagesExpanded(!isPagesExpanded);
                }} className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white group ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? mod.label : undefined}>
                      <div className="flex items-center gap-4 min-w-0">
                        <Icon className="w-5 h-5 text-blue-200 dark:text-white/50 group-hover:text-white shrink-0"/>
                        {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{mod.label}</span>}
                      </div>
                      {!isSidebarCollapsed && (<div className={`transition-transform duration-200 ${isPagesExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="w-4 h-4"/>
                        </div>)}
                    </button>

                    {!isSidebarCollapsed && isPagesExpanded && (<div className="pl-12 pr-4 space-y-1 mt-1">
                        {adminPagesList.filter((page) => page.slug !== 'complaint-status').map((page) => (<button key={page.id} onClick={() => {
                            setActiveTab(`customPages_${page.slug}`);
                            setIsMobileMenuOpen(false);
                        }} className={`w-full text-left py-2 px-3 rounded-lg text-sm transition-colors ${activeTab === `customPages_${page.slug}`
                            ? 'bg-white/20 text-white font-medium shadow-inner'
                            : 'text-blue-100 dark:text-white/60 hover:text-white hover:bg-white/10'}`}>
                            {page.title}
                          </button>))}
                        {!isStaff && (<button onClick={() => setActiveTab('customPages_new')} className="w-full text-left px-3 py-2 text-xs rounded-lg transition font-medium text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 mt-2">
                            + Add New Page
                          </button>)}
                      </div>)}
                  </div>);
        }
        const isActive = activeTab === mod.tab;
        const isPaymentsTab = mod.tab === 'payments';
        const isComplianceTab = mod.tab === 'compliance';
        const isChecklistTab = mod.tab === 'checklist';
        const isL2Tab = mod.tab === 'l2-approvals';
        const l2PendingCount = allPayments.filter((p) => p.approvalStatus === 'L2_PENDING').length;
        let badgeCount = 0;
        let badgeTooltip = '';
        if (isL2Tab && l2PendingCount > 0) {
            badgeCount = l2PendingCount;
            badgeTooltip = `${l2PendingCount} Pending L2 Approval`;
        }
        else if (isPaymentsTab && pendingQrCount > 0) {
            badgeCount = pendingQrCount;
            badgeTooltip = `${pendingQrCount} Pending QR`;
        }
        else if (isComplianceTab && complianceAlertCount > 0) {
            badgeCount = complianceAlertCount;
            badgeTooltip = `${complianceAlertCount} Active Alerts`;
        }
        else if (isChecklistTab && checklistPendingCount > 0) {
            badgeCount = checklistPendingCount;
            badgeTooltip = `${checklistPendingCount} Pending Tasks`;
        }
        const showPendingBadge = badgeCount > 0;
        const isComplianceCluster = ['compliance', 'checklist', 'penalty-matrix'].includes(mod.tab);
        let buttonStyle = '';
        let iconStyle = '';
        if (isComplianceCluster) {
            if (isActive) {
                buttonStyle = 'bg-gradient-to-r from-amber-500/25 via-indigo-600/30 to-amber-500/20 text-white font-extrabold shadow-md border border-amber-400/50';
                iconStyle = 'text-amber-300';
            }
            else {
                buttonStyle = 'bg-amber-400/[0.08] dark:bg-amber-400/[0.07] border border-amber-400/20 text-amber-100 hover:bg-amber-400/20 hover:border-amber-400/40 hover:text-white';
                iconStyle = 'text-amber-400 group-hover:text-amber-200';
            }
        }
        else {
            if (isActive) {
                buttonStyle = 'bg-white/20 text-white font-semibold shadow-inner';
                iconStyle = 'text-white';
            }
            else {
                buttonStyle = 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white';
                iconStyle = 'text-blue-200 dark:text-white/50 group-hover:text-white';
            }
        }
        return (<div key={mod.tab}>
                  {!isSidebarCollapsed && mod.tab === 'compliance' && (<div className="pt-3 pb-1.5 px-3 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0"/>
                        SEBI Regulatory
                      </span>
                      <span className="text-[8px] font-black px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 font-mono">
                        3 Desks
                      </span>
                    </div>)}

                  <button onClick={() => {
                setActiveTab(mod.tab);
                setIsMobileMenuOpen(false);
            }} className={`w-full relative flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${buttonStyle} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? (showPendingBadge ? `${mod.label} (${badgeTooltip})` : mod.label) : undefined}>
                    <div className="relative shrink-0 flex items-center justify-center">
                      <Icon className={`w-5 h-5 transition-colors ${iconStyle}`}/>
                      {isSidebarCollapsed && showPendingBadge && (<span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-amber-500 text-black text-[9px] font-black rounded-full shadow-md animate-pulse">
                          {badgeCount}
                        </span>)}
                    </div>
                    {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">{mod.label}</span>}
                    {!isSidebarCollapsed && showPendingBadge && (<span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black shadow-sm shrink-0 animate-pulse">
                        {badgeCount}
                      </span>)}
                    {!isSidebarCollapsed && isComplianceCluster && !showPendingBadge && (<span className="ml-auto">
                        {mod.tab === 'compliance' && (<span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Desk
                          </span>)}
                        {mod.tab === 'checklist' && (<span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Checklist
                          </span>)}
                        {mod.tab === 'penalty-matrix' && (<span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/25 text-rose-300 border border-rose-500/30 font-mono">
                            78 Rules
                          </span>)}
                      </span>)}
                    {!isSidebarCollapsed && isActive && !showPendingBadge && !isComplianceCluster && (<div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"/>)}
                  </button>
                </div>);
    })}

            {user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN' && (<button onClick={() => { setActiveTab('legalView'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group ${activeTab === 'legalView'
            ? 'bg-white/20 text-white font-semibold shadow-inner'
            : 'text-blue-100 dark:text-white/70 hover:bg-white/10 hover:text-white'} ${isSidebarCollapsed ? 'justify-center px-2' : ''}`} title={isSidebarCollapsed ? "Legal & Disclosures" : undefined}>
                <FileText className={`w-5 h-5 transition-colors shrink-0 ${activeTab === 'legalView' ? 'text-white' : 'text-blue-200 dark:text-white/50 group-hover:text-white'}`}/>
                {!isSidebarCollapsed && <span className="truncate whitespace-nowrap">Legal & Disclosures</span>}
                {!isSidebarCollapsed && activeTab === 'legalView' && (<div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]"/>)}
              </button>)}

            {!tenantIsLive && !isSidebarCollapsed && (<div className="mx-2 mt-4 p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-200">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-amber-300 mb-1 uppercase tracking-wide">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0"/>
                  <span>Setup Mode (3 Panels)</span>
                </div>
                <p className="text-[10px] text-amber-200/80 leading-relaxed font-medium">
                  Compliance &amp; advanced desks are paused. Click <strong className="text-amber-200 underline">Go Live</strong> in top header to launch production.
                </p>
              </div>)}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 h-dvh flex flex-col overflow-hidden w-full bg-slate-50 dark:bg-slate-950">
          {/* Top Header Bar with Theme, User & Logout */}
          <header className="h-20 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shrink-0 z-30 transition-colors">
            <div className="flex items-center gap-3">
              {/* Mobile menu toggle */}
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors" title="Open Navigation">
                {isMobileMenuOpen ? <X className="w-5 h-5"/> : <Menu className="w-5 h-5"/>}
              </button>
              <div>
                <h1 className="text-base md:text-xl font-black text-slate-900 dark:text-white capitalize tracking-tight">
                  {(() => {
        if (!activeTab)
            return 'Dashboard';
        if (activeTab === 'deliveryReports_all' || activeTab === 'delivery-reports')
            return 'Multi-Channel Delivery Reports';
        if (activeTab === 'deliveryReports_telegram')
            return 'Telegram Delivery Reports';
        if (activeTab === 'deliveryReports_sms')
            return 'Text Message (SMS) Delivery Reports';
        if (activeTab === 'deliveryReports_inapp')
            return 'Panel Notification Delivery Reports';
        return activeTab.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    })()}
                </h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                  {user?.tenant?.companyName ? `${user.tenant.companyName} Compliance Portal` : 'Research Analyst Governance & Compliance Platform'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 md:gap-4">
              {user?.isImpersonated && (<button onClick={handleRevertImpersonate} className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center space-x-1.5 font-bold text-xs shadow-md shadow-indigo-600/20" title="Back to Super Admin">
                  <LogOut className="h-3.5 w-3.5 rotate-180"/>
                  <span className="hidden sm:inline">Back to Super Admin</span>
                </button>)}

              {/* Admin Real-time Notification Bell for Researcher Actions */}
              <div className="relative">
                <button onClick={() => setIsAdminNotifOpen(!isAdminNotifOpen)} className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center" title="Researcher Activity & Live Signals">
                  <Bell className={`w-5 h-5 ${adminUnreadCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}`}/>
                  {adminUnreadCount > 0 && (<span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-md shadow-rose-600/30 animate-pulse">
                      {adminUnreadCount > 9 ? '9+' : adminUnreadCount}
                    </span>)}
                </button>

                {/* Admin Notification Dropdown */}
                {isAdminNotifOpen && (<>
                    <div className="fixed inset-0 z-40" onClick={() => setIsAdminNotifOpen(false)}/>
                    <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                      <div className="p-3.5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs uppercase tracking-wider text-slate-900 dark:text-white">Researcher Activity</span>
                          {adminUnreadCount > 0 && (<span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold">
                              {adminUnreadCount} new
                            </span>)}
                        </div>
                        {adminUnreadCount > 0 && (<button onClick={handleMarkAdminNotifsRead} className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline">
                            Mark all as read
                          </button>)}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                        {adminNotifications.length === 0 ? (<div className="py-8 px-4 text-center">
                            <Bell className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-60"/>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">No activity notifications</p>
                          </div>) : (adminNotifications.slice(0, 8).map((n) => {
            const isUnread = !n.isRead && !n.read && n.status !== 'READ';
            const type = (n.type || '').toLowerCase();
            return (<div key={n.id || n._id} onClick={() => {
                    setIsAdminNotifOpen(false);
                    setActiveTab('research');
                }} className={`p-3 cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isUnread ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs mt-0.5 ${type === 'signal' || type === 'alert' || type === 'update'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : type === 'report'
                        ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                        : 'bg-slate-500/15 text-slate-600'}`}>
                                  {type === 'signal' ? <Target className="w-4 h-4"/> : type === 'report' ? <FileText className="w-4 h-4"/> : <Bell className="w-4 h-4"/>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1 mb-0.5">
                                    <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                      {n.title}
                                    </h5>
                                    {isUnread && (<span className="w-2 h-2 rounded-full bg-rose-600 shrink-0"/>)}
                                  </div>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {n.message}
                                  </p>
                                </div>
                              </div>);
        }))}
                      </div>

                      <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-white/10 flex items-center justify-between px-3">
                        <button onClick={() => {
            setIsAdminNotifOpen(false);
            setShowAllNotifsModal(true);
        }} className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5"/>
                          <span>View All ({adminNotifications.length})</span>
                        </button>
                        <button onClick={() => {
            setIsAdminNotifOpen(false);
            setShowAllNotifsModal(true);
        }} className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-500 flex items-center gap-1">
                          <span>Manage Signals &amp; Reports</span>
                          <ChevronRight className="w-3.5 h-3.5"/>
                        </button>
                      </div>
                    </div>
                  </>)}
              </div>

              {/* Go Live Button / LIVE Status Badge */}
              {!tenantIsLive ? (<button onClick={() => setIsGoLiveModalOpen(true)} className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 transition-all transform hover:scale-105 animate-pulse border border-emerald-400/50" title="Launch portal to LIVE production (password verification required)">
                  <Zap className="w-3.5 h-3.5 fill-current"/>
                  <span>Go Live</span>
                </button>) : (<div onClick={handleLiveBadgeClick} className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center gap-2 cursor-pointer shadow-sm select-none hover:bg-emerald-500/20 transition-all active:scale-95" title="LIVE Cycle (System Monitoring)">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>LIVE</span>
                  {tenantCutoffDate && (<span className="hidden xl:inline text-[10px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">
                      • Cycle: {new Date(tenantCutoffDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </span>)}
                </div>)}

              {/* Theme Toggle */}
              <div className="p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <ThemeToggle />
              </div>

              {/* Profile Dropdown with Username & Logout */}
              <UserProfileDropdown user={{
        name: user?.firstName || user?.name || 'Admin',
        firstName: user?.firstName,
        email: user?.email,
        role: user?.role || 'Staff'
    }} badgeColor="rose" onProfileClick={() => setActiveTab('profile')} onLogoutClick={() => setIsLogoutModalOpen(true)}/>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-4 md:p-8 max-w-7xl mx-auto w-full h-full">

              {/* ====================================================
  PROFILE COMPLETENESS WIZARD (Only for ADMIN, if completeness < 80%)
 ==================================================== */}
              {!isProfileComplete && !isCompletenessLoading && !tenantDetails?.address && !user?.tenant?.address && ['ADMIN', 'RESEARCHER'].includes(user.role) && !user?.isImpersonated && (<div className="max-w-3xl mx-auto space-y-8 mt-6">
                  <div className="p-6 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl text-xs space-y-2">
                    <h3 className="font-bold text-sm">Action Required: Profile Wizard Completeness is below 80%</h3>
                    <p>Your current completion score is <strong>{completeness}%</strong>. In accordance with SEBI compliance, client onboarding and research publishing features are locked until your profile reaches 80% completion.</p>
                  </div>

                  <div className="glassmorphism p-8 rounded-2xl border border-slate-400 dark:border-white/10 space-y-6">
                    <h2 className="text-lg font-bold">Profile Setup Wizard - Step {wizardStep} of 5</h2>
                    <div className="h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-primary-500" style={{ width: `${(wizardStep / 5) * 100}%` }}/>
                    </div>

                    {/* Step 1: Org details */}
                    {wizardStep === 1 && (<div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 1: Organization Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Corporate Address <span className="text-red-500">*</span></label>
                            <input type="text" value={orgAddress} onChange={e => setOrgAddress(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="Corporate HQ location"/>
                            {wizardErrors.orgAddress && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgAddress}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Corporate Website <span className="text-red-500">*</span></label>
                            <input type="text" value={orgWebsite} onChange={e => setOrgWebsite(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="www.alpharesearch.com"/>
                            {wizardErrors.orgWebsite && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgWebsite}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Support Mobile <span className="text-red-500">*</span></label>
                            <input type="text" value={orgMobile} onChange={e => setOrgMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="Support mobile"/>
                            {wizardErrors.orgMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">GST Number <span className="text-red-500">*</span></label>
                            <input type="text" value={orgGst} onChange={e => setOrgGst(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="GST Number"/>
                            {wizardErrors.orgGst && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.orgGst}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('ORG', { address: orgAddress, website: orgWebsite, mobile: orgMobile, gst: orgGst })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4"/>
                        </button>
                      </div>)}

                    {/* Step 2: Principal Officer */}
                    {wizardStep === 2 && (<div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 2: Principal Officer Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Full Name</label>
                            <input type="text" value={poName} onChange={e => setPoName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="PO Name"/>
                            {wizardErrors.poName && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Email</label>
                            <input type="email" value={poEmail} onChange={e => setPoEmail(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="po@company.com"/>
                            {wizardErrors.poEmail && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poEmail}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO Mobile</label>
                            <input type="text" value={poMobile} onChange={e => setPoMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="PO Mobile"/>
                            {wizardErrors.poMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">PO NISM Registration No</label>
                            <input type="text" value={poNism} onChange={e => setPoNism(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="NISM-889012"/>
                            {wizardErrors.poNism && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poNism}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">NISM Validity Date</label>
                            <input type="date" value={poValidity} onChange={e => setPoValidity(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs text-slate-600 dark:text-slate-400"/>
                            {wizardErrors.poValidity && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.poValidity}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('PO', { name: poName, email: poEmail, mobile: poMobile, nismNumber: poNism, nismValidity: poValidity })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4"/>
                        </button>
                      </div>)}

                    {/* Step 3: Compliance Officer */}
                    {wizardStep === 3 && (<div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 3: Compliance Officer Profile</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Compliance Officer Name</label>
                            <input type="text" value={coName} onChange={e => setCoName(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="CO Name"/>
                            {wizardErrors.coName && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coName}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Email</label>
                            <input type="email" value={coEmail} onChange={e => setCoEmail(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="co@company.com"/>
                            {wizardErrors.coEmail && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coEmail}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Mobile</label>
                            <input type="text" value={coMobile} onChange={e => setCoMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="CO Mobile"/>
                            {wizardErrors.coMobile && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coMobile}</p>}
                          </div>
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">CO Membership Registration</label>
                            <input type="text" value={coNism} onChange={e => setCoNism(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs" placeholder="NISM-CO-998811"/>
                            {wizardErrors.coNism && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.coNism}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('CO', { name: coName, email: coEmail, mobile: coMobile, nismNumber: coNism })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4"/>
                        </button>
                      </div>)}

                    {/* Step 4: Grievance & Escilations */}
                    {wizardStep === 4 && (<div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 4: Grievance Officer & Resolution SLA</h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400">Under SEBI rules, grievances must be assigned a resolution SLA of max 30 days.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Escalation Resolution Time</label>
                            <select className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-3 px-4 text-xs">
                              <option>7 Working Days</option>
                              <option>15 Working Days</option>
                              <option>30 Working Days (SEBI Standard)</option>
                            </select>
                          </div>
                        </div>
                        <button onClick={() => setWizardStep(5)} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Save & Next</span> <ArrowRight className="h-4 w-4"/>
                        </button>
                      </div>)}

                    {/* Step 5: Internal Policies Upload */}
                    {wizardStep === 5 && (<div className="space-y-4">
                        <h3 className="font-bold text-sm text-primary-700 dark:text-primary-300">Step 5: Internal Governance Policy Upload</h3>
                        <div>
                          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-2">Upload combined PDF (Internal Control, Conflict policy, AML policy)</label>
                          <div className="border border-dashed border-slate-400 dark:border-white/10 rounded-xl p-6 text-center bg-slate-100 dark:bg-white/5">
                            <UploadCloud className="h-8 w-8 text-primary-600 dark:text-primary-400 mx-auto mb-2"/>
                            <span className="text-xs text-slate-700 dark:text-slate-300">Drag or click to mock upload policy document</span>
                            <input type="text" value={policyUrl} onChange={e => setPolicyUrl(e.target.value)} className="w-full bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-xl py-2 px-3 text-xs mt-3 font-mono" placeholder="Policy PDF URL (Mock)"/>
                            {wizardErrors.policyUrl && <p className="text-red-500 text-[10px] mt-1">{wizardErrors.policyUrl}</p>}
                          </div>
                        </div>
                        <button onClick={() => handleSaveWizardStep('POLICY', { internalPolicyUrl: policyUrl || '/uploads/policies/comb_policy.pdf' })} className="mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-bold text-xs flex items-center space-x-2">
                          <span>Complete Wizard</span> <CheckCircle className="h-4 w-4"/>
                        </button>
                      </div>)}
                  </div>
                </div>)}

              {/* ====================================================
  DASHBOARD VIEW (If completeness >= 80% OR non-ADMIN role)
 ==================================================== */}
              {(isProfileComplete || user.role !== 'ADMIN' || user?.isImpersonated) && (<div className="space-y-8">
                  {children}
                </div>)}
            </div>
          </div>
        </main>

        {closingAlertId && (() => {
        const activeClosingAlert = alerts.find((a) => a.id === closingAlertId);
        return (<div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Resolve Compliance Alert</h3>
                <form onSubmit={handleCloseAlert} className="space-y-4">
                  {activeClosingAlert?.alertType === 'DEPOSIT_LOW' && (<div>
                      <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">Add deposit Float (Rs.)</label>
                      <input type="number" value={depositTopup} onChange={e => setDepositTopup(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs"/>
                    </div>)}

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      {activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Upload Payment Receipt (Optional)' : 'Upload Proof Document (Optional)'}
                    </label>
                    <input type="file" onChange={e => setAlertProof(e.target.files ? e.target.files[0] : null)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs text-slate-700 dark:text-slate-300 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-200 dark:bg-white/10 file:text-slate-900 dark:text-white hover:file:bg-slate-300 dark:bg-white/20"/>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
                      {activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Proof remarks / Date' : 'Resolution Remarks'}
                    </label>
                    <textarea value={closeRemarks} onChange={e => setCloseRemarks(e.target.value)} required rows={3} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/5 rounded-lg py-2 px-3 text-xs" placeholder={activeClosingAlert?.alertType === 'DEPOSIT_LOW' ? 'Enter bank receipt reference details...' : 'Enter details about how this alert was resolved...'}/>
                  </div>
                  <div className="flex space-x-3 pt-2 justify-end text-xs">
                    <button type="button" onClick={() => setClosingAlertId(null)} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5">Cancel</button>
                    <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold">Submit & Close Alert</button>
                  </div>
                </form>
              </div>
            </div>);
    })()}

        <ConfirmDialog isOpen={confirmState.isOpen} title={confirmState.title} message={confirmState.message} variant={confirmState.variant} onConfirm={confirmState.onConfirm} onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} confirmLabel={confirmState.confirmLabel} cancelLabel={confirmState.cancelLabel}/>

        {/* Client Activity Timeline & Audit Modal */}
        <ClientTimelineModal isOpen={isTimelineModalOpen} onClose={() => {
        setIsTimelineModalOpen(false);
        setSelectedTimelineClient(null);
    }} clientId={selectedTimelineClient?.id || null} clientName={selectedTimelineClient?.name}/>

        {/* Report Modal */}
        {showReportModal && (<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-400 dark:border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center"><FileText className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400"/> Download Periodic Report</h3>
                <button onClick={() => setShowReportModal(false)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-white transition">
                  <X className="h-5 w-5"/>
                </button>
              </div>

              <form onSubmit={handleDownloadPeriodicReport}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Financial Year (Starting April)</label>
                    <select value={reportYear} onChange={e => setReportYear(parseInt(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-900 dark:text-white">
                      {(() => {
            const now = new Date();
            const currentFinYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
            const numYears = Math.max(1, currentFinYear - reportStartYear + 1);
            return [...Array(numYears)].map((_, i) => {
                const year = reportStartYear + i;
                return <option key={year} value={year}>{year} - {year + 1}</option>;
            });
        })()}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reporting Period</label>
                    <select value={reportHalf} onChange={e => setReportHalf(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-400 dark:border-white/10 rounded-lg py-2.5 px-3 text-sm text-slate-900 dark:text-white">
                      <option value="H1">H1 (April - September)</option>
                      <option value="H2">H2 (October - March)</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-xl">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mr-3 flex-shrink-0 mt-0.5"/>
                    <div className="text-xs text-amber-800 dark:text-amber-200 leading-relaxed">
                      <strong>Disclaimer:</strong> The data populated in this report is retrieved directly from the administrative database settings. Please ensure that you thoroughly review and manually verify all details in the generated Excel file before final submission to SEBI.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-start space-x-2 px-1">
                  <input type="checkbox" id="agreeDisclaimer" required className="mt-1 h-4 w-4 rounded border-slate-400 text-primary-600 focus:ring-primary-500"/>
                  <label htmlFor="agreeDisclaimer" className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    I acknowledge the disclaimer and agree to manually verify the downloaded data before submission.
                  </label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setShowReportModal(false)} className="px-4 py-2 border border-slate-400 dark:border-white/10 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 dark:bg-white/5 text-sm transition">Cancel</button>
                  <button type="submit" disabled={downloadingReport} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition flex items-center space-x-2 disabled:opacity-50">
                    {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin"/> : <Download className="h-4 w-4"/>}
                    <span>Agree & Download</span>
                  </button>
                </div>
              </form>

            </div>

          </div>)}

        {/* Complaint Modal */}
        {isComplaintModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 my-8 animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black">Log Complaint</h3>
                <button onClick={() => setIsComplaintModalOpen(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition">
                  <X className="h-6 w-6"/>
                </button>
              </div>
              <form onSubmit={handleCreateComplaint} className="space-y-4">
                {/* Client DB Search / Auto-fill Section */}
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-white/10 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Search Client Record (PAN / Aadhaar / Email / Mobile / Name)
                  </label>
                  <div className="flex space-x-2">
                    <input type="text" value={complaintSearchQuery} onChange={(e) => {
            setComplaintSearchQuery(e.target.value);
            if (showClientNotFoundAlert)
                setShowClientNotFoundAlert(false);
        }} onKeyDown={(e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSearchClientForComplaint();
            }
        }} placeholder="Type Client PAN, Aadhaar, Mobile, Email or Name..." className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"/>
                    <button type="button" onClick={() => handleSearchClientForComplaint()} className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs flex items-center transition shadow-md shadow-primary-500/20">
                      <Search className="h-4 w-4 mr-1.5"/> Search DB
                    </button>
                  </div>

                  {/* Found Client Banner */}
                  {complaintFoundClient && (<div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-fade-in">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500"/>
                        <span>
                          <strong>Client Found:</strong> {complaintClientName} {complaintPan ? `(PAN: ${complaintPan})` : ''} {complaintMobile ? `(Mob: ${complaintMobile})` : ''}
                        </span>
                      </div>
                      <button type="button" onClick={() => {
                setComplaintFoundClient(null);
                setComplaintSearchQuery('');
                setComplaintClientName('');
                setComplaintEmail('');
                setComplaintMobile('');
                setComplaintPan('');
            }} className="text-emerald-500 underline font-bold hover:text-emerald-400 ml-2">
                        Clear
                      </button>
                    </div>)}

                  {/* Not Found Alert */}
                  {showClientNotFoundAlert && !complaintFoundClient && (<div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-start space-x-3">
                        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5"/>
                        <div className="text-xs space-y-1">
                          <h5 className="font-extrabold text-amber-600 dark:text-amber-400 text-sm">Client Not Found in Database</h5>
                          <p className="text-slate-600 dark:text-slate-300">
                            यह क्लाइंट आपके रिकॉर्ड में नहीं है। क्या आप न्यू क्लाइंट डिटेल्स मैनुअली दर्ज करना चाहते हैं?
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-3 pt-1">
                        <button type="button" onClick={() => {
                setIsManualFillAllowed(true);
                setShowClientNotFoundAlert(false);
            }} className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition">
                          Yes, Fill Details Manually
                        </button>
                        <button type="button" onClick={() => {
                setComplaintSearchQuery('');
                setShowClientNotFoundAlert(false);
            }} className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition">
                          No, Search Again
                        </button>
                      </div>
                    </div>)}
                </div>

                {!complaintFoundClient && !isManualFillAllowed && !showClientNotFoundAlert && (<div className="text-center py-8 bg-slate-50/50 dark:bg-slate-800/20 border border-dashed border-slate-300 dark:border-white/10 rounded-2xl space-y-2">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">🔍 Client Search Required</p>
                    <p className="text-xs text-slate-500">Please enter Client PAN, Aadhaar, Mobile, Email or Name above and click <strong className="text-primary-600">Search DB</strong> to look up client or fill complaint details.</p>
                  </div>)}

                {(complaintFoundClient || isManualFillAllowed) && (<div className="space-y-4 animate-fade-in pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Name *</label>
                        <input type="text" required value={complaintClientName} onChange={(e) => setComplaintClientName(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="E.g. Rahul Kumar"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Source *</label>
                        <select required value={complaintSource} onChange={(e) => setComplaintSource(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500">
                          <option value="MANUAL">Manual</option>
                          <option value="SCORES">SCORES</option>
                          <option value="ODR">ODR</option>
                          <option value="EMAIL">Email</option>
                          <option value="PORTAL">Portal</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Email</label>
                        <input type="email" value={complaintEmail} onChange={(e) => setComplaintEmail(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client Mobile</label>
                        <input type="text" value={complaintMobile} onChange={(e) => setComplaintMobile(e.target.value.replace(/\D/g, '').slice(0, 10))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Client PAN</label>
                        <input type="text" maxLength={10} placeholder="ABCDE1234F" value={complaintPan} onChange={(e) => setComplaintPan(formatPan(e.target.value))} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500 uppercase font-mono"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Received At</label>
                        <input type="date" value={complaintReceivedAt} onChange={(e) => setComplaintReceivedAt(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Subject *</label>
                        <input type="text" required value={complaintSubject} onChange={(e) => setComplaintSubject(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="Short description of the issue"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1 uppercase tracking-wider">Detailed Description *</label>
                      <textarea required rows={4} value={complaintDescription} onChange={(e) => setComplaintDescription(e.target.value)} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-primary-500" placeholder="Provide full details of the complaint..."></textarea>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-white/10">
                      <button type="button" onClick={() => setIsComplaintModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                      <button type="submit" disabled={isSubmittingComplaint} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-sm font-bold rounded-xl transition-colors flex items-center shadow-lg shadow-primary-500/20 disabled:opacity-50">
                        {isSubmittingComplaint ? <Loader2 className="h-4 w-4 mr-2 animate-spin"/> : <Save className="h-4 w-4 mr-2"/>} Submit Complaint
                      </button>
                    </div>
                  </div>)}
              </form>
            </div>
          </div>)}

        {/* PDF Preview Modal */}
        {pdfPreviewModal?.isOpen && (<div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden animate-fade-in-up">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 rounded-xl">
                    <FileText className="w-5 h-5"/>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {pdfPreviewModal.title}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/60 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-700">
                        {pdfPreviewModal.badgeText}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Live document view with official compliance headers and formatting
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a href={pdfPreviewModal.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors">
                    <ExternalLink className="w-3.5 h-3.5"/>
                    <span>Open in New Tab</span>
                  </a>
                  <button type="button" onClick={() => setPdfPreviewModal(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
                    <X className="w-5 h-5"/>
                  </button>
                </div>
              </div>

              {/* PDF View Container */}
              <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-2 sm:p-4 overflow-hidden">
                <iframe src={pdfPreviewModal.url} className="w-full h-full rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner bg-white" title={pdfPreviewModal.title}/>
              </div>
            </div>
          </div>)}

        {/* GST Toggle Confirmation Modal */}
        {isGstConfirmModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${pendingGstTargetState
            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
            : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'}`}>
                  {pendingGstTargetState ? (<CheckCircle2 className="w-6 h-6"/>) : (<AlertTriangle className="w-6 h-6"/>)}
                </div>
                <button type="button" onClick={() => {
            setIsGstConfirmModalOpen(false);
            setPendingGstTargetState(null);
        }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                {pendingGstTargetState ? 'Enable 18% GST Invoicing?' : 'Disable GST (Non-GST Mode)?'}
              </h3>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 mb-6 leading-relaxed">
                {pendingGstTargetState ? (<>
                    <p>
                      Are you sure you want to enable GST calculation?
                    </p>
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-1">
                      <p className="font-semibold">● 18% GST (CGST/SGST or IGST) will apply to all subscription purchases.</p>
                      <p>● Company GSTIN: <strong className="font-mono">{orgGst || 'Not Entered'}</strong> will appear on all generated invoices.</p>
                      <p>● Calculation Method: <strong>{gstCalculationType === 'EXCLUSIVE' ? 'Amount + 18% GST (Exclusive)' : 'Amount includes 18% GST (Inclusive)'}</strong></p>
                    </div>
                  </>) : (<>
                    <p>
                      Are you sure you want to disable GST calculation?
                    </p>
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 space-y-1">
                      <p className="font-semibold">● Non-GST Advisor Mode: Invoices will be generated with 0% tax.</p>
                      <p>● Company GSTIN will NOT be printed on invoice PDFs.</p>
                      <p>● Use this if your annual turnover is below the GST registration threshold or you operate as an unregistered entity.</p>
                    </div>
                  </>)}
              </div>

              <div className="flex items-center gap-3">
                <button type="button" disabled={isSavingGstToggle} onClick={() => {
            setIsGstConfirmModalOpen(false);
            setPendingGstTargetState(null);
        }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition text-slate-700 dark:text-slate-300">
                  Cancel
                </button>
                <button type="button" disabled={isSavingGstToggle} onClick={handleConfirmGstToggle} className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition text-white shadow-lg flex items-center justify-center gap-2 ${pendingGstTargetState
            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            : 'bg-rose-600 hover:bg-rose-500 shadow-rose-500/20'}`}>
                  {isSavingGstToggle ? (<Loader2 className="w-4 h-4 animate-spin"/>) : pendingGstTargetState ? ('Yes, Enable GST') : ('Yes, Disable GST')}
                </button>
              </div>
            </div>
          </div>)}

        {/* KYC Onboarding Flow Confirmation Modal */}
        {isKycFlowConfirmModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 flex items-center justify-center">
                  <ArrowRightLeft className="w-6 h-6"/>
                </div>
                <button type="button" onClick={() => {
            setIsKycFlowConfirmModalOpen(false);
            setPendingKycFirstState(null);
        }} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                  <X className="w-4 h-4"/>
                </button>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                Switch Onboarding Flow to {pendingKycFirstState ? 'KYC Before Payment' : 'KYC After Payment'}?
              </h3>

              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 mb-6 leading-relaxed">
                <p>
                  You are changing the sequence in which new clients complete verification and purchase plans:
                </p>

                {pendingKycFirstState ? (<div className="bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600"/> Strict Compliance Flow (KYC First):
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      1. Clients will verify Identity KYC (PAN / KRA) and sign Service Agreement <strong>before</strong> accessing plan selection or payments.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      2. Recommended for adherence to strict SEBI guidelines.
                    </p>
                    <div className="pt-2 border-t border-blue-200 dark:border-blue-800/60 font-mono text-[10px] text-blue-700 dark:text-blue-300 font-semibold">
                      Sequence: Welcome ➔ Identity KYC ➔ Legal Agreement ➔ Subscription
                    </div>
                  </div>) : (<div className="bg-indigo-50 dark:bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 space-y-2">
                    <p className="font-bold flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-indigo-600"/> Payment First Flow (KYC After Payment):
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      1. Clients will select their plan and complete payment <strong>first</strong>.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      2. After payment confirmation, the client must complete Identity KYC and sign the Service Agreement before market recommendations unlock.
                    </p>
                    <p className="text-[11px] leading-relaxed">
                      3. <em>If Admin assigns a plan directly to a client, payment is bypassed and the client is prompted to do KYC &amp; Agreement directly upon login.</em>
                    </p>
                    <div className="pt-2 border-t border-indigo-200 dark:border-indigo-800/60 font-mono text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold">
                      Sequence: Welcome ➔ Subscription/Payment ➔ Identity KYC ➔ Legal Agreement
                    </div>
                  </div>)}
              </div>

              <div className="flex items-center gap-3">
                <button type="button" disabled={isSavingKycFlowToggle} onClick={() => {
            setIsKycFlowConfirmModalOpen(false);
            setPendingKycFirstState(null);
        }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold rounded-xl transition text-slate-700 dark:text-slate-300">
                  Cancel
                </button>
                <button type="button" disabled={isSavingKycFlowToggle} onClick={handleConfirmKycFlowToggle} className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-xs font-bold rounded-xl transition text-white shadow-lg shadow-primary-500/20 flex items-center justify-center gap-2">
                  {isSavingKycFlowToggle ? (<Loader2 className="w-4 h-4 animate-spin"/>) : ('Yes, Switch Flow')}
                </button>
              </div>
            </div>
          </div>)}

        
        {/* Mandatory Setup Prerequisites Required Modal */}
        {isSetupPrereqModalOpen && (() => {
        const prereqStatus = getPrerequisitesStatus();
        const percent = Math.round((prereqStatus.completedCount / prereqStatus.totalCount) * 100);
        return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[90vh] animate-fade-in-up">
                
                {/* Header */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-6 h-6"/>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>Firm Setup Required</span>
                        <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          SEBI Compliance
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Action blocked: <strong className="text-slate-700 dark:text-slate-200">{prereqActionTarget || 'Manage Client / Plan'}</strong> requires all 8 foundation settings to be completed first.
                      </p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsSetupPrereqModalOpen(false)} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                    <X className="w-5 h-5"/>
                  </button>
                </div>

                {/* Progress bar */}
                <div className="py-4 border-b border-slate-200 dark:border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Prerequisites Progress ({prereqStatus.completedCount} of {prereqStatus.totalCount} Configured)
                    </span>
                    <span className={`font-mono font-bold ${percent === 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                      {percent}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${percent === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`} style={{ width: `${percent}%` }}/>
                  </div>
                </div>

                {/* Checklist of 8 Items */}
                <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-2.5 custom-scrollbar">
                  {prereqStatus.items.map((item, idx) => (<div key={item.id} className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${item.completed
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40'
                    : 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40 hover:border-amber-400'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.completed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'}`}>
                          {item.completed ? <CheckCircle2 className="w-4 h-4"/> : <AlertTriangle className="w-4 h-4"/>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {idx + 1}. {item.name}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${item.completed
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'}`}>
                              {item.badgeText}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <button type="button" onClick={() => handleNavigateToPrerequisite(item)} className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 self-end sm:self-center ${item.completed
                    ? 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'}`}>
                        <span>{item.completed ? 'Review' : 'Configure Now'}</span>
                        <ChevronRight className="w-3.5 h-3.5"/>
                      </button>
                    </div>))}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Need help? Navigate to <strong>Settings</strong> to complete firm verification.
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsSetupPrereqModalOpen(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition">
                      Dismiss
                    </button>
                    <button type="button" onClick={() => {
                setIsSetupPrereqModalOpen(false);
                setActiveTab('settings');
                setSettingsTab('general');
            }} className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-xs transition shadow-md shadow-primary-500/20 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5"/>
                      <span>Go to Settings</span>
                    </button>
                  </div>
                </div>

              </div>
            </div>);
    })()}

        {/* SEBI Compliance Google Calendar View Modal */}
        <ComplianceCalendarModal isOpen={showCalendarModal} onClose={() => setShowCalendarModal(false)} checklist={checklist} checklistHistory={checklistHistory} complianceCutoffDate={tenantCutoffDate || tenantDetails?.complianceCutoffDate || tenantDetails?.createdAt || null} onReloadData={loadData} onOpenAuditModal={(req) => {
        setAuditModalReq(req);
        const status = req.audit?.status || 'PENDING';
        setAuditStatus(status !== 'PENDING' ? status : '');
        setAuditRemarks(req.audit?.officerRemarks || '');
    }} userRole={user?.role}/>
        {/* Full Admin Notifications Center Modal */}
        {showAllNotifsModal && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
              <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <Bell className="w-5 h-5"/>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Researcher Activity &amp; Live Alerts</h3>
                    <p className="text-xs text-slate-500">{adminNotifications.length} total notification{adminNotifications.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {adminUnreadCount > 0 && (<button onClick={handleMarkAdminNotifsRead} className="px-3 py-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg hover:underline">
                      Mark all as read
                    </button>)}
                  <button onClick={() => setShowAllNotifsModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
                    <X className="w-5 h-5"/>
                  </button>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="p-3 border-b border-slate-200 dark:border-white/10 bg-slate-50/40 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  {['ALL', 'UNREAD', 'SIGNALS', 'REPORTS'].map(tabKey => (<button key={tabKey} onClick={() => setNotifModalFilter(tabKey)} className={`px-2.5 py-1 rounded-lg font-bold transition ${notifModalFilter === tabKey ? 'bg-rose-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'}`}>
                      {tabKey}
                    </button>))}
                </div>
                <input type="text" placeholder="Search notifications..." value={notifSearchQuery} onChange={(e) => setNotifSearchQuery(e.target.value)} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-800 dark:text-white focus:outline-none"/>
              </div>

              {/* Notifications List */}
              <div className="p-3 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5 flex-1 max-h-[60vh]">
                {(() => {
            const filtered = adminNotifications.filter((n) => {
                const isUnread = !n.isRead && !n.read && n.status !== 'READ';
                if (notifModalFilter === 'UNREAD' && !isUnread)
                    return false;
                const type = (n.type || '').toLowerCase();
                if (notifModalFilter === 'SIGNALS' && type !== 'signal' && type !== 'trade')
                    return false;
                if (notifModalFilter === 'REPORTS' && type !== 'report')
                    return false;
                if (notifSearchQuery) {
                    const q = notifSearchQuery.toLowerCase();
                    const titleMatch = (n.title || '').toLowerCase().includes(q);
                    const msgMatch = (n.message || '').toLowerCase().includes(q);
                    if (!titleMatch && !msgMatch)
                        return false;
                }
                return true;
            });
            if (filtered.length === 0) {
                return (<div className="py-12 text-center">
                        <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50"/>
                        <p className="text-xs text-slate-500 font-medium">No notifications matching selected filter</p>
                      </div>);
            }
            return filtered.map((n) => {
                const isUnread = !n.isRead && !n.read && n.status !== 'READ';
                const type = (n.type || '').toLowerCase();
                return (<div key={n.id || n._id} onClick={() => {
                        setShowAllNotifsModal(false);
                        setActiveTab('research');
                    }} className={`p-3.5 cursor-pointer rounded-xl transition flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${isUnread ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs ${type === 'signal' || type === 'alert' || type === 'update'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : type === 'report'
                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                            : 'bg-slate-500/15 text-slate-600'}`}>
                          {type === 'signal' ? <Target className="w-4 h-4"/> : type === 'report' ? <FileText className="w-4 h-4"/> : <Bell className="w-4 h-4"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                              {n.title}
                            </h5>
                            <span className="text-[10px] text-slate-400">
                              {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                      </div>);
            });
        })()}
              </div>

              <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                <button type="button" onClick={() => {
            setShowAllNotifsModal(false);
            setActiveTab('research');
        }} className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition">
                  Go to Research &amp; Signals Desk
                </button>
                <button type="button" onClick={() => setShowAllNotifsModal(false)} className="px-4 py-2 text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl transition">
                  Close
                </button>
              </div>
            </div>
          </div>)}


        <SecretComplianceVaultModal isOpen={isSecretVaultOpen} onClose={() => setIsSecretVaultOpen(false)}/>

        <L2PaymentReviewModal isOpen={Boolean(selectedL2Payment)} payment={selectedL2Payment} plans={adminPlans} onClose={() => setSelectedL2Payment(null)} onSuccess={() => {
        loadData();
        api.getAdminPayments().then(res => { if (res.success)
            setAllPayments(res.data); });
    }}/>

        <L1L2AuditModal isOpen={Boolean(selectedL1L2Diff)} payment={selectedL1L2Diff} onClose={() => setSelectedL1L2Diff(null)}/>

        {/* ====================================================
        PRODUCTION GO-LIVE AUTHORIZATION MODAL
       ==================================================== */}
        {isGoLiveModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-white/10 relative overflow-hidden">
              {/* Header Gradient bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"/>
              
              <div className="flex items-start gap-4 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <Zap className="w-6 h-6 fill-current animate-bounce"/>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Launch Portal to LIVE Production
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    Permanent Action • Routine test penalties cleared • Full desks unlocked
                  </p>
                </div>
              </div>

              {/* Dynamic Cycle Info Callout */}
              {(() => {
            const info = getCalculatedCutoffInfo();
            return (<div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 mb-5">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"/>
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                        Smart Regulatory Cut-off Rule
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed font-medium">
                      {info.ruleExplanation}
                    </p>
                    <div className="mt-3 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                      <span>Official Compliance Monitoring:</span>
                      <span className="px-2.5 py-0.5 rounded-md bg-emerald-600 text-white font-mono font-black shadow-sm">
                        From {info.cutoff.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>);
        })()}

              {/* Scope Breakdown */}
              <div className="space-y-2.5 mb-6 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>
                  <span><strong>Clean Pre-Operational Noise:</strong> Past routine checklist breaches and test BSE penalties are auto-waived (₹0 Penalty).</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"/>
                  <span><strong>Preserve Real Ledger:</strong> Registered clients, payments, invoices, and active KYC/Agreement checks remain 100% intact.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"/>
                  <span><strong>Unlock All Desks:</strong> Compliance Desk, SEBI Checklist, Penalties, Delivery Reports, Signals &amp; Tickets unlock immediately.</span>
                </div>
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2">
                  Enter Admin Password to Authorize
                </label>
                <div className="relative">
                  <input type={showGoLivePassword ? 'text' : 'password'} value={goLivePassword} onChange={(e) => setGoLivePassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter')
        handleConfirmGoLive(); }} placeholder="Enter your admin account password..." className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono pr-11"/>
                  <button type="button" onClick={() => setShowGoLivePassword(!showGoLivePassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                    {showGoLivePassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3">
                <button type="button" disabled={isSubmittingGoLive} onClick={() => {
            setIsGoLiveModalOpen(false);
            setGoLivePassword('');
        }} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={isSubmittingGoLive} onClick={handleConfirmGoLive} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2 disabled:opacity-50">
                  {isSubmittingGoLive ? (<>
                      <Loader2 className="w-4 h-4 animate-spin"/>
                      <span>Verifying &amp; Launching...</span>
                    </>) : (<>
                      <Zap className="w-4 h-4 fill-current"/>
                      <span>Authorize &amp; Go Live</span>
                    </>)}
                </button>
              </div>
            </div>
          </div>)}

        {/* Logout Modal */}
        {isLogoutModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-white/10 animate-fade-in-up">
              <LogOut className="h-12 w-12 text-rose-600 dark:text-rose-500 mx-auto mb-4"/>
              <h3 className="text-xl font-black text-center mb-2">Sign Out</h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm text-center mb-6">Are you sure you want to sign out of your account?</p>
              {user?.allowMultiDeviceLogin ? (<div className="flex flex-col space-y-3">
                  <button onClick={() => handleLogout(false)} className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Sign out on this device</button>
                  <button onClick={() => handleLogout(true)} className="w-full py-2.5 bg-rose-950/40 border border-rose-500/30 text-rose-500 hover:bg-rose-900/40 text-sm font-bold rounded-xl transition-colors">Sign out on ALL devices</button>
                  <button onClick={() => setIsLogoutModalOpen(false)} className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300 mt-2">Cancel</button>
                </div>) : (<div className="flex justify-center space-x-3">
                  <button onClick={() => setIsLogoutModalOpen(false)} className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-white/10 dark:bg-slate-700 text-sm font-bold rounded-xl transition-colors text-slate-700 dark:text-slate-300">Cancel</button>
                  <button onClick={() => handleLogout(false)} className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-sm font-bold rounded-xl transition-colors text-white shadow-lg shadow-rose-500/20">Log Out</button>
                </div>)}
            </div>
          </div>)}
      </div>
    </div>);

}
