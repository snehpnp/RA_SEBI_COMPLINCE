const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const adminFilePath = 'd:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx';
const content = fs.readFileSync(adminFilePath, 'utf-8');
const lines = content.split('\n');
const outDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin';
const tabsDir = path.join(outDir, 'tabs');

function transpileCode(tsCode) {
  const result = ts.transpileModule(tsCode, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false
    }
  });
  return result.outputText.replace(/^['"]use client['"];?\s*/g, '');
}

// 1. ADMIN LAYOUT
// Lines 5537 to 6239
const layoutTopRaw = lines.slice(5536, 6239).join('\n');
const layoutTopClean = transpileCode(layoutTopRaw);

// Modals: lines 17041 to 18074
const modalsRaw = lines.slice(17040, 18074).join('\n');
const modalsClean = transpileCode(modalsRaw);

// Audit requirement modal: lines 15859 to 16325
const auditReqModalRaw = lines.slice(15858, 16325).join('\n');
const auditReqModalClean = transpileCode(auditReqModalRaw);

const adminLayoutContent = `import React from 'react';
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
import api from '@/services/api';

export default function AdminLayout({ children }) {
  const admin = useAdmin();
  const {
    isDarkMode, isMobileMenuOpen, setIsMobileMenuOpen, isSidebarCollapsed, setIsSidebarCollapsed,
    user, appLogo, appName, pendingQrCount, alerts, activeTab, setActiveTab,
    isStaff, hasPermission, filteredNav, adminPagesList, isDeliveryReportsExpanded,
    setIsDeliveryReportsExpanded, isPagesExpanded, setIsPagesExpanded,
    adminNotifications, adminUnreadCount, isAdminNotifOpen, setIsAdminNotifOpen,
    setShowAllNotifsModal, closingAlertId, setClosingAlertId, depositTopup, setDepositTopup,
    alertProof, setAlertProof, closeRemarks, setCloseRemarks, handleCloseAlert,
    confirmState, setConfirmState, isTimelineModalOpen, setIsTimelineModalOpen,
    selectedTimelineClient, setSelectedTimelineClient, showReportModal, setShowReportModal,
    reportYear, setReportYear, reportHalf, setReportHalf, reportStartYear,
    handleDownloadPeriodicReport, isComplaintModalOpen, setIsComplaintModalOpen,
    complaintClientSearch, setComplaintClientSearch, complaintSearching,
    showClientNotFoundAlert, setShowClientNotFoundAlert, complaintFoundClient,
    setComplaintFoundClient, isManualFillAllowed, setIsManualFillAllowed,
    complaintManualName, setComplaintManualName, complaintManualPan, setComplaintManualPan,
    complaintManualEmail, setComplaintManualEmail, complaintManualMobile, setComplaintManualMobile,
    complaintSource, setComplaintSource, complaintScoresRegNo, setComplaintScoresRegNo,
    complaintType, setComplaintType, complaintDescription, setComplaintDescription,
    complaintProof, setComplaintProof, isSavingComplaint, handleRegisterComplaint,
    pdfPreviewModal, setPdfPreviewModal, isGstConfirmModalOpen, setIsGstConfirmModalOpen,
    pendingGstValue, setPendingGstValue, confirmGstToggle, isKycFlowConfirmModalOpen,
    setIsKycFlowConfirmModalOpen, pendingKycFlowValue, setPendingKycFlowValue,
    confirmKycFlowToggle, isSetupPrereqModalOpen, setIsSetupPrereqModalOpen,
    getPrerequisitesStatus, showCalendarModal, setShowCalendarModal,
    showAllNotifsModal, notifModalFilter, setNotifModalFilter, notifSearchQuery,
    setNotifSearchQuery, handleNotifItemClick, handleMarkAllNotifsAsRead,
    auditModalReq, setAuditModalReq, isGoLiveModalOpen, setIsGoLiveModalOpen,
    isCompletenessLoading, completenessMetrics, wizardStep, setWizardStep,
    isActivatingLive, handleProceedToGoLive, isLogoutModalOpen, setIsLogoutModalOpen,
    handleLogout, isProfileComplete
  } = admin;

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="h-screen h-dvh overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans">
        
        {/* Mobile Sidebar Backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={\`fixed lg:relative inset-y-0 left-0 z-50 bg-blue-900 dark:bg-slate-950 border-r border-blue-800 dark:border-premium-border flex flex-col transition-all duration-300 \${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full lg:translate-x-0'
        } \${!isMobileMenuOpen && isSidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}\`}>
          
          {/* Brand */}
          <div className={\`h-24 flex items-center border-b border-blue-800 dark:border-premium-border transition-all duration-300 \${
            isSidebarCollapsed ? 'px-3 justify-center' : 'px-6 justify-between'
          }\`}>
            <div className={\`flex items-center gap-3 overflow-hidden \${isSidebarCollapsed ? 'justify-center' : ''}\`}>
              {(() => {
                const rawLogo = user?.tenantLogo || user?.tenant?.logoUrl || appLogo;
                const logoSrc = rawLogo ? (rawLogo.startsWith('http') ? rawLogo : \`\${api.getBaseUrl()}/uploads/\${rawLogo}\`) : null;
                const displayName = user?.tenantName || user?.tenant?.companyName || appName || 'Logo';

                if (logoSrc) {
                  return (
                    <img
                      src={logoSrc}
                      alt={displayName}
                      className={\`object-contain shrink-0 \${isSidebarCollapsed ? 'h-9 w-9 rounded-lg' : 'h-10 max-w-[150px]'}\`}
                    />
                  );
                }
                return (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 shrink-0">
                      {(displayName[0] || 'R').toUpperCase()}
                    </div>
                    {!isSidebarCollapsed && (
                      <span className="font-extrabold text-base tracking-tight text-white line-clamp-1">
                        {displayName}
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>
            {!isSidebarCollapsed && (
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden text-blue-200 dark:text-slate-400 hover:text-white p-2 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <div className="flex-1 overflow-y-auto px-3 py-6 space-y-1.5 custom-scrollbar">
            {filteredNav.map((mod) => {
              const IconComp = ICON_MAP[mod.icon] || Layers;
              const isActive = activeTab === mod.tab;
              return (
                <button
                  key={mod.tab}
                  onClick={() => {
                    setActiveTab(mod.tab);
                    setIsMobileMenuOpen(false);
                  }}
                  className={\`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl transition-all duration-200 group relative \${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30'
                      : 'text-blue-100 dark:text-slate-400 hover:bg-blue-800/60 dark:hover:bg-slate-800/60 hover:text-white font-medium'
                  } \${isSidebarCollapsed ? 'justify-center' : ''}\`}
                  title={isSidebarCollapsed ? mod.label : undefined}
                >
                  <IconComp className={\`w-5 h-5 shrink-0 transition-transform duration-200 \${isActive ? 'scale-110' : 'group-hover:scale-110'}\`} />
                  {!isSidebarCollapsed && (
                    <span className="text-sm tracking-wide truncate">{mod.label}</span>
                  )}
                  {mod.tab === 'payments' && pendingQrCount > 0 && (
                    <span className={\`ml-auto bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full shrink-0 \${isSidebarCollapsed ? 'absolute top-1 right-1' : ''}\`}>
                      {pendingQrCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Sidebar Collapse Toggle */}
          <div className="p-3 border-t border-blue-800 dark:border-premium-border hidden lg:block">
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="w-full flex items-center justify-center p-2 rounded-xl text-blue-200 dark:text-slate-400 hover:bg-blue-800/60 dark:hover:bg-slate-800 hover:text-white transition"
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-100 dark:bg-slate-950">
          
          {/* Header */}
          <header className="h-20 border-b border-slate-200 dark:border-white/10 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-2 rounded-xl border border-slate-200 dark:border-white/10"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                  {activeTab.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/-/g, ' ')}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                  Research Analyst Management & Compliance System
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <ThemeToggle />
              <UserProfileDropdown user={user} onLogout={() => setIsLogoutModalOpen(true)} />
            </div>
          </header>

          {/* Content Viewport */}
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 lg:p-10 space-y-8 max-w-7xl mx-auto w-full custom-scrollbar">
            
            {/* Live Alerts Notification Banner */}
            {alerts && alerts.filter(a => a.status === 'ACTIVE').length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-700 dark:text-rose-400 animate-pulse">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span className="text-xs font-bold">
                    {alerts.filter(a => a.status === 'ACTIVE').length} Active Compliance Alerts require immediate resolution
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('compliance')}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shrink-0 transition"
                >
                  Review
                </button>
              </div>
            )}

            {/* Tab Body */}
            {(isProfileComplete || user?.role !== 'ADMIN' || user?.isImpersonated) && (
              <div className="space-y-8">
                {children}
              </div>
            )}
          </div>
        </main>

        {/* Modals & Dialogs */}
        ${modalsClean}

        {/* Audit Requirement Modal */}
        ${auditReqModalClean}

      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(outDir, 'AdminLayout.jsx'), adminLayoutContent, 'utf-8');
console.log('AdminLayout.jsx created cleanly with full structure!');

// 2. GENERATE TABS CLEANLY
const commonImports = `import React, { useState, useEffect, useMemo, useRef } from 'react';
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
`;

const tabDefs = [
  { name: 'DashboardTab', start: 6252, end: 6736, isSelfInvoking: false },
  { name: 'StaffTab', start: 6745, end: 7674, isSelfInvoking: false },
  { name: 'L2ApprovalsTab', start: 7678, end: 7976, isSelfInvoking: true },
  { name: 'PaymentsTab', start: 7979, end: 8586, isSelfInvoking: true },
  { name: 'ChecklistTab', start: 8589, end: 8862, isSelfInvoking: true },
  { name: 'ComplianceTab', start: 8875, end: 9506, isSelfInvoking: false },
  { name: 'ClientsTab', start: 9523, end: 12820, isSelfInvoking: false },
  { name: 'PlansTab', start: 12864, end: 13066, modalStart: 15425, modalEnd: 15571, isSelfInvoking: false },
  { name: 'SettingsTab', start: 13073, end: 14945, isSelfInvoking: false },
  { name: 'RolesTab', start: 15026, end: 15419, modalStart: 15572, modalEnd: 15855, isSelfInvoking: false },
  { name: 'AuditLogsTab', start: 16330, end: 17014, isSelfInvoking: true }
];

tabDefs.forEach(s => {
  let mainCode = lines.slice(s.start - 1, s.end).join('\n');
  if (s.modalStart && s.modalEnd) {
    mainCode += '\n' + lines.slice(s.modalStart - 1, s.modalEnd).join('\n');
  }

  const cleanCode = transpileCode(mainCode);

  let componentBody = '';
  if (s.isSelfInvoking) {
    let inner = cleanCode.trim();
    if (inner.startsWith('{')) inner = inner.slice(1).trim();
    if (inner.endsWith(')()}')) inner = inner.slice(0, -4).trim();
    if (inner.endsWith(';')) inner = inner.slice(0, -1).trim();
    inner = inner.replace(/^activeTab\s*===[^&]+&&\s*/, '');
    if (inner.startsWith('(() =>') && inner.endsWith(')')) {
      inner = inner.slice(6, -1).trim();
      if (inner.startsWith('{') && inner.endsWith('}')) {
        inner = inner.slice(1, -1).trim();
      }
    }
    componentBody = inner;
  } else {
    let jsx = cleanCode.trim();
    if (jsx.endsWith(';')) jsx = jsx.slice(0, -1).trim();
    componentBody = `return (\n${jsx}\n);`;
  }

  let extraTabImports = '';
  if (s.name === 'SettingsTab') {
    extraTabImports = `
import FaqManagement from '@/components/admin/FaqManagement';
import OccupationsManager from '@/components/admin/OccupationsManager';
import SecuritySettingsTab from '@/components/admin/SecuritySettingsTab';
import EmailTemplatesManager from '@/components/admin/EmailTemplatesManager';
import PagesManagement from '@/components/admin/PagesManagement';
`;
  } else if (s.name === 'ComplianceTab') {
    extraTabImports = `
import ComplianceCalendarModal from '@/components/compliance/ComplianceCalendarModal';
`;
  } else if (s.name === 'ClientsTab') {
    extraTabImports = `
import ClientTimelineModal from '@/components/admin/ClientTimelineModal';
`;
  }

  const fileContent = `${commonImports}
${extraTabImports}

export default function ${s.name}(props) {
  const admin = useAdmin();
  const {
    user, setUser, isStaff, hasPermission, tenantDetails, setTenantDetails,
    dashboardStats, setDashboardStats, refreshDashboard,
    staff, setStaff, allStaff, editingStaff, setEditingStaff,
    clients, setClients, allClients, selectedClient, setSelectedClient,
    adminPlans, setAdminPlans,
    allPayments, setAllPayments,
    checklist, setChecklist,
    activityLogs, setActivityLogs,
    alerts, setAlerts, closingAlertId, setClosingAlertId, handleCloseAlert,
    activeTab, setActiveTab,
    adminPagesList, setAdminPagesList,
    roles, setRoles,
    confirmState, setConfirmState, showConfirm,
    pdfPreviewModal, setPdfPreviewModal,
    showCalendarModal, setShowCalendarModal,
    showReportModal, setShowReportModal,
    isSetupPrereqModalOpen, setIsSetupPrereqModalOpen,
    getPrerequisitesStatus,
    openTimelineModal,
    ...restAdmin
  } = admin || {};

  ${componentBody}
}
`;

  const targetFile = path.join(tabsDir, `${s.name}.jsx`);
  fs.writeFileSync(targetFile, fileContent, 'utf-8');
  console.log(`Generated tab: ${s.name}.jsx`);
});

console.log('Build perfect admin complete!');
