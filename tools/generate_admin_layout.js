const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const adminFilePath = 'd:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx';
const content = fs.readFileSync(adminFilePath, 'utf-8');
const lines = content.split('\n');
const outDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin';

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

// Extract layout top (lines 5536 to 6241)
const layoutTopRaw = lines.slice(5536, 6240).join('\n');
const layoutTopClean = transpileCode(layoutTopRaw);

// Extract modals (lines 17040 to 18079)
const modalsRaw = lines.slice(17040, 18078).join('\n');
const modalsClean = transpileCode(modalsRaw);

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
    handleLogout
  } = admin;

  ${layoutTopClean}

                <div className="space-y-8">
                  {children}
                </div>
              </div>
            </div>
          </main>

          ${modalsClean}

        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(outDir, 'AdminLayout.jsx'), adminLayoutContent, 'utf-8');
console.log('AdminLayout.jsx generated successfully!');
