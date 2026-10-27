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

// 1. GENERATE ADMIN LAYOUT
// Lines 5537 to 6239
const layoutTopRaw = lines.slice(5536, 6239).join('\n');
const layoutTopClean = transpileCode(layoutTopRaw).trim().replace(/;$/, '');

// Modals: lines 17041 to 18074
const modalsRaw = lines.slice(17040, 18074).join('\n');
const modalsClean = transpileCode(modalsRaw).trim().replace(/;$/, '');

// Audit requirement modal: lines 15859 to 16325
const auditReqModalRaw = lines.slice(15858, 16325).join('\n');
const auditReqModalClean = transpileCode(auditReqModalRaw).trim().replace(/;$/, '');

const layoutHeader = `import React from 'react';
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
`;

const layoutMid = `
                <div className="space-y-8">
                  {children}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
`;

const layoutFooter = `
    </div>
  </div>
  );
}
`;

const fullAdminLayout = layoutHeader + layoutTopClean + layoutMid + modalsClean + '\n' + auditReqModalClean + layoutFooter;
fs.writeFileSync(path.join(outDir, 'AdminLayout.jsx'), fullAdminLayout, 'utf-8');

// 2. GENERATE TABS
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

function generateCleanTab(tabName, codeContent) {
  let extraTabImports = '';
  if (tabName === 'SettingsTab') {
    extraTabImports = `
import FaqManagement from '@/components/admin/FaqManagement';
import OccupationsManager from '@/components/admin/OccupationsManager';
import SecuritySettingsTab from '@/components/admin/SecuritySettingsTab';
import EmailTemplatesManager from '@/components/admin/EmailTemplatesManager';
import PagesManagement from '@/components/admin/PagesManagement';
`;
  } else if (tabName === 'ComplianceTab') {
    extraTabImports = `
import ComplianceCalendarModal from '@/components/compliance/ComplianceCalendarModal';
`;
  } else if (tabName === 'ClientsTab') {
    extraTabImports = `
import ClientTimelineModal from '@/components/admin/ClientTimelineModal';
`;
  }

  const content = `${commonImports}
${extraTabImports}

export default function ${tabName}(props) {
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

  ${codeContent}
}
`;
  fs.writeFileSync(path.join(tabsDir, `${tabName}.jsx`), content, 'utf-8');
  console.log(`Saved clean tab: ${tabName}.jsx`);
}

// Simple direct JSX tabs
['DashboardTab', 'StaffTab', 'ComplianceTab', 'ClientsTab', 'SettingsTab'].forEach(name => {
  const map = {
    DashboardTab: [6252, 6736],
    StaffTab: [6745, 7674],
    ComplianceTab: [8875, 9506],
    ClientsTab: [9523, 12820],
    SettingsTab: [13073, 14945]
  };
  const [start, end] = map[name];
  const raw = lines.slice(start - 1, end).join('\n');
  const clean = transpileCode(raw).trim().replace(/;$/, '');
  generateCleanTab(name, `return (\n${clean}\n);`);
});

// Self-invoking tabs (wrapped in return (() => { ... })();)
['L2ApprovalsTab', 'PaymentsTab', 'ChecklistTab', 'AuditLogsTab'].forEach(name => {
  const map = {
    L2ApprovalsTab: [7678, 7976],
    PaymentsTab: [7979, 8586],
    ChecklistTab: [8589, 8862],
    AuditLogsTab: [16330, 17014]
  };
  const [start, end] = map[name];
  let raw = lines.slice(start - 1, end).join('\n').trim();
  // strip outer {activeTab === '...' &&
  raw = raw.replace(/^\{?activeTab\s*===[^&]+&&\s*/, '');
  if (raw.endsWith('}')) raw = raw.slice(0, -1).trim();
  const clean = transpileCode(raw).trim().replace(/;$/, '');
  generateCleanTab(name, `return (${clean});`);
});

// PlansTab (includes modals)
{
  const mainRaw = lines.slice(12864 - 1, 13066).join('\n');
  const modalRaw = lines.slice(15425 - 1, 15571).join('\n');
  const cleanMain = transpileCode(mainRaw).trim().replace(/;$/, '');
  const cleanModal = transpileCode(modalRaw).trim().replace(/;$/, '');
  generateCleanTab('PlansTab', `return (\n<>\n${cleanMain}\n${cleanModal}\n</>\n);`);
}

// RolesTab (includes modals)
{
  const mainRaw = lines.slice(15026 - 1, 15419).join('\n');
  const modalRaw = lines.slice(15572 - 1, 15855).join('\n');
  const cleanMain = transpileCode(mainRaw).trim().replace(/;$/, '');
  const cleanModal = transpileCode(modalRaw).trim().replace(/;$/, '');
  generateCleanTab('RolesTab', `return (\n<>\n${cleanMain}\n${cleanModal}\n</>\n);`);
}

console.log('All cleaned successfully!');
