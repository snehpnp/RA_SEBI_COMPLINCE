const fs = require('fs');
const path = require('path');
const ts = require('d:/RA_SEBI_COMPLINCE/frontend/node_modules/typescript');

const adminFilePath = 'd:/RA_SEBI_COMPLINCE/frontend/src/app/admin/page.tsx';
const content = fs.readFileSync(adminFilePath, 'utf-8');
const lines = content.split('\n');

const outDir = 'd:/RA_SEBI_COMPLINCE/frontend_vit/src/pages/admin';
const tabsDir = path.join(outDir, 'tabs');

if (!fs.existsSync(tabsDir)) {
  fs.mkdirSync(tabsDir, { recursive: true });
}

// Common imports header for tabs
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

// Slice definitions
const slices = [
  {
    name: 'DashboardTab',
    start: 6252,
    end: 6736,
    isSelfInvoking: false
  },
  {
    name: 'StaffTab',
    start: 6745,
    end: 7674,
    isSelfInvoking: false
  },
  {
    name: 'L2ApprovalsTab',
    start: 7678,
    end: 7976,
    isSelfInvoking: true
  },
  {
    name: 'PaymentsTab',
    start: 7979,
    end: 8586,
    isSelfInvoking: true
  },
  {
    name: 'ChecklistTab',
    start: 8589,
    end: 8862,
    isSelfInvoking: true
  },
  {
    name: 'ComplianceTab',
    start: 8875,
    end: 9506,
    isSelfInvoking: false
  },
  {
    name: 'ClientsTab',
    start: 9523,
    end: 12820,
    isSelfInvoking: false
  },
  {
    name: 'PlansTab',
    start: 12864,
    end: 13067,
    isSelfInvoking: false,
    extraSlice: { start: 15424, end: 15570 }
  },
  {
    name: 'SettingsTab',
    start: 13073,
    end: 14945,
    isSelfInvoking: false
  },
  {
    name: 'RolesTab',
    start: 15025,
    end: 15420,
    isSelfInvoking: false,
    extraSlice: { start: 15572, end: 15720 }
  },
  {
    name: 'AuditLogsTab',
    start: 16330,
    end: 17014,
    isSelfInvoking: true
  }
];

slices.forEach(s => {
  let rawCode = lines.slice(s.start - 1, s.end).join('\n');
  if (s.extraSlice) {
    rawCode = `<>\n${rawCode}\n${lines.slice(s.extraSlice.start - 1, s.extraSlice.end).join('\n')}\n</>`;
  }
  const cleanCode = transpileCode(rawCode);

  let componentBody = '';
  if (s.isSelfInvoking) {
    let inner = cleanCode.trim();
    if (inner.startsWith('{') && inner.endsWith(')()}')) {
      inner = inner.slice(1, -4).trim();
    }
    inner = inner.replace(/^activeTab\s*===[^&]+&&\s*/, '');
    if (inner.startsWith('(() =>') && inner.endsWith(')')) {
      inner = inner.slice(6, -1).trim();
      if (inner.startsWith('{') && inner.endsWith('}')) {
        inner = inner.slice(1, -1).trim();
      }
    }
    componentBody = inner;
  } else {
    let trimmed = cleanCode.trim().replace(/;\s*$/, '');
    componentBody = `return (\n${trimmed}\n);`;
  }

  // Extra imports specific to certain tabs
  let extraTabImports = '';
  if (s.name === 'SettingsTab') {
    extraTabImports = `
import FaqManagement from '@/components/admin/FaqManagement';
import OccupationsManager from '@/components/admin/OccupationsManager';
import SecuritySettingsTab from '@/components/admin/SecuritySettingsTab';
import EmailTemplatesManager from '@/components/admin/EmailTemplatesManager';
import PagesManagement from '@/components/admin/PagesManagement';
import { base_ra_url } from '@/utils/config';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { CKEditor } from '@ckeditor/ckeditor5-react';
`;
  } else if (s.name === 'PlansTab') {
    extraTabImports = `
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import { CKEditor } from '@ckeditor/ckeditor5-react';
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
    openTimelineModal
  } = admin || {};

  ${componentBody}
}
`;

  const targetFile = path.join(tabsDir, `${s.name}.jsx`);
  fs.writeFileSync(targetFile, fileContent, 'utf-8');
  console.log(`Generated tab: ${s.name}.jsx (${(fileContent.length / 1024).toFixed(1)} KB)`);
});

// Now generate the wrapper tabs
const wrapperTabs = [
  {
    name: 'ActiveClientSummaryTab',
    importStmt: `import ActiveClientSummary from '@/components/admin/ActiveClientSummary';`,
    body: `export default function ActiveClientSummaryTab() {
  const { setActiveTab } = useAdmin();
  return <ActiveClientSummary onBack={() => setActiveTab('dashboard')} />;
}`
  },
  {
    name: 'PenaltyMatrixTab',
    importStmt: `import { SebiPenaltiesMatrixView } from '@/components/SebiPenaltiesMatrixView';`,
    body: `export default function PenaltyMatrixTab() {
  const { setShowCalendarModal } = useAdmin();
  return (
    <div className="w-full space-y-6">
      <SebiPenaltiesMatrixView onOpenChecklistCalendar={() => setShowCalendarModal(true)} />
    </div>
  );
}`
  },
  {
    name: 'VaultsTab',
    importStmt: `import ClientVaultExplorer from '@/components/admin/vault/ClientVaultExplorer';`,
    body: `export default function VaultsTab() {
  const { user } = useAdmin();
  return (
    <ClientVaultExplorer 
      canDownload={!user?.permissions?.includes('MASK_VAULT_DATA')} 
      isMasked={Boolean(user?.permissions?.includes('MASK_VAULT_DATA'))} 
    />
  );
}`
  },
  {
    name: 'ResearchTab',
    importStmt: `import SignalManagement from '@/components/SignalManagement';`,
    body: `export default function ResearchTab() {
  const { isStaff, user, hasPermission, adminPlans, showMobilePreview } = useAdmin();
  return (
    <SignalManagement
      adminPlans={adminPlans}
      user={user}
      hasPermission={hasPermission}
      showMobilePreview={showMobilePreview}
      isStaff={isStaff}
    />
  );
}`
  },
  {
    name: 'ResearchReportsTab',
    importStmt: `import AdminResearchReports from '@/components/admin/AdminResearchReports';`,
    body: `export default function ResearchReportsTab() {
  return <AdminResearchReports />;
}`
  },
  {
    name: 'DeliveryReportsTab',
    importStmt: `import TradeDeliveryReports from '@/components/admin/TradeDeliveryReports';`,
    body: `export default function DeliveryReportsTab() {
  const { activeTab } = useAdmin();
  const subChannel = activeTab === 'deliveryReports_telegram' ? 'TELEGRAM' :
    activeTab === 'deliveryReports_sms' ? 'SMS' :
    activeTab === 'deliveryReports_inapp' ? 'INAPP' : 'ALL';
  return (
    <div className="mx-6 space-y-6 animate-fade-in">
      <TradeDeliveryReports channel={subChannel} />
    </div>
  );
}`
  },
  {
    name: 'CouponsTab',
    importStmt: `import CouponsManager from '@/components/CouponsManager';`,
    body: `export default function CouponsTab() {
  return <CouponsManager />;
}`
  },
  {
    name: 'PagesTab',
    importStmt: `import PagesManagement from '@/components/admin/PagesManagement';`,
    body: `export default function PagesTab() {
  const { isStaff, activeTab, setAdminPagesList } = useAdmin();
  const pageSlug = activeTab && activeTab.startsWith('customPages_') ? activeTab.split('_')[1] : null;
  return <PagesManagement readOnly={isStaff} pageSlug={pageSlug} onPagesUpdate={(pages) => setAdminPagesList(pages)} />;
}`
  },
  {
    name: 'ComplaintReportTab',
    importStmt: `import ComplaintReportAdmin from '@/components/admin/ComplaintReportAdmin';`,
    body: `export default function ComplaintReportTab() {
  return <ComplaintReportAdmin />;
}`
  },
  {
    name: 'SignatureSettingsTab',
    importStmt: `import SignatureSettingsComponent from '@/components/admin/SignatureSettingsTab';`,
    body: `export default function SignatureSettingsTab() {
  const { user, setUser, loadData, showMobilePreview, toggleMobilePreview } = useAdmin();
  return (
    <SignatureSettingsComponent
      user={user}
      setUser={setUser}
      loadData={loadData}
      showMobilePreview={showMobilePreview}
      toggleMobilePreview={toggleMobilePreview}
    />
  );
}`
  },
  {
    name: 'ResourcesTab',
    importStmt: `import AdminResourcesTabComponent from '@/components/AdminResourcesTab';`,
    body: `export default function ResourcesTab() {
  return (
    <div className="animate-fade-in">
      <AdminResourcesTabComponent triggerAlert={(msg) => toast(msg)} />
    </div>
  );
}`
  },
  {
    name: 'TicketsTab',
    importStmt: `import TicketManagement from '@/components/admin/TicketManagement';`,
    body: `export default function TicketsTab() {
  const { isStaff, user, hasPermission } = useAdmin();
  return (
    <div className="space-y-6">
      <TicketManagement isStaff={isStaff} user={user} hasPermission={hasPermission} />
    </div>
  );
}`
  },
  {
    name: 'VideoKycTab',
    importStmt: `import VideoKycDesk from '@/components/admin/VideoKycDesk';`,
    body: `export default function VideoKycTab() {
  return <VideoKycDesk />;
}`
  },
  {
    name: 'ProfileTab',
    importStmt: `import AdminProfilePage from '@/pages/admin/profile/AdminProfilePage';
import StaffProfilePage from '@/pages/admin/profile/StaffProfilePage';
import PAProfilePage from '@/pages/admin/profile/PAProfilePage';`,
    body: `export default function ProfileTab() {
  const { user } = useAdmin();
  return (
    <>
      {user?.role === 'ADMIN' && <AdminProfilePage />}
      {(user?.role === 'STAFF' || user?.role === 'COMPLIANCE_OFFICER' || user?.role === 'RESEARCHER') && <StaffProfilePage />}
      {user?.role === 'PRINCIPAL_ANALYST' && <PAProfilePage />}
    </>
  );
}`
  },
  {
    name: 'LegalTab',
    importStmt: `import Legal from '@/components/client/Legal';`,
    body: `export default function LegalTab() {
  const { adminPagesList, setActiveTab } = useAdmin();
  return (
    <Legal
      pages={(adminPagesList || []).filter(p => p.slug !== 'complaint-status' && (p.status === 'ACTIVE' || !p.status))}
      onReadDocument={(page) => {
        if (page.type === 'URL' && page.externalUrl) {
          window.open(page.externalUrl, '_blank');
        } else {
          setActiveTab(\`customPages_\${page.slug}\`);
        }
      }}
    />
  );
}`
  },
  {
    name: 'ComplaintDataViewTab',
    importStmt: `import CustomPageView from '@/components/client/CustomPageView';`,
    body: `export default function ComplaintDataViewTab() {
  return <CustomPageView page={{ slug: 'complaint-status', title: 'Complaint Data' }} />;
}`
  }
];

wrapperTabs.forEach(w => {
  const content = `import React from 'react';
import { useAdmin } from '../AdminContext';
import { toast } from 'react-hot-toast';
${w.importStmt}

${w.body}
`;
  const targetFile = path.join(tabsDir, `${w.name}.jsx`);
  fs.writeFileSync(targetFile, content, 'utf-8');
  console.log(`Generated wrapper tab: ${w.name}.jsx`);
});

console.log('All tab files generated successfully!');
