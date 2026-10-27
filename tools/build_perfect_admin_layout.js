const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const adminFilePath = 'd:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx';
const content = fs.readFileSync(adminFilePath, 'utf-8');
const lines = content.split('\n');

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

// Lines 5536 to 6240: layout before tabs (0-indexed 5535 to 6240)
const topLines = lines.slice(5535, 6240);

// Line 17038 to 18077:
// Line 17038 (0-indexed 17037): "          </div>" (closes flex-1 overflow-y-auto)
// Line 17039 (0-indexed 17038): "        </main>"
// ... all modals to line 18077 (0-indexed 18076)
const bottomLines = lines.slice(17037, 18077);

// Combine them:
const completeReturnStatement = [
  ...topLines,
  '                  {children}',
  '                </div>',
  '              )}',
  '            </div>',
  ...bottomLines
].join('\n');

const transpiledReturn = transpileCode(completeReturnStatement);

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
  } = admin || {};

`;

const finalLayoutCode = layoutHeader + transpiledReturn + '\n}\n';

const outPath = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin/AdminLayout.jsx';
fs.writeFileSync(outPath, finalLayoutCode, 'utf8');

// Check diagnostics
const sf = ts.createSourceFile(outPath, finalLayoutCode, ts.ScriptTarget.Latest, true, ts.ScriptKind.JSX);
console.log('AdminLayout diagnostics count:', sf.parseDiagnostics.length);
sf.parseDiagnostics.forEach(d => {
  const { line, character } = sf.getLineAndCharacterOfPosition(d.start);
  console.log(`  Line ${line + 1}:${character + 1} - ${d.messageText}`);
});
